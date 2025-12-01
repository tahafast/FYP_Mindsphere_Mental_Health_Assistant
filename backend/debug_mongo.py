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
if not uri:
    print("Error: MONGODB_URI not found in environment variables.")
    sys.exit(1)

print(f"Attempting to connect to MongoDB Atlas...")
print(f"URI (masked): {uri.split('@')[-1] if '@' in uri else 'Invalid URI'}")
print(f"Certifi location: {certifi.where()}")

try:
    # The critical fix requested by the user
    client = MongoClient(
        uri,
        tlsCAFile=certifi.where()
    )
    
    # Force a connection verification
    client.admin.command('ping')
    print("Success: MongoDB Connection Established!")
    
except Exception as e:
    print("Connection Failed!")
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
