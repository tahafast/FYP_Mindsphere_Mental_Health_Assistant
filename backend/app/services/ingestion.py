import os
from typing import List
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import MongoDBAtlasVectorSearch
from pymongo import MongoClient
from app.core.config import settings

class IngestionService:
    def __init__(self):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
        # Initialize embeddings if API key is present
        if settings.OPENAI_API_KEY:
            self.embeddings = OpenAIEmbeddings(openai_api_key=settings.OPENAI_API_KEY)
        else:
            self.embeddings = None

    async def process_pdf(self, file_path: str) -> dict:
        """
        Process a PDF file: load, split, embed, and store.
        """
        try:
            # 1. Load PDF
            loader = PyPDFLoader(file_path)
            documents = loader.load()
            
            # 2. Split text into chunks
            chunks = self.text_splitter.split_documents(documents)
            
            total_chunks = len(chunks)
            print(f"Processed {len(documents)} pages into {total_chunks} chunks.")

            # 3. Store in Vector DB (Placeholder for now if no DB connection)
            # In a real scenario, we would push 'chunks' to MongoDB Atlas here.
            # if self.embeddings and settings.MONGODB_URI:
            #     client = MongoClient(settings.MONGODB_URI)
            #     collection = client.mindsphere.vectors
            #     MongoDBAtlasVectorSearch.from_documents(
            #         documents=chunks,
            #         embedding=self.embeddings,
            #         collection=collection,
            #         index_name="default"
            #     )
            
            return {
                "status": "success",
                "pages": len(documents),
                "chunks": total_chunks,
                "message": "Document processed successfully"
            }
            
        except Exception as e:
            print(f"Error processing PDF: {str(e)}")
            raise e

ingestion_service = IngestionService()
