import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

export default function AddQuestion() {
  const { toast } = useToast();
  const [type, setType] = useState<"multiple_choice" | "true_false" | "fill_blank" | "image_based">("multiple_choice");
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const parsedOptions = options ? JSON.parse(options) : null;
      await api.addQuestion({ type, question_text: questionText, options: parsedOptions, correct_answer: correctAnswer, image_url: imageUrl || null });
      toast({ title: "Question added" });
      setQuestionText(""); setOptions(""); setCorrectAnswer(""); setImageUrl("");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-10">
      <Card className="max-w-3xl mx-auto bg-white/60 dark:bg-gray-900/60 backdrop-blur-md">
        <CardHeader>
          <CardTitle>Add Question</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as any)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                  <SelectItem value="true_false">True / False</SelectItem>
                  <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                  <SelectItem value="image_based">Image Based</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Question</Label>
              <Textarea value={questionText} onChange={(e) => setQuestionText(e.target.value)} required />
            </div>
            <div>
              <Label>Options (JSON)</Label>
              <Textarea value={options} onChange={(e) => setOptions(e.target.value)} placeholder='["A","B","C","D"] or image options array' />
            </div>
            <div>
              <Label>Correct Answer</Label>
              <Input value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} required />
            </div>
            <div>
              <Label>Image URL (optional)</Label>
              <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            </div>
            <Button disabled={loading} className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">{loading ? 'Saving...' : 'Save Question'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


