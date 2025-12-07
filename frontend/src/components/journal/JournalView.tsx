import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lightbulb, Calendar, Download, Trash2 } from "lucide-react";
import { Journal } from "@/lib/api";

interface JournalViewProps {
    journal: Journal;
    onExport?: () => void;
    onDelete?: () => void;
    showActions?: boolean;
}

const MOOD_EMOJI: Record<string, string> = {
    sad: "😔",
    anxious: "😰",
    neutral: "😐",
    happy: "🙂",
    great: "🤩",
};

export function JournalView({
    journal,
    onExport,
    onDelete,
    showActions = true
}: JournalViewProps) {
    const formatDate = (dateIso: string) => {
        const date = new Date(dateIso);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <Card className="w-full">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(journal.date_iso)}
                        {journal.is_today && (
                            <Badge variant="outline" className="ml-2">Today</Badge>
                        )}
                    </CardTitle>
                    {journal.mood && (
                        <span className="text-2xl" title={journal.mood}>
                            {MOOD_EMOJI[journal.mood] || "😐"}
                        </span>
                    )}
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Journal Content */}
                <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap text-foreground">{journal.content}</p>
                </div>

                {/* Tags */}
                {journal.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {journal.tags.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                                {tag}
                            </Badge>
                        ))}
                    </div>
                )}

                {/* AI Summary */}
                {journal.summary && (
                    <div className="bg-accent/50 rounded-lg p-3 space-y-2">
                        <p className="text-xs font-medium text-primary uppercase tracking-wide">
                            Summary
                        </p>
                        <p className="text-sm text-muted-foreground">{journal.summary}</p>
                    </div>
                )}

                {/* AI Suggestion */}
                {journal.ai_suggestion && (
                    <div className="bg-gradient-to-br from-primary/5 to-accent/10 border border-primary/20 rounded-lg p-3 space-y-2">
                        <p className="text-xs font-medium text-primary uppercase tracking-wide flex items-center gap-1">
                            <Lightbulb className="h-3 w-3" />
                            AI Suggestion
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {journal.ai_suggestion.suggestion}
                        </p>
                        <Badge variant="outline" className="text-xs capitalize">
                            {journal.ai_suggestion.type}
                        </Badge>
                    </div>
                )}

                {/* Actions */}
                {showActions && (
                    <div className="flex gap-2 pt-2 border-t border-border">
                        {onExport && (
                            <Button variant="ghost" size="sm" onClick={onExport}>
                                <Download className="h-4 w-4 mr-1" />
                                Export
                            </Button>
                        )}
                        {onDelete && journal.is_today && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onDelete}
                                className="text-destructive hover:text-destructive"
                            >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default JournalView;
