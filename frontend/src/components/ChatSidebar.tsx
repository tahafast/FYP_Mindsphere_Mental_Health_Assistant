import { Plus, MessageSquare, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface ChatSession {
  id: string;
  name: string;
  timestamp: Date;
}

// Mock chat sessions - will be fetched from backend later
const mockChatSessions: ChatSession[] = [
  { id: "1", name: "Understanding Anxiety", timestamp: new Date() },
  { id: "2", name: "Daily Check-in", timestamp: new Date(Date.now() - 86400000) },
  { id: "3", name: "Session 1", timestamp: new Date(Date.now() - 172800000) },
  { id: "4", name: "Coping Strategies", timestamp: new Date(Date.now() - 259200000) },
];

interface ChatSidebarContentProps {
  activeSessionId?: string;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
}

function ChatSidebarContent({ activeSessionId, onNewChat, onSelectSession }: ChatSidebarContentProps) {
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
            {mockChatSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  activeSessionId === session.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-primary"
                    : "text-sidebar-foreground"
                )}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span className="truncate">{session.name}</span>
                </div>
              </button>
            ))}
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
}

export function ChatSidebar({ activeSessionId, onNewChat, onSelectSession }: ChatSidebarProps) {
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
      />
    </aside>
  );
}
