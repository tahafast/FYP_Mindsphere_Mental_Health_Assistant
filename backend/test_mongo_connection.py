import os
import sys
import certifi
from pymongo import MongoClient
from dotenv import load_dotenv

# Load env
load_dotenv(os.path.join(os.getcwd(), "backend", ".env"))
if not os.getenv("MONGODB_URI"):
    load_dotenv(os.path.join(os.getcwd(), ".env"))

uri = os.getenv("MONGODB_URI")
db_name = os.getenv("MONGODB_DB_NAME", "mindsphere")

print(f"Testing connection to: {db_name}")

try:
    # Try with certifi and OCSP disabled
    client = MongoClient(uri, tlsCAFile=certifi.where(), tlsDisableOCSPEndpointCheck=True)
    # Force a connection verification
    client.admin.command('ping')
    print("✅ MongoDB Connection Successful!")
    
    db = client[db_name]
    collection = db["connection_test"]
    
    # Test Insert
    result = collection.insert_one({"test": "data", "status": "ok"})
    print(f"✅ Inserted document ID: {result.inserted_id}")
    
    # Test Find
    doc = collection.find_one({"_id": result.inserted_id})
    print(f"✅ Retrieved document: {doc}")
    
    # Clean up
    collection.delete_one({"_id": result.inserted_id})
    print("✅ Cleaned up test document.")
    
except Exception as e:
    print(f"❌ Connection Failed: {e}")
    sys.exit(1)
