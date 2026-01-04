import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SupabaseConnection } from "@/components/ai/ConnectionForm";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const STORAGE_KEY = "supabase_connection";

export function useAIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connection, setConnection] = useState<SupabaseConnection | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Load connection from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConnection(parsed);
      } catch (e) {
        console.error("Failed to parse saved connection:", e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const connect = useCallback(async (newConnection: SupabaseConnection) => {
    setIsConnecting(true);
    
    try {
      // Test connection by sending a simple message
      const { data, error } = await supabase.functions.invoke("ai-database", {
        body: {
          messages: [{ role: "user", content: "اختبار الاتصال" }],
          conversationHistory: [],
          supabaseUrl: newConnection.url,
          supabaseKey: newConnection.anonKey,
        },
      });

      if (error) {
        throw error;
      }

      if (data.error === 'invalid_key' || data.error === 'invalid_url') {
        toast.error(data.response);
        return false;
      }

      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConnection));
      setConnection(newConnection);
      toast.success("تم الاتصال بنجاح!");
      
      // Add welcome message
      const welcomeMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "مرحباً! تم الاتصال بقاعدة بياناتك بنجاح. يمكنك الآن سؤالي عن جداولك أو طلب إضافة/تعديل/حذف البيانات.",
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
      
      return true;
    } catch (error: any) {
      console.error("Connection error:", error);
      toast.error("فشل الاتصال. تأكد من صحة البيانات.");
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setConnection(null);
    setMessages([]);
    toast.info("تم قطع الاتصال");
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!connection) {
      toast.error("يرجى الاتصال بقاعدة البيانات أولاً");
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Prepare conversation history for context
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke("ai-database", {
        body: {
          messages: [{ role: "user", content }],
          conversationHistory,
          supabaseUrl: connection.url,
          supabaseKey: connection.anonKey,
        },
      });

      if (error) {
        throw error;
      }

      // Check for rate limit
      if (data.error === 'rate_limit') {
        toast.error("تم تجاوز حد الطلبات. يرجى الانتظار قليلاً.");
      }

      // Add AI response
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response || "عذراً، لم أتمكن من معالجة طلبك.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error("حدث خطأ في الاتصال بالمساعد الذكي");

      // Add error message
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `عذراً، حدث خطأ: ${error.message || "خطأ غير معروف"}`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, connection]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    connection,
    isConnecting,
    connect,
    disconnect,
  };
}
