import os
import sys
from datasets import load_dataset
from langchain_openai import OpenAIEmbeddings
from langchain_mongodb import MongoDBAtlasVectorSearch
from pymongo import MongoClient
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
# Try loading from backend/.env if not found in current dir
if not load_dotenv():
    load_dotenv("backend/.env")

# Configuration
MONGO_URI = os.getenv("MONGODB_URI")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
DB_NAME = os.getenv("MONGODB_DB_NAME", "mindsphere")
COLLECTION_NAME = "vectors"
INDEX_NAME = "default"

def pre_flight_check():
    """Verifies essential configuration before proceeding."""
    if not MONGO_URI:
        logger.error("❌ MONGODB_URI is missing in environment variables.")
        sys.exit(1)
    if not OPENAI_API_KEY:
        logger.error("❌ OPENAI_API_KEY is missing in environment variables.")
        sys.exit(1)
    
    logger.warning("⚠️  IMPORTANT: Ensure your MongoDB Atlas Search Index is configured with 'type': 'knnVector' for the 'embedding' field.")
    logger.info("✅ Pre-flight checks passed.")

def get_vector_store():
    client = MongoClient(MONGO_URI)
    collection = client[DB_NAME][COLLECTION_NAME]
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small", openai_api_key=OPENAI_API_KEY)
    return MongoDBAtlasVectorSearch(
        collection=collection,
        embedding=embeddings,
        index_name=INDEX_NAME
    ), collection

def purge_existing_data(collection):
    """Deletes existing documents from the target sources to ensure idempotency."""
    target_sources = ['counsel_chat', 'amod_counseling', 'cbt_bench']
    logger.info(f"🧹 Purging existing data for sources: {target_sources}...")
    result = collection.delete_many({'metadata.source': {'$in': target_sources}})
    logger.info(f"✅ Deleted {result.deleted_count} existing documents.")

def ingest_counsel_chat(vector_store):
    """Ingests nbertagnolli/counsel-chat (CSV-like structure)"""
    logger.info("🔹 Ingesting Counsel Chat...")
    try:
        dataset = load_dataset("nbertagnolli/counsel-chat", split="train")
        
        texts = []
        metadatas = []
        
        for row in dataset:
            # Construct a Q&A pair
            text = f"User Question: {row['questionTitle']}\n{row['questionText']}\n\nTherapist Response: {row['answerText']}"
            texts.append(text)
            metadatas.append({
                "source": "counsel_chat",
                "type": "professional_advice",
                "topic": row.get('topics', 'general') # Dataset uses 'topics'
            })
            
        # Batch ingest
        batch_size = 100
        total = len(texts)
        for i in range(0, total, batch_size):
            vector_store.add_texts(
                texts=texts[i:i+batch_size],
                metadatas=metadatas[i:i+batch_size]
            )
            logger.info(f"   Processed {min(i + batch_size, total)}/{total}")
        logger.info("✅ Counsel Chat ingested.")
            
    except Exception as e:
        logger.error(f"❌ Error ingesting Counsel Chat: {e}")

def ingest_amod_dataset(vector_store):
    """Ingests Amod/mental_health_counseling_conversations (JSON-like)"""
    logger.info("🔹 Ingesting Amod Counseling Conversations...")
    try:
        dataset = load_dataset("Amod/mental_health_counseling_conversations", split="train")
        
        texts = []
        metadatas = []
        
        for row in dataset:
            text = f"Context: {row['Context']}\nResponse: {row['Response']}"
            texts.append(text)
            metadatas.append({
                "source": "amod_counseling",
                "type": "dialogue",
                "topic": "general_counseling"
            })

        batch_size = 100
        total = len(texts)
        for i in range(0, total, batch_size):
            vector_store.add_texts(
                texts=texts[i:i+batch_size],
                metadatas=metadatas[i:i+batch_size]
            )
            logger.info(f"   Processed {min(i + batch_size, total)}/{total}")
        logger.info("✅ Amod Counseling ingested.")

    except Exception as e:
        logger.error(f"❌ Error ingesting Amod dataset: {e}")

def ingest_cbt_bench(vector_store):
    """Ingests Psychotherapy-LLM/CBT-Bench"""
    logger.info("🔹 Ingesting CBT Bench...")
    try:
        # Try specific config 'dp_ref_exe_1' (Deliberate Practice) found in search
        config_name = "dp_ref_exe_1" 
        try:
            dataset = load_dataset("Psychotherapy-LLM/CBT-Bench", config_name, split="train")
            logger.info(f"   Loaded config: {config_name}")
        except Exception:
            logger.warning(f"   Config '{config_name}' failed, trying 'qa_seed'...")
            try:
                dataset = load_dataset("Psychotherapy-LLM/CBT-Bench", "qa_seed", split="train")
                logger.info("   Loaded config: qa_seed")
            except Exception as e:
                logger.error(f"❌ Could not load CBT-Bench with any config. Skipping. Error: {e}")
                return

        texts = []
        metadatas = []
        
        for row in dataset:
            # Adjust fields based on actual dataset structure inspection
            # CBT-Bench usually has 'history' or 'dialogue'
            history = row.get('history', [])
            if not history: continue
            
            # Flatten dialogue for context
            dialogue_text = "\n".join([f"{turn['role']}: {turn['content']}" for turn in history])
            
            texts.append(dialogue_text)
            metadatas.append({
                "source": "cbt_bench",
                "type": "cbt_session",
                "topic": "cognitive_behavioral_therapy"
            })
            
        batch_size = 50
        total = len(texts)
        if total == 0:
            logger.warning("   No valid data found in CBT Bench dataset.")
            return

        for i in range(0, total, batch_size):
            vector_store.add_texts(texts=texts[i:i+batch_size], metadatas=metadatas[i:i+batch_size])
            logger.info(f"   Processed {min(i + batch_size, total)}/{total}")
        logger.info("✅ CBT Bench ingested.")
            
    except Exception as e:
        logger.error(f"⚠️ Skipping CBT Bench due to error: {e}")

if __name__ == "__main__":
    pre_flight_check()
    
    logger.info("🚀 Starting ingestion process...")
    vector_store, collection = get_vector_store()
    
    # Idempotency check
    purge_existing_data(collection)
    
    ingest_counsel_chat(vector_store)
    ingest_amod_dataset(vector_store)
    ingest_cbt_bench(vector_store)
    
    logger.info("✅ Professional Datasets Ingested Successfully")
