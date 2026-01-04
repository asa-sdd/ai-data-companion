import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, isLoading, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading && !disabled) {
      onSend(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [message]);

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="glass rounded-2xl p-2 shadow-lg">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="اكتب سؤالك هنا... مثال: أرني جميع المنتجات"
            disabled={isLoading || disabled}
            className={cn(
              "flex-1 resize-none bg-transparent px-4 py-3 text-foreground placeholder:text-muted-foreground",
              "focus:outline-none disabled:opacity-50",
              "min-h-[48px] max-h-[150px]"
            )}
            rows={1}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!message.trim() || isLoading || disabled}
            className={cn(
              "h-12 w-12 rounded-xl transition-all duration-200",
              message.trim() && !isLoading
                ? "bg-primary hover:bg-primary/90"
                : "bg-muted text-muted-foreground"
            )}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5 rotate-180" />
            )}
          </Button>
        </div>
      </div>
      
      <div className="flex justify-center mt-2">
        <p className="text-xs text-muted-foreground">
          اضغط Enter للإرسال • Shift+Enter لسطر جديد
        </p>
      </div>
    </form>
  );
}
