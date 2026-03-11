'use client';

import * as React from 'react';
import { cn } from '@ordo/core';
import { Button, Avatar, AvatarImage, AvatarFallback } from '@ordo/ui';
import { Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { getInitials } from '@ordo/core';

interface AvatarUploadProps {
  currentUrl?: string | null;
  name: string;
  onChange: (url: string | null) => void;
}

export function AvatarUpload({ currentUrl, name, onChange }: AvatarUploadProps) {
  const [preview, setPreview] = React.useState<string | null>(currentUrl ?? null);
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }

    // Preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    setUploading(true);
    try {
      // Request presigned URL from backend
      const presignedRes = await fetch('/api/upload/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type }),
      });
      if (!presignedRes.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, publicUrl } = (await presignedRes.json()) as { uploadUrl: string; publicUrl: string };

      // Upload directly to S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error('Upload failed');

      onChange(publicUrl);
      toast.success('Avatar updated.');
    } catch {
      toast.error('Failed to upload avatar. Please try again.');
      setPreview(currentUrl ?? null);
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    setPreview(null);
    onChange(null);
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-16 w-16">
        {preview && <AvatarImage src={preview} alt={name} />}
        <AvatarFallback className="text-lg">{getInitials(name)}</AvatarFallback>
      </Avatar>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={uploading}
            onClick={() => fileRef.current?.click()}
            aria-label="Upload photo"
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Upload photo
          </Button>
          {preview && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              aria-label="Remove photo"
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">JPG, PNG, GIF up to 5 MB</p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-hidden="true"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
