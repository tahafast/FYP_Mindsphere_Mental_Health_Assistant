import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Quote } from "lucide-react";
import { getQuote, getGroundingSuggestion } from "@/lib/quotes";
import { getTodaysMood } from "@/lib/api";

const USER_ID = "user123";

export function SuggestionCard() {
    const [quote, setQuote] = useState("");
    const [isGrounding, setIsGrounding] = useState(false);

    useEffect(() => {
        loadQuote();
    }, []);

    const loadQuote = async () => {
        // Randomly decide between quote and grounding suggestion
        const useGrounding = Math.random() > 0.7;
        setIsGrounding(useGrounding);

        if (useGrounding) {
            setQuote(getGroundingSuggestion());
        } else {
            // Try to get mood-based quote
            const mood = await getTodaysMood(USER_ID);
            if (mood) {
                setQuote(getQuote(mood.mood as any));
            } else {
                setQuote(getQuote());
            }
        }
    };

    return (
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-6">
                <div className="flex items-start gap-4">
                    <div className="mt-1">
                        <Quote className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                            {isGrounding ? "Grounding Technique" : "Daily Inspiration"}
                        </p>
                        <p className="text-lg italic leading-relaxed text-foreground">
                            "{quote}"
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
