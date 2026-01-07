import { useState, useEffect } from "react";
import { MessageSquare, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Message } from "@/hooks/useAIChat";

export interface SavedConversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

const CONVERSATIONS_KEY = "saved_conversations";

interface SavedConversationsProps {
  onLoad: (messages: Message[]) => void;
  currentMessages: Message[];
  onSave: () => void;
}

export function SavedConversations({ onLoad, currentMessages, onSave }: SavedConversationsProps) {
  const [conversations, setConversations] = useState<SavedConversation[]>([]);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = () => {
    const saved = localStorage.getItem(CONVERSATIONS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConversations(parsed.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
        })));
      } catch (e) {
        console.error("Failed to parse saved conversations:", e);
      }
    }
  };

  const deleteConversation = (id: string) => {
    const updated = conversations.filter((c) => c.id !== id);
    setConversations(updated);
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(updated));
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ar", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  if (conversations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">لا توجد محادثات محفوظة</p>
        <p className="text-xs mt-1">احفظ محادثة للوصول إليها لاحقاً</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-2 p-1">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={cn(
              "group p-3 rounded-lg border border-border hover:border-primary/30 transition-colors cursor-pointer",
              "hover:bg-muted/50"
            )}
            onClick={() => onLoad(conv.messages)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{conv.title}</h4>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(conv.updatedAt)}</span>
                  <span>•</span>
                  <span>{conv.messages.length} رسالة</span>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conv.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

export function saveConversation(messages: Message[]): SavedConversation | null {
  if (messages.length === 0) return null;

  const saved = localStorage.getItem(CONVERSATIONS_KEY);
  let conversations: SavedConversation[] = [];
  
  if (saved) {
    try {
      conversations = JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse saved conversations:", e);
    }
  }

  // Generate title from first user message
  const firstUserMsg = messages.find((m) => m.role === "user");
  const title = firstUserMsg?.content.slice(0, 50) || "محادثة جديدة";

  const newConversation: SavedConversation = {
    id: crypto.randomUUID(),
    title: title + (title.length >= 50 ? "..." : ""),
    messages,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  conversations.unshift(newConversation);
  
  // Keep only last 20 conversations
  if (conversations.length > 20) {
    conversations = conversations.slice(0, 20);
  }

  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
  return newConversation;
}
