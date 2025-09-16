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
import { toast } from "sonner";
import { Plus, Search, Star, Edit, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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

  useEffect(() => {
    fetchNotes();
  }, [user]);

  const createNote = async (title: string, content: string, tags: string[]) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          title,
          content,
          tags,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating note:', error);
        toast.error('Failed to create note');
        return;
      }

      setNotes(prev => [data, ...prev]);
      toast.success('Note created successfully!');
    } catch (error) {
      console.error('Error creating note:', error);
      toast.error('Failed to create note');
    }
  };

  const updateNote = async (id: string, updates: Partial<Note>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notes')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating note:', error);
        toast.error('Failed to update note');
        return;
      }

      setNotes(prev => prev.map(note => note.id === id ? data : note));
      toast.success('Note updated successfully!');
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Failed to update note');
    }
  };

  const deleteNote = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting note:', error);
        toast.error('Failed to delete note');
        return;
      }

      setNotes(prev => prev.filter(note => note.id !== id));
      toast.success('Note deleted successfully!');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    }
  };

  return { notes, loading, createNote, updateNote, deleteNote };
}

function NoteDialog({ 
  note, 
  open, 
  onOpenChange, 
  onSave 
}: { 
  note?: Note; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onSave: (title: string, content: string, tags: string[]) => void;
}) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [tagsInput, setTagsInput] = useState(note?.tags?.join(', ') || '');

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setTagsInput(note.tags?.join(', ') || '');
    } else {
      setTitle('');
      setContent('');
      setTagsInput('');
    }
  }, [note, open]);

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    onSave(title, content, tags);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{note ? 'Edit Note' : 'Create New Note'}</DialogTitle>
          <DialogDescription>
            {note ? 'Make changes to your note' : 'Create a new note to save your thoughts'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="note-title">Title</Label>
            <Input
              id="note-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter note title..."
            />
          </div>
          <div>
            <Label htmlFor="note-content">Content</Label>
            <Textarea
              id="note-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note content here..."
              rows={10}
            />
          </div>
          <div>
            <Label htmlFor="note-tags">Tags (comma-separated)</Label>
            <Input
              id="note-tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="study, math, important..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {note ? 'Save Changes' : 'Create Note'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function NotesPage() {
  const { notes, loading, createNote, updateNote, deleteNote } = useNotes();
  const [filter, setFilter] = useState("");
  const [selectedNote, setSelectedNote] = useState<Note | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);

  const tags = useMemo(
    () => Array.from(new Set(notes.flatMap((n) => n.tags || []))).sort(),
    [notes],
  );

  const filtered = useMemo(() => {
    const f = filter.toLowerCase();
    let list = notes.slice();
    
    // Favorites first, then by updated date
    list.sort((a, b) => {
      if (a.is_favorite && !b.is_favorite) return -1;
      if (!a.is_favorite && b.is_favorite) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
    
    if (!f) return list;
    
    return list.filter(
      (n) =>
        n.title.toLowerCase().includes(f) ||
        n.content.toLowerCase().includes(f) ||
        (n.tags || []).some((t) => t.toLowerCase().includes(f)),
    );
  }, [filter, notes]);

  const handleCreateNote = (title: string, content: string, tags: string[]) => {
    createNote(title, content, tags);
  };

  const handleUpdateNote = (title: string, content: string, tags: string[]) => {
    if (selectedNote) {
      updateNote(selectedNote.id, { title, content, tags });
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Notes</h1>
            <p className="text-muted-foreground">
              Organize your thoughts and ideas
            </p>
          </div>
          <Button 
            onClick={() => {
              setSelectedNote(undefined);
              setDialogOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Note
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Search</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search notes..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardContent>
            </Card>

            {tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer hover:bg-secondary/80"
                        onClick={() => setFilter(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Notes Grid */}
          <div className="lg:col-span-3">
            {filtered.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="text-muted-foreground">
                  {notes.length === 0 ? (
                    <>
                      <div className="text-6xl mb-4">📝</div>
                      <h3 className="text-lg font-semibold mb-2">No notes yet</h3>
                      <p className="mb-4">Create your first note to get started!</p>
                      <Button 
                        onClick={() => {
                          setSelectedNote(undefined);
                          setDialogOpen(true);
                        }}
                      >
                        Create First Note
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="text-4xl mb-4">🔍</div>
                      <p>No notes match your search.</p>
                    </>
                  )}
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((note) => (
                  <Card key={note.id} className="group hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                            {note.title}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {new Date(note.updated_at).toLocaleDateString()} •{' '}
                            {new Date(note.updated_at).toLocaleTimeString()}
                          </CardDescription>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {note.is_favorite && (
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateNote(note.id, { is_favorite: !note.is_favorite })}
                          >
                            <Star className={`h-3 w-3 ${note.is_favorite ? 'text-yellow-500 fill-current' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
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
                            onClick={() => deleteNote(note.id)}
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