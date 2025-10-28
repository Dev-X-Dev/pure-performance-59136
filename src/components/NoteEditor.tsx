import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Note } from "@/types";
import { ArrowLeft, Save, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface NoteEditorProps {
  note: Note;
  onClose: () => void;
  onSave: (noteData: Partial<Note>) => Promise<void>;
}

export function NoteEditor({ note, onClose, onSave }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title || '');
  const [content, setContent] = useState(note.content || '');
  const [tags, setTags] = useState(note.tags?.join(', ') || '');
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSave = async () => {
    const noteData = {
      title,
      content,
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
    };
    await onSave(noteData);
    onClose();
  };

  const handleAiEdit = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please describe what you want to change');
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-processor', {
        body: {
          action: 'edit-note',
          content,
          prompt: aiPrompt,
        }
      });

      if (error) throw error;

      setContent(data.result);
      setShowAiDialog(false);
      setAiPrompt('');
      toast.success('Note updated with AI suggestions');
    } catch (error) {
      console.error('AI edit error:', error);
      toast.error('Failed to process AI request');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-lg font-semibold">Edit Note</h2>
              <p className="text-xs text-muted-foreground">
                Last updated: {new Date(note.updated_at!).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowAiDialog(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              Edit with AI
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter note title..."
              className="text-2xl font-bold border-0 px-0 focus-visible:ring-0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tag1, tag2, tag3..."
            />
            {tags && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.split(',').map(tag => tag.trim()).filter(Boolean).map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note content..."
              className="min-h-[500px] font-mono text-sm"
            />
          </div>
        </div>
      </div>

      <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit with AI</DialogTitle>
            <DialogDescription>
              Describe what changes you want to make to your note content
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ai-prompt">What would you like to change?</Label>
              <Textarea
                id="ai-prompt"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="E.g., 'Make it more concise', 'Add more details about photosynthesis', 'Fix grammar and spelling'"
                className="min-h-[100px]"
              />
            </div>
            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Example prompts:</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1 text-muted-foreground">
                <p>• "Make this more concise and easier to understand"</p>
                <p>• "Add more examples and details"</p>
                <p>• "Reorganize into bullet points"</p>
                <p>• "Fix any grammar or spelling errors"</p>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAiDialog(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleAiEdit} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Apply Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
