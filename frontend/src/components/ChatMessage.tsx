import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Message } from "@/lib/api";
import { JSONResponseRenderer, extractMarkdown } from "@/components/chat/JSONResponseRenderer";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronRight, Heart, MessageCircle, Lightbulb } from "lucide-react";

interface ChatMessageProps {
  message: Message;
}

/**
 * Check if content is JSON that needs special rendering
 */
function isJSONContent(content: string): boolean {
  if (!content || typeof content !== 'string') return false;

  let cleanContent = content.trim();

  // Strip markdown code blocks if present
  if (cleanContent.startsWith("```")) {
    const firstNewline = cleanContent.indexOf("\n");
    if (firstNewline !== -1) {
      cleanContent = cleanContent.slice(firstNewline + 1);
    }
    if (cleanContent.endsWith("```")) {
      cleanContent = cleanContent.slice(0, -3).trim();
    }
  }
  if (cleanContent.startsWith("json")) {
    cleanContent = cleanContent.slice(4).trim();
  }

  if (!cleanContent.startsWith('{')) return false;

  try {
    const parsed = JSON.parse(cleanContent);
    // Check for any known response structure
    return !!(
      parsed.response ||          // New unified format
      parsed.empathetic_open ||   // Legacy therapeutic
      parsed.message ||           // Legacy simple
      parsed.response_type        // Any typed response
    );
  } catch {
    return false;
  }
}

/**
 * Beautiful Markdown Renderer with Green Theme - for extracted markdown
 */
function BeautifulMarkdownRenderer({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Section headings with icons
          h2: ({ children }) => (
            <h2 className="flex items-center gap-2 text-lg font-semibold text-emerald-400 mb-3 mt-4 first:mt-0">
              <Heart className="h-5 w-5 text-emerald-400" />
              <span>{children}</span>
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="flex items-center gap-2 text-base font-semibold text-emerald-400/90 mt-4 mb-2">
              <MessageCircle className="h-4 w-4 text-emerald-400/80" />
              <span>{children}</span>
            </h3>
          ),
          // Bullet lists
          ul: ({ children }) => (
            <ul className="space-y-1.5 my-3 ml-1">{children}</ul>
          ),
          li: ({ children }) => (
            <li className="flex items-start gap-2 text-gray-300">
              <ChevronRight className="h-4 w-4 text-emerald-500/60 mt-0.5 flex-shrink-0" />
              <span>{children}</span>
            </li>
          ),
          // Ordered lists (action steps)
          ol: ({ children }) => (
            <ol className="space-y-3 my-3 rounded-xl bg-gradient-to-br from-emerald-900/20 to-teal-900/10 border border-emerald-500/20 p-4">
              {children}
            </ol>
          ),
          // Paragraphs
          p: ({ children }) => (
            <p className="leading-relaxed text-gray-200 mb-3 last:mb-0">{children}</p>
          ),
          // Blockquotes for insights
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-emerald-500/50 pl-4 py-1 my-3 italic text-emerald-300/80 bg-emerald-900/10 rounded-r-lg flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-emerald-400 mt-1 flex-shrink-0" />
              <span>{children}</span>
            </blockquote>
          ),
          // Bold text
          strong: ({ children }) => (
            <strong className="font-semibold text-emerald-300">{children}</strong>
          ),
          // Italic/emphasis
          em: ({ children }) => (
            <em className="italic text-gray-300">{children}</em>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isCrisis = message.isCrisis;
  const contentType = message.content_type || 'text';

  if (isCrisis) {
    return (
      <div className="flex justify-start mb-4 animate-fade-in-up">
        <div className="max-w-[80%] bg-crisis border-l-4 border-crisis-border rounded-xl p-4 shadow-md">
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

  // Check if bot message should use JSON renderer
  const shouldUseJSONRenderer = !isUser && (contentType === 'json' || isJSONContent(message.content));

  // For bot messages with JSON content
  if (shouldUseJSONRenderer) {
    // Try to extract markdown from unified format first
    const markdown = extractMarkdown(message.content);

    // If we got markdown from the new unified format, render it beautifully
    if (markdown && markdown.length > 0) {
      return (
        <div className="flex justify-start mb-4 animate-fade-in-up">
          <div className="max-w-[85%] rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-900/60 border border-emerald-500/20 p-5 shadow-lg">
            <BeautifulMarkdownRenderer markdown={markdown} />
            <p className="text-xs text-emerald-500/50 mt-4 pt-3 border-t border-emerald-500/10">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      );
    }

    // Otherwise use full JSONResponseRenderer for legacy formats
    return (
      <div className="flex justify-start mb-4 animate-fade-in-up">
        <div className="max-w-[85%] rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-900/60 border border-emerald-500/20 p-5 shadow-lg">
          <JSONResponseRenderer content={message.content} isBot={true} />
          <p className="text-xs text-emerald-500/50 mt-4 pt-3 border-t border-emerald-500/10">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    );
  }

  // Default rendering for user messages and plain text bot messages
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in-up`}>
      <div
        className={`max-w-[80%] rounded-xl p-4 shadow-md ${isUser
          ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white'
          : 'bg-gradient-to-br from-slate-800/80 to-slate-900/60 border border-emerald-500/20 text-gray-100'
          }`}
      >
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
        <p className={`text-xs mt-2 ${isUser ? 'text-emerald-200/60' : 'text-emerald-500/50'}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
