import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Calendar as CalendarIcon, X } from "lucide-react";
import { useJournal, getTodayISO, isFutureDate } from "@/hooks/useJournal";
import { JournalModal, JournalCard, JournalView, MiniCalendar } from "@/components/journal";
import { Journal } from "@/lib/api";

const JournalPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [state, actions] = useJournal();
    const [showModal, setShowModal] = useState(false);
    const [modalDate, setModalDate] = useState<string | undefined>(undefined);
    const [selectedJournal, setSelectedJournal] = useState<Journal | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Get tag filter from URL
    const tagFilter = searchParams.get("tag");

    // Load journals on mount
    useEffect(() => {
        actions.loadJournals();
    }, []);

    // Handle day click from calendar
    const handleDayClick = (dateIso: string, hasEntry: boolean) => {
        // Prevent future date clicks (already handled in MiniCalendar, but double-check)
        if (isFutureDate(dateIso)) {
            return;
        }

        if (hasEntry) {
            // Find journal for this date
            const journal = state.journals.find(j => j.date_iso === dateIso);
            if (journal) {
                setSelectedJournal(journal);
            }
        } else {
            // Only allow opening modal for today
            if (dateIso === getTodayISO()) {
                setModalDate(dateIso);
                setShowModal(true);
            }
        }
    };

    const handleJournalClick = (journal: Journal) => {
        if (journal.is_today) {
            setModalDate(journal.date_iso);
            setShowModal(true);
        } else {
            setSelectedJournal(journal);
        }
    };

    const handleNewJournal = () => {
        setSelectedJournal(null);
        setModalDate(getTodayISO());
        setShowModal(true);
    };

    const handleExport = async () => {
        if (selectedJournal) {
            await actions.loadJournal(selectedJournal.id);
            await actions.exportCurrentJournal();
        }
    };

    const handleDelete = async () => {
        if (selectedJournal && window.confirm("Are you sure you want to delete this journal entry?")) {
            await actions.loadJournal(selectedJournal.id);
            await actions.deleteCurrentJournal();
            setSelectedJournal(null);
            actions.loadJournals();
        }
    };

    const clearTagFilter = () => {
        setSearchParams({});
    };

    // Filter journals by search query and/or tag filter
    const filteredJournals = state.journals.filter(j => {
        // Apply tag filter if present
        if (tagFilter) {
            const hasTag = j.tags.some(t => t.toLowerCase() === tagFilter.toLowerCase());
            if (!hasTag) return false;
        }

        // Apply search query if present
        if (searchQuery) {
            const matchesSearch =
                j.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                j.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                j.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
            if (!matchesSearch) return false;
        }

        return true;
    });

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                        <span className="text-2xl">📔</span>
                        Reflection Journal
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Track your thoughts, feelings, and daily reflections
                    </p>
                </div>
                <Button onClick={handleNewJournal}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Entry
                </Button>
            </div>

            {/* Tag Filter Banner */}
            {tagFilter && (
                <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                    <span className="text-sm text-muted-foreground">Filtering by theme:</span>
                    <Badge variant="default" className="capitalize">
                        {tagFilter}
                    </Badge>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearTagFilter}
                        className="ml-auto"
                    >
                        <X className="h-4 w-4 mr-1" />
                        Clear filter
                    </Button>
                </div>
            )}

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search journals by content, tags, or themes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar */}
                <div className="lg:order-2">
                    <MiniCalendar onDayClick={handleDayClick} />
                </div>

                {/* Journal List or Selected Journal */}
                <div className="lg:col-span-2 lg:order-1 space-y-4">
                    {selectedJournal ? (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedJournal(null)}
                            >
                                ← Back to all entries
                            </Button>
                            <JournalView
                                journal={selectedJournal}
                                onExport={handleExport}
                                onDelete={handleDelete}
                            />
                        </>
                    ) : (
                        <>
                            {state.isLoading ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    Loading journals...
                                </div>
                            ) : filteredJournals.length === 0 ? (
                                <div className="text-center py-12">
                                    <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="font-medium text-foreground mb-1">
                                        {searchQuery || tagFilter ? "No matching entries" : "No journal entries yet"}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        {searchQuery || tagFilter
                                            ? "Try adjusting your search or filter"
                                            : "Start writing your first reflection today"
                                        }
                                    </p>
                                    {!searchQuery && !tagFilter && (
                                        <Button onClick={handleNewJournal}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Create First Entry
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredJournals.map((journal) => (
                                        <JournalCard
                                            key={journal.id}
                                            journal={journal}
                                            onClick={() => handleJournalClick(journal)}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Journal Modal */}
            <JournalModal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setModalDate(undefined);
                    actions.loadJournals(); // Refresh list after modal closes
                }}
                initialDate={modalDate}
            />
        </div>
    );
};

export default JournalPage;
