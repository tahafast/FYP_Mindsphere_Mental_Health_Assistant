import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getChatSessions, getChatMessages, deleteSession, ChatSession } from "@/lib/api";
import { Play, Trash2, Download, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const USER_ID = "user123";

export function RecentConversations() {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [previews, setPreviews] = useState<Record<string, string>>({});
    const navigate = useNavigate();

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const allSessions = await getChatSessions(USER_ID);
            const recent = allSessions.slice(0, 5);
            setSessions(recent);

            // Fetch preview for each session (first user message)
            const previewMap: Record<string, string> = {};
            for (const session of recent) {
                try {
                    const messages = await getChatMessages(session.id);
                    const firstUserMsg = messages.find(m => m.role === 'user');
                    if (firstUserMsg) {
                        previewMap[session.id] = firstUserMsg.content.substring(0, 80) + (firstUserMsg.content.length > 80 ? '...' : '');
                    }
                } catch (e) {
                    console.error(`Failed to fetch messages for session ${session.id}`, e);
                }
            }
            setPreviews(previewMap);
        } catch (error) {
            console.error("Failed to fetch sessions", error);
        } finally {
            setLoading(false);
        }
    };

    const handleContinue = (sessionId: string) => {
        navigate(`/?session=${sessionId}`);
    };

    const handleDelete = async (sessionId: string) => {
        try {
            await deleteSession(sessionId);
            setSessions(sessions.filter(s => s.id !== sessionId));
            toast.success("Conversation deleted");
        } catch (error) {
            toast.error("Failed to delete conversation");
        }
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Recent Conversations</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }

    if (sessions.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Recent Conversations</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-8">
                        No conversations yet. Start a new chat to begin your journey.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Conversations</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {sessions.map((session) => (
                        <div
                            key={session.id}
                            className="flex items-start justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors duration-200 group"
                        >
                            <div className="flex-1 min-w-0 mr-4">
                                <h4 className="font-medium text-sm mb-1 truncate">
                                    {session.name}
                                </h4>
                                {previews[session.id] && (
                                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                        {previews[session.id]}
                                    </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    {new Date(session.timestamp).toLocaleDateString([], {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </p>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleContinue(session.id)}
                                    className="h-8 w-8 p-0 hover:bg-primary/10"
                                    title="Continue"
                                >
                                    <Play className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(session.id)}
                                    className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                    title="Delete"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled
                                    className="h-8 w-8 p-0"
                                    title="Export (coming soon)"
                                >
                                    <Download className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
