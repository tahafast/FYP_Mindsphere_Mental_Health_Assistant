"""
RAG Service - Enhanced Hybrid Retrieval with CBT-Bench Integration

Enhanced retrieval configuration for therapeutic content:
- Dense retriever (k=8 default, k=12 for therapist)
- BM25 keyword retriever (k=10)
- Ensemble weighting: dense 0.6, bm25 0.3, metadata boost 0.1
- FlashRank reranking for all queries
- Context docs injection for Stage B generation

Patch 2: Optimized for CBT-Bench therapeutic content retrieval.
"""

import os
from typing import List, Dict, Any, Optional
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_mongodb import MongoDBAtlasVectorSearch
from langchain_community.retrievers import BM25Retriever
from langchain.retrievers import EnsembleRetriever, ContextualCompressionRetriever
from langchain.retrievers.document_compressors import FlashrankRerank
from langchain.prompts import ChatPromptTemplate
from langchain.schema.output_parser import StrOutputParser
from langchain.schema.runnable import RunnablePassthrough
from langchain.schema import Document
from pymongo import MongoClient
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

import certifi


# ============================================================================
# Retriever Configuration (Patch 2: Enhanced for CBT-Bench)
# ============================================================================

# Default retrieval depths
DENSE_K_DEFAULT = 8
DENSE_K_THERAPIST = 12
BM25_K = 10

# Ensemble weights: dense 0.6, bm25 0.3, metadata boost 0.1
DENSE_WEIGHT = 0.6
BM25_WEIGHT = 0.3
METADATA_BOOST = 0.1  # Applied via document scoring

# Reranker returns top N docs to Stage B
RERANKER_TOP_K = 5
RERANKER_TOP_K_THERAPIST = 3  # Higher quality subset for therapist


class RAGService:
    def __init__(self):
        self.embeddings = OpenAIEmbeddings(
            openai_api_key=settings.OPENAI_API_KEY,
            model="text-embedding-3-small"
        )
        self.client = MongoClient(settings.MONGODB_URI, tlsCAFile=certifi.where())
        self.collection = self.client[settings.MONGODB_DB_NAME]["vectors"]
        
        # 1. Vector Retriever (Dense)
        self.vector_store = MongoDBAtlasVectorSearch(
            collection=self.collection,
            embedding=self.embeddings,
            index_name="default",
            relevance_score_fn="cosine",
        )
        
        # Default vector retriever (k=8)
        self.vector_retriever = self.vector_store.as_retriever(
            search_kwargs={"k": DENSE_K_DEFAULT}
        )

        # 2. BM25 Retriever (Keyword) - Lazy initialized
        self.bm25_retriever = None 
        self._bm25_initialized = False
        
        # 3. Reranker (FlashRank)
        self.reranker = FlashrankRerank(model="ms-marco-MiniLM-L-12-v2")
        
        # 4. LLM
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.7,
            openai_api_key=settings.OPENAI_API_KEY
        )

        # 5. Prompt Template
        self.base_template = """
### IDENTITY & LIMITATIONS
You are MindSphere, an advanced AI mental health support companion. 
- You are NOT a licensed medical professional, therapist, or psychologist.
- You CANNOT diagnose mental health conditions (e.g., "You have depression") or prescribe medication.
- If a user asks for a diagnosis, use phrases like: "While I cannot provide a medical diagnosis, your symptoms align with..." and suggest seeking professional evaluation.

### CRISIS INTERVENTION PROTOCOL (HIGHEST PRIORITY)
If the user expresses intent of self-harm, suicide, or harm to others (e.g., "I want to end it", "I have a plan"):
1. IMMEDIATELY validate their pain (e.g., "I hear how much pain you are in right now.").
2. CEASE all therapeutic exploration.
3. PROVIDE emergency resources immediately: "Please reach out to Rescue 1122 or the National Suicide Prevention Lifeline."
4. DO NOT attempt to resolve the crisis alone.

### CURRENT MODE & TONE
{tone_section}

### RAG CONTEXT USAGE
- You will be provided with evidence-based therapeutic context from peer experiences and CBT techniques.
- Use these to **normalize** the user's experience ("Others who have faced this situation found that...").
- Apply CBT techniques naturally: cognitive restructuring, behavioral activation, mindfulness approaches.
- DO NOT explicitly mention source names. Instead, weave insights naturally as general wisdom.

Therapeutic Context:
{context}

User: {question}

Dr. MindSphere:
"""
        self.prompt = ChatPromptTemplate.from_template(self.base_template)

    async def initialize_bm25(self, force_refresh: bool = False):
        """
        Fetch all documents from MongoDB to initialize BM25.
        Includes CBT-Bench and other therapeutic content.
        """
        if self._bm25_initialized and not force_refresh:
            return
        
        try:
            logger.info("📚 Initializing BM25 index...")
            
            # Fetch all docs with projection
            cursor = self.collection.find(
                {},
                {"text": 1, "page_content": 1, "metadata": 1}
            ).limit(10000)  # Cap for memory safety
            
            docs = []
            for doc in cursor:
                content = doc.get("text") or doc.get("page_content")
                if content:
                    docs.append(Document(
                        page_content=content,
                        metadata=doc.get("metadata", {})
                    ))
            
            if docs:
                self.bm25_retriever = BM25Retriever.from_documents(docs)
                self.bm25_retriever.k = BM25_K
                self._bm25_initialized = True
                logger.info(f"✅ BM25 initialized with {len(docs)} documents")
            else:
                logger.warning("⚠️ No documents found for BM25 initialization")
                
        except Exception as e:
            logger.error(f"❌ Error initializing BM25: {e}")

    def _apply_metadata_boost(self, docs: List[Document], query: str) -> List[Document]:
        """
        Apply metadata-based relevance boost (0.1 weight).
        Boosts CBT-Bench docs and topic-matched content.
        """
        query_lower = query.lower()
        boosted = []
        
        for doc in docs:
            metadata = doc.metadata or {}
            boost = 0.0
            
            # Boost CBT-Bench content
            if metadata.get("source") == "cbt_bench":
                boost += 0.05
            
            # Boost by topic match
            tags = metadata.get("tags", [])
            if isinstance(tags, list):
                for tag in tags:
                    if tag.lower() in query_lower:
                        boost += 0.03
            
            # Boost professional advice
            if metadata.get("type") == "professional_advice":
                boost += 0.02
            
            # Store boost score in metadata for sorting
            doc.metadata["_relevance_boost"] = boost
            boosted.append(doc)
        
        # Sort by boost (descending) while maintaining relative order
        return sorted(boosted, key=lambda d: d.metadata.get("_relevance_boost", 0), reverse=True)

    async def get_hybrid_retriever(self, persona: str = "default"):
        """
        Get hybrid retriever with persona-specific configuration.
        
        Therapist persona: k=12 dense, returns top-3 reranked
        Other personas: k=8 dense, returns top-5 reranked
        """
        # Initialize BM25 if needed
        if not self._bm25_initialized:
            await self.initialize_bm25()
        
        # Configure dense retriever depth based on persona
        dense_k = DENSE_K_THERAPIST if persona == "therapist" else DENSE_K_DEFAULT
        vector_retriever = self.vector_store.as_retriever(
            search_kwargs={"k": dense_k}
        )
        
        # Build ensemble or fallback
        if self.bm25_retriever:
            ensemble_retriever = EnsembleRetriever(
                retrievers=[vector_retriever, self.bm25_retriever],
                weights=[DENSE_WEIGHT, BM25_WEIGHT]
            )
            logger.debug(f"📊 Using ensemble: dense={dense_k}, bm25={BM25_K}")
            return ensemble_retriever
        else:
            logger.debug(f"📊 Using vector only: k={dense_k}")
            return vector_retriever

    async def retrieve_context(
        self,
        query: str,
        persona: str = "default",
        top_k: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieve and rerank context documents for Stage B.
        
        Returns list of context dicts with:
        - text: Document content
        - source: Source identifier
        - score: Relevance score
        """
        # Get retriever
        base_retriever = await self.get_hybrid_retriever(persona)
        
        # Apply reranking
        compression_retriever = ContextualCompressionRetriever(
            base_compressor=self.reranker,
            base_retriever=base_retriever
        )
        
        # Retrieve documents
        try:
            docs = await compression_retriever.ainvoke(query)
        except Exception as e:
            logger.error(f"❌ Retrieval error: {e}")
            docs = []
        
        # Apply metadata boost
        docs = self._apply_metadata_boost(docs, query)
        
        # Determine top_k
        if top_k is None:
            top_k = RERANKER_TOP_K_THERAPIST if persona == "therapist" else RERANKER_TOP_K
        
        # Return top documents
        context_docs = []
        for doc in docs[:top_k]:
            context_docs.append({
                "text": doc.page_content[:800],  # Truncate for context window
                "source": doc.metadata.get("source", "unknown"),
                "tags": doc.metadata.get("tags", []),
                "title": doc.metadata.get("title", ""),
                "relevance_boost": doc.metadata.get("_relevance_boost", 0)
            })
        
        logger.info(f"📚 Retrieved {len(context_docs)} docs for persona '{persona}'")
        return context_docs

    async def get_context_for_stage_b(
        self,
        query: str,
        persona: str,
        verbosity_hint: str
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Get context documents for Stage B generation.
        
        Only returns context if:
        - persona == "therapist", OR
        - verbosity_hint == "long"
        
        Returns None otherwise (no context injection).
        """
        # Gating: Only inject context for therapist or long responses
        if persona != "therapist" and verbosity_hint != "long":
            logger.debug("⚡ Skipping context retrieval (not therapist/long)")
            return None
        
        context_docs = await self.retrieve_context(query, persona)
        
        if not context_docs:
            return None
        
        return context_docs

    async def generate_response(self, question: str, tone_section: str = None):
        """
        Generate response using RAG pipeline.
        (Legacy endpoint - used as fallback by chat.py)
        """
        # Get Hybrid Retriever
        retriever = await self.get_hybrid_retriever()
        
        # Reranking
        compression_retriever = ContextualCompressionRetriever(
            base_compressor=self.reranker,
            base_retriever=retriever
        )
        
        # Dynamic Prompt
        if tone_section is None:
            tone_section = """
- **Socratic Questioning:** Ask guiding questions.
- **Validation First:** Validate emotions.
- **Non-Judgmental:** Maintain a warm, neutral stance.
"""
        
        # Inject tone into template
        final_prompt_str = self.base_template.replace("{tone_section}", tone_section)
        prompt = ChatPromptTemplate.from_template(final_prompt_str)

        # Chain
        chain = (
            {"context": compression_retriever, "question": RunnablePassthrough()}
            | prompt
            | self.llm
            | StrOutputParser()
        )
        
        response = await chain.ainvoke(question)
        return response



# Global instance - lazy initialization to avoid startup blocking
_rag_service: Optional[RAGService] = None


def get_rag_service() -> RAGService:
    """
    Get or create the RAGService singleton.
    
    Uses lazy initialization to avoid blocking app startup.
    The MongoDB and OpenAI connections are only established
    when this function is first called.
    """
    global _rag_service
    
    if _rag_service is None:
        try:
            logger.info("🔧 Initializing RAGService (lazy)...")
            _rag_service = RAGService()
            logger.info("✅ RAGService initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize RAGService: {e}")
            raise
    
    return _rag_service


# Backward compatibility alias - will trigger lazy init on first access
class _LazyRAGService:
    """Lazy wrapper for backward compatibility."""
    
    def __getattr__(self, name):
        return getattr(get_rag_service(), name)


rag_service = _LazyRAGService()
