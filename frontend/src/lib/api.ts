// API Layer - Connected to Backend
const API_BASE_URL = 'http://localhost:49674/api/v1';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isCrisis?: boolean;
}

export interface ChatSession {
  id: string;
  name: string;
  timestamp: Date;
}

export interface ChatRequest {
  user_id: string;
  session_id: string;
  message: string;
}

export interface ChatResponse {
  response: string;
  sentiment_score: number;
  sentiment_label: string;
  crisis_detected: boolean;
}

export interface SentimentLog {
  user_id: string;
  timestamp: string; // ISO string from backend
  sentiment_score: number;
  emotion_label: string;
  input_preview?: string;
}

export interface UploadStatus {
  status: 'idle' | 'parsing' | 'chunking' | 'uploading' | 'complete' | 'error';
  message: string;
  progress?: number;
}

export interface KnowledgeStats {
  totalDocuments: number;
  lastUploaded: string;
  vectorIndexStatus: 'healthy' | 'indexing' | 'error';
}

// Helper for API calls
const fetchApi = async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API call failed: ${response.statusText}`);
  }
  return response.json();
};

// Chat API
export const sendMessage = async (message: string, userId: string, sessionId: string): Promise<ChatResponse> => {
  return fetchApi<ChatResponse>('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, session_id: sessionId, message }),
  });
};

// Mood History API
export const getMoodHistory = async (userId: string): Promise<SentimentLog[]> => {
  return fetchApi<SentimentLog[]>(`/user/mood-history?user_id=${userId}`);
};

// Knowledge Upload API
export const uploadKnowledge = async (
  file: File,
  onProgress: (status: UploadStatus) => void
): Promise<void> => {
  const formData = new FormData();
  formData.append('file', file);

  onProgress({ status: 'uploading', message: 'Starting upload...', progress: 0 });

  try {
    onProgress({ status: 'parsing', message: 'Uploading and processing on server...', progress: 30 });

    const response = await fetch(`${API_BASE_URL}/knowledge/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Upload failed');

    onProgress({ status: 'complete', message: 'Document processed successfully!', progress: 100 });
  } catch (error) {
    onProgress({ status: 'error', message: 'Failed to upload document', progress: 0 });
    throw error;
  }
};

// Knowledge Stats API
export const getKnowledgeStats = async (): Promise<KnowledgeStats> => {
  return fetchApi<KnowledgeStats>('/knowledge/stats');
};

// Chat Session APIs
export const getChatSessions = async (userId: string): Promise<ChatSession[]> => {
  // Map backend fields to frontend interface
  const sessions = await fetchApi<any[]>(`/sessions?user_id=${userId}`);
  return sessions.map(s => ({
    id: s.session_id,
    name: s.title,
    timestamp: new Date(s.created_at)
  }));
};

export const createChatSession = async (userId: string): Promise<ChatSession> => {
  const session = await fetchApi<any>(`/sessions?user_id=${userId}`, {
    method: 'POST'
  });
  return {
    id: session.session_id,
    name: session.title,
    timestamp: new Date(session.created_at)
  };
};

export const deleteSession = async (sessionId: string): Promise<void> => {
  await fetchApi(`/sessions/${sessionId}`, {
    method: 'DELETE'
  });
};

export const getChatMessages = async (sessionId: string): Promise<Message[]> => {
  const messages = await fetchApi<any[]>(`/sessions/${sessionId}/messages`);
  return messages.map(m => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: new Date(m.timestamp)
  }));
};

