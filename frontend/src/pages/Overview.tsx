import { useState, useEffect, useCallback } from "react";
import { HeroGreeting } from "@/components/HeroGreeting";
import { QuickSnapshots } from "@/components/QuickSnapshots";
import { RecentConversations } from "@/components/RecentConversations";
import { InsightsSnapshot } from "@/components/InsightsSnapshot";
import MoodTrendChart from "@/components/MoodTrendChart";
import { SuggestionCard } from "@/components/SuggestionCard";
import { OverviewFooter } from "@/components/OverviewFooter";
import { MiniCalendar, JournalModal } from "@/components/journal";
import { getTodayISO, isFutureDate } from "@/hooks/useJournal";

const Overview = () => {
    const [showJournalModal, setShowJournalModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
    const [moodRefreshKey, setMoodRefreshKey] = useState(0);

    // Callback to refresh mood data immediately after logging
    const handleMoodLogged = useCallback(() => {
        setMoodRefreshKey(prev => prev + 1);
    }, []);

    // Handle calendar day click
    const handleDayClick = useCallback((dateIso: string, hasEntry: boolean) => {
        // Prevent future dates (already handled in MiniCalendar, but double-check)
        if (isFutureDate(dateIso)) {
            return;
        }

        setSelectedDate(dateIso);
        setShowJournalModal(true);
    }, []);

    // Keyboard shortcut: Press "J" to open today's journal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only trigger if not in an input/textarea and no modifiers
            if (
                e.key.toLowerCase() === 'j' &&
                !e.ctrlKey &&
                !e.metaKey &&
                !e.altKey &&
                document.activeElement?.tagName !== 'INPUT' &&
                document.activeElement?.tagName !== 'TEXTAREA'
            ) {
                e.preventDefault();
                setSelectedDate(getTodayISO());
                setShowJournalModal(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="space-y-6 pb-8">
            {/* 1. Hero Greeting Card */}
            <HeroGreeting onMoodLogged={handleMoodLogged} />

            {/* 2. Quick Snapshot Cards */}
            <QuickSnapshots refreshKey={moodRefreshKey} />

            {/* 2.5. Journal Calendar Widget */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    {/* 3. Recent Conversations */}
                    <RecentConversations />
                </div>
                <div>
                    <MiniCalendar onDayClick={handleDayClick} />
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                        Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">J</kbd> to open today's journal
                    </p>
                </div>
            </div>

            {/* 4. Insights Snapshot */}
            <InsightsSnapshot />

            {/* 5. LEAS/Sentiment Graph (moved lower) */}
            <MoodTrendChart />

            {/* 6. Suggestion/Quote Card */}
            <SuggestionCard />

            {/* 7. Footer */}
            <OverviewFooter />

            {/* Journal Modal */}
            <JournalModal
                isOpen={showJournalModal}
                onClose={() => {
                    setShowJournalModal(false);
                    setSelectedDate(undefined);
                }}
                initialDate={selectedDate}
            />
        </div>
    );
};

export default Overview;
