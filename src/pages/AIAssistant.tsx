import { useRef, useEffect } from "react";
import { Trash2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ChatMessage } from "@/components/ai/ChatMessage";
import { ChatInput } from "@/components/ai/ChatInput";
import { WelcomeCard } from "@/components/ai/WelcomeCard";
import { ConnectionForm } from "@/components/ai/ConnectionForm";
import { useAIChat } from "@/hooks/useAIChat";

export default function AIAssistant() {
  const { 
    messages, 
    isLoading, 
    sendMessage, 
    clearMessages,
    connection,
    isConnecting,
    connect,
    disconnect
  } = useAIChat();
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const isConnected = !!connection;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 glass border-b border-border/50">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-foreground">مساعد قاعدة البيانات</h1>
              <p className="text-xs text-muted-foreground">
                {isConnected ? "متصل" : "غير متصل"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && isConnected && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearMessages}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 ml-2" />
                مسح
              </Button>
            )}
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings2 className="w-4 h-4 ml-2" />
                  الاتصال
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                <div className="mt-6">
                  <ConnectionForm
                    onConnect={connect}
                    isConnecting={isConnecting}
                    existingConnection={connection}
                    onDisconnect={disconnect}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container max-w-4xl mx-auto px-4 flex flex-col">
        {!isConnected ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            <div className="w-full max-w-md">
              <ConnectionForm
                onConnect={connect}
                isConnecting={isConnecting}
              />
            </div>
            <WelcomeCard onExampleClick={() => {}} isConnected={false} />
          </div>
        ) : (
          <>
            <ScrollArea
              ref={scrollRef}
              className="flex-1 py-4"
              style={{ height: "calc(100vh - 200px)" }}
            >
              {messages.length === 0 ? (
                <WelcomeCard onExampleClick={sendMessage} isConnected={true} />
              ) : (
                <div className="space-y-2">
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      role={message.role}
                      content={message.content}
                    />
                  ))}
                  {isLoading && (
                    <ChatMessage role="assistant" content="" isLoading />
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Input Area */}
            <div className="sticky bottom-0 py-4 bg-gradient-to-t from-background via-background to-transparent">
              <ChatInput onSend={sendMessage} isLoading={isLoading} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
