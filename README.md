<p align="center">
  <img src="./frontend/public/brain.svg" alt="MindSphere Logo" width="120" height="120" />
</p>

<h1 align="center">🧠 MindSphere</h1>

<p align="center">
  <strong>An Advanced AI Mental Health Companion with Crisis-Aware Safety Architecture</strong>
</p>

<p align="center">
  <em>Bridging the gap between AI accessibility and clinical-grade emotional support</em>
</p>

<p align="center">
  <a href="#features"><img src="https://img.shields.io/badge/Features-First%20Responder%20Protocol-red?style=for-the-badge" alt="First Responder Protocol" /></a>
  <a href="#leas"><img src="https://img.shields.io/badge/Analytics-LEAS%20Score-blue?style=for-the-badge" alt="LEAS Analytics" /></a>
  <a href="#rag-engine"><img src="https://img.shields.io/badge/RAG-Hybrid%20Ensemble-green?style=for-the-badge" alt="Hybrid RAG" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/OpenAI-412991?style=flat-square&logo=openai&logoColor=white" alt="OpenAI" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/HuggingFace-FFD21E?style=flat-square&logo=huggingface&logoColor=black" alt="HuggingFace" />
</p>

---

## 📖 Table of Contents

<details open>
<summary><strong>Click to expand</strong></summary>

- [🌟 Overview](#-overview)
- [🏗️ System Architecture](#️-system-architecture)
- [🔐 Safety Layer & First Responder Protocol](#-safety-layer--first-responder-protocol)
- [📊 Sentiment Analytics & LEAS Score](#-sentiment-analytics--leas-score)
- [🧬 RAG Intelligence Engine](#-rag-intelligence-engine)
- [🌬️ Breathing Exercise Engine](#️-breathing-exercise-engine)
- [🎨 Frontend Architecture](#-frontend-architecture)
- [🔧 Backend API Reference](#-backend-api-reference)
- [📸 Screenshots](#-screenshots)
- [🚀 Getting Started](#-getting-started)
- [⚙️ Configuration](#️-configuration)
- [🧪 Testing](#-testing)
- [📚 Project Structure](#-project-structure)
- [🔮 Extending MindSphere](#-extending-mindsphere)
- [📜 License](#-license)

</details>

---

## 🌟 Overview

**MindSphere** is a full-stack AI mental health companion that combines the empathetic conversational abilities of GPT-4o with clinical-grade safety mechanisms, longitudinal emotional tracking, and evidence-based breathing exercises.

### Core Philosophy

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   "AI should be a bridge to professional care, not a barrier." │
│                                                                 │
│   MindSphere explicitly communicates its limitations:           │
│   ✗ Cannot diagnose mental health conditions                   │
│   ✗ Cannot prescribe medication                                │
│   ✓ Can provide validated coping techniques                    │
│   ✓ Can bridge users to emergency services when needed         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### ✨ Key Differentiators

| Feature | Description |
|---------|-------------|
| **🚨 First Responder Protocol** | Semantic crisis detection using Sentence Transformers (not regex-only) triggers immediate safety interventions |
| **📈 LEAS (Longitudinal Emotional Alignment Score)** | Continuous sentiment tracking via RoBERTa with sigmoid smoothing for clinical visualization |
| **🧠 Hybrid RAG Pipeline** | BM25 + Dense Retrieval → Ensemble → FlashRank Reranking → GPT-4o generation |
| **🌬️ Biometric Breathing Engine** | WebAudio-powered guided exercises with accessibility-first design |
| **🎭 Dynamic Persona Switching** | Tone adapts (Directive / Empathetic / Motivational) based on detected emotional state |

---

## 🏗️ System Architecture

```mermaid
flowchart TB
    subgraph Frontend["🖥️ FRONTEND (React + Vite + TypeScript)"]
        direction TB
        subgraph UI["User Interface Components"]
            ChatUI["💬 Chat UI<br/>ChatPage, Sidebar, Messages"]
            Dashboard["📊 Dashboard<br/>LEAS Graph, Overview, Insights"]
            Breathing["🌬️ Breathing Modal<br/>Bubble, HUD, Controls"]
            SafetyUI["🚨 Safety Alert UI<br/>Crisis Overlay, Emergency Contacts"]
        end
        API["📡 API Layer (api.ts)"]
        UI --> API
    end

    subgraph Backend["⚡ FASTAPI BACKEND"]
        direction TB
        subgraph Endpoints["API Endpoints"]
            ChatEndpoint["/chat<br/>Crisis Detection"]
            SessionsEndpoint["/sessions<br/>CRUD + Auto-Title"]
            MoodsEndpoint["/moods<br/>Log/Fetch Mood Data"]
            BreathingEndpoint["/breathing<br/>Start/Stop, Presets"]
        end
        
        subgraph Services["🧠 Service Layer"]
            SafetyGuard["🛡️ SafetyGuard<br/>━━━━━━━━━━━━━<br/>SentenceTransformers<br/>all-MiniLM-L6-v2<br/>Prototype Clustering<br/>(0.72 threshold)"]
            SentimentSvc["📈 SentimentService<br/>━━━━━━━━━━━━━<br/>J-Hartmann RoBERTa<br/>Sigmoid Smoothing<br/>Emotion→LEAS Mapping"]
            RAGService["🤖 RAGService<br/>━━━━━━━━━━━━━<br/>MongoDB Atlas VectorSearch<br/>BM25 + Dense Ensemble<br/>FlashRank Reranker<br/>GPT-4o-mini"]
        end
        
        Endpoints --> Services
    end

    subgraph Database["🗄️ MONGODB ATLAS"]
        direction LR
        Vectors[("📚 vectors<br/>knnVector Index<br/>(cosine similarity)")]
        Sessions[("💾 chat_sessions<br/>session_id, title<br/>user_id")]
        Sentiment[("📊 user_sentiment<br/>_metrics<br/>LEAS scores")]
        MoodLogs[("😊 mood_logs<br/>Manual check-ins")]
    end

    API -->|"HTTP/JSON"| Backend
    Services --> Database
    
    SafetyGuard -->|"Crisis Detected"| SafetyUI
    SentimentSvc -->|"LEAS Score"| Dashboard
    RAGService -->|"GPT Response"| ChatUI

    style Frontend fill:#1a1a2e,stroke:#4ade80,stroke-width:2px
    style Backend fill:#16213e,stroke:#60a5fa,stroke-width:2px
    style Database fill:#0f3460,stroke:#f472b6,stroke-width:2px
    style SafetyGuard fill:#7f1d1d,stroke:#ef4444,stroke-width:2px
    style SentimentSvc fill:#1e3a5f,stroke:#3b82f6,stroke-width:2px
    style RAGService fill:#14532d,stroke:#22c55e,stroke-width:2px
```

### Architecture Overview

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18 + Vite + TypeScript | Modern SPA with real-time chat, LEAS visualization, and breathing exercises |
| **API Layer** | FastAPI (Python 3.10+) | High-performance async API with automatic OpenAPI documentation |
| **Safety Layer** | Sentence Transformers | Semantic crisis detection with 0.72 cosine similarity threshold |
| **Sentiment Engine** | J-Hartmann RoBERTa | 7-emotion classification with confidence-aware LEAS mapping |
| **RAG Pipeline** | LangChain + FlashRank | Hybrid BM25/Dense retrieval with cross-encoder reranking |
| **LLM** | GPT-4o-mini | Empathetic response generation with dynamic persona switching |
| **Database** | MongoDB Atlas | Vector store, session management, and longitudinal analytics |

---

## 🔐 Safety Layer & First Responder Protocol

The Safety Layer is the **highest-priority subsystem** in MindSphere. It intercepts every user message *before* any other processing occurs.

### Hybrid Detection Strategy

```
┌────────────────────────────────────────────────────────────────────┐
│                    SAFETY GUARD DETECTION FLOW                     │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   User Message                                                     │
│        │                                                           │
│        ▼                                                           │
│   ┌─────────────────────────────────────────┐                      │
│   │      STEP 1: REGEX FAST-FAIL            │                      │
│   │                                         │                      │
│   │   Patterns:                             │                      │
│   │   • "heart attack", "cardiac arrest"    │                      │
│   │   • "chest pain|pressure|hurts"         │                      │
│   │   • "can't breathe", "choking"          │                      │
│   │   • "kill myself", "end it all"         │                      │
│   │                                         │                      │
│   │   Match found? ──────────────────────────────► CRISIS RESPONSE │
│   │        │                                │                      │
│   │        │ No match                       │                      │
│   │        ▼                                │                      │
│   └─────────────────────────────────────────┘                      │
│                                                                    │
│   ┌─────────────────────────────────────────┐                      │
│   │      STEP 2: SEMANTIC SIMILARITY        │                      │
│   │                                         │                      │
│   │   Model: all-MiniLM-L6-v2               │                      │
│   │   (384-dim sentence embeddings)         │                      │
│   │                                         │                      │
│   │   Crisis Prototypes:                    │                      │
│   │   ┌───────────────────────────────────┐ │                      │
│   │   │ Cluster 1: Active Immediate Threat│ │                      │
│   │   │  • "I want to die"                │ │                      │
│   │   │  • "I am going to kill myself"    │ │                      │ 
│   │   │  • "I have a plan to end my life" │ │                      │
│   │   ├───────────────────────────────────┤ │                      │
│   │   │ Cluster 2: Passive Ideation       │ │                      │
│   │   │  • "I want to go to sleep..."     │ │                      │
│   │   │  • "I wish I could disappear"     │ │                      │ 
│   │   │  • "I don't want to exist"        │ │                      │
│   │   ├───────────────────────────────────┤ │                      │
│   │   │ Cluster 3: Perceived Burden       │ │                      │ 
│   │   │  • "World better off without me"  │ │                      │
│   │   │  • "I am a burden to everyone"    │ │                      │
│   │   │  • "There is no point going on"   │ │                      │
│   │   └───────────────────────────────────┘ │                      │
│   │                                         │                      │
│   │   Cosine Similarity > 0.72? ─────────────────► CRISIS RESPONSE │
│   │        │                                │                      │
│   │        │ Below threshold                │                      │
│   │        ▼                                │                      │
│   │   PROCEED TO RAG PIPELINE               │                      │
│   └─────────────────────────────────────────┘                      │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Why 0.72 Threshold?

The threshold of **0.72** was carefully calibrated to catch:
- Passive ideation phrases ("I'm tired of being here")
- Semantic variations that regex misses
- While avoiding false positives on general sadness

### First Responder Protocol Response

When crisis is detected, the system returns a structured JSON payload:

```json
{
  "isCrisis": true,
  "crisisType": "medical_emergency",
  "message": "⚠️ MEDICAL ALERT DETECTED",
  "immediate_action": {
    "primary_directive": "Stop everything. Sit down comfortably. Loosen tight clothing.",
    "grounding_technique": "Focus on staying conscious. Breathe slowly: Inhale (4s) ... Hold (4s) ... Exhale (4s).",
    "emergency_contacts": [
      { "name": "Rescue (Ambulance)", "number": "1122", "action": "Call Now" },
      { "name": "Police", "number": "15", "action": "Backup" }
    ]
  },
  "detection_method": "semantic_model"
}
```

### Frontend Crisis Overlay

The frontend renders a **full-screen takeover** with:
- Pulsing medical alert icon
- Large, readable emergency buttons
- Grounding technique instructions
- "I am safe now" dismissal option

### Safety Logging

All crisis events are logged to MongoDB with:
- User ID
- Session ID  
- Timestamp
- Sentiment score (-1.0 for crisis)
- Emotion label ("crisis")
- Input preview (first 100 chars)

---

## 📊 Sentiment Analytics & LEAS Score

### Sentiment Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SENTIMENT ANALYSIS PIPELINE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   User Message                                                              │
│        │                                                                    │
│        ▼                                                                    │
│   ┌────────────────────────────────────────┐                                │
│   │        TEXT PREPROCESSING               │                               │
│   │                                         │                               │
│   │   • Capitalize standalone 'i' → 'I'    │                                │
│   │   • Preserve formatting                 │                               │
│   └────────────────┬────────────────────────┘                               │
│                    │                                                        │
│                    ▼                                                        │
│   ┌────────────────────────────────────────┐                                │
│   │    J-HARTMANN EMOTION ROBERTA          │                                │
│   │                                         │                               │
│   │   Model: j-hartmann/emotion-english-   │                                │
│   │          distilroberta-base            │                                │
│   │                                         │                               │
│   │   Labels: anger | disgust | fear |     │                                │
│   │           joy | neutral | sadness |    │                                │
│   │           surprise                     │                                │
│   │                                         │                               │
│   │   Output: { label, confidence }        │                                │
│   └────────────────┬────────────────────────┘                               │
│                    │                                                        │
│                    ▼                                                        │
│   ┌────────────────────────────────────────┐                                │
│   │       SIGMOID SMOOTHING                 │                               │
│   │                                         │                               │
│   │   Formula: σ(x) = 1 / (1 + e^(-k(x-0.5)))                               │
│   │   Where k = 10 (steepness)             │                                │
│   │                                         │                               │
│   │   Purpose: Prevent extreme jumps in    │                                │
│   │   graph visualization                   │                               │
│   └────────────────┬────────────────────────┘                               │
│                    │                                                        │
│                    ▼                                                        │
│   ┌────────────────────────────────────────┐                                │
│   │    CONFIDENCE-AWARE DYNAMIC MAPPING     │                               │
│   │                                         │                               │
│   │   ┌─────────────────────────────────┐  │                                │
│   │   │ joy (high conf > 0.75)          │  │                                │
│   │   │   → +0.5 to +1.0 (Thriving)     │  │                                │
│   │   ├─────────────────────────────────┤  │                                │
│   │   │ joy (low conf < 0.75)           │  │                                │
│   │   │   → 0.0 to +0.4 (Stable)        │  │                                │
│   │   ├─────────────────────────────────┤  │                                │
│   │   │ neutral                          │  │                               │
│   │   │   → 0.0 (Baseline)              │  │                                │
│   │   ├─────────────────────────────────┤  │                                │
│   │   │ sadness (high conf)             │  │                                │
│   │   │   → -0.3 to -1.0 (Distressed)   │  │                                │
│   │   ├─────────────────────────────────┤  │                                │
│   │   │ anger | fear | disgust          │  │                                │
│   │   │   → -0.4 to -1.0 (High Distress)│  │                                │
│   │   └─────────────────────────────────┘  │                                │
│   │                                         │                               │
│   │   Special: Neutral keyword override    │                                │
│   │   ("just okay" → caps joy at 0.2)     │                                 │
│   └────────────────┬────────────────────────┘                               │
│                    │                                                        │
│                    ▼                                                        │
│            ┌───────────────┐                                                │
│            │  LEAS SCORE   │  Final: -1.0 to +1.0                           │
│            │  (persisted)  │                                                │
│            └───────┬───────┘                                                │
│                    │                                                        │
│                    ▼                                                        │
│           MongoDB Collection                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### LEAS Graph Visualization

The frontend renders an interactive Recharts `LineChart` with:

| Zone | Score Range | Color |
|------|-------------|-------|
| Thriving | +0.5 to +1.0 | Green |
| Stable | +0.1 to +0.5 | Blue |
| Neutral | -0.1 to +0.1 | Gray |
| Anxious | -0.5 to -0.1 | Orange |
| Distressed | -1.0 to -0.5 | Red |

**Clinical Baseline**: A dashed red reference line at **-0.05** indicates the threshold below which clinical attention may be warranted.

---

## 🧬 RAG Intelligence Engine

### Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       RAG INTELLIGENCE PIPELINE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   User Query                                                                │
│        │                                                                    │
│        ▼                                                                    │
│   ┌─────────────────────────────────────────────┐                           │
│   │            HYBRID RETRIEVAL                  │                          │
│   │                                              │                          │
│   │   ┌────────────────┐   ┌────────────────┐   │                           │
│   │   │  BM25 Retriever│   │ Dense Retriever│   │                           │
│   │   │   (Keyword)    │   │   (Semantic)   │   │                           │
│   │   │                │   │                │   │                           │
│   │   │   Weight: 0.3  │   │   Weight: 0.7  │   │                           │
│   │   │                │   │                │   │                           │
│   │   │  rank_bm25     │   │  MongoDB Atlas │   │                           │
│   │   │  in-memory     │   │  VectorSearch  │   │                           │
│   │   │  k=20          │   │  k=20          │   │                           │
│   │   └───────┬────────┘   └───────┬────────┘   │                           │
│   │           │                    │            │                           │
│   │           └──────────┬─────────┘            │                           │
│   │                      │                      │                           │
│   │                      ▼                      │                           │
│   │           ┌────────────────────┐            │                           │
│   │           │ EnsembleRetriever  │            │                           │
│   │           │  (Reciprocal Rank  │            │                           │
│   │           │   Fusion)          │            │                           │
│   │           └─────────┬──────────┘            │                           │
│   │                     │                       │                           │
│   └─────────────────────┼───────────────────────┘                           │
│                         │                                                   │
│                         ▼                                                   │
│   ┌─────────────────────────────────────────────┐                           │
│   │           FLASHRANK RERANKER                 │                          │
│   │                                              │                          │
│   │   Model: ms-marco-MiniLM-L-12-v2            │                           │
│   │                                              │                          │
│   │   Purpose: Cross-encoder scoring for        │                           │
│   │   relevance-based reordering                │                           │
│   │                                              │                          │
│   │   Output: Top contexts sorted by relevance  │                           │
│   └─────────────────────┬───────────────────────┘                           │
│                         │                                                   │
│                         ▼                                                   │
│   ┌─────────────────────────────────────────────┐                           │
│   │         DYNAMIC PROMPT INJECTION             │                          │
│   │                                              │                          │
│   │   Base Template:                             │                          │
│   │   ┌────────────────────────────────────────┐│                           │
│   │   │ ### IDENTITY & LIMITATIONS             ││                           │
│   │   │ You are MindSphere, an advanced AI...  ││                           │
│   │   │                                        ││                           │
│   │   │ ### CRISIS INTERVENTION PROTOCOL       ││                           │
│   │   │ (HIGHEST PRIORITY)                     ││                           │
│   │   │ If user expresses intent of self-harm..││                           │
│   │   │                                        ││                           │
│   │   │ ### CURRENT MODE & TONE                ││                           │
│   │   │ {tone_section} ← Dynamic injection     ││                           │
│   │   │                                        ││                           │
│   │   │ ### RAG CONTEXT USAGE                  ││                           │
│   │   │ Peer Context: {context}                ││                           │
│   │   │                                        ││                           │
│   │   │ User: {question}                       ││                           │
│   │   │ Dr. MindSphere:                        ││                           │
│   │   └────────────────────────────────────────┘│                           │
│   │                                              │                          │
│   │   Tone Sections:                             │                          │
│   │   • DIRECTIVE  → fear/anger detected        │                           │
│   │   • EMPATHETIC → sadness detected           │                           │
│   │   • MOTIVATIONAL → joy/love detected        │                           │
│   │   • DEFAULT → neutral                       │                           │
│   └─────────────────────┬───────────────────────┘                           │
│                         │                                                   │
│                         ▼                                                   │
│   ┌─────────────────────────────────────────────┐                           │
│   │              GPT-4o-mini                     │                          │
│   │                                              │                          │
│   │   Temperature: 0.7                           │                          │
│   │                                              │                          │
│   │   → Empathetic, contextual response         │                           │
│   └─────────────────────────────────────────────┘                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### MongoDB Vector Store Schema

```javascript
// Collection: vectors
{
  "_id": ObjectId,
  "text": "Chunk content from processed document...",
  "embedding": [0.023, -0.156, ...], // 1536 dimensions (text-embedding-3-small)
  "metadata": {
    "source": "reddit_pdf",
    "type": "thread",
    "sentiment_tag": "anxiety",  // auto-tagged during ingestion
    "Header 1": "Chapter Title",
    "Header 2": "Section Title"
  }
}
```

### Atlas Search Index Definition

```json
{
  "name": "default",
  "definition": {
    "mappings": {
      "dynamic": true,
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
```

---

## 🌬️ Breathing Exercise Engine

The Breathing Engine is a **complete frontend subsystem** with its own state machine, timer synchronization, WebAudio synthesis, and accessibility support.

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BREATHING ENGINE ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     BreathingModal.jsx                              │   │
│   │                     (Orchestrator)                                  │   │
│   │                                                                     │   │
│   │   Responsibilities:                                                 │   │
│   │   • Preset selection (4-4-4 Box, 4-7-8, Resonant, Guided Slow)      │   │
│   │   • Duration configuration                                          │   │
│   │   • Audio/Motion toggle persistence (localStorage)                  │   │
│   │   • Backend session start/stop API calls                            │   │
│   │   • Coordinates all child components                                │   │
│   └───────────────────────────┬─────────────────────────────────────────┘   │
│                               │                                             │
│           ┌───────────────────┼───────────────────┐                         │
│           │                   │                   │                         │
│           ▼                   ▼                   ▼                         │
│   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐                 │
│   │BreathingStage │   │     HUD       │   │   Controls    │                 │
│   │               │   │               │   │               │                 │
│   │ • Container   │   │ • Step label  │   │ • Start/Pause │                 │
│   │   overflow    │   │   (Breathe In │   │ • Resume/Stop │                 │
│   │ • Background  │   │    /Hold/Out) │   │ • Reset       │                 │
│   │   gradient    │   │ • Countdown   │   │ • Audio toggle│                 │
│   │               │   │ • Elapsed     │   │ • Motion      │                 │
│   │   ┌───────┐   │   │ • Remaining   │   │   toggle      │                 │
│   │   │Bubble │   │   │ • Cycles      │   │               │                 │
│   │   │       │   │   │               │   │               │                 │
│   │   │ scale │   │   │ Color-coded   │   │ State-aware   │                 │
│   │   │  CSS  │   │   │ labels        │   │ button render │                 │
│   │   │       │   │   │               │   │               │                 │
│   │   └───────┘   │   └───────────────┘   └───────────────┘                 │
│   └───────────────┘                                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### State Machine Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                    BREATHING ENGINE STATE FLOW                     │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│      ┌───────────────────────────────────────────────────────┐     │
│      │                                                       │     │
│      │    ┌────────┐                                         │     │
│      │    │  IDLE  │◄────────────────────────────────────┐   │     │
│      │    └───┬────┘                                     │   │     │
│      │        │ start(countdownSeconds)                  │   │     │
│      │        ▼                                          │   │     │
│      │    ┌────────────┐                                 │   │     │
│      │    │ COUNTDOWN  │ ← 3... 2... 1...                │   │     │
│      │    │            │                                 │   │     │
│      │    │  Effect:   │                                 │   │     │
│      │    │  setInterval(1s) decrements countdown        │   │     │
│      │    └─────┬──────┘                                 │   │     │
│      │          │ countdown === 0                        │   │     │
│      │          ▼                                        │   │     │
│      │    ┌────────────┐     pause()     ┌────────────┐  │   │     │
│      │    │   ACTIVE   │◄───────────────►│  PAUSED    │  │   │     │
│      │    │            │     resume()    │            │  │   │     │
│      │    │  rAF Loop: │                 │  rAF       │  │   │     │
│      │    │  • tick()  │                 │  stopped   │  │   │     │
│      │    │  • 60fps   │                 │            │  │   │     │
│      │    └─────┬──────┘                 └─────┬──────┘  │   │     │
│      │          │                              │         │   │     │
│      │          │ sessionDuration reached      │ stop()  │   │     │
│      │          │ OR stop()                    │         │   │     │
│      │          ▼                              │         │   │     │
│      │    ┌────────────┐◄─────────────────────┘          │   │     │
│      │    │ COMPLETED  │                                 │   │     │
│      │    │            │                                 │   │     │
│      │    │  Display:  │                                 │   │     │
│      │    │  "X cycles │                                 │   │     │
│      │    │   in Y:ZZ" │                                 │   │     │
│      │    └─────┬──────┘                                 │   │     │
│      │          │ reset()                                │   │     │
│      │          └─────────────────────────────────────── ┘   │     │
│      │                                                       │     │
│      └───────────────────────────────────────────────────────┘     │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### useBreathingEngine Hook

The core hook (`useBreathingEngine.js`) manages:

| State | Type | Description |
|-------|------|-------------|
| `status` | `'idle' \| 'countdown' \| 'active' \| 'paused' \| 'completed'` | Current engine state |
| `countdown` | `number` | Pre-start countdown (default: 3) |
| `stepIndex` | `number` | Current index in step array |
| `stepElapsed` | `number` | Seconds elapsed in current step |
| `scale` | `number` | Bubble scale (0.7 to 2.5) |
| `cycleCount` | `number` | Completed breathing cycles |

**Animation Loop**: Uses `requestAnimationFrame` for 60fps updates with delta-time compensation and easing (`easeInOutQuad`).

### WebAudio Engine

`breathingAudio.js` creates a synthesized ambient soundscape:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    WEBAUDIO SIGNAL GRAPH                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────┐  │
│   │ Oscillator │───►│  LowPass   │───►│  GainNode  │───►│ Master │  │
│   │   (sine)   │    │  Filter    │    │  (step)    │    │  Gain  │  │
│   └────────────┘    └────────────┘    └────────────┘    └───┬────┘  │
│                                                             │       │
│   Step-specific parameters:                                 │       │
│                                                             ▼       │
│   INHALE: freq 80→200Hz, filter 400→1000Hz, gain 0.02→0.1           │
│   HOLD:   freq 100Hz, filter 500Hz, gain 0.03→0.05  AudioDestination|
│   EXHALE: freq 180→60Hz, filter 800→300Hz, gain 0.08→0.01           │
│                                                                     │
│   Accessibility: reduceMotion = simple 440Hz chime                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Accessibility Features

| Feature | Implementation |
|---------|----------------|
| **Reduced Motion** | `prefers-reduced-motion` media query detection |
| **Focus Management** | `focus-visible` outline for keyboard navigation |
| **Screen Reader** | `role="status"` and `aria-live="polite"` on HUD |
| **High Contrast** | `prefers-contrast: high` font weight adjustments |
| **Tabular Numbers** | `font-variant-numeric: tabular-nums` for timer stability |

---

## 🎨 Frontend Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | React 18 + Vite |
| **Language** | TypeScript |
| **Styling** | TailwindCSS + shadcn/ui |
| **State** | React Query (TanStack Query) |
| **Routing** | React Router v6 |
| **Charts** | Recharts |
| **Animations** | CSS + requestAnimationFrame |
| **Audio** | WebAudio API |
| **Icons** | Lucide React |

### Page Structure

```
src/
├── pages/
│   ├── Chat.tsx              # Main AI chat interface
│   ├── Overview.tsx          # Dashboard home (LEAS graph, insights)
│   ├── Personalization.tsx   # User settings
│   ├── Recommendations.tsx   # AI-suggested resources
│   ├── SafetyLogs.tsx        # Crisis intervention audit log
│   └── BreathingLibrary.tsx  # Breathing exercise launcher
├── components/
│   ├── breathing/
│   │   ├── BreathingModal.jsx
│   │   ├── BreathingStage.jsx
│   │   ├── Bubble.jsx
│   │   ├── HUD.jsx
│   │   ├── Controls.jsx
│   │   └── index.js
│   ├── ChatMessage.tsx
│   ├── ChatSidebar.tsx
│   ├── MoodTrendChart.tsx
│   ├── HeroGreeting.tsx
│   ├── TopNav.tsx
│   └── ui/                   # shadcn/ui primitives
├── hooks/
│   ├── useBreathingEngine.js
│   ├── use-mobile.tsx
│   └── use-toast.ts
├── utils/
│   └── audio/
│       └── breathingAudio.js
├── lib/
│   ├── api.ts                # Backend API client
│   └── utils.ts              # cn() helper
└── styles/
    └── breathing.css
```

### Key Components

#### `Chat.tsx`
- Session management with auto-initialization
- Sidebar toggle with content-shift animation
- Crisis overlay rendering
- Message history with auto-scroll

#### `MoodTrendChart.tsx`
- Recharts LineChart with clinical zones
- Reference area color-coding
- Conditional dot coloring (red below baseline)
- Responsive container

#### `ChatSidebar.tsx`
- Collapsible rail pattern
- Query-based session fetching
- Delete mutation with optimistic updates
- Mobile sheet drawer

---

## 🔧 Backend API Reference

### Base URL

```
http://localhost:8000/api/v1
```

### Endpoints

<details>
<summary><strong>💬 Chat</strong></summary>

#### `POST /chat`

Process a user message through the safety/RAG pipeline.

**Request:**
```json
{
  "user_id": "user123",
  "session_id": "abc-123-def",
  "message": "I've been feeling anxious lately"
}
```

**Response:**
```json
{
  "response": "I hear that you've been feeling anxious...",
  "sentiment_score": -0.35,
  "sentiment_label": "fear",
  "crisis_detected": false
}
```

**Crisis Response:**
```json
{
  "response": "{\"isCrisis\": true, ...}",
  "sentiment_score": -1.0,
  "sentiment_label": "crisis",
  "crisis_detected": true
}
```

</details>

<details>
<summary><strong>📊 Sessions</strong></summary>

#### `POST /sessions?user_id={user_id}`
Create a new chat session.

#### `GET /sessions?user_id={user_id}`
List all active sessions.

#### `DELETE /sessions/{session_id}`
Soft-delete a session.

#### `GET /sessions/{session_id}/messages`
Get chat history for a session.

#### `POST /sessions/{session_id}/title`
Auto-generate title from first message.

</details>

<details>
<summary><strong>😊 Moods</strong></summary>

#### `POST /moods`
Log a manual mood check-in.

```json
{
  "user_id": "user123",
  "mood": "happy"  // "sad" | "neutral" | "happy"
}
```

#### `GET /moods/latest?user_id={user_id}`
Get today's most recent mood.

</details>

<details>
<summary><strong>📈 User Analytics</strong></summary>

#### `GET /user/mood-history?user_id={user_id}`
Get all sentiment logs for LEAS graph.

#### `GET /user/insights?user_id={user_id}`
Get weekly summary with interpretation.

</details>

<details>
<summary><strong>🌬️ Breathing</strong></summary>

#### `GET /breathing/techniques`
Get all built-in breathing techniques.

#### `GET /breathing/presets?user_id={user_id}`
Get user + built-in presets.

#### `POST /breathing/session/start`
Start a breathing session.

#### `POST /breathing/session/stop`
Save completed session.

#### `POST /breathing/presets`
Create custom preset.

#### `DELETE /breathing/presets/{preset_id}`
Delete user preset.

</details>

<details>
<summary><strong>📚 Knowledge</strong></summary>

#### `POST /knowledge/upload`
Upload and process a PDF for RAG.

#### `GET /knowledge/stats`
Get vector store statistics.

</details>

---

## 📸 Screenshots

### 💬 Chat Interface
*Main AI conversation interface with crisis-aware messaging and dynamic sidebar*

![Chat Interface](./screenshots/chatinterface.png)

---

### 📊 Dashboard & LEAS Graph
*Longitudinal Emotional Alignment Score visualization with clinical zones*

![Dashboard](./screenshots/dashboard.png)

![Sentiment Graph](./screenshots/sentiment_graph.png)

---

### 🌬️ Breathing Exercise
*Interactive guided breathing with WebAudio synthesis and real-time HUD*

![Breathing Exercise](./screenshots/breathing%20exercise.png)

![Breathing Complete](./screenshots/breathing%20complete.png)

![Breathing HUD Layout](./screenshots/breathingHUDlayout.png)

---

### 🚨 Crisis Protocol
*Full-screen First Responder Protocol overlay with emergency contacts*

![Crisis Protocol](./screenshots/crisisprotocol.png)

---

### 🛡️ Safety Logs
*Audit trail of safety interventions and crisis detections*

![Safety Logs](./screenshots/safetylogs.png)

---

### 💡 Recommendations
*AI-powered resource suggestions based on user interactions*

![Recommendations](./screenshots/recommendations.png)

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | ≥ 18.x |
| Python | ≥ 3.10 |
| MongoDB Atlas | Free tier or higher |
| OpenAI API Key | GPT-4o access |

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-username/mindsphere.git
cd mindsphere

# 2. Configure environment variables
cp .env.example .env
# Edit .env with your API keys (see Configuration section)

# 3. Backend setup
cd backend
python -m venv venv
.\venv\Scripts\Activate  # Windows
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt

# 4. Frontend setup
cd ../frontend
npm install

# 5. Start both services (Windows)
cd ..
start.bat

# 5. Start both services (Linux/Mac)
# Terminal 1:
cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# Terminal 2:
cd frontend && npm run dev
```

### Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:8080 |
| Backend API | http://localhost:8000 |
| API Documentation | http://localhost:8000/docs |

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-api-key-here

# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority

# Database Configuration
MONGODB_DB_NAME=mindsphere
```

Create a `.env` file in the `backend/` directory:

```env
OPENAI_API_KEY=sk-your-api-key-here
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=mindsphere
```

### MongoDB Atlas Setup

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a database named `mindsphere`
3. Create the following collections:
   - `vectors`
   - `chat_sessions`
   - `chat_histories`
   - `user_sentiment_metrics`
   - `mood_logs`
   - `breathing_sessions`
   - `breathing_presets`
4. Create an Atlas Search Index on `vectors`:

```json
{
  "name": "default",
  "definition": {
    "mappings": {
      "dynamic": true,
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
```

---

## 🧪 Testing

### Frontend Tests

```bash
cd frontend
npm run test
```

#### Breathing Engine Tests (`useBreathingEngine.test.js`)

Tests cover:
- State initialization
- Countdown → Active transitions
- Step cycling and wrap-around
- Pause/Resume functionality
- Scale calculation with easing
- Cleanup on unmount

### Backend Tests

```bash
cd backend
python -m pytest
```

Test files:
- `test_enhancements.py` - Service integration tests
- `test_mongo_connection.py` - Database connectivity
- `test_sentiment_model.py` - RoBERTa model validation

---

## 📚 Project Structure

```
mindsphere/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       └── endpoints/
│   │   │           ├── breathing.py
│   │   │           ├── chat.py
│   │   │           ├── knowledge.py
│   │   │           ├── moods.py
│   │   │           ├── sessions.py
│   │   │           └── user.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── prompts.py
│   │   ├── models/
│   │   │   ├── breathing.py
│   │   │   ├── chat.py
│   │   │   ├── mood_log.py
│   │   │   └── session.py
│   │   └── services/
│   │       ├── ingestion.py
│   │       ├── ingest_hf.py
│   │       ├── rag.py
│   │       ├── safety_guard.py
│   │       └── sentiment.py
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── breathing/
│   │   │   └── ui/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── styles/
│   │   └── utils/
│   ├── index.html
│   └── package.json
├── .env.example
├── start.bat
└── README.md
```

---

## 🔮 Extending MindSphere

### Adding a New Breathing Technique

1. **Backend** (`backend/app/api/v1/endpoints/breathing.py`):

```python
BUILTIN_TECHNIQUES["my-technique"] = {
    "id": "my-technique",
    "name": "My Custom Technique",
    "description": "Description here",
    "use_case": "Use case",
    "steps": [
        {"type": "inhale", "duration": 5},
        {"type": "hold", "duration": 2},
        {"type": "exhale", "duration": 7},
    ]
}
```

2. **Frontend** (`frontend/src/components/breathing/BreathingModal.jsx`):

```javascript
PRESET_CONFIGS['my-technique'] = {
    steps: [
        { type: 'inhale', duration: 5 },
        { type: 'hold', duration: 2 },
        { type: 'exhale', duration: 7 },
    ],
};
```

### Adding a New Crisis Prototype Cluster

In `backend/app/services/safety_guard.py`:

```python
self.crisis_prototypes.extend([
    # Cluster 4: Substance Abuse Crisis
    "I can't stop using",
    "I need to get high right now",
])

self.cluster_labels.extend([
    "Substance Abuse Crisis",
    "Substance Abuse Crisis",
])
```

### Customizing the LLM Prompt

Edit `backend/app/core/prompts.py` to add new persona modes or modify existing ones.

### Adding New Sentiment Mappings

In `backend/app/services/sentiment.py`, modify the `analyze_emotion` method to handle new emotion labels or scoring rules.

---

## 📜 License

This project is developed as a Final Year Project (FYP) for academic purposes.

---

<p align="center">
  <strong>Built with 💚 for mental health awareness</strong>
</p>

<p align="center">
  <em>MindSphere is not a replacement for professional mental health care.<br/>
  If you are in crisis, please contact your local emergency services or crisis hotline.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Made%20with-FastAPI-009688?style=flat-square&logo=fastapi" />
  <img src="https://img.shields.io/badge/Made%20with-React-61DAFB?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/Made%20with-Love-ff69b4?style=flat-square" />
</p>
