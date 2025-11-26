import asyncio
import os
import sys

# Add backend to path so we can import app modules
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.services.ingestion import ingestion_service

async def main():
    file_path = os.path.join("data", "reddit dataset.pdf")
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    print(f"Starting ingestion for {file_path}...")
    try:
        result = await ingestion_service.process_pdf(file_path)
        print("Ingestion Result:", result)
    except Exception as e:
        print(f"Ingestion failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
