import { Plus, MessageSquare, Menu, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getChatSessions, deleteSession, ChatSession } from "@/lib/api";
import { toast } from "sonner";

interface ChatSidebarContentProps {
  activeSessionId?: string;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  userId: string;
}

function ChatSidebarContent({ activeSessionId, onNewChat, onSelectSession, userId }: ChatSidebarContentProps) {
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['chatSessions', userId],
    queryFn: () => getChatSessions(userId),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
      toast.success("Chat deleted");
    },
    onError: () => {
      toast.error("Failed to delete chat");
    }
  });

  const handleDelete = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this chat?")) {
      deleteMutation.mutate(sessionId);
    }
  };

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* New Chat Button */}
      <div className="p-4 border-b border-sidebar-border">
        <Button
          onClick={onNewChat}
          className="w-full justify-start gap-2 bg-primary hover:bg-primary-hover text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-hidden">
        <div className="px-4 py-3">
          <h3 className="text-xs font-semibold text-sidebar-foreground uppercase tracking-wider">
            Recent Conversations
          </h3>
        </div>
        <ScrollArea className="h-[calc(100%-3rem)]">
          <div className="px-2 pb-4 space-y-1">
            {isLoading ? (
              <div className="px-4 py-2 text-sm text-muted-foreground">Loading...</div>
            ) : sessions.length === 0 ? (
              <div className="px-4 py-2 text-sm text-muted-foreground">No recent chats</div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className={cn(
                    "group relative w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors cursor-pointer flex items-center justify-between",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    activeSessionId === session.id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-primary"
                      : "text-sidebar-foreground"
                  )}
                >
                  <div className="flex items-start gap-2 overflow-hidden">
                    <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span className="truncate">{session.name}</span>
                  </div>

                  <button
                    onClick={(e) => handleDelete(e, session.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 hover:text-destructive rounded"
                    title="Delete Chat"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

interface ChatSidebarProps {
  activeSessionId?: string;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  userId?: string; // Optional to keep backward compatibility if needed, but we'll pass it
}

export function ChatSidebar({ activeSessionId, onNewChat, onSelectSession, userId = "user123" }: ChatSidebarProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-20 left-4 z-40 md:hidden"
            aria-label="Open chat history"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <ChatSidebarContent
            activeSessionId={activeSessionId}
            onNewChat={onNewChat}
            onSelectSession={onSelectSession}
            userId={userId}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className="hidden md:block w-72 border-r border-sidebar-border">
      <ChatSidebarContent
        activeSessionId={activeSessionId}
        onNewChat={onNewChat}
        onSelectSession={onSelectSession}
        userId={userId}
      />
    </aside>
  );
}
