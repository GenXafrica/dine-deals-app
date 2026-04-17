// src/components/DealThumbnailUpload.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

interface DealThumbnailUploadProps {
  dealId: string;
  images: string[];
  onImagesChange: (images: string[]) => void;
  label?: string;
}

const PLACEHOLDER_IMAGE =
  'https://d64gsuwffb70l.cloudfront.net/683946324043f54d19950def_1749044351325_dffa81dd.jpg';

const normalizeImages = (arr?: string[] | null) => {
  const base = Array.isArray(arr) ? arr.slice(0, 3) : [];
  while (base.length < 3) base.push('');
  return base;
};

// NEW limits (requested)
const MAX_IMAGE_KB = 300; // 300 KB
const MAX_IMAGE_BYTES = MAX_IMAGE_KB * 1024;
const MAX_IMAGE_DIM = 1080; // px (square)

// Video limits
const MAX_VIDEO_MB = 15; // 15 MB
const MAX_VIDEO_BYTES = MAX_VIDEO_MB * 1024 * 1024;
const MAX_VIDEO_WIDTH = 1080; // px
const MAX_VIDEO_HEIGHT = 1920; // px
const MAX_VIDEO_DURATION = 60; // seconds

// helpers
const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => {
      reader.abort();
      reject(new Error('Failed to read file'));
    };
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      if (typeof reader.result === 'string') img.src = reader.result;
      else reject(new Error('Unexpected file read result'));
    };
    reader.readAsDataURL(file);
  });
};

const readImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Invalid image file'));
    };
    img.src = url;
  });
};

const encodeCanvasToJpeg = (canvas: HTMLCanvasElement, quality: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Failed to process image'));
        resolve(blob);
      },
      'image/jpeg',
      quality
    );
  });

/**
 * Process image:
 * - center-crop square
 * - resize to <= MAX_IMAGE_DIM (never upscale)
 * - compress to JPEG and attempt to get <= MAX_IMAGE_BYTES
 */
const processImageToJpeg = async (file: File): Promise<{ blob: Blob; width: number; height: number }> => {
  const img = await readImage(file);
  let srcW = img.naturalWidth;
  let srcH = img.naturalHeight;

  // center crop to square
  const cropSize = Math.min(srcW, srcH);
  const sx = Math.floor((srcW - cropSize) / 2);
  const sy = Math.floor((srcH - cropSize) / 2);

  // output size: clamp to MAX_IMAGE_DIM but don't upscale
  let outSize = Math.min(MAX_IMAGE_DIM, cropSize);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  const tryCompress = async (size: number, initialQuality = 0.85) => {
    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, size, size);

    let quality = initialQuality;
    let blob = await encodeCanvasToJpeg(canvas, quality);

    while (blob.size > MAX_IMAGE_BYTES && quality > 0.5) {
      quality -= 0.05;
      blob = await encodeCanvasToJpeg(canvas, quality);
    }
    return { blob, size, quality };
  };

  // try with outSize first
  let { blob } = await tryCompress(outSize, 0.85);

  // if still too big, reduce dimensions gradually
  while (blob.size > MAX_IMAGE_BYTES && outSize > 720) {
    outSize = Math.round(outSize * 0.9);
    const res = await tryCompress(outSize, 0.8);
    blob = res.blob;
  }

  if (blob.size > MAX_IMAGE_BYTES) {
    throw new Error(`Could not compress image under ${MAX_IMAGE_KB} KB. Choose a simpler image.`);
  }

  return { blob, width: outSize, height: outSize };
};

// Video metadata reader
const getVideoMetadata = (file: File): Promise<{ width: number; height: number; duration: number }> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');

    let cleaned = false;
    const cleanup = () => {
      if (!cleaned) {
        try {
          URL.revokeObjectURL(url);
        } catch {}
        cleaned = true;
      }
    };

    const onError = () => {
      cleanup();
      reject(new Error('Failed to load video metadata'));
    };

    video.preload = 'metadata';
    video.src = url;

    const onLoaded = () => {
      const width = video.videoWidth || 0;
      const height = video.videoHeight || 0;
      const duration = isFinite(video.duration) ? video.duration : 0;
      cleanup();
      resolve({ width, height, duration });
    };

    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('error', onError);
  });

// extract a single centered frame from a video file and return a JPEG Blob sized `size` x `size`
const extractVideoPoster = async (file: File, size = 1080): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');

    let cleanup = () => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    };

    video.preload = 'metadata';
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    const onError = (e: any) => {
      cleanup();
      reject(new Error('Failed to load video for poster extraction'));
    };

    video.addEventListener('error', onError);

    video.addEventListener('loadedmetadata', () => {
      const duration = isFinite(video.duration) ? Math.max(0.01, video.duration) : 1;
      const seekTo = Math.min(1, duration / 2);

      const handleSeeked = () => {
        try {
          const vw = video.videoWidth || 1;
          const vh = video.videoHeight || 1;

          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas not supported');

          const scale = Math.max(canvas.width / vw, canvas.height / vh);
          const sw = canvas.width / scale;
          const sh = canvas.height / scale;
          const sx = Math.max(0, (vw - sw) / 2);
          const sy = Math.max(0, (vh - sh) / 2);

          ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(
            blob => {
              cleanup();
              if (blob) resolve(blob);
              else reject(new Error('Failed to create poster blob'));
            },
            'image/jpeg',
            0.9
          );
        } catch (err) {
          cleanup();
          reject(err);
        } finally {
          try {
            video.removeEventListener('seeked', handleSeeked);
          } catch {}
        }
      };

      video.addEventListener('seeked', handleSeeked);

      try {
        video.currentTime = seekTo;
      } catch {
        setTimeout(() => {
          try {
            video.currentTime = seekTo;
          } catch {}
        }, 250);
      }

      // safety fallback
      setTimeout(() => {
        try {
          if (!video.paused) video.pause();
        } catch {}
      }, 2500);
    });
  });
};

// helper to detect video urls (mp4/mov)
const isVideoUrl = (url: string) => {
  if (!url) return false;
  return /\.(mp4|mov)(\?|$)/i.test(url);
};

export const DealThumbnailUpload: React.FC<DealThumbnailUploadProps> = ({
  dealId,
  images,
  onImagesChange,
  label = 'JPG max 1080×1080 (300 KB) • MP4 max 1080×1920 (30s, 25 MB)',
}) => {
  const [uploading, setUploading] = useState<number | null>(null);

  // async validation: type, size, (dimensions for images and videos)
  const validateFileAsync = async (file: File): Promise<{ ok: boolean; type: 'image' | 'video' | null; ext: string | null }> => {
    const isImage =
      file.type === 'image/jpeg' ||
      file.type === 'image/jpg' ||
      file.type === 'image/png' ||
      /\.jpe?g$/i.test(file.name) ||
      /\.png$/i.test(file.name);

    const isVideo =
      file.type === 'video/mp4' ||
      file.type === 'video/quicktime' ||
      /\.mp4$/i.test(file.name) ||
      /\.mov$/i.test(file.name);

    if (!isImage && !isVideo) {
      toast({
        title: 'Error',
        description: 'Only JPG/PNG images or MP4/MOV videos are allowed',
        variant: 'destructive',
      });
      return { ok: false, type: null, ext: null };
    }

    if (isVideo) {
      if (file.size > MAX_VIDEO_BYTES) {
        toast({
          title: 'Error',
          description: `Video size must be less than ${MAX_VIDEO_MB} MB`,
          variant: 'destructive',
        });
        return { ok: false, type: null, ext: null };
      }

      // check metadata: duration and dimensions
      try {
        const { width, height, duration } = await getVideoMetadata(file);
        if (duration > MAX_VIDEO_DURATION) {
          toast({
            title: 'Error',
            description: `Video duration must be ${MAX_VIDEO_DURATION} seconds or less (your video is ${Math.round(duration)}s)`,
            variant: 'destructive',
          });
          return { ok: false, type: null, ext: null };
        }
        // allow orientation, but enforce max bounds
        const tooWide = width > MAX_VIDEO_WIDTH;
        const tooTall = height > MAX_VIDEO_HEIGHT;
        if (tooWide || tooTall) {
          toast({
            title: 'Error',
            description: `Video resolution must be at most ${MAX_VIDEO_WIDTH}×${MAX_VIDEO_HEIGHT}px (your video is ${width}×${height})`,
            variant: 'destructive',
          });
          return { ok: false, type: null, ext: null };
        }
      } catch (err) {
        console.warn('Video metadata read failed', err);
        toast({
          title: 'Error',
          description: 'Failed to read video metadata. Try a different file.',
          variant: 'destructive',
        });
        return { ok: false, type: null, ext: null };
      }

      const extMatch = (file.name.split('.').pop() || '').toLowerCase();
      const ext = extMatch === 'mov' ? 'mov' : 'mp4';
      return { ok: true, type: 'video', ext };
    }

    // Image checks
    if (file.size > MAX_IMAGE_BYTES) {
      // We will attempt client-side resize/compression later; allow pass here so we can process.
      // But warn briefly (not an error yet).
    }

    try {
      const { width, height } = await getImageDimensions(file);
      // Images will be center-cropped to square; only check the larger dimension cannot be < 1
      if (width < 16 || height < 16) {
        toast({
          title: 'Error',
          description: 'Image is too small or invalid',
          variant: 'destructive',
        });
        return { ok: false, type: null, ext: null };
      }
      // we allow larger images because we'll resize; so no strict rejection here
    } catch (err: any) {
      console.error('Dimension check failed', err);
      toast({
        title: 'Error',
        description: 'Failed to validate image dimensions',
        variant: 'destructive',
      });
      return { ok: false, type: null, ext: null };
    }

    return { ok: true, type: 'image', ext: 'jpg' };
  };

  const uploadFileAndMaybePoster = async (file: File, index: number) => {
    const validated = await validateFileAsync(file);
    if (!validated.ok || !validated.type) return;

    setUploading(index);
    try {
      const baseName = `${dealId}_${index}_${Date.now()}`;
      const ext = validated.ext ?? (file.name.split('.').pop() || 'bin');

      // file paths
      const primaryPath =
        validated.type === 'video' ? `deals/${baseName}.${ext}` : `deals/${baseName}.jpg`;
      const posterPath = validated.type === 'video' ? `deals/${baseName}.poster.jpg` : null;

      // If image: process then upload the processed JPEG blob
      if (validated.type === 'image') {
        const { blob, width, height } = await processImageToJpeg(file);
        const fileForUpload = new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });

        const { error: upErr } = await supabase.storage
          .from('merchant-images')
          .upload(primaryPath, fileForUpload, {
            upsert: true,
            contentType: 'image/jpeg',
          });
        if (upErr) throw upErr;

        const { data: primaryPublic } = supabase.storage.from('merchant-images').getPublicUrl(primaryPath);
        const primaryUrl = primaryPublic?.publicUrl ?? primaryPublic?.publicURL ?? '';
        if (!primaryUrl) throw new Error('Failed to get public URL for uploaded image');

        const newImages = normalizeImages(images);
        newImages[index] = primaryUrl;
        onImagesChange(newImages);

        toast({ title: 'Success', description: `Image uploaded (${width}×${height}px, ${Math.round(blob.size / 1024)} KB)` });
        return;
      }

      // If video: upload original file (validated size/duration/res)
      {
        const { error: upErr } = await supabase.storage
          .from('merchant-images')
          .upload(primaryPath, file, {
            upsert: true,
            contentType: file.type,
          });
        if (upErr) throw upErr;

        const { data: primaryPublic } = supabase.storage.from('merchant-images').getPublicUrl(primaryPath);
        const primaryUrl = primaryPublic?.publicUrl ?? primaryPublic?.publicURL ?? '';
        if (!primaryUrl) throw new Error('Failed to get public URL for uploaded file');

        // attempt to extract poster (1080x1080) and upload it
        if (posterPath) {
          try {
            const posterBlob = await extractVideoPoster(file, Math.min(MAX_IMAGE_DIM, 1080));
            // try to compress poster if needed (simple approach)
            let posterToUpload: Blob = posterBlob;
            if (posterBlob.size > MAX_IMAGE_BYTES) {
              // downscale poster to 720 if needed
              const canvas = document.createElement('canvas');
              const img = await readImage(new File([posterBlob], 'tmp.jpg', { type: 'image/jpeg' }));
              const size = Math.min(720, Math.max(320, Math.floor((MAX_IMAGE_DIM * 720) / 1080)));
              canvas.width = size;
              canvas.height = size;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0, size, size);
                // eslint-disable-next-line no-await-in-loop
                posterToUpload = await encodeCanvasToJpeg(canvas, 0.8);
              }
            }

            const posterFile = new File([posterToUpload], `${baseName}.poster.jpg`, { type: 'image/jpeg' });
            const { error: posterErr } = await supabase.storage
              .from('merchant-images')
              .upload(posterPath, posterFile, {
                upsert: true,
                contentType: 'image/jpeg',
              });
            if (posterErr) {
              console.warn('Poster upload failed (non-fatal):', posterErr);
            }
          } catch (err) {
            console.warn('Poster extraction failed (non-fatal):', err);
          }
        }

        const newImages = normalizeImages(images);
        newImages[index] = primaryUrl;
        onImagesChange(newImages);

        toast({ title: 'Success', description: 'Video uploaded successfully!' });
        return;
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      toast({
        title: 'Error',
        description: err?.message || 'Failed to upload media',
        variant: 'destructive',
      });
    } finally {
      setUploading(null);
    }
  };

  const removeImage = async (index: number) => {
    const current = normalizeImages(images);
    const url = current[index];
    if (url) {
      try {
        let filePath = '';
        if (url.includes('/storage/v1/object/public/')) {
          const after = url.split('/storage/v1/object/public/')[1]; // "<bucket>/<path>"
          const parts = after.split('/');
          if (parts.length > 1) {
            filePath = parts.slice(1).join('/');
          } else {
            filePath = parts[0];
          }
        } else {
          filePath = url.split('/').pop() || '';
        }

        if (filePath) {
          await supabase.storage.from('merchant-images').remove([filePath]);
          const predictedPoster = filePath.replace(/\.[^/.]+$/, '.poster.jpg');
          try {
            await supabase.storage.from('merchant-images').remove([predictedPoster]);
          } catch {}
        }
      } catch (err) {
        console.warn('Failed to remove from storage (non-fatal)', err);
      }
    }

    const newImages = normalizeImages(images);
    newImages[index] = '';
    onImagesChange(newImages);
  };

  const normalized = normalizeImages(images);

  return (
    <div className="space-y-4">
      <Label className="flex items-center gap-2 text-xs text-gray-500">{label}</Label>

      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map(index => {
          const src = normalized[index];
          const hasMedia = !!src;
          const showVideo = hasMedia && isVideoUrl(src);

          const posterDerived = showVideo
            ? src.replace(/\.[^/.]+(\?.*)?$/, '.poster.jpg')
            : null;

          return (
            <div key={index} className="relative">
              <div className="aspect-square border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                {hasMedia ? (
                  <>
                    {showVideo ? (
                      <img
                        src={posterDerived || PLACEHOLDER_IMAGE}
                        alt={`Deal media ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={e => {
                          const t = e.target as HTMLImageElement;
                          t.src = PLACEHOLDER_IMAGE;
                        }}
                      />
                    ) : (
                      <img
                        src={src}
                        alt={`Deal media ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={e => {
                          const t = e.target as HTMLImageElement;
                          t.src = PLACEHOLDER_IMAGE;
                        }}
                      />
                    )}

                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 w-6 h-6 p-0"
                      onClick={() => removeImage(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-gray-100 transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-xs text-gray-500 text-center px-2">
                      {uploading === index ? 'Uploading...' : 'Upload JPG/MP4'}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,video/mp4,video/quicktime"
                      className="hidden"
                      onChange={async e => {
                        const file = e.target.files?.[0];
                        if (file) await uploadFileAndMaybePoster(file, index);
                        if (e.target) (e.target as HTMLInputElement).value = '';
                      }}
                      disabled={uploading === index}
                    />
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DealThumbnailUpload;
