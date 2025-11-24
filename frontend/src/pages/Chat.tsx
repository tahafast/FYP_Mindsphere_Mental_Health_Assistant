import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { ChatMessage } from "@/components/ChatMessage";
import { ThinkingIndicator } from "@/components/ThinkingIndicator";
import { ChatSidebar } from "@/components/ChatSidebar";
import { sendMessage, Message, createChatSession } from "@/lib/api";
import { toast } from "sonner";

const Chat = () => {
  const [activeSessionId, setActiveSessionId] = useState<string>("1");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello, I'm MindEase. I'm here to listen and support you. How are you feeling today?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
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

    try {
      const response = await sendMessage(input, messages);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        isCrisis: response.isCrisis,
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
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
          content: "Hello, I'm MindEase. I'm here to listen and support you. How are you feeling today?",
          timestamp: new Date(),
        }
      ]);
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
        content: "Hello, I'm MindEase. I'm here to listen and support you. How are you feeling today?",
        timestamp: new Date(),
      }
    ]);
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
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="border-b border-border bg-card p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Your Safe Space</h2>
          <p className="text-sm text-muted-foreground">A confidential conversation</p>
        </div>

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
              Disclaimer: MindEase is an AI assistant, not a licensed therapist or medical professional. 
              For emergencies, call 988 or your local crisis line.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
