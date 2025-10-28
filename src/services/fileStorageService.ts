import { supabase } from "@/integrations/supabase/client";

export interface NoteAttachment {
  id: string;
  note_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  created_at: string;
}

export class FileStorageService {
  private static readonly BUCKET_NAME = 'note-files';
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024;

  static async uploadFile(
    noteId: string,
    file: File,
    userId: string
  ): Promise<NoteAttachment> {
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error('File size exceeds 50MB limit');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${noteId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(this.BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data: attachment, error: dbError } = await supabase
      .from('note_attachments')
      .insert({
        note_id: noteId,
        user_id: userId,
        file_name: file.name,
        file_path: uploadData.path,
        file_size: file.size,
        file_type: file.type
      })
      .select()
      .single();

    if (dbError) {
      await supabase.storage.from(this.BUCKET_NAME).remove([fileName]);
      throw new Error(`Failed to save attachment metadata: ${dbError.message}`);
    }

    return attachment;
  }

  static async getAttachments(noteId: string): Promise<NoteAttachment[]> {
    const { data, error } = await supabase
      .from('note_attachments')
      .select('*')
      .eq('note_id', noteId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch attachments: ${error.message}`);
    }

    return data || [];
  }

  static async downloadFile(attachment: NoteAttachment): Promise<Blob> {
    const { data, error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .download(attachment.file_path);

    if (error) {
      throw new Error(`Download failed: ${error.message}`);
    }

    return data;
  }

  static async getFileUrl(attachment: NoteAttachment): Promise<string> {
    const { data } = await supabase.storage
      .from(this.BUCKET_NAME)
      .createSignedUrl(attachment.file_path, 3600);

    if (!data?.signedUrl) {
      throw new Error('Failed to generate file URL');
    }

    return data.signedUrl;
  }

  static async deleteFile(attachmentId: string, filePath: string): Promise<void> {
    const { error: storageError } = await supabase.storage
      .from(this.BUCKET_NAME)
      .remove([filePath]);

    if (storageError) {
      console.error('Storage deletion error:', storageError);
    }

    const { error: dbError } = await supabase
      .from('note_attachments')
      .delete()
      .eq('id', attachmentId);

    if (dbError) {
      throw new Error(`Failed to delete attachment: ${dbError.message}`);
    }
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  static getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
    if (mimeType.startsWith('text/')) return '📃';
    return '📎';
  }
}
