import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Journal, JournalCreate, JournalCalendarDay, MoodType,
    createOrUpdateJournal, getJournals, getJournal, deleteJournal,
    getJournalCalendar, exportJournal
} from '@/lib/api';

const USER_ID = 'user123';
const AUTOSAVE_DELAY = 5000; // 5 seconds
const OFFLINE_STORAGE_KEY = 'mindsphere_journal_offline';

interface OfflineEntry {
    content: string;
    mood?: MoodType;
    date_iso: string;
    timestamp: number;
}

interface UseJournalState {
    // Current journal being edited
    currentJournal: Journal | null;
    content: string;
    mood: MoodType | undefined;

    // Selected date for viewing/editing
    selectedDate: string;

    // State flags
    isLoading: boolean;
    isSaving: boolean;
    isSaved: boolean;
    isOffline: boolean;
    hasUnsavedChanges: boolean;
    isEditable: boolean; // Only true if selectedDate === today

    // Calendar data
    calendarDays: JournalCalendarDay[];

    // Journal list
    journals: Journal[];

    // Error handling
    error: string | null;

    // Crisis detected
    crisisDetected: boolean;
}

interface UseJournalActions {
    setContent: (content: string) => void;
    setMood: (mood: MoodType | undefined) => void;
    saveJournal: () => Promise<Journal | null>;
    loadJournalByDate: (dateIso: string) => Promise<void>;
    loadJournal: (journalId: string) => Promise<void>;
    loadJournals: (start?: string, end?: string) => Promise<void>;
    loadCalendar: (month: string) => Promise<void>;
    deleteCurrentJournal: () => Promise<void>;
    exportCurrentJournal: () => Promise<void>;
    syncOfflineEntries: () => Promise<void>;
    clearError: () => void;
    resetToToday: () => void;
}

// Helper to get today's date in local timezone
function getTodayISO(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper to check if a date is today
function isDateToday(dateIso: string): boolean {
    return dateIso === getTodayISO();
}

// Helper to normalize a date string to start-of-day (local timezone)
function normalizeDate(dateIso: string): Date {
    const parts = dateIso.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Months are 0-indexed
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
}

// Helper to check if a date is in the future
function isFutureDate(dateIso: string): boolean {
    const today = normalizeDate(getTodayISO());
    const selected = normalizeDate(dateIso);
    return selected > today;
}

// Format date for display
function formatDateDisplay(dateIso: string): string {
    const date = new Date(dateIso + 'T12:00:00'); // Use noon to avoid timezone issues
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

export function useJournal(): [UseJournalState, UseJournalActions] {
    // State
    const [currentJournal, setCurrentJournal] = useState<Journal | null>(null);
    const [content, setContentInternal] = useState('');
    const [mood, setMood] = useState<MoodType | undefined>(undefined);
    const [selectedDate, setSelectedDate] = useState<string>(getTodayISO());
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [calendarDays, setCalendarDays] = useState<JournalCalendarDay[]>([]);
    const [journals, setJournals] = useState<Journal[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [crisisDetected, setCrisisDetected] = useState(false);

    // Computed property: can only edit if selectedDate is today
    const isEditable = isDateToday(selectedDate);

    // Refs for autosave and request cancellation
    const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedContentRef = useRef<string>('');
    const loadRequestIdRef = useRef<number>(0);

    // Online/offline detection
    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            syncOfflineEntries();
        };
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Clear autosave timer on unmount
    useEffect(() => {
        return () => {
            if (autosaveTimerRef.current) {
                clearTimeout(autosaveTimerRef.current);
            }
        };
    }, []);

    // Save to localStorage when offline
    const saveOffline = useCallback((entry: OfflineEntry) => {
        try {
            const key = `${OFFLINE_STORAGE_KEY}-${USER_ID}-${entry.date_iso}`;
            localStorage.setItem(key, JSON.stringify(entry));
        } catch (e) {
            console.error('Failed to save offline:', e);
        }
    }, []);

    // Sync offline entries when back online
    const syncOfflineEntries = useCallback(async () => {
        if (isOffline) return;

        try {
            const today = getTodayISO();
            const key = `${OFFLINE_STORAGE_KEY}-${USER_ID}-${today}`;
            const stored = localStorage.getItem(key);

            if (!stored) return;

            const entry: OfflineEntry = JSON.parse(stored);

            // Only sync today's entry (past entries can't be created)
            if (entry.date_iso === today) {
                await createOrUpdateJournal(USER_ID, {
                    content: entry.content,
                    mood: entry.mood,
                    local_date: entry.date_iso
                });
                localStorage.removeItem(key);
            }
        } catch (e) {
            console.error('Failed to sync offline entries:', e);
        }
    }, [isOffline]);

    // Set content with autosave trigger (only for today's date)
    const setContent = useCallback((newContent: string) => {
        setContentInternal(newContent);
        setHasUnsavedChanges(newContent !== lastSavedContentRef.current);
        setIsSaved(false);

        // Clear existing timer
        if (autosaveTimerRef.current) {
            clearTimeout(autosaveTimerRef.current);
        }

        // Only autosave if we're editing today's journal
        if (isDateToday(selectedDate)) {
            autosaveTimerRef.current = setTimeout(() => {
                if (newContent.trim() && newContent !== lastSavedContentRef.current) {
                    saveJournalInternal(newContent, mood);
                }
            }, AUTOSAVE_DELAY);
        }
    }, [selectedDate, mood]);

    // Internal save function to avoid closure issues
    const saveJournalInternal = async (contentToSave: string, moodToSave?: MoodType): Promise<Journal | null> => {
        const today = getTodayISO();

        // Validation: cannot save for future dates
        if (isFutureDate(selectedDate)) {
            setError('You cannot create a journal entry for a future date.');
            return null;
        }

        // Validation: can only save for today
        if (!isDateToday(selectedDate)) {
            setError('Can only save entries for today. Past entries are view-only.');
            return null;
        }

        if (!contentToSave.trim()) {
            setError('Journal content cannot be empty');
            return null;
        }

        // If offline, save locally
        if (isOffline) {
            saveOffline({
                content: contentToSave,
                mood: moodToSave,
                date_iso: today,
                timestamp: Date.now()
            });
            setIsSaved(true);
            setHasUnsavedChanges(false);
            lastSavedContentRef.current = contentToSave;
            return null;
        }

        setIsSaving(true);
        setError(null);
        setCrisisDetected(false);

        try {
            const saved = await createOrUpdateJournal(USER_ID, {
                content: contentToSave,
                mood: moodToSave,
                local_date: today
            });

            setCurrentJournal(saved);
            setIsSaved(true);
            setHasUnsavedChanges(false);
            lastSavedContentRef.current = contentToSave;

            // Check for crisis
            if (saved.crisis_level === 'medium' || saved.crisis_level === 'high') {
                setCrisisDetected(true);
            }

            return saved;
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to save journal';
            setError(message);
            return null;
        } finally {
            setIsSaving(false);
        }
    };

    // Save journal (exposed to UI)
    const saveJournal = useCallback(async (): Promise<Journal | null> => {
        return saveJournalInternal(content, mood);
    }, [content, mood, selectedDate, isOffline, saveOffline]);

    // Load journal by specific date (KEY FIX for per-date loading)
    const loadJournalByDate = useCallback(async (dateIso: string) => {
        // Increment request ID to track this specific request
        const requestId = ++loadRequestIdRef.current;

        // Prevent loading future dates
        if (isFutureDate(dateIso)) {
            setError('Cannot view future journal entries');
            return;
        }

        setIsLoading(true);
        setError(null);
        setSelectedDate(dateIso); // Update selected date immediately
        setCrisisDetected(false);

        try {
            const journalsList = await getJournals(USER_ID, dateIso, dateIso);

            // Check if this request is still the latest one
            if (requestId !== loadRequestIdRef.current) {
                return; // Stale request, ignore result
            }

            if (journalsList.length > 0) {
                const journal = journalsList[0];
                setCurrentJournal(journal);
                setContentInternal(journal.content);
                setMood(journal.mood);
                lastSavedContentRef.current = journal.content;
                setIsSaved(true);
                setHasUnsavedChanges(false);
            } else {
                // No journal for this date
                setCurrentJournal(null);
                setContentInternal('');
                setMood(undefined);
                lastSavedContentRef.current = '';
                setIsSaved(false);
                setHasUnsavedChanges(false);
            }
        } catch (e) {
            if (requestId === loadRequestIdRef.current) {
                setError(e instanceof Error ? e.message : 'Failed to load journal');
            }
        } finally {
            if (requestId === loadRequestIdRef.current) {
                setIsLoading(false);
            }
        }
    }, []);

    // Load specific journal by ID
    const loadJournal = useCallback(async (journalId: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const journal = await getJournal(USER_ID, journalId);
            setCurrentJournal(journal);
            setContentInternal(journal.content);
            setMood(journal.mood);
            setSelectedDate(journal.date_iso);
            lastSavedContentRef.current = journal.content;
            setIsSaved(true);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load journal');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Load journals list
    const loadJournals = useCallback(async (start?: string, end?: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const list = await getJournals(USER_ID, start, end);
            setJournals(list);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load journals');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Load calendar
    const loadCalendar = useCallback(async (month: string) => {
        try {
            const response = await getJournalCalendar(USER_ID, month);
            setCalendarDays(response.days);
        } catch (e) {
            console.error('Failed to load calendar:', e);
        }
    }, []);

    // Delete current journal
    const deleteCurrentJournal = useCallback(async () => {
        if (!currentJournal) return;

        try {
            await deleteJournal(USER_ID, currentJournal.id);
            setCurrentJournal(null);
            setContentInternal('');
            setMood(undefined);
            lastSavedContentRef.current = '';
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to delete journal');
        }
    }, [currentJournal]);

    // Export current journal
    const exportCurrentJournal = useCallback(async () => {
        if (!currentJournal) return;

        try {
            const blobUrl = await exportJournal(USER_ID, currentJournal.id);

            // Create download link
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `journal_${currentJournal.date_iso}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to export journal');
        }
    }, [currentJournal]);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // Reset to today's journal
    const resetToToday = useCallback(() => {
        loadJournalByDate(getTodayISO());
    }, [loadJournalByDate]);

    const state: UseJournalState = {
        currentJournal,
        content,
        mood,
        selectedDate,
        isLoading,
        isSaving,
        isSaved,
        isOffline,
        hasUnsavedChanges,
        isEditable,
        calendarDays,
        journals,
        error,
        crisisDetected
    };

    const actions: UseJournalActions = {
        setContent,
        setMood,
        saveJournal,
        loadJournalByDate,
        loadJournal,
        loadJournals,
        loadCalendar,
        deleteCurrentJournal,
        exportCurrentJournal,
        syncOfflineEntries,
        clearError,
        resetToToday
    };

    return [state, actions];
}

// Export utility functions for use in components
export { getTodayISO, isDateToday, isFutureDate, formatDateDisplay };

export default useJournal;
