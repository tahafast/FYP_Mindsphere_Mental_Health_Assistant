import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, AlertTriangle } from "lucide-react";
import { ChatMessage } from "@/components/ChatMessage";
import { ThinkingIndicator } from "@/components/ThinkingIndicator";
import { ChatSidebar } from "@/components/ChatSidebar";
import { sendMessage, Message, createChatSession } from "@/lib/api";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Phone, Activity } from "lucide-react";

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
  const [activeSessionId, setActiveSessionId] = useState<string>("1");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello, I'm MindSphere. I'm here to listen and support you. How are you feeling today?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [showCrisisAlert, setShowCrisisAlert] = useState(false);
  const [crisisData, setCrisisData] = useState<CrisisData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSend = async () => {
    if (!input.trim() || isThinking) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsThinking(true);
    setShowCrisisAlert(false);

    try {
      // Pass user_id (hardcoded "user123" for now)
      const response = await sendMessage(input, "user123");

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response, // Note: Backend returns 'response', not 'message'
        timestamp: new Date(),
        isCrisis: response.crisis_detected,
      };

      setMessages(prev => [...prev, aiMessage]);

      if (response.crisis_detected) {
        setShowCrisisAlert(true);
        try {
          // Try to parse the response as JSON if it's a medical emergency
          const parsed = JSON.parse(response.response);
          if (parsed.crisisType === 'medical_emergency') {
            setCrisisData(parsed);
          }
        } catch (e) {
          // Not JSON, standard crisis
          console.log("Standard crisis detected");
        }

        toast.error("Crisis Protocol Activated", {
          duration: 5000,
        });
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
      const newSession = await createChatSession();
      setActiveSessionId(newSession.id);
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: "Hello, I'm MindSphere. I'm here to listen and support you. How are you feeling today?",
          timestamp: new Date(),
        }
      ]);
      setShowCrisisAlert(false);
      toast.success("New conversation started");
    } catch (error) {
      toast.error("Failed to create new chat");
    }
  };

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    // In a real app, fetch messages for this session
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: "Hello, I'm MindSphere. I'm here to listen and support you. How are you feeling today?",
        timestamp: new Date(),
      }
    ]);
    setShowCrisisAlert(false);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full">
      {/* Left Sidebar - Chat History */}
      <ChatSidebar
        activeSessionId={activeSessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Chat Header */}
        <div className="border-b border-border bg-card p-4 shadow-sm flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Your Safe Space</h2>
            <p className="text-sm text-muted-foreground">A confidential conversation</p>
          </div>
          {showCrisisAlert && (
            <div className="flex items-center gap-2 text-destructive font-bold animate-pulse">
              <AlertTriangle className="h-5 w-5" />
              <span>CRISIS RESOURCES DETECTED</span>
            </div>
          )}
        </div>

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

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
          <div className="max-w-4xl mx-auto">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isThinking && <ThinkingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-border bg-card p-4 shadow-lg">
          <div className="max-w-4xl mx-auto space-y-3">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Share what's on your mind..."
                className="min-h-[60px] resize-none bg-background"
                disabled={isThinking}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isThinking}
                size="icon"
                className="h-[60px] w-[60px] flex-shrink-0 bg-primary hover:bg-primary-hover"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Disclaimer: MindSphere is an AI assistant, not a licensed therapist or medical professional.
              For emergencies, call 988 or your local crisis line.
            </p>
          </div>
        </div>
      </div>


      {/* Medical Crisis Overlay */}
      {
        crisisData && (
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
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground uppercase tracking-widest mb-2">Grounding</p>
                    <p className="font-medium text-primary">
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
        )
      }
    </div >
  );
};

export default Chat;
