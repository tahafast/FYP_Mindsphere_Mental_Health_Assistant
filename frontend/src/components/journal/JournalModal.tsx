import { useState, useEffect, useCallback, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import {
    Save, Loader2, ChevronDown, ChevronUp, Lightbulb,
    AlertTriangle, Phone, Wind, Sparkles, CloudOff, Calendar, Lock, Unlock
} from "lucide-react";
import { useJournal, formatDateDisplay, isDateToday, isFutureDate } from "@/hooks/useJournal";
import { MoodType } from "@/lib/api";
import { BreathingModal } from "@/components/breathing";

interface JournalModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialDate?: string; // Date to load (YYYY-MM-DD)
}

const MOOD_OPTIONS: { value: MoodType; emoji: string; label: string }[] = [
    { value: "sad", emoji: "😔", label: "Sad" },
    { value: "anxious", emoji: "😰", label: "Anxious" },
    { value: "neutral", emoji: "😐", label: "Okay" },
    { value: "happy", emoji: "🙂", label: "Good" },
    { value: "great", emoji: "🤩", label: "Great" },
];

const PROMPTS = [
    "What's on your mind today?",
    "What are you grateful for?",
    "What challenged you today?",
    "What moment brought you joy?",
    "What would you like to let go of?",
];

export function JournalModal({ isOpen, onClose, initialDate }: JournalModalProps) {
    const [state, actions] = useJournal();
    const [insightsOpen, setInsightsOpen] = useState(true);
    const [showBreathingModal, setShowBreathingModal] = useState(false);
    const [randomPrompt] = useState(() =>
        PROMPTS[Math.floor(Math.random() * PROMPTS.length)]
    );

    // Load the journal when modal opens or initial date changes
    useEffect(() => {
        if (isOpen) {
            if (initialDate) {
                actions.loadJournalByDate(initialDate);
            } else {
                actions.resetToToday();
            }
        }
    }, [isOpen, initialDate]);

    // Handle close with unsaved changes warning
    const handleClose = useCallback(() => {
        if (state.hasUnsavedChanges && state.isEditable) {
            if (window.confirm("You have unsaved changes. Are you sure you want to close?")) {
                onClose();
            }
        } else {
            onClose();
        }
    }, [state.hasUnsavedChanges, state.isEditable, onClose]);

    // Manual save
    const handleSave = async () => {
        const result = await actions.saveJournal();
        if (result) {
            // Optionally show success toast
        }
    };

    // Format the date for display
    const formattedDate = useMemo(() => {
        return formatDateDisplay(state.selectedDate);
    }, [state.selectedDate]);

    const isToday = isDateToday(state.selectedDate);
    const isFuture = isFutureDate(state.selectedDate);

    // Determine display states
    const showEditControls = state.isEditable && !isFuture;
    const showReadOnlyBadge = !state.isEditable && !isFuture;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="space-y-3">
                        {/* Date Display - Large and Prominent */}
                        <div className="flex items-center gap-3">
                            <Calendar className="h-6 w-6 text-primary" aria-hidden="true" />
                            <h2
                                className="text-xl font-semibold text-foreground"
                                aria-label={`Journal for ${formattedDate}`}
                            >
                                {formattedDate}
                            </h2>
                        </div>

                        {/* Title and Status Badges */}
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <span className="text-xl">📔</span>
                            Reflection Journal

                            {isToday && (
                                <Badge variant="default" className="ml-2 bg-primary">
                                    Today
                                </Badge>
                            )}

                            {showReadOnlyBadge && (
                                <Badge variant="secondary" className="ml-2">
                                    <Lock className="h-3 w-3 mr-1" />
                                    View Only
                                </Badge>
                            )}

                            {isFuture && (
                                <Badge variant="destructive" className="ml-2">
                                    Future Date
                                </Badge>
                            )}

                            {state.isOffline && (
                                <Badge variant="outline" className="ml-2">
                                    <CloudOff className="h-3 w-3 mr-1" />
                                    Offline
                                </Badge>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    {/* Future date warning */}
                    {isFuture && (
                        <Card className="border-amber-500/50 bg-amber-500/10">
                            <CardContent className="pt-4">
                                <p className="text-sm text-amber-600 dark:text-amber-400">
                                    You cannot create a journal entry for a future date.
                                    Please select today or a past date.
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Loading state */}
                    {state.isLoading && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}

                    {/* Crisis Alert */}
                    {state.crisisDetected && (
                        <Card className="border-destructive bg-destructive/10">
                            <CardContent className="pt-4">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0" />
                                    <div className="space-y-3">
                                        <p className="font-medium text-destructive">
                                            We noticed you may be going through a difficult time.
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            You're not alone. Help is available.
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => window.location.href = 'tel:988'}
                                            >
                                                <Phone className="h-4 w-4 mr-2" />
                                                Crisis Hotline: 988
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setShowBreathingModal(true)}
                                            >
                                                <Wind className="h-4 w-4 mr-2" />
                                                Breathing Exercise
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {!state.isLoading && !isFuture && (
                        <div className="space-y-4">
                            {/* Mood Selector */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">How are you feeling?</Label>
                                <div className="flex gap-2">
                                    {MOOD_OPTIONS.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => showEditControls && actions.setMood(option.value)}
                                            disabled={!showEditControls}
                                            className={`
                                                flex flex-col items-center p-2 rounded-lg border-2 transition-all
                                                ${state.mood === option.value
                                                    ? 'border-primary bg-primary/10'
                                                    : 'border-transparent hover:border-border hover:bg-accent/50'
                                                }
                                                ${!showEditControls ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
                                            `}
                                            title={option.label}
                                            aria-label={`${option.label} mood`}
                                            aria-pressed={state.mood === option.value}
                                        >
                                            <span className="text-2xl">{option.emoji}</span>
                                            <span className="text-xs text-muted-foreground mt-1">{option.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Suggested Prompt */}
                            {!state.content && showEditControls && (
                                <div className="bg-accent/50 rounded-lg p-3 text-sm text-muted-foreground italic">
                                    💡 {randomPrompt}
                                </div>
                            )}

                            {/* Journal Content */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Your thoughts</Label>
                                <Textarea
                                    value={state.content}
                                    onChange={(e) => actions.setContent(e.target.value)}
                                    placeholder={showEditControls
                                        ? "Write freely about your day, your feelings, or anything on your mind..."
                                        : "No journal entry for this day."
                                    }
                                    className="min-h-[200px] resize-none"
                                    readOnly={!showEditControls}
                                    aria-label="Journal entry content"
                                />
                            </div>

                            {/* Status Bar */}
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span className="flex items-center gap-2">
                                    {state.isSaving && (
                                        <>
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            Saving...
                                        </>
                                    )}
                                    {state.isSaved && !state.isSaving && showEditControls && (
                                        <>
                                            <span className="text-green-500">✓</span>
                                            Saved
                                        </>
                                    )}
                                    {state.hasUnsavedChanges && !state.isSaving && showEditControls && (
                                        <span className="text-amber-500">Unsaved changes</span>
                                    )}
                                    {!showEditControls && state.currentJournal && (
                                        <span className="flex items-center gap-1">
                                            <Lock className="h-3 w-3" />
                                            Past entries are read-only
                                        </span>
                                    )}
                                </span>
                                <span>{state.content.length} characters</span>
                            </div>

                            {/* Privacy Status (read-only display) */}
                            {state.currentJournal && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                                    {state.currentJournal.allow_training ? (
                                        <>
                                            <Unlock className="h-3 w-3" />
                                            <span>Usage: Shared for personalization</span>
                                        </>
                                    ) : (
                                        <>
                                            <Lock className="h-3 w-3" />
                                            <span>Usage: Private</span>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* AI Insights Section */}
                            {state.currentJournal && (state.currentJournal.summary || state.currentJournal.ai_suggestion) && (
                                <Collapsible open={insightsOpen} onOpenChange={setInsightsOpen}>
                                    <CollapsibleTrigger asChild>
                                        <Button variant="ghost" className="w-full justify-between p-3 h-auto">
                                            <span className="flex items-center gap-2">
                                                <Sparkles className="h-4 w-4 text-primary" />
                                                AI Insights
                                            </span>
                                            {insightsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <Card className="bg-gradient-to-br from-primary/5 to-accent/10 border-primary/20">
                                            <CardContent className="pt-4 space-y-3" aria-live="polite">
                                                {/* Summary */}
                                                {state.currentJournal.summary && (
                                                    <div>
                                                        <p className="text-sm font-medium text-primary mb-1">Summary</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {state.currentJournal.summary}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* AI Suggestion */}
                                                {state.currentJournal.ai_suggestion && (
                                                    <div>
                                                        <p className="text-sm font-medium text-primary mb-1 flex items-center gap-1">
                                                            <Lightbulb className="h-3 w-3" />
                                                            Suggestion
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {state.currentJournal.ai_suggestion.suggestion}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Tags */}
                                                {state.currentJournal.tags.length > 0 && (
                                                    <div>
                                                        <p className="text-sm font-medium text-primary mb-1">Themes</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {state.currentJournal.tags.map((tag, i) => (
                                                                <Badge key={i} variant="secondary" className="text-xs">
                                                                    {tag}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </CollapsibleContent>
                                </Collapsible>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2 pt-2">
                                {showEditControls && (
                                    <Button
                                        onClick={handleSave}
                                        disabled={state.isSaving || !state.content.trim()}
                                        className="flex-1"
                                    >
                                        {state.isSaving ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Save className="h-4 w-4 mr-2" />
                                        )}
                                        Save Entry
                                    </Button>
                                )}
                                <Button variant="outline" onClick={handleClose}>
                                    {showEditControls ? 'Cancel' : 'Close'}
                                </Button>
                            </div>

                            {/* Error Display */}
                            {state.error && (
                                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                                    <p className="text-sm text-destructive text-center">{state.error}</p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={actions.clearError}
                                        className="w-full mt-2 text-xs"
                                    >
                                        Dismiss
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Breathing Modal for Crisis */}
            <BreathingModal
                isOpen={showBreathingModal}
                onClose={() => setShowBreathingModal(false)}
            />
        </>
    );
}

export default JournalModal;
