import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { getChatSessions, createChatSession, logMood } from "@/lib/api";
import { toast } from "sonner";

const USER_ID = "user123"; // Hardcoded for prototype

interface HeroGreetingProps {
    onMoodLogged?: () => void;
}

export function HeroGreeting({ onMoodLogged }: HeroGreetingProps) {
    const [lastSessionId, setLastSessionId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchLastSession();
    }, []);

    const fetchLastSession = async () => {
        try {
            const sessions = await getChatSessions(USER_ID);
            if (sessions.length > 0) {
                setLastSessionId(sessions[0].id);
            }
        } catch (error) {
            console.error("Failed to fetch sessions", error);
        } finally {
            setLoading(false);
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return "Good morning";
        if (hour >= 12 && hour < 18) return "Good afternoon";
        if (hour >= 18 && hour < 22) return "Good evening";
        return "Good night";
    };

    const handleStartNewChat = async () => {
        try {
            const newSession = await createChatSession(USER_ID);
            navigate(`/?session=${newSession.id}`);
            toast.success("New conversation started");
        } catch (error) {
            toast.error("Failed to start new chat");
        }
    };

    const handleResumeChat = () => {
        if (lastSessionId) {
            navigate(`/?session=${lastSessionId}`);
        }
    };

    const handleMoodClick = async (mood: 'sad' | 'neutral' | 'happy') => {
        try {
            const result = await logMood(USER_ID, mood);
            const moodEmoji = mood === 'sad' ? '😔' : mood === 'neutral' ? '😐' : '🙂';
            const time = new Date(result.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            toast.success(`Saved: ${moodEmoji} ${mood} • ${time}`, {
                description: "Mood saved locally unless you opt in.",
                duration: 4000,
            });
            // Trigger immediate refresh of mood in parent components
            onMoodLogged?.();
        } catch (error) {
            toast.error("Failed to log mood");
        }
    };

    return (
        <Card className="p-8 bg-gradient-to-br from-card to-card/50 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                {/* Left Side: Greeting & Actions */}
                <div className="flex-1 space-y-4">
                    <div>
                        <h1 className="text-4xl font-bold text-foreground mb-2">
                            {getGreeting()}, I'm Dr. MindSphere.
                        </h1>
                        <p className="text-lg text-muted-foreground">
                            Quick check-in or continue your last conversation.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Button
                            size="lg"
                            onClick={handleStartNewChat}
                            className="rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
                        >
                            Start New Chat
                        </Button>
                        {!loading && lastSessionId && (
                            <Button
                                size="lg"
                                variant="outline"
                                onClick={handleResumeChat}
                                className="rounded-xl shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200"
                            >
                                Resume Last Chat
                            </Button>
                        )}
                    </div>
                </div>

                {/* Right Side: Mood Check-in */}
                <div className="flex flex-col items-end gap-3">
                    <p className="text-sm font-medium text-muted-foreground">
                        How are you feeling?
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => handleMoodClick('sad')}
                            className="text-3xl h-16 w-16 rounded-2xl hover:scale-110 hover:bg-accent transition-all duration-200"
                            title="Sad"
                        >
                            😔
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => handleMoodClick('neutral')}
                            className="text-3xl h-16 w-16 rounded-2xl hover:scale-110 hover:bg-accent transition-all duration-200"
                            title="Neutral"
                        >
                            😐
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => handleMoodClick('happy')}
                            className="text-3xl h-16 w-16 rounded-2xl hover:scale-110 hover:bg-accent transition-all duration-200"
                            title="Happy"
                        >
                            🙂
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground/70 text-right max-w-[200px]">
                        Mood saved locally unless you opt in.
                    </p>
                </div>
            </div>
        </Card>
    );
}
