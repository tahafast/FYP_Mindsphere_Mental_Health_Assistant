// API Layer - Connected to Backend
const API_BASE_URL = 'http://localhost:8000/api/v1';

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

export interface ChatResponse {
  message: string;
  isCrisis: boolean;
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
    throw new Error(`API call failed: ${response.statusText}`);
  }
  return response.json();
};

// Chat API
export const sendMessage = async (message: string, history: Message[]): Promise<ChatResponse> => {
  return fetchApi<ChatResponse>('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  });
};

// Knowledge Upload API
export const uploadKnowledge = async (
  file: File,
  onProgress: (status: UploadStatus) => void
): Promise<void> => {
  const formData = new FormData();
  formData.append('file', file);

  // Initial status
  onProgress({ status: 'uploading', message: 'Starting upload...', progress: 0 });

  try {
    // For large files, we might want to implement a more complex progress tracking
    // For now, we'll use a standard fetch which waits for the server to process
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
export const getChatSessions = async (): Promise<ChatSession[]> => {
  // return fetchApi<ChatSession[]>('/sessions');
  // Mocking for now as backend session management might not be ready
  return [
    { id: "1", name: "Current Session", timestamp: new Date() }
  ];
};

export const createChatSession = async (): Promise<ChatSession> => {
  // return fetchApi<ChatSession>('/sessions', { method: 'POST' });
  return {
    id: Date.now().toString(),
    name: "New Conversation",
    timestamp: new Date(),
  };
};

export const getChatMessages = async (sessionId: string): Promise<Message[]> => {
  // return fetchApi<Message[]>(`/sessions/${sessionId}/messages`);
  return [];
};

