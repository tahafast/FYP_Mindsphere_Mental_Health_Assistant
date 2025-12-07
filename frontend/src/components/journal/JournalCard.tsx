import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { Journal } from "@/lib/api";

interface JournalCardProps {
    journal: Journal;
    onClick?: () => void;
}

const MOOD_EMOJI: Record<string, string> = {
    sad: "😔",
    anxious: "😰",
    neutral: "😐",
    happy: "🙂",
    great: "🤩",
};

export function JournalCard({ journal, onClick }: JournalCardProps) {
    const formatDate = (dateIso: string) => {
        const date = new Date(dateIso);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Truncate content for preview
    const preview = journal.content.length > 120
        ? journal.content.slice(0, 120) + "..."
        : journal.content;

    return (
        <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={onClick}
        >
            <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(journal.date_iso)}
                        {journal.is_today && (
                            <Badge variant="outline" className="text-xs">Today</Badge>
                        )}
                    </div>
                    {journal.mood && (
                        <span className="text-xl">{MOOD_EMOJI[journal.mood]}</span>
                    )}
                </div>

                <p className="text-sm text-foreground mb-2 line-clamp-2">
                    {preview}
                </p>

                {/* Summary preview */}
                {journal.summary && (
                    <p className="text-xs text-muted-foreground italic mb-2 line-clamp-1">
                        "{journal.summary}"
                    </p>
                )}

                {/* Tags */}
                {journal.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {journal.tags.slice(0, 3).map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                                {tag}
                            </Badge>
                        ))}
                        {journal.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                                +{journal.tags.length - 3}
                            </Badge>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default JournalCard;
