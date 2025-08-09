import { useMemo, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Upload, FileJson, FileSpreadsheet } from "lucide-react";

export default function AddQuestionPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [previewCount, setPreviewCount] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);

  function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  const handleFile = async (file: File) => {
    try {
      const text = await readFileAsText(file);
      setBulkText(text);
      // auto preview
      const { items, error } = parseBulk(text);
      setParseError(error || null);
      setPreviewCount(items.length);
      toast({ title: `Loaded ${items.length} item(s) from file` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to read file", description: e?.message || String(e) });
    }
  };

  const parseBulk = (raw: string): { items: any[]; error?: string } => {
    const trimmed = raw.trim();
    if (!trimmed) return { items: [], error: "Paste CSV or JSON first" };
    try {
      if (trimmed.startsWith("[")) {
        const parsed = JSON.parse(trimmed);
        if (!Array.isArray(parsed)) return { items: [], error: "JSON must be an array of objects" };
        // Trust server-side validation; here we only pass through
        return { items: parsed };
      }
      // CSV: question_text,option1,option2,option3,option4,correct_answer,category
      const lines = trimmed.split(/\r?\n/).filter(Boolean);
      const items: any[] = [];
      const splitCsvLine = (line: string): string[] => {
        const result: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            // Handle escaped double quotes within quoted field
            if (inQuotes && line[i + 1] === '"') {
              current += '"';
              i++;
              continue;
            }
            inQuotes = !inQuotes;
            continue;
          }
          if (ch === ',' && !inQuotes) {
            result.push(current);
            current = "";
          } else {
            current += ch;
          }
        }
        result.push(current);
        return result.map((c) => c.trim()).map((c) => {
          // strip wrapping quotes if present
          if (c.startsWith('"') && c.endsWith('"') && c.length >= 2) return c.slice(1, -1).trim();
          if (c.startsWith("'") && c.endsWith("'") && c.length >= 2) return c.slice(1, -1).trim();
          return c;
        });
      };
      for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx];
        const cols = splitCsvLine(line);
        if (cols.length < 6) continue;
        // Skip header row if present
        const headerCandidates = ["question_text", "option1", "option2", "option3", "option4", "correct_answer"]; 
        const looksLikeHeader = headerCandidates.every((h, i) => (cols[i] || "").toLowerCase() === h);
        if (looksLikeHeader) continue;
        const [q, o1, o2, o3, o4, ca, cat = 'General'] = cols;
        items.push({
          type: 'multiple_choice',
          question_text: q,
          options: [o1, o2, o3, o4].map((v) => String(v).trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '')),
          correct_answer: String(ca).trim().replace(/^"|"$/g, '').replace(/^'|'$/g, ''),
          category: cat || 'General',
        });
      }
      return { items };
    } catch (e: any) {
      return { items: [], error: e?.message || String(e) };
    }
  };

  const doBulkImport = async () => {
    setLoading(true);
    setParseError(null);
    try {
      const { items, error } = parseBulk(bulkText);
      if (error) throw new Error(error);
      if (!items.length) throw new Error('No valid items found.');
      const res = await api.bulkImportQuestions(items);
      const inserted = Number(((res as any)?.data?.inserted ?? 0));
      if (inserted > 0) {
        toast({ title: 'Import successful' });
      } else {
        toast({ title: 'No items inserted', description: 'No valid items were found or you may not have permission.' });
      }
      setBulkText("");
      setPreviewCount(0);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Import failed', description: e.message });
      setParseError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const sampleCsv = useMemo(() => {
    return [
      "question_text,option1,option2,option3,option4,correct_answer,category",
      "What is the capital of France?,Paris,Lyon,Marseille,Nice,Paris,Geography",
      "2+2 equals to?,3,4,5,6,4,Math",
    ].join("\n");
  }, []);

  const sampleJson = useMemo(() => {
    return JSON.stringify([
      {
        type: "multiple_choice",
        question_text: "What is the capital of France?",
        options: ["Paris", "Lyon", "Marseille", "Nice"],
        correct_answer: "Paris",
        category: "Geography"
      },
      {
        type: "multiple_choice",
        question_text: "2+2 equals to?",
        options: ["3", "4", "5", "6"],
        correct_answer: "4",
        category: "Math"
      }
    ], null, 2);
  }, []);

  return (
    <Card className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-md">
      <CardHeader>
        <CardTitle>Add / Import Questions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3">
          <Label>Upload file (.csv or .json)</Label>
          <div className="flex items-center gap-3">
            <Input
              type="file"
              accept=".csv,.json,text/csv,application/json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
            <Button type="button" variant="outline" onClick={() => {
              const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = 'questions_template.csv';
              a.click();
              URL.revokeObjectURL(a.href);
            }}>
              <FileSpreadsheet className="h-4 w-4 mr-2" /> CSV template
            </Button>
            <Button type="button" variant="outline" onClick={() => {
              const blob = new Blob([sampleJson], { type: 'application/json;charset=utf-8' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = 'questions_template.json';
              a.click();
              URL.revokeObjectURL(a.href);
            }}>
              <FileJson className="h-4 w-4 mr-2" /> JSON template
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            CSV columns: question_text, option1, option2, option3, option4, correct_answer, category
          </p>
        </div>

        <div className="grid gap-2">
          <Label>Or paste CSV / JSON</Label>
          <Textarea
            value={bulkText}
            onChange={(e) => {
              setBulkText(e.target.value);
              const { items, error } = parseBulk(e.target.value);
              setParseError(error || null);
              setPreviewCount(items.length);
            }}
            placeholder='CSV: question_text, opt1, opt2, opt3, opt4, correct_answer, category OR JSON array of question objects'
            className="min-h-40"
          />
          <div className="flex items-center justify-between text-sm">
            <div className="text-muted-foreground">Parsed items: {previewCount}</div>
            {parseError && <div className="text-red-600">{parseError}</div>}
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="button" disabled={loading} onClick={doBulkImport} className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
            <Upload className="h-4 w-4 mr-2" /> {loading ? 'Importing…' : 'Import'}
          </Button>
          <Button type="button" variant="outline" disabled={loading} onClick={() => { setBulkText(""); setPreviewCount(0); setParseError(null); }}>Clear</Button>
        </div>
      </CardContent>
    </Card>
  );
}


