import { useState } from "react";
import { Database, Link, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface SupabaseConnection {
  url: string;
  anonKey: string;
}

interface ConnectionFormProps {
  onConnect: (connection: SupabaseConnection) => void;
  isConnecting?: boolean;
  existingConnection?: SupabaseConnection | null;
  onDisconnect?: () => void;
}

export function ConnectionForm({ 
  onConnect, 
  isConnecting, 
  existingConnection,
  onDisconnect 
}: ConnectionFormProps) {
  const [url, setUrl] = useState(existingConnection?.url || "");
  const [anonKey, setAnonKey] = useState(existingConnection?.anonKey || "");
  const [showKey, setShowKey] = useState(false);
  const [errors, setErrors] = useState<{ url?: string; anonKey?: string }>({});

  const validateForm = () => {
    const newErrors: { url?: string; anonKey?: string } = {};

    if (!url.trim()) {
      newErrors.url = "يرجى إدخال عنوان Supabase";
    } else if (!url.includes("supabase.co") && !url.includes("supabase.in")) {
      newErrors.url = "العنوان غير صالح. يجب أن يكون بالشكل: https://xxxxx.supabase.co";
    }

    if (!anonKey.trim()) {
      newErrors.anonKey = "يرجى إدخال Anon Key";
    } else if (anonKey.length < 100) {
      newErrors.anonKey = "المفتاح قصير جداً. تأكد من نسخ المفتاح كاملاً";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onConnect({ url: url.trim(), anonKey: anonKey.trim() });
    }
  };

  if (existingConnection) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-success" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">متصل بنجاح</h3>
              <p className="text-sm text-muted-foreground truncate max-w-[250px]">
                {existingConnection.url}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onDisconnect}
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            قطع الاتصال
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-3">
          <Database className="w-7 h-7 text-white" />
        </div>
        <CardTitle className="text-xl">اتصل بقاعدة بياناتك</CardTitle>
        <CardDescription>
          أدخل بيانات مشروع Supabase الخاص بك للبدء
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url" className="flex items-center gap-2">
              <Link className="w-4 h-4" />
              عنوان المشروع (Project URL)
            </Label>
            <Input
              id="url"
              type="url"
              placeholder="https://xxxxx.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={cn(
                "font-mono text-sm",
                errors.url && "border-destructive focus-visible:ring-destructive"
              )}
              dir="ltr"
            />
            {errors.url && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.url}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="anonKey" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              مفتاح API (Anon Key)
            </Label>
            <div className="relative">
              <Input
                id="anonKey"
                type={showKey ? "text" : "password"}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                className={cn(
                  "font-mono text-sm pl-10",
                  errors.anonKey && "border-destructive focus-visible:ring-destructive"
                )}
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.anonKey && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.anonKey}
              </p>
            )}
          </div>

          <div className="bg-info/10 rounded-lg p-3 text-sm text-info-foreground">
            <p className="font-medium mb-1">أين أجد هذه البيانات؟</p>
            <p className="text-muted-foreground">
              في لوحة تحكم Supabase ← Settings ← API
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                جاري الاتصال...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 ml-2" />
                اتصال
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
