import os
import pymupdf4llm
from typing import List, Dict, Any
from langchain.text_splitter import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_mongodb import MongoDBAtlasVectorSearch
from pymongo import MongoClient
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

import certifi

class IngestionService:
    def __init__(self):
        self.headers_to_split_on = [
            ("#", "Header 1"),
            ("##", "Header 2"),
            ("###", "Header 3"),
        ]
        self.markdown_splitter = MarkdownHeaderTextSplitter(headers_to_split_on=self.headers_to_split_on)
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=512,
            chunk_overlap=100,
            separators=["\n\n", "\n", ". ", "? ", "! ", " ", ""],
        )
        
        if settings.OPENAI_API_KEY:
            self.embeddings = OpenAIEmbeddings(openai_api_key=settings.OPENAI_API_KEY, model="text-embedding-3-small")
        else:
            self.embeddings = None
            logger.warning("OPENAI_API_KEY not found. Embeddings will not be generated.")

        if settings.MONGODB_URI:
            self.client = MongoClient(settings.MONGODB_URI, tlsCAFile=certifi.where())
            self.collection = self.client[settings.MONGODB_DB_NAME]["knowledge_base"]
        else:
            self.client = None
            self.collection = None
            logger.warning("MONGODB_URI not found. Vector storage disabled.")

    def _get_sentiment_tag(self, text: str) -> str:
        # Simple keyword scan for prototype
        text_lower = text.lower()
        if any(w in text_lower for w in ["anxiety", "worry", "panic", "fear"]):
            return "anxiety"
        elif any(w in text_lower for w in ["depression", "sad", "hopeless", "down"]):
            return "depression"
        elif any(w in text_lower for w in ["hope", "better", "recovery", "help"]):
            return "recovery"
        return "neutral"

    async def process_pdf(self, file_path: str) -> dict:
        """
        Process a PDF file: Convert to Markdown, split, embed, and store.
        """
        try:
            logger.info(f"Starting ingestion for {file_path}")
            
            # 1. Convert PDF to Markdown
            md_text = pymupdf4llm.to_markdown(file_path)
            
            # 2. Structural Splitting (Markdown)
            header_splits = self.markdown_splitter.split_text(md_text)
            
            # 3. Recursive Refinement
            chunks = self.text_splitter.split_documents(header_splits)
            
            # 4. Metadata Injection
            for chunk in chunks:
                chunk.metadata["source"] = "reddit_pdf"
                chunk.metadata["type"] = "thread"
                chunk.metadata["sentiment_tag"] = self._get_sentiment_tag(chunk.page_content)
                # Ensure header metadata is preserved (MarkdownHeaderTextSplitter does this)

            total_chunks = len(chunks)
            logger.info(f"Generated {total_chunks} chunks.")

            # 5. Vector Storage
            if self.embeddings and self.collection is not None:
                MongoDBAtlasVectorSearch.from_documents(
                    documents=chunks,
                    embedding=self.embeddings,
                    collection=self.collection,
                    index_name="default"
                )
                logger.info("Chunks stored in MongoDB Atlas.")
                
                # 6. Log Atlas Search Index Definition
                index_definition = {
                    "name": "default",
                    "definition": {
                        "mappings": {
                            "dynamic": True,
                            "fields": {
                                "embedding": {
                                    "dimensions": 1536,
                                    "similarity": "cosine",
                                    "type": "knnVector"
                                }
                            }
                        }
                    }
                }
                logger.info(f"IMPORTANT: Ensure your Atlas Search Index is configured with this JSON:\n{index_definition}")
            
            return {
                "status": "success",
                "chunks_count": total_chunks,
                "message": "Document processed and stored successfully. Check logs for Atlas Index definition."
            }
            
        except Exception as e:
            logger.error(f"Error processing PDF: {str(e)}")
            raise e

ingestion_service = IngestionService()
