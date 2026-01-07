import { Download, FileJson, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ExportButtonsProps {
  data: any[];
  filename?: string;
}

export function ExportButtons({ data, filename = "export" }: ExportButtonsProps) {
  if (!data || data.length === 0) return null;

  const exportAsJSON = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    downloadBlob(blob, `${filename}.json`);
    toast.success("تم تصدير البيانات كـ JSON");
  };

  const exportAsCSV = () => {
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            if (value === null || value === undefined) return "";
            if (typeof value === "object") return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            const strValue = String(value);
            if (strValue.includes(",") || strValue.includes('"') || strValue.includes("\n")) {
              return `"${strValue.replace(/"/g, '""')}"`;
            }
            return strValue;
          })
          .join(",")
      ),
    ];
    const csvString = csvRows.join("\n");
    const blob = new Blob(["\ufeff" + csvString], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, `${filename}.csv`);
    toast.success("تم تصدير البيانات كـ CSV");
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="ghost"
        onClick={exportAsCSV}
        className="h-7 px-2 text-xs"
        title="تصدير كـ CSV"
      >
        <FileSpreadsheet className="h-3.5 w-3.5 ml-1" />
        CSV
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={exportAsJSON}
        className="h-7 px-2 text-xs"
        title="تصدير كـ JSON"
      >
        <FileJson className="h-3.5 w-3.5 ml-1" />
        JSON
      </Button>
    </div>
  );
}
