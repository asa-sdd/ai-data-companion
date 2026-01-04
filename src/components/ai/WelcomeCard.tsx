import { Database, MessageSquare, Sparkles, Table } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const examples = [
  {
    icon: Table,
    text: "أرني جميع الجداول المتاحة",
  },
  {
    icon: Database,
    text: "صف لي جدول المنتجات",
  },
  {
    icon: MessageSquare,
    text: "أضف منتج جديد اسمه باراسيتامول بسعر 50",
  },
  {
    icon: Sparkles,
    text: "عدل سعر المنتج رقم 5 إلى 75",
  },
];

interface WelcomeCardProps {
  onExampleClick: (text: string) => void;
}

export function WelcomeCard({ onExampleClick }: WelcomeCardProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent mb-6 shadow-lg">
          <Database className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gradient mb-3">
          مساعد قاعدة البيانات الذكي
        </h1>
        <p className="text-muted-foreground text-lg max-w-md">
          تحدث معي بالعربية وسأساعدك في إدارة قاعدة بياناتك
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
        {examples.map((example, index) => (
          <Card
            key={index}
            className="group cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200 bg-card/50 backdrop-blur-sm"
            onClick={() => onExampleClick(example.text)}
          >
            <CardContent className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <example.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                {example.text}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-sm text-muted-foreground mt-8 text-center">
        💡 يمكنني قراءة وإضافة وتعديل وحذف البيانات من جداولك
      </p>
    </div>
  );
}
