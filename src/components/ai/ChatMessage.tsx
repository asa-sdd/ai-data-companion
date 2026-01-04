import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

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
          "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm",
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
  // Split content by code blocks and tables
  const parts = content.split(/(```[\s\S]*?```|\|[\s\S]*?\|(?:\n|$))/g);

  return (
    <div className="space-y-2">
      {parts.map((part, index) => {
        if (part.startsWith("```")) {
          // Code block
          const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
          const code = match?.[2] || part.slice(3, -3);
          return (
            <pre
              key={index}
              className="bg-secondary/50 rounded-lg p-3 overflow-x-auto text-sm font-mono"
              dir="ltr"
            >
              <code>{code.trim()}</code>
            </pre>
          );
        }

        if (part.includes("|") && part.includes("\n")) {
          // Potential markdown table
          return <TableRenderer key={index} content={part} />;
        }

        // Regular text with basic markdown
        return (
          <p key={index} className="whitespace-pre-wrap leading-relaxed">
            {formatText(part)}
          </p>
        );
      })}
    </div>
  );
}

function TableRenderer({ content }: { content: string }) {
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
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm" dir="ltr">
        <thead className="bg-secondary/50">
          <tr>
            {headers.map((header, i) => (
              <th key={i} className="px-3 py-2 text-start font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.slice(dataStartIndex).map((line, rowIndex) => (
            <tr key={rowIndex} className="border-t border-border">
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

function formatText(text: string): React.ReactNode {
  // Bold
  let formatted = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  // Italic
  formatted = formatted.replace(/\*(.*?)\*/g, "<em>$1</em>");
  // Inline code
  formatted = formatted.replace(/`(.*?)`/g, '<code class="bg-secondary/50 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');

  return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
}
