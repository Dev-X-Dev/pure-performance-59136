/*
  # Create Note Attachments Storage System

  ## Overview
  This migration creates a complete file storage system for notes, allowing users to attach
  documents, PDFs, images, and other study materials to their notes.

  ## Changes

  1. New Tables
    - `note_attachments`
      - `id` (uuid, primary key)
      - `note_id` (uuid, foreign key to notes)
      - `user_id` (uuid, foreign key to auth.users)
      - `file_name` (text) - Original file name
      - `file_path` (text) - Storage bucket path
      - `file_size` (bigint) - File size in bytes
      - `file_type` (text) - MIME type
      - `created_at` (timestamptz)

  2. Storage
    - Creates 'note-files' storage bucket for file attachments
    - Supports documents, images, PDFs, etc.

  3. Security
    - Enable RLS on `note_attachments` table
    - Users can only access their own attachments
    - Storage policies restrict access to user's own files
    - Proper foreign key constraints ensure data integrity

  ## Important Notes
  - Maximum file size configurable per bucket settings
  - Files are organized by user_id/note_id structure
  - Automatic cleanup when notes are deleted via cascade
*/

-- Create note_attachments table
CREATE TABLE IF NOT EXISTS public.note_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on note_attachments
ALTER TABLE public.note_attachments ENABLE ROW LEVEL SECURITY;

-- Create policies for note_attachments
CREATE POLICY "Users can view their own attachments"
  ON public.note_attachments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upload attachments to their notes"
  ON public.note_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = note_id
      AND notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own attachments"
  ON public.note_attachments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_note_attachments_note_id ON public.note_attachments(note_id);
CREATE INDEX IF NOT EXISTS idx_note_attachments_user_id ON public.note_attachments(user_id);

-- Create storage bucket for note files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'note-files',
  'note-files',
  false,
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for note-files bucket
CREATE POLICY "Users can upload files to their own folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'note-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view their own files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'note-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'note-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'note-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'note-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
