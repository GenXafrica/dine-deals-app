import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

interface DealImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
}

// Existing image limits (unchanged)
const MAX_FILE_SIZE = 300 * 1024; // 300 KB
const MAX_DIMENSION = 1080; // 1080 x 1080

export const DealImageUpload: React.FC<DealImageUploadProps> = ({
  value,
  onChange,
  label = 'Deal Image',
  placeholder = 'Enter image URL',
}) => {
  const [urlInput, setUrlInput] = useState(value || '');
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUrlChange = (url: string) => {
    setUrlInput(url);
    setPreviewUrl(url || null);
    onChange(url);
  };

  const clearImage = () => {
    setUrlInput('');
    setPreviewUrl(null);
    onChange('');
  };

  const readFileAsImage = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Invalid image file'));
      img.src = URL.createObjectURL(file);
    });
  };

  const encodeCanvasToJpeg = (canvas: HTMLCanvasElement, quality: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Failed to process image'));
          resolve(blob);
        },
        'image/jpeg',
        quality
      );
    });
  };

  const validateAndProcessImage = async (
    file: File
  ): Promise<{ blob: Blob; width: number; height: number }> => {
    const img = await readFileAsImage(file);

    const srcW = img.width;
    const srcH = img.height;

    const cropSize = Math.min(srcW, srcH);
    const cropX = Math.floor((srcW - cropSize) / 2);
    const cropY = Math.floor((srcH - cropSize) / 2);

    const outSize = Math.min(MAX_DIMENSION, cropSize);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    canvas.width = outSize;
    canvas.height = outSize;

    ctx.drawImage(img, cropX, cropY, cropSize, cropSize, 0, 0, outSize, outSize);

    let quality = 0.85;
    let blob = await encodeCanvasToJpeg(canvas, quality);

    while (blob.size > MAX_FILE_SIZE && quality > 0.5) {
      quality -= 0.05;
      blob = await encodeCanvasToJpeg(canvas, quality);
    }

    if (blob.size > MAX_FILE_SIZE) {
      let size = outSize;
      while (blob.size > MAX_FILE_SIZE && size > 720) {
        size = Math.round(size * 0.9);
        canvas.width = size;
        canvas.height = size;
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, cropX, cropY, cropSize, cropSize, 0, 0, size, size);

        quality = 0.8;
        blob = await encodeCanvasToJpeg(canvas, quality);

        while (blob.size > MAX_FILE_SIZE && quality > 0.5) {
          quality -= 0.05;
          blob = await encodeCanvasToJpeg(canvas, quality);
        }
      }
    }

    if (blob.size > MAX_FILE_SIZE) {
      throw new Error('Could not compress image to 300 KB. Please choose a simpler/smaller image.');
    }

    return { blob, width: canvas.width, height: canvas.height };
  };

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);

      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload a valid image file');
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('You must be logged in to upload images');
      }

      const { blob, width, height } = await validateAndProcessImage(file);

      const fileExt = 'jpg';
      const fileName = `merchant_deal_${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `deals/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('merchant-images')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg',
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data } = supabase.storage.from('merchant-images').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      setUrlInput(publicUrl);
      setPreviewUrl(publicUrl);
      onChange(publicUrl);

      toast({
        title: 'Uploaded',
        description: `Deal image uploaded (${Math.round(width)}x${Math.round(height)}px, ${Math.round(blob.size / 1024)} KB)`,
      });
    } catch (err: any) {
      toast({
        title: 'Upload error',
        description: err?.message || 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile(file);
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <ImageIcon className="w-4 h-4" />
        {label}
      </Label>

      {/* UPDATED helper text ONLY */}
      <div className="text-xs text-muted-foreground">
        JPG max 1080×1080 (300 KB) • MP4 max 1080×1920 (60s, 15 MB)
      </div>

      <div className="flex gap-2">
        <Input
          type="url"
          value={urlInput}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0"
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : <><Upload className="w-4 h-4 mr-2" />Upload</>}
        </Button>

        {urlInput && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearImage}
            className="flex-shrink-0"
            disabled={uploading}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {previewUrl ? (
        <div className="mt-2">
          <img
            src={previewUrl}
            alt="Deal preview"
            className="w-24 h-24 object-cover rounded-lg border"
            onError={() => {
              toast({ title: 'Error', description: 'Invalid image URL', variant: 'destructive' });
              setPreviewUrl(null);
            }}
          />
        </div>
      ) : (
        <div className="mt-2 w-24 h-24 rounded-lg border flex items-center justify-center bg-muted text-muted-foreground">
          <ImageIcon className="w-6 h-6" />
        </div>
      )}
    </div>
  );
};
