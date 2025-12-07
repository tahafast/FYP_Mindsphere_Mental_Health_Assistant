import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getTodaysMood, TodaysMood } from "@/lib/api";
import { MessageSquarePlus, Play, BookOpen, Wind, Phone, AlertCircle, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BreathingModal } from "@/components/breathing";
import { JournalModal } from "@/components/journal";
import "@/styles/breathing.css";

const USER_ID = "user123";

export function QuickSnapshots() {
    const [todaysMood, setTodaysMood] = useState<TodaysMood | null>(null);
    const [showBreathingModal, setShowBreathingModal] = useState(false);
    const [showJournalModal, setShowJournalModal] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchTodaysMood();
    }, []);

    const fetchTodaysMood = async () => {
        const mood = await getTodaysMood(USER_ID);
        setTodaysMood(mood);
    };

    const getMoodEmoji = (mood: string) => {
        if (mood === 'sad') return '😔';
        if (mood === 'happy') return '🙂';
        return '😐';
    };

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Today's Mood */}
                <Card className="hover:shadow-lg transition-shadow duration-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            Today's Mood
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {todaysMood ? (
                            <div className="space-y-1">
                                <div className="text-3xl">{getMoodEmoji(todaysMood.mood)}</div>
                                <p className="text-xs text-muted-foreground">
                                    {new Date(todaysMood.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No mood logged today</p>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="hover:shadow-lg transition-shadow duration-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <MessageSquarePlus className="h-4 w-4 text-primary" />
                            Quick Actions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start hover:bg-accent"
                            onClick={() => navigate('/')}
                        >
                            <Play className="h-3 w-3 mr-2" />
                            New Chat
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start hover:bg-accent"
                            onClick={() => setShowJournalModal(true)}
                        >
                            <BookOpen className="h-3 w-3 mr-2" />
                            Reflection Journal
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start hover:bg-accent"
                            onClick={() => setShowBreathingModal(true)}
                        >
                            <Wind className="h-3 w-3 mr-2" />
                            Breathing Exercise
                        </Button>
                    </CardContent>
                </Card>

                {/* Safety Card */}
                <Card className="hover:shadow-lg transition-shadow duration-200 border-destructive/20">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-destructive" />
                            Emergency
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button
                            variant="destructive"
                            size="sm"
                            className="w-full"
                            onClick={() => window.location.href = 'tel:911'}
                        >
                            <Phone className="h-3 w-3 mr-2" />
                            Call 911
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full hover:bg-accent"
                            onClick={() => window.location.href = 'tel:988'}
                        >
                            <Phone className="h-3 w-3 mr-2" />
                            Crisis Hotline: 988
                        </Button>
                    </CardContent>
                </Card>

                {/* Recommendations */}
                <Card className="hover:shadow-lg transition-shadow duration-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">
                            Recommendations
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">
                            Personalized suggestions based on your journey
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full hover:bg-accent"
                            disabled
                            title="Coming soon"
                        >
                            View Recommendations
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Breathing Exercise Modal */}
            <BreathingModal
                isOpen={showBreathingModal}
                onClose={() => setShowBreathingModal(false)}
            />

            {/* Journal Modal */}
            <JournalModal
                isOpen={showJournalModal}
                onClose={() => setShowJournalModal(false)}
            />
        </>
    );
}
