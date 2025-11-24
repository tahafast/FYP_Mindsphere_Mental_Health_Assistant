from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.ingestion import ingestion_service
from datetime import datetime

router = APIRouter()

@router.post("/upload")
async def upload_knowledge(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    try:
        # Save file temporarily
        temp_file_path = f"temp_{file.filename}"
        with open(temp_file_path, "wb") as f:
            content = await file.read()
            f.write(content)
            
        # Process file
        result = await ingestion_service.process_pdf(temp_file_path)
        
        # Clean up
        import os
        os.remove(temp_file_path)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_stats():
    # Mock stats for now
    return {
        "totalDocuments": 5,
        "lastUploaded": datetime.now().strftime("%Y-%m-%d"),
        "vectorIndexStatus": "healthy"
    }
