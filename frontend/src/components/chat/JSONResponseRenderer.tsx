import { motion } from "framer-motion";
import { AlertTriangle, ChevronRight, Heart, Lightbulb, ListChecks, MessageCircle } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Dynamic Response Types from Stage B
 * 
 * New unified format: { response: string, mode: string }
 * Legacy format: { response_type, message, empathetic_open, etc. }
 */

interface UnifiedResponse {
    response: string;
    mode: "initial_share" | "follow_up" | "casual" | "question" | "support";
}

interface LegacyTherapeuticResponse {
    response_type?: "therapeutic";
    title?: string;
    empathetic_open: string;
    summary?: string;
    what_i_heard?: string[];
    why_it_matters?: string;
    action_steps?: Array<{
        title: string;
        detail: string;
    }>;
    footer_note?: string;
}

interface LegacySimpleResponse {
    response_type: "acknowledgment" | "greeting" | "answer" | "follow_up";
    message: string;
    follow_up?: string;
    insight?: string;
    question?: string;
}

type ParsedResponse = UnifiedResponse | LegacyTherapeuticResponse | LegacySimpleResponse;

interface JSONResponseRendererProps {
    content: string;
    isBot?: boolean;
}

/**
 * Strips markdown code blocks from content if present
 */
function stripMarkdownCodeBlocks(content: string): string {
    let result = content.trim();

    // Handle ```json or ``` prefix
    if (result.startsWith("```")) {
        const firstNewline = result.indexOf("\n");
        if (firstNewline !== -1) {
            result = result.slice(firstNewline + 1);
        }
        if (result.endsWith("```")) {
            result = result.slice(0, -3).trim();
        }
    }

    // Handle loose "json" prefix
    if (result.startsWith("json")) {
        result = result.slice(4).trim();
    }

    return result;
}

/**
 * Decode unicode escape sequences in a string
 */
function decodeUnicode(str: string): string {
    try {
        // Handle unicode escape sequences like \ud83d\ude0a
        return str.replace(/\\u[\dA-Fa-f]{4}/gi, (match) => {
            return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
        });
    } catch {
        return str;
    }
}

/**
 * Extract markdown content from various response formats
 * Handles: JSON string with response field, parsed object, plain markdown
 */
export function extractMarkdown(content: any): string {
    try {
        // Case 1: backend returned a JSON string
        if (typeof content === "string" && content.trim().startsWith("{")) {
            const cleanContent = stripMarkdownCodeBlocks(content);
            const parsed = JSON.parse(cleanContent);
            if (parsed.response) {
                return decodeUnicode(parsed.response);
            }
            // Legacy format with empathetic_open - return empty to trigger full rendering
            if (parsed.empathetic_open || parsed.message) {
                return "";
            }
            return content;
        }

        // Case 2: backend returned an already-parsed object
        if (typeof content === "object" && content !== null && content.response) {
            return decodeUnicode(content.response);
        }

        // Case 3: plain markdown
        return typeof content === "string" ? content : "";
    } catch {
        // If parsing fails, fallback to raw string
        return typeof content === "string" ? content : "";
    }
}

/**
 * Check if response is the new unified format
 */
function isUnifiedResponse(parsed: any): parsed is UnifiedResponse {
    return typeof parsed.response === 'string' && typeof parsed.mode === 'string';
}

/**
 * Check if response is legacy therapeutic format
 */
function isLegacyTherapeutic(parsed: any): parsed is LegacyTherapeuticResponse {
    return typeof parsed.empathetic_open === 'string' || parsed.response_type === 'therapeutic';
}

/**
 * Check if response is legacy simple format
 */
function isLegacySimple(parsed: any): parsed is LegacySimpleResponse {
    return typeof parsed.message === 'string' &&
        ['acknowledgment', 'greeting', 'answer', 'follow_up'].includes(parsed.response_type);
}

/**
 * JSONResponseRenderer
 * 
 * Dynamically renders structured JSON responses from Stage B.
 * Supports both new unified format and legacy formats for backward compatibility.
 */
export function JSONResponseRenderer({ content, isBot = true }: JSONResponseRendererProps) {
    // Strip markdown code blocks and try to parse JSON
    const cleanContent = stripMarkdownCodeBlocks(content);
    let parsed: ParsedResponse | null = null;
    let parseError = false;

    try {
        parsed = JSON.parse(cleanContent);
    } catch (e) {
        // If not valid JSON, render as markdown
        parseError = true;
    }

    // If parse failed, render content as markdown (not raw)
    if (parseError || !parsed) {
        return <MarkdownRenderer markdown={content} />;
    }

    // NEW UNIFIED FORMAT: { response, mode }
    if (isUnifiedResponse(parsed)) {
        return <UnifiedResponseCard response={parsed} />;
    }

    // LEGACY: Simple responses (acknowledgment, greeting, etc.)
    if (isLegacySimple(parsed)) {
        return <LegacySimpleCard response={parsed} />;
    }

    // LEGACY: Full therapeutic response
    if (isLegacyTherapeutic(parsed)) {
        return <LegacyTherapeuticCard response={parsed} />;
    }

    // Unknown format - render as markdown
    return <MarkdownRenderer markdown={content} />;
}

/**
 * Beautiful Markdown Renderer with Green Theme
 */
function MarkdownRenderer({ markdown }: { markdown: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="prose prose-invert prose-sm max-w-none"
        >
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
                        <blockquote className="border-l-4 border-emerald-500/50 pl-4 py-1 my-3 italic text-emerald-300/80 bg-emerald-900/10 rounded-r-lg">
                            {children}
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
        </motion.div>
    );
}

/**
 * New unified response card - beautiful green themed
 */
function UnifiedResponseCard({ response }: { response: UnifiedResponse }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-emerald-500/10 p-1"
        >
            <div className="rounded-lg p-4">
                <MarkdownRenderer markdown={response.response} />
            </div>
        </motion.div>
    );
}

/**
 * Legacy simple response card
 */
function LegacySimpleCard({ response }: { response: LegacySimpleResponse }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
        >
            <p className="text-gray-100 text-base leading-relaxed">
                {response.message}
            </p>
            {response.follow_up && response.follow_up.trim() !== "" && (
                <p className="text-emerald-300/70 text-sm italic">
                    {response.follow_up}
                </p>
            )}
            {response.insight && response.insight.trim() !== "" && (
                <div className="flex items-start gap-2 text-gray-300 text-sm border-l-4 border-emerald-500/50 pl-3 py-1 bg-emerald-900/10 rounded-r-lg">
                    <Lightbulb className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>{response.insight}</span>
                </div>
            )}
            {response.question && response.question.trim() !== "" && (
                <p className="text-emerald-300/70 text-sm italic">
                    {response.question}
                </p>
            )}
        </motion.div>
    );
}

/**
 * Legacy full therapeutic response card with green theme
 */
function LegacyTherapeuticCard({ response }: { response: LegacyTherapeuticResponse }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
        >
            {/* Title / Emotional Summary */}
            {response.title && (
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-lg">
                    <span className="text-xl">💚</span>
                    <span>{response.title}</span>
                </div>
            )}

            {/* Empathetic Opening */}
            <p className="text-gray-100 text-base leading-relaxed">
                {response.empathetic_open}
            </p>

            {/* Summary */}
            {response.summary && (
                <p className="text-gray-300 text-sm leading-relaxed">
                    {response.summary}
                </p>
            )}

            {/* What I Heard */}
            {response.what_i_heard && response.what_i_heard.length > 0 && (
                <div className="rounded-xl bg-slate-800/50 border border-emerald-500/20 p-4">
                    <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold mb-3">
                        <span className="text-lg">💬</span>
                        <span>What I Heard</span>
                    </div>
                    <ul className="space-y-2">
                        {response.what_i_heard.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-gray-300 text-sm">
                                <ChevronRight className="h-4 w-4 text-emerald-500/60 mt-0.5 flex-shrink-0" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Why It Matters / Insight */}
            {response.why_it_matters && (
                <div className="flex items-start gap-2 text-sm border-l-4 border-emerald-500/50 pl-4 py-2 italic text-emerald-300/80 bg-emerald-900/10 rounded-r-lg">
                    <Lightbulb className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>{response.why_it_matters}</span>
                </div>
            )}

            {/* Action Steps */}
            {response.action_steps && response.action_steps.length > 0 && (
                <div className="mt-4 rounded-xl bg-gradient-to-br from-emerald-900/20 to-teal-900/10 border border-emerald-500/20 p-4">
                    <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold mb-4">
                        <span className="text-lg">🧭</span>
                        <span>Action Steps</span>
                    </div>
                    <div className="space-y-3">
                        {response.action_steps.map((step, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="flex items-start gap-3"
                            >
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-300 text-xs font-semibold border border-emerald-500/30">
                                    {idx + 1}
                                </div>
                                <div>
                                    <p className="text-gray-100 font-medium text-sm">{step.title}</p>
                                    <p className="text-gray-400 text-sm mt-0.5">{step.detail}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Footer Note (Safety) */}
            {response.footer_note && response.footer_note.trim() !== "" && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-start gap-2 bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-sm"
                >
                    <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-red-200">{response.footer_note}</p>
                </motion.div>
            )}
        </motion.div>
    );
}

export default JSONResponseRenderer;
