import { Loader2 } from "lucide-react";

export function ThinkingIndicator() {
  return (
    <div className="flex justify-start mb-4 animate-fade-in-up">
      <div className="bg-chat-ai-bg border-l-4 border-chat-ai-border rounded-lg p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground animate-pulse-gentle">
            MindEase is reflecting...
          </span>
        </div>
      </div>
    </div>
  );
}
