import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Message } from "@/lib/api";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isCrisis = message.isCrisis;

  if (isCrisis) {
    return (
      <div className="flex justify-start mb-4 animate-fade-in-up">
        <div className="max-w-[80%] bg-crisis border-l-4 border-crisis-border rounded-lg p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-crisis-foreground flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-crisis-foreground whitespace-pre-wrap">
                {message.content}
              </p>
              <div className="mt-3 pt-3 border-t border-crisis-border">
                <p className="text-xs font-semibold text-crisis-foreground mb-2">
                  Get immediate help:
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => window.open('tel:988', '_blank')}
                  >
                    Call 988 - Suicide & Crisis Lifeline
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open('https://988lifeline.org/chat/', '_blank')}
                  >
                    Chat Online
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in-up`}>
      <div
        className={`max-w-[80%] rounded-lg p-4 shadow-sm ${
          isUser
            ? 'bg-chat-user-bg text-chat-user-fg'
            : 'bg-chat-ai-bg text-chat-ai-fg border-l-4 border-chat-ai-border'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p className="text-xs text-muted-foreground mt-2">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
