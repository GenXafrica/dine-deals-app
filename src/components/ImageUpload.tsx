import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

interface ImageUploadProps {
  currentImage?: string;
  onImageChange: (url: string) => void;
  disabled?: boolean;
}

const PLACEHOLDER_IMAGE =
  'https://cexezutizzchdpsspghx.supabase.co/storage/v1/object/public/app-icons/DealPlaceholder.jpg';

const IDEAL_WIDTH = 512;
const IDEAL_HEIGHT = 512;
const MAX_FILE_SIZE = 100 * 1024; // 100KB

export const ImageUpload: React.FC<ImageUploadProps> = ({
  currentImage,
  onImageChange,
  disabled = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndResizeImage = (
    file: File,
  ): Promise<{ blob: Blob; width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas not supported'));

        let { width, height } = img;
        const aspectRatio = width / height;

        // Scale down so both sides are <= IDEAL (512)
        if (width > IDEAL_WIDTH || height > IDEAL_HEIGHT) {
          if (aspectRatio > 1) {
            width = IDEAL_WIDTH;
            height = IDEAL_WIDTH / aspectRatio;
          } else {
            height = IDEAL_HEIGHT;
            width = IDEAL_HEIGHT * aspectRatio;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          blob =>
            blob
              ? resolve({ blob, width, height })
              : reject(new Error('Failed to process image')),
          'image/jpeg',
          0.8,
        );
      };
      img.onerror = () => reject(new Error('Invalid image file'));
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadImage = async (file: File) => {
    try {
      setUploading(true);
      setUploadSuccess(false);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Must be logged in to upload images');
      }

      // Type + size checks
      if (
        !['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)
      ) {
        throw new Error('Please select a JPG or PNG image');
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('Image size must be less than 100KB');
      }

      const { blob, width, height } = await validateAndResizeImage(file);
      const fileExt = 'jpg';
      const fileName = `merchant_logo_${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

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

      const { data } = supabase.storage
        .from('merchant-images')
        .getPublicUrl(filePath);
      const imageUrl = data.publicUrl;

      onImageChange(imageUrl);
      setPreview(imageUrl);
      setUploadSuccess(true);
      toast({
        title: 'Success',
        description: `Logo uploaded successfully (${Math.round(
          width,
        )}x${Math.round(height)}px)`,
      });

      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (error: any) {
      toast({
        title: 'Upload Error',
        description: error.message || 'Failed to upload image.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file);
  };

  const clearImage = () => {
    onImageChange('');
    setPreview(null);
    setUploadSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const displayImage = preview || currentImage || PLACEHOLDER_IMAGE;

  return (
    <div className="flex items-center gap-4">
      <div className="flex-shrink-0">
        <img
          src={displayImage}
          alt="Logo preview"
          className="w-20 h-20 object-cover border rounded-lg shadow-sm"
          onError={e => {
            if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
              e.currentTarget.src = PLACEHOLDER_IMAGE;
            }
          }}
        />
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || disabled}
            className="flex-1"
          >
            {uploading ? (
              <>
                <div className="w-3 h-3 mr-2 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                Uploading...
              </>
            ) : uploadSuccess ? (
              <>
                <Check className="w-3 h-3 mr-2 text-green-600" />
                Done
              </>
            ) : (
              <>
                <Upload className="w-3 h-3 mr-2" />
                Upload Logo
              </>
            )}
          </Button>
          {(currentImage || preview) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearImage}
              disabled={uploading || disabled}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleFileSelect}
          className="hidden"
        />
        <p className="text-xs text-gray-500">
          Max 512×512 pixels • Max 100KB
        </p>
      </div>
    </div>
  );
};
