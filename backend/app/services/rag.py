from typing import List, Dict, Any
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_mongodb import MongoDBAtlasVectorSearch
from langchain_community.retrievers import BM25Retriever
from langchain.retrievers import EnsembleRetriever, ContextualCompressionRetriever
from langchain.retrievers.document_compressors import FlashrankRerank
from langchain.prompts import ChatPromptTemplate
from langchain.schema.output_parser import StrOutputParser
from langchain.schema.runnable import RunnablePassthrough
from pymongo import MongoClient
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class RAGService:
    def __init__(self):
        self.embeddings = OpenAIEmbeddings(openai_api_key=settings.OPENAI_API_KEY, model="text-embedding-3-small")
        self.client = MongoClient(settings.MONGODB_URI)
        self.collection = self.client[settings.MONGODB_DB_NAME]["vectors"]
        
        # 1. Vector Retriever
        self.vector_store = MongoDBAtlasVectorSearch(
            collection=self.collection,
            embedding=self.embeddings,
            index_name="default",
            relevance_score_fn="cosine",
        )
        self.vector_retriever = self.vector_store.as_retriever(search_kwargs={"k": 20})

        # 2. BM25 Retriever (Keyword)
        # Note: BM25 usually needs to be initialized with documents. 
        # For a dynamic system, we might need to rebuild it or use a search engine that supports it (like Atlas Search with Lucene).
        # However, for this specific task with a PDF, we can load the docs into memory or use Atlas's hybrid if configured.
        # Since the user asked for "EnsembleRetriever" with "BM25Retriever", we assume in-memory for the loaded PDF or similar.
        # BUT, if we are using MongoDB, we should ideally use Atlas Search's hybrid capabilities.
        # Given the constraint "Implement Hybrid Search (EnsembleRetriever)", I will try to fetch all docs for BM25 or assume a smaller scale.
        # For a 350+ page PDF, fetching all chunks (maybe 1000-2000) into memory for BM25 is feasible.
        # Let's try to load them on init or lazy load. For now, I'll initialize it as empty and provide a method to refresh.
        self.bm25_retriever = None 
        
        # 3. Reranker
        self.reranker = FlashrankRerank(model="ms-marco-MiniLM-L-12-v2") # Lightweight model
        
        # 4. LLM
        self.llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7, openai_api_key=settings.OPENAI_API_KEY)

        # 5. Prompt
        self.prompt = ChatPromptTemplate.from_template("""
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

### THERAPEUTIC TONE (CBT-ALIGNED)
- **Socratic Questioning:** Instead of giving advice ("You should exercise"), ask guiding questions ("What activities have helped you feel calm in the past?").
- **Validation First:** Always validate the user's emotion before offering a perspective. "It makes sense that you feel overwhelmed given..."
- **Non-Judgmental:** Maintain a warm, consistent, and neutral stance.

### RAG CONTEXT USAGE
- You will be provided with snippets from Reddit threads (Context).
- Use these to **normalize** the user's experience ("Others who have faced this situation found that...").
- DO NOT explicitly mention "I found a Reddit thread that says...". Instead, weave it in naturally as general peer wisdom.

Peer Context:
{context}

User: {question}

Dr. MindSphere:
        """)

    async def initialize_bm25(self):
        """
        Fetch all documents from MongoDB to initialize BM25.
        This is a startup cost.
        """
        try:
            # Fetch all docs (projection to save bandwidth)
            cursor = self.collection.find({}, {"text": 1, "metadata": 1}) # Assuming 'text' field exists, or 'page_content'
            docs = []
            # We need to reconstruct Document objects
            from langchain.schema import Document
            for doc in cursor:
                # MongoDBAtlasVectorSearch stores text in 'text' or 'page_content' depending on config. 
                # Default is usually 'text'.
                content = doc.get("text") or doc.get("page_content")
                if content:
                    docs.append(Document(page_content=content, metadata=doc.get("metadata", {})))
            
            if docs:
                self.bm25_retriever = BM25Retriever.from_documents(docs)
                self.bm25_retriever.k = 20
                logger.info(f"BM25 initialized with {len(docs)} documents.")
            else:
                logger.warning("No documents found for BM25 initialization.")
        except Exception as e:
            logger.error(f"Error initializing BM25: {e}")

    async def get_hybrid_retriever(self):
        if not self.bm25_retriever:
            await self.initialize_bm25()
            if not self.bm25_retriever:
                return self.vector_retriever # Fallback

        ensemble_retriever = EnsembleRetriever(
            retrievers=[self.bm25_retriever, self.vector_retriever],
            weights=[0.3, 0.7]
        )
        return ensemble_retriever

    async def generate_response(self, question: str):
        # 1. Get Hybrid Retriever
        retriever = await self.get_hybrid_retriever()
        
        # 2. Reranking
        compression_retriever = ContextualCompressionRetriever(
            base_compressor=self.reranker,
            base_retriever=retriever
        )
        
        # 3. Chain
        chain = (
            {"context": compression_retriever, "question": RunnablePassthrough()}
            | self.prompt
            | self.llm
            | StrOutputParser()
        )
        
        response = await chain.ainvoke(question)
        return response

rag_service = RAGService()
