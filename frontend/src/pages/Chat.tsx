import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, AlertTriangle, Menu, Brain, SquarePen, Phone, Activity } from "lucide-react";
import { ChatMessage } from "@/components/ChatMessage";
import { ThinkingIndicator } from "@/components/ThinkingIndicator";
import { ChatSidebarNew } from "@/components/ChatSidebar";
import { sendMessage, Message, createChatSession, getChatMessages } from "@/lib/api";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface CrisisData {
  isCrisis: boolean;
  crisisType: string;
  message: string;
  immediate_action: {
    primary_directive: string;
    grounding_technique: string;
    emergency_contacts: { name: string; number: string; action: string }[];
  };
}

const Chat = () => {
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [showCrisisAlert, setShowCrisisAlert] = useState(false);
  const [crisisData, setCrisisData] = useState<CrisisData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const USER_ID = "user123"; // Hardcoded for now

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  // Auto-init session if none exists
  useEffect(() => {
    const initSession = async () => {
      if (!activeSessionId) {
        try {
          const newSession = await createChatSession(USER_ID);
          setActiveSessionId(newSession.id);
          // Refresh sidebar
          queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
        } catch (error) {
          console.error("Failed to create initial session", error);
        }
      }
    };
    initSession();
  }, [activeSessionId, queryClient]);

  const handleSend = async () => {
    if (!input.trim() || isThinking || !activeSessionId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    // Check if this is the first user message to trigger title refresh later
    const isFirstMessage = messages.length === 1 && messages[0].role === 'assistant';

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsThinking(true);
    setShowCrisisAlert(false);

    try {
      // Pass user_id and session_id
      const response = await sendMessage(input, USER_ID, activeSessionId);

      // If it was the first message, refresh the sidebar after a short delay to show the new title
      if (isFirstMessage) {
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
        }, 2000); // Wait for background title generation
      }

      if (response.crisis_detected) {
        setShowCrisisAlert(true);
        let sanitizedContent = "⚠️ Crisis Protocol Activated. Resources provided.";

        try {
          // Try to parse the response as JSON if it's a medical emergency
          const parsed = JSON.parse(response.response);
          if (parsed.crisisType === 'medical_emergency') {
            setCrisisData(parsed);
            // We don't want to show the raw JSON in the chat
            // The overlay will handle the detailed information
          }
        } catch (e) {
          // Not JSON, standard crisis or parsing failed
          console.log("Standard crisis detected or parsing error");
          sanitizedContent = response.response; // Fallback to original if not JSON
        }

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: sanitizedContent,
          timestamp: new Date(),
          isCrisis: true,
        };
        setMessages(prev => [...prev, aiMessage]);

        toast.error("Crisis Protocol Activated", {
          duration: 5000,
        });
      } else {
        // Standard response
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.response,
          timestamp: new Date(),
          isCrisis: false,
        };
        setMessages(prev => [...prev, aiMessage]);
      }

    } catch (error: any) {
      toast.error(error.message || "Failed to send message. Please try again.");
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = async () => {
    try {
      const newSession = await createChatSession(USER_ID);
      setActiveSessionId(newSession.id);
      setMessages([]);
      setShowCrisisAlert(false);
      queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
      toast.success("New conversation started");
    } catch (error) {
      toast.error("Failed to create new chat");
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    try {
      const history = await getChatMessages(sessionId);
      if (history.length > 0) {
        setMessages(history);
      } else {
        setMessages([]);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load chat history");
    }
    setShowCrisisAlert(false);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <ChatSidebarNew
        activeSessionId={activeSessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Area - The "Shifting" Container */}
      <div className="flex-1 flex flex-col relative min-w-0 transition-all duration-300 ease-in-out">

        {/* Crisis Alert Banner */}
        {showCrisisAlert && (
          <div className="p-4 bg-destructive/10 border-b border-destructive/20">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Important Safety Information</AlertTitle>
              <AlertDescription>
                If you or someone you know is in immediate danger, please call emergency services (911/112) or a crisis hotline immediately.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Chat History / Hero */}
        <div className="flex-1 overflow-y-auto pb-32">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center space-y-4">
              <div className="mb-6 rounded-full bg-primary/10 p-4">
                <Brain className="h-12 w-12 text-primary" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60 mb-2 animate-pulse-slow">
                Hello, Meet MindSphere.
              </h1>
              <p className="text-xl text-muted-foreground">
                Your personal mental health AI assistant
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto p-4 space-y-6">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isThinking && <ThinkingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area - Pinned to Bottom of THIS container */}
        <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-background via-background to-transparent z-20">
          <div className="max-w-3xl mx-auto relative">
            <div className="relative bg-secondary/40 backdrop-blur-md rounded-[2rem] border border-border/50 shadow-lg transition-all duration-300 focus-within:ring-1 focus-within:ring-emerald-500/50 focus-within:shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Share what's on your mind..."
                className="min-h-[60px] w-full resize-none bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-4 pr-14 text-base rounded-[2rem]"
                disabled={isThinking}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isThinking}
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-primary hover:bg-primary-hover hover:scale-105 transition-transform shadow-sm"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground/60 text-center mt-2">
              MindSphere is an AI assistant, not a licensed therapist. For emergencies, call 15 or 1122.
            </p>
          </div>
        </div>
      </div>

      {/* Medical Crisis Overlay */}
      {crisisData && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="max-w-md w-full space-y-8">
            <div className="flex flex-col items-center gap-4 text-destructive">
              <Activity className="h-16 w-16 animate-pulse" />
              <h1 className="text-3xl font-bold tracking-tighter">MEDICAL ALERT</h1>
            </div>

            <div className="space-y-4">
              <div className="bg-card border-2 border-destructive/20 p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-semibold mb-2">Primary Directive</h3>
                <p className="text-lg leading-relaxed font-medium">
                  {crisisData.immediate_action.primary_directive}
                </p>
              </div>

              <div className="bg-primary/5 p-8 rounded-full w-64 h-64 mx-auto flex items-center justify-center animate-pulse duration-[4000ms]">
                <div className="text-center flex flex-col items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground uppercase tracking-widest mb-2">Grounding</p>
                  <p className="font-semibold text-lg leading-relaxed text-primary">
                    {crisisData.immediate_action.grounding_technique}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              {crisisData.immediate_action.emergency_contacts.map((contact, idx) => (
                <Button
                  key={idx}
                  variant="destructive"
                  size="lg"
                  className="w-full h-16 text-xl font-bold gap-2 shadow-xl hover:scale-105 transition-transform"
                  onClick={() => window.location.href = `tel:${contact.number}`}
                >
                  <Phone className="h-6 w-6" />
                  {contact.action}: {contact.number}
                </Button>
              ))}
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => setCrisisData(null)}
              >
                I am safe now (Dismiss)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
