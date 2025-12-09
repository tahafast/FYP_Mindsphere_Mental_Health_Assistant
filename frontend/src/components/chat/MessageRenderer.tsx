import { Message } from "@/lib/api";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from 'react';

interface MessageRendererProps {
    message: Message;
    contentType?: "text" | "markdown";
}

/**
 * MessageRenderer - Renders chat messages with support for markdown and crisis modes
 * 
 * Features:
 * - Markdown rendering with GitHub Flavored Markdown (GFM)
 * - Progressive disclosure for long content
 * - Crisis mode with action buttons
 * - Safe HTML sanitization (via react-markdown)
 */
export function MessageRenderer({ message, contentType = "text" }: MessageRendererProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const isUser = message.role === 'user';
    const isCrisis = message.isCrisis;

    // Crisis mode rendering
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

    // Regular message rendering
    const isMarkdown = contentType === "markdown" && !isUser;
    const shouldShowExpand = !isUser && message.content.length > 400;
    const displayContent = shouldShowExpand && !isExpanded
        ? message.content.slice(0, 400) + "..."
        : message.content;

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in-up`}>
            <div
                className={`max-w-[80%] rounded-lg p-4 shadow-sm ${isUser
                        ? 'bg-chat-user-bg text-chat-user-fg'
                        : 'bg-chat-ai-bg text-chat-ai-fg border-l-4 border-chat-ai-border'
                    }`}
            >
                {isMarkdown ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                // Custom heading styling
                                h2: ({ node, ...props }) => (
                                    <h2 className="text-base font-semibold mt-2 mb-2" {...props} />
                                ),
                                // Custom list styling
                                ul: ({ node, ...props }) => (
                                    <ul className="list-disc pl-4 my-2 space-y-1" {...props} />
                                ),
                                ol: ({ node, ...props }) => (
                                    <ol className="list-decimal pl-4 my-2 space-y-1" {...props} />
                                ),
                                // Ensure links are safe
                                a: ({ node, ...props }) => (
                                    <a className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
                                ),
                                // Prevent code blocks from breaking layout
                                pre: ({ node, ...props }) => (
                                    <pre className="overflow-x-auto bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs" {...props} />
                                ),
                            }}
                        >
                            {displayContent}
                        </ReactMarkdown>
                    </div>
                ) : (
                    <p className="text-sm whitespace-pre-wrap">{displayContent}</p>
                )}

                {shouldShowExpand && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-xs text-blue-600 hover:underline mt-2 block"
                    >
                        {isExpanded ? "Show less" : "Read more"}
                    </button>
                )}

                <p className="text-xs text-muted-foreground mt-2">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
    );
}
