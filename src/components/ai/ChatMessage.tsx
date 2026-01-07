import { Bot, User, Table2, CheckCircle2, XCircle, AlertCircle, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExportButtons } from "./ExportButtons";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isLoading?: boolean;
}

export function ChatMessage({ role, content, isLoading }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 p-4 animate-slide-up",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-accent text-accent-foreground"
        )}
      >
        {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
      </div>

      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm",
          isUser
            ? "bg-chat-user text-chat-user-foreground rounded-tr-sm"
            : "bg-chat-ai text-chat-ai-foreground rounded-tl-sm"
        )}
      >
        {isLoading ? (
          <div className="flex gap-1.5 py-2">
            <div className="w-2 h-2 rounded-full bg-current animate-pulse-soft" />
            <div className="w-2 h-2 rounded-full bg-current animate-pulse-soft [animation-delay:0.2s]" />
            <div className="w-2 h-2 rounded-full bg-current animate-pulse-soft [animation-delay:0.4s]" />
          </div>
        ) : (
          <div className="prose prose-sm max-w-none text-inherit">
            <MessageContent content={content} />
          </div>
        )}
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  // Try to detect JSON data in the content
  const jsonDataBlocks = extractJsonData(content);
  
  // Split content by code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3">
      {parts.map((part, index) => {
        if (part.startsWith("```")) {
          // Code block
          const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
          const lang = match?.[1] || "";
          const code = match?.[2] || part.slice(3, -3);
          
          // Check if it's JSON with data
          if (lang === "json" || isJsonLike(code)) {
            const parsed = tryParseJson(code);
            if (parsed && (Array.isArray(parsed) || (parsed.data && Array.isArray(parsed.data)))) {
              return <DataTableRenderer key={index} data={parsed} />;
            }
          }
          
          return <CodeBlock key={index} code={code.trim()} language={lang} />;
        }

        // Check for inline JSON results
        const jsonMatch = part.match(/\{[\s\S]*?"(success|data|tables|error)"[\s\S]*?\}/);
        if (jsonMatch) {
          const parsed = tryParseJson(jsonMatch[0]);
          if (parsed) {
            // Remove the JSON from text and show it as a result card
            const textBefore = part.slice(0, jsonMatch.index);
            const textAfter = part.slice((jsonMatch.index || 0) + jsonMatch[0].length);
            
            return (
              <div key={index} className="space-y-2">
                {textBefore.trim() && <TextBlock text={textBefore} />}
                <ResultCard data={parsed} />
                {textAfter.trim() && <TextBlock text={textAfter} />}
              </div>
            );
          }
        }

        // Regular text
        if (part.trim()) {
          return <TextBlock key={index} text={part} />;
        }
        
        return null;
      })}
    </div>
  );
}

function TextBlock({ text }: { text: string }) {
  // Handle markdown tables
  if (text.includes("|") && text.includes("\n")) {
    const lines = text.split("\n");
    const tableLines: string[] = [];
    const textParts: string[] = [];
    let inTable = false;
    
    for (const line of lines) {
      if (line.includes("|")) {
        inTable = true;
        tableLines.push(line);
      } else if (inTable && line.trim() === "") {
        // End of table
        inTable = false;
      } else {
        if (tableLines.length > 0 && !inTable) {
          // We have a table to render
        }
        textParts.push(line);
      }
    }
    
    if (tableLines.length > 2) {
      return (
        <div className="space-y-2">
          {textParts.length > 0 && (
            <p className="whitespace-pre-wrap leading-relaxed">{formatText(textParts.join("\n"))}</p>
          )}
          <MarkdownTableRenderer content={tableLines.join("\n")} />
        </div>
      );
    }
  }
  
  return (
    <p className="whitespace-pre-wrap leading-relaxed">{formatText(text)}</p>
  );
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="relative group">
      <pre
        className="bg-secondary/50 rounded-lg p-3 overflow-x-auto text-sm font-mono"
        dir="ltr"
      >
        {language && (
          <span className="absolute top-2 left-2 text-xs text-muted-foreground opacity-60">
            {language}
          </span>
        )}
        <code>{code}</code>
      </pre>
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </Button>
    </div>
  );
}

function ResultCard({ data }: { data: any }) {
  const isSuccess = data.success === true;
  const hasError = data.error || data.success === false;
  const hasData = data.data || data.tables || data.inserted || data.updated || data.deleted;
  
  // Extract the actual data array
  const dataArray = data.data || data.tables || data.inserted || data.updated || data.deleted || data.sample_data;
  
  return (
    <div className={cn(
      "rounded-xl border p-4 space-y-3",
      hasError ? "border-destructive/30 bg-destructive/5" : "border-primary/20 bg-primary/5"
    )}>
      {/* Status Header */}
      <div className="flex items-center gap-2">
        {hasError ? (
          <XCircle className="h-5 w-5 text-destructive" />
        ) : isSuccess ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <AlertCircle className="h-5 w-5 text-amber-500" />
        )}
        <span className={cn(
          "font-medium text-sm",
          hasError ? "text-destructive" : "text-green-600"
        )}>
          {data.message || (hasError ? "حدث خطأ" : "تم بنجاح")}
        </span>
        {data.count !== undefined && (
          <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">
            {data.count} صف
          </span>
        )}
      </div>
      
      {/* Error Message */}
      {data.error && (
        <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-lg" dir="ltr">
          {data.error}
        </p>
      )}
      
      {/* Data Table */}
      {Array.isArray(dataArray) && dataArray.length > 0 && (
        <DataTable data={dataArray} />
      )}
      
      {/* Tables List */}
      {Array.isArray(data.tables) && data.tables.length > 0 && !data.tables[0]?.id && (
        <div className="flex flex-wrap gap-2">
          {data.tables.map((table: string, i: number) => (
            <span key={i} className="inline-flex items-center gap-1 bg-secondary px-3 py-1.5 rounded-lg text-sm">
              <Table2 className="h-3.5 w-3.5" />
              {table}
            </span>
          ))}
        </div>
      )}
      
      {/* Hint */}
      {data.hint && (
        <p className="text-xs text-muted-foreground">{data.hint}</p>
      )}
      
      {/* Setup SQL */}
      {data.setup_sql && (
        <CodeBlock code={data.setup_sql.trim()} language="sql" />
      )}
    </div>
  );
}

function DataTable({ data, showExport = true }: { data: any[]; showExport?: boolean }) {
  if (!data.length) return null;
  
  const columns = Object.keys(data[0]);
  
  return (
    <div className="space-y-2">
      {showExport && (
        <div className="flex justify-end">
          <ExportButtons data={data} />
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-border bg-background">
        <table className="w-full text-sm" dir="ltr">
          <thead className="bg-muted/50">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-3 py-2.5 text-start font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-muted/30 transition-colors">
                {columns.map((col) => (
                  <td key={col} className="px-3 py-2 text-foreground">
                    <CellValue value={row[col]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CellValue({ value }: { value: any }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">null</span>;
  }
  
  if (typeof value === "boolean") {
    return (
      <span className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        value ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      )}>
        {value ? "true" : "false"}
      </span>
    );
  }
  
  if (typeof value === "object") {
    return (
      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
        {JSON.stringify(value)}
      </code>
    );
  }
  
  // Truncate long strings
  const strValue = String(value);
  if (strValue.length > 50) {
    return <span title={strValue}>{strValue.slice(0, 47)}...</span>;
  }
  
  return <span>{strValue}</span>;
}

function DataTableRenderer({ data }: { data: any }) {
  const dataArray = Array.isArray(data) ? data : data.data || data.tables || [];
  
  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
        لا توجد بيانات
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Table2 className="h-4 w-4" />
        <span>{dataArray.length} صف</span>
      </div>
      <DataTable data={dataArray} />
    </div>
  );
}

function MarkdownTableRenderer({ content }: { content: string }) {
  const lines = content.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return <p>{content}</p>;

  const parseRow = (line: string) =>
    line
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);

  const headers = parseRow(lines[0]);
  const isHeaderSeparator = lines[1]?.match(/^[\s|:-]+$/);
  const dataStartIndex = isHeaderSeparator ? 2 : 1;

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-background">
      <table className="w-full text-sm" dir="ltr">
        <thead className="bg-muted/50">
          <tr>
            {headers.map((header, i) => (
              <th key={i} className="px-3 py-2.5 text-start font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {lines.slice(dataStartIndex).map((line, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-muted/30 transition-colors">
              {parseRow(line).map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Helper functions
function extractJsonData(content: string): any[] {
  const results: any[] = [];
  const jsonPattern = /\{[^{}]*"(success|data|tables)"[^{}]*\}/g;
  let match;
  while ((match = jsonPattern.exec(content)) !== null) {
    const parsed = tryParseJson(match[0]);
    if (parsed) results.push(parsed);
  }
  return results;
}

function isJsonLike(text: string): boolean {
  const trimmed = text.trim();
  return (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
         (trimmed.startsWith("[") && trimmed.endsWith("]"));
}

function tryParseJson(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function formatText(text: string): React.ReactNode {
  // Handle emojis and special characters properly
  let formatted = text;
  
  // Bold
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  // Italic
  formatted = formatted.replace(/(?<!\*)\*(?!\*)([^*]+)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
  // Inline code
  formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');
  // Links
  formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline">$1</a>');

  return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
}
