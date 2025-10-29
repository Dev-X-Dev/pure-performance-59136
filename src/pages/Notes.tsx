import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Note } from "@/types";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Search, Star, Edit, Trash2, Brain, Target, BookOpen, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { FlashcardGenerator } from "@/components/FlashcardGenerator";
import { QuizGenerator } from "@/components/QuizGenerator";
import { PracticeProblems } from "@/components/PracticeProblems";
import { NoteEditor } from "@/components/NoteEditor";

function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchNotes = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching notes:', error);
        toast.error('Failed to load notes');
        return;
      }

      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const createNote = async (noteData: Partial<Note>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          ...noteData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setNotes(prev => [data, ...prev]);
      toast.success('Note created successfully');
      return data;
    } catch (error) {
      console.error('Error creating note:', error);
      toast.error('Failed to create note');
    }
  };

  const updateNote = async (id: string, updates: Partial<Note>) => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setNotes(prev => prev.map(note => note.id === id ? data : note));
      toast.success('Note updated successfully');
      return data;
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Failed to update note');
    }
  };

  const deleteNote = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotes(prev => prev.filter(note => note.id !== id));
      toast.success('Note deleted successfully');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [user]);

  return {
    notes,
    loading,
    createNote,
    updateNote,
    deleteNote,
    refetch: fetchNotes,
  };
}

interface NoteDialogProps {
  note?: Note | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (noteData: Partial<Note>) => Promise<void>;
}

function NoteDialog({ note, open, onOpenChange, onSave }: NoteDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setContent(note.content || '');
      setTags(note.tags?.join(', ') || '');
    } else {
      setTitle('');
      setContent('');
      setTags('');
    }
  }, [note, open]);

  const handleSave = async () => {
    const noteData = {
      title,
      content,
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
    };

    await onSave(noteData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{note ? 'Edit Note' : 'Create Note'}</DialogTitle>
          <DialogDescription>
            {note ? 'Update your note details.' : 'Add a new note to your collection.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title..."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note content..."
              className="min-h-[100px]"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tag1, tag2, tag3..."
            />
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {note ? 'Update' : 'Create'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Notes() {
  const [params] = useSearchParams();
  const showQuiz = params.get("quiz") === "true";
  const showPractice = params.get("practice") === "true";
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [showQuizViewer, setShowQuizViewer] = useState(showQuiz);
  const [showPracticeProblems, setShowPracticeProblems] = useState(showPractice);
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [noteInEditor, setNoteInEditor] = useState<Note | null>(null);

  const { notes, loading, createNote, updateNote, deleteNote } = useNotes();

  const filteredNotes = useMemo(() => {
    if (!searchTerm && !selectedTag) return notes;

    return notes.filter(note => {
      const matchesSearch = !searchTerm ||
        note.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesTag = !selectedTag ||
        note.tags?.some(tag => tag.toLowerCase().includes(selectedTag.toLowerCase()));

      return matchesSearch && matchesTag;
    });
  }, [notes, searchTerm, selectedTag]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach(note => {
      note.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet);
  }, [notes]);

  const handleCreateNote = async (noteData: Partial<Note>) => {
    await createNote(noteData);
  };

  const handleUpdateNote = async (noteData: Partial<Note>) => {
    if (selectedNote) {
      await updateNote(selectedNote.id, noteData);
    }
  };

  const toggleNoteSelection = (noteId: string) => {
    setSelectedNotes(prev => 
      prev.includes(noteId) 
        ? prev.filter(id => id !== noteId)
        : [...prev, noteId]
    );
  };

  if (showFlashcards) {
    return (
      <AppLayout>
        <FlashcardGenerator
          noteIds={selectedNotes}
          onClose={() => setShowFlashcards(false)}
        />
      </AppLayout>
    );
  }

  if (showQuizViewer) {
    return (
      <AppLayout>
        <QuizGenerator
          noteIds={selectedNotes.length > 0 ? selectedNotes : notes.map(n => n.id)}
          onClose={() => setShowQuizViewer(false)}
        />
      </AppLayout>
    );
  }

  if (showPracticeProblems) {
    return (
      <AppLayout>
        <PracticeProblems
          noteIds={selectedNotes.length > 0 ? selectedNotes : notes.map(n => n.id)}
          onClose={() => setShowPracticeProblems(false)}
        />
      </AppLayout>
    );
  }

  if (noteInEditor) {
    return (
      <AppLayout>
        <NoteEditor
          note={noteInEditor}
          onClose={() => setNoteInEditor(null)}
          onSave={async (noteData) => {
            await updateNote(noteInEditor.id, noteData);
            setNoteInEditor(null);
          }}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">My Notes</h1>
            <p className="text-muted-foreground">
              Organize and study your notes with AI-powered tools
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedNote(null)}>
                <Plus className="h-4 w-4 mr-2" />
                New Note
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Search & Filter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="sm:w-48">
                <Input
                  placeholder="Filter by tag..."
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                />
              </div>
            </div>

            {/* AI Tools */}
            {selectedNotes.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <p className="text-sm text-muted-foreground mb-2 w-full">
                  {selectedNotes.length} notes selected - Use AI tools:
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowFlashcards(true)}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Generate Flashcards
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowQuizViewer(true)}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Create Quiz
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowPracticeProblems(true)}
                >
                  <Target className="h-4 w-4 mr-2" />
                  Practice Problems
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes Display */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading notes...</p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-lg font-semibold mb-2">
                {notes.length === 0 ? 'No notes yet' : 'No matching notes'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {notes.length === 0 
                  ? 'Create your first note to get started with studying'
                  : 'Try adjusting your search or filters'
                }
              </p>
              {notes.length === 0 && (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Note
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNotes.map((note) => (
                <Card 
                  key={note.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedNotes.includes(note.id) ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => toggleNoteSelection(note.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">
                          {note.title || 'Untitled'}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {new Date(note.updated_at!).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        {note.is_favorite && (
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateNote(note.id, { is_favorite: !note.is_favorite });
                          }}
                        >
                          <Star className={`h-3 w-3 ${note.is_favorite ? 'text-yellow-500 fill-current' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNoteInEditor(note);
                          }}
                        >
                          <FileText className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNote(note);
                            setDialogOpen(true);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNote(note.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                      {note.content || 'No content...'}
                    </p>
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {note.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {note.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{note.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <NoteDialog
          note={selectedNote}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={selectedNote ? handleUpdateNote : handleCreateNote}
        />
      </div>
    </AppLayout>
  );
}