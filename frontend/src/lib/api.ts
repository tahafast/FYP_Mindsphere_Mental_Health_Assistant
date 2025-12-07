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

// Mood Logging APIs
export interface MoodLogRequest {
  user_id: string;
  mood: 'sad' | 'neutral' | 'happy';
}

export interface MoodLogResponse {
  user_id: string;
  mood: string;
  timestamp: string;
  message: string;
}

export interface TodaysMood {
  mood: string;
  timestamp: string;
}

export interface UserInsights {
  check_in_count: number;
  exercises_completed: number;
  interpretation: string;
}

export const logMood = async (userId: string, mood: 'sad' | 'neutral' | 'happy'): Promise<MoodLogResponse> => {
  return fetchApi<MoodLogResponse>('/moods', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, mood }),
  });
};

export const getTodaysMood = async (userId: string): Promise<TodaysMood | null> => {
  try {
    return await fetchApi<TodaysMood>(`/moods/latest?user_id=${userId}`);
  } catch {
    return null;
  }
};

export const getUserInsights = async (userId: string): Promise<UserInsights> => {
  return fetchApi<UserInsights>(`/user/insights?user_id=${userId}`);
};

// Breathing Exercise APIs
export interface BreathingTechnique {
  id: string;
  name: string;
  description: string;
  use_case: string;
  steps: Array<{ type: string; duration: number }>;
}

export interface BreathingPreset {
  preset_id: string;
  name: string;
  technique_id: string;
  config: any;
  is_builtin?: boolean;
}

export interface SessionStartResponse {
  session_id: string;
  expires_at: string;
}

export interface SessionStopResponse {
  session_id: string;
  duration_seconds: number;
  cycles_completed: number;
  completed: boolean;
}

export const startBreathingSession = async (
  userId: string,
  techniqueId: string,
  presetName?: string,
  durationMinutes?: number
): Promise<SessionStartResponse> => {
  return fetchApi<SessionStartResponse>('/breathing/session/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      technique_id: techniqueId,
      preset_name: presetName,
      duration_minutes: durationMinutes,
      start_timestamp: new Date().toISOString()
    }),
  });
};

export const stopBreathingSession = async (
  sessionId: string,
  cyclesCompleted: number,
  durationSeconds: number,
  completed: boolean
): Promise<SessionStopResponse> => {
  return fetchApi<SessionStopResponse>('/breathing/session/stop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      end_timestamp: new Date().toISOString(),
      cycles_completed: cyclesCompleted,
      duration_seconds: durationSeconds,
      completed
    }),
  });
};

export const getBreathingPresets = async (userId: string) => {
  return fetchApi<{ user_presets: BreathingPreset[]; builtin_presets: BreathingPreset[] }>(
    `/breathing/presets?user_id=${userId}`
  );
};

export const createBreathingPreset = async (
  userId: string,
  name: string,
  techniqueId: string,
  config: any
) => {
  return fetchApi('/breathing/presets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, name, technique_id: techniqueId, config }),
  });
};

export const deleteBreathingPreset = async (presetId: string) => {
  return fetchApi(`/breathing/presets/${presetId}`, {
    method: 'DELETE',
  });
};

export const getBreathingTechniques = async () => {
  return fetchApi<{ techniques: BreathingTechnique[] }>('/breathing/techniques');
};

// ============================================================================
// Journal APIs
// ============================================================================

export type MoodType = 'sad' | 'neutral' | 'happy' | 'great' | 'anxious';
export type SentimentType = 'positive' | 'neutral' | 'negative' | 'mixed';
export type CrisisLevel = 'none' | 'low' | 'medium' | 'high';
export type SuggestionType = 'affirmation' | 'coping' | 'action' | 'gratitude';

export interface AISuggestion {
  suggestion: string;
  type: SuggestionType;
}

export interface Journal {
  id: string;
  user_id: string;
  date_iso: string;
  content: string;
  mood?: MoodType;
  tags: string[];
  summary?: string;
  sentiment?: SentimentType;
  ai_suggestion?: AISuggestion;
  crisis_level: CrisisLevel;
  created_at: string;
  updated_at: string;
  is_today: boolean;
  allow_training?: boolean; // Whether entry was opted-in for training
}

export interface JournalCreate {
  content: string;
  mood?: MoodType;
  local_date?: string;
  allow_training?: boolean;
}

export interface JournalCalendarDay {
  date_iso: string;
  has_entry: boolean;
  mood?: MoodType;
}

export interface JournalCalendarResponse {
  month: string;
  days: JournalCalendarDay[];
}

export interface JournalSearchResult {
  id: string;
  date_iso: string;
  summary?: string;
  relevance_score: number;
}

export interface JournalTagCount {
  tag: string;
  count: number;
}

// Create or update today's journal
export const createOrUpdateJournal = async (
  userId: string,
  data: JournalCreate
): Promise<Journal> => {
  return fetchApi<Journal>(`/journal?user_id=${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

// Get journals in date range
export const getJournals = async (
  userId: string,
  start?: string,
  end?: string
): Promise<Journal[]> => {
  let url = `/journal?user_id=${userId}`;
  if (start) url += `&start=${start}`;
  if (end) url += `&end=${end}`;
  return fetchApi<Journal[]>(url);
};

// Get single journal by ID
export const getJournal = async (userId: string, journalId: string): Promise<Journal> => {
  return fetchApi<Journal>(`/journal/${journalId}?user_id=${userId}`);
};

// Delete journal
export const deleteJournal = async (userId: string, journalId: string): Promise<void> => {
  await fetchApi(`/journal/${journalId}?user_id=${userId}`, { method: 'DELETE' });
};

// Get calendar markers for a month
export const getJournalCalendar = async (
  userId: string,
  month: string
): Promise<JournalCalendarResponse> => {
  return fetchApi<JournalCalendarResponse>(`/journal/calendar?user_id=${userId}&month=${month}`);
};

// Search journals
export const searchJournals = async (
  userId: string,
  query: string,
  limit: number = 10
): Promise<JournalSearchResult[]> => {
  return fetchApi<JournalSearchResult[]>(`/journal/search?user_id=${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit }),
  });
};

// Export journal as text (returns blob URL)
export const exportJournal = async (userId: string, journalId: string): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/journal/export/${journalId}?user_id=${userId}`);
  if (!response.ok) throw new Error('Export failed');
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

// Get recent journal tags with counts
export const getRecentJournalTags = async (
  userId: string,
  limit: number = 20
): Promise<JournalTagCount[]> => {
  return fetchApi<JournalTagCount[]>(`/journal/tags/recent?user_id=${userId}&limit=${limit}`);
};

// Search journals by tag
export const searchJournalsByTag = async (
  userId: string,
  tag: string
): Promise<Journal[]> => {
  return fetchApi<Journal[]>(`/journal?user_id=${userId}&tag=${encodeURIComponent(tag)}`);
};

// ============================================================================
// Recommendations APIs
// ============================================================================

export interface TrendPoint {
  date: string;
  score: number;
}

export type StatusLabel = 'Calm' | 'Stable' | 'Mixed' | 'Elevated' | 'Anxious';

export interface DailyRecommendation {
  daily_digest_title: string;
  emotional_summary: string;
  suggestion_for_today: string;
  average_leas_score: number;
  status_label: StatusLabel;
  trend_points: TrendPoint[];
}

/**
 * Get emotionally intelligent daily recommendation based on recent LEAS scores.
 * 
 * @param userId - The authenticated user's ID
 * @param windowDays - Number of days to analyze (default: 3)
 * @param userTz - Optional user timezone string
 * @param refresh - Force refresh (bypass cache)
 * @returns Promise<DailyRecommendation>
 */
export const getDailyRecommendation = async (
  userId: string,
  windowDays: number = 3,
  userTz?: string,
  refresh: boolean = false
): Promise<DailyRecommendation> => {
  let url = `/recommendations/daily?user_id=${userId}&window_days=${windowDays}`;
  if (userTz) {
    url += `&user_tz=${encodeURIComponent(userTz)}`;
  }
  if (refresh) {
    url += `&refresh=true`;
  }
  return fetchApi<DailyRecommendation>(url);
};
