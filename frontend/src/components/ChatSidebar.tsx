import { Plus, MessageSquare, Menu, Trash2, SquarePen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getChatSessions, deleteSession } from "@/lib/api";
import { toast } from "sonner";

// 1. Ensure Interface matches Backend Pydantic Model exactly
interface ChatSession {
  session_id: string; // Changed from id to session_id
  title: string;      // Changed from name to title (if backend uses 'title')
  created_at: string;
}

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
    e.nativeEvent.stopImmediatePropagation();
    if (confirm("Delete this conversation?")) {
      deleteMutation.mutate(sessionId);
    }
  };

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Chat History */}
      <div className="flex-1 overflow-hidden pt-2">
        <ScrollArea className="h-[calc(100%-3rem)]">
          <div className="px-2 pb-4 space-y-1">
            {isLoading ? (
              <div className="px-4 py-2 text-sm text-muted-foreground">Loading...</div>
            ) : sessions.length === 0 ? (
              <div className="px-4 py-2 text-sm text-muted-foreground">No recent chats</div>
            ) : (
              sessions.map((session: any) => {
                const currentId = session.session_id || session.id;
                const currentTitle = session.title || session.name || "Untitled Chat";

                return (
                  <div
                    key={currentId}
                    onClick={() => onSelectSession(currentId)}
                    className={cn(
                      "group grid grid-cols-[auto_1fr_auto] items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer min-h-[40px]",
                      activeSessionId === currentId
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                    )}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0" />

                    <span className="truncate text-left min-w-0">
                      {currentTitle}
                    </span>

                    {/* Delete Button: Grid Item - Clean Style */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={(e) => handleDelete(e, currentId)}
                      className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100 z-50"
                      title="Delete chat"
                    >
                      <Trash2 className="h-4 w-4" />
                    </div>
                  </div>
                );
              })
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
  userId?: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function ChatSidebarNew({ activeSessionId, onNewChat, onSelectSession, userId = "user123", isOpen, onToggle }: ChatSidebarProps) {
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
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-sidebar-border transition-all duration-300 ease-in-out overflow-hidden bg-sidebar",
        isOpen ? "w-64" : "w-16"
      )}
    >
      {/* Rail Header */}
      <div className="flex flex-col gap-4 p-4 border-b border-sidebar-border/50 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Button
          onClick={() => {
            if (!isOpen) onToggle();
            onNewChat();
          }}
          variant="ghost"
          size="icon"
          className={cn(
            "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all",
            isOpen && "w-full justify-start gap-2 px-2"
          )}
          title="New Chat"
        >
          <SquarePen className="h-5 w-5" />
          {isOpen && <span>New Chat</span>}
        </Button>
      </div>

      {/* Chat History List */}
      <div className={cn(
        "flex-1 overflow-hidden transition-opacity duration-300",
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        <ChatSidebarContent
          activeSessionId={activeSessionId}
          onNewChat={onNewChat}
          onSelectSession={onSelectSession}
          userId={userId}
        />
      </div>
    </aside>
  );
}
