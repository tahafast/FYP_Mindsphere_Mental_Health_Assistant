# MindSphere: Mental Health Assistant Leveraging Generative AI

![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=for-the-badge&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-0.1-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white)

## Abstract

MindSphere is an advanced mental health assistant designed to provide empathetic, 24/7 support using Generative AI. It combines a **First Responder Protocol** for immediate crisis intervention with a **Longitudinal Emotional Alignment Score (LEAS)** to track user well-being over time. The system utilizes a **Hybrid RAG architecture with Reranking** to deliver clinically grounded and context-aware responses, bridging the gap between automated support and professional care.

---

## Key Features

### 🛡️ First Responder Protocol
Located in `backend/app/services/safety_guard.py`, this critical safety feature uses optimized Regex patterns to instantly detect medical emergencies and self-harm intent. It bypasses the LLM to deliver a deterministic, structured crisis response, prioritizing user safety above all else.

### 📈 Longitudinal Emotional Alignment Score (LEAS)
Found in `backend/app/services/sentiment.py` and visualized in `frontend/src/components/MoodTrendChart.tsx`, LEAS is a proprietary metric derived from a distilled BERT emotion classification model. It quantifies emotional states on a scale (from -1.0 Distressed to +1.0 Thriving) and plots them against a clinical baseline to visualize progress over time.

### 🧠 Hybrid RAG with Reranking
Implemented in `backend/app/services/rag.py`, the retrieval engine combines **MongoDB Atlas Vector Search** (semantic) with **BM25** (keyword) using an `EnsembleRetriever`. Results are then refined by a **FlashRank** reranker to ensure the Large Language Model (LLM) receives the most relevant professional counseling context.

---

## System Architecture

```mermaid
flowchart TD
    User([User]) <--> UI[React Frontend\n(Vite + Shadcn/UI)]
    UI <--> API[FastAPI Backend]
    
    subgraph "Safety Layer"
        API --> Guard{Safety Guard\n(Regex Patterns)}
        Guard -- "Crisis Detected" --> Crisis[Crisis Response\n(Immediate Action)]
        Guard -- "Safe" --> RAG[RAG Orchestrator]
    end
    
    subgraph "Intelligence Engine"
        RAG --> VectorDB[(MongoDB Atlas\nVector Store)]
        RAG --> BM25[BM25 Retriever]
        VectorDB & BM25 --> Ensemble[Ensemble Retriever]
        Ensemble --> Rerank[FlashRank Reranker]
        Rerank --> LLM[OpenAI GPT-4o]
    end
    
    subgraph "Analytics"
        API --> Sentiment[Sentiment Engine\n(DistilBERT)]
        Sentiment --> LEAS[LEAS Score]
        LEAS --> DB[(MongoDB\nLogs)]
    end
    
    Crisis --> UI
    LLM --> UI
```

---

## Installation & Setup

### Prerequisites
- **Node.js** (v18+)
- **Python** (v3.10+)
- **MongoDB Atlas** Cluster (Vector Search enabled)

### 1. Backend Setup
Navigate to the backend directory and install dependencies:

```bash
cd backend
python -m venv venv
# Windows
.\venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:
```env
OPENAI_API_KEY=your_key_here
MONGODB_URI=your_mongodb_atlas_uri
MONGODB_DB_NAME=mindsphere
```

### 2. Frontend Setup
Navigate to the frontend directory and install dependencies:

```bash
cd frontend
npm install
```

Start the development server:
```bash
npm run dev
```

### 3. Data Ingestion
Run the ingestion script to populate the Vector Database with Hugging Face datasets:

```bash
# From the backend directory
python -m app.services.ingest_hf
```

---

## User Interface

### 📊 Dashboard & Analytics
*Real-time tracking of emotional trends using the LEAS metric.*

![Dashboard UI Placeholder](https://placehold.co/800x450?text=Dashboard+UI+Screenshot)

### 💬 AI Chat Interface
*Empathetic, context-aware conversations powered by Hybrid RAG.*

![Chat UI Placeholder](https://placehold.co/800x450?text=Chat+UI+Screenshot)

---

## Tech Stack

**Frontend:**
- React, Vite, TypeScript
- TailwindCSS, Shadcn/UI
- Recharts (Data Visualization)

**Backend:**
- FastAPI, Uvicorn
- LangChain, OpenAI
- PyMongo, Motor
- Transformers, Torch

**AI & Data:**
- MongoDB Atlas Vector Search
- FlashRank (Reranking)
- DistilBERT (Sentiment Analysis)
