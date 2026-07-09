// Client-side image compression before upload.
// Keeps documents (PDF/etc.) untouched and rescales images to a safer max dimension.
const MAX_DIM = 1920;
const QUALITY = 0.85;

function isCompressibleImage(file: File): boolean {
  return /^image\/(jpe?g|png|webp)$/i.test(file.type);
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export async function compressImageFile(file: File): Promise<File> {
  if (!isCompressibleImage(file)) return file;
  if (typeof window === "undefined") return file;
  // Skip tiny files — nothing to gain.
  if (file.size < 200 * 1024) return file;

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
    if (scale >= 1 && file.type === "image/jpeg") return file;

    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY),
    );
    if (!blob) return file;
    // If compression made it bigger, keep original.
    if (blob.size >= file.size) return file;

    const base = file.name.replace(/\.[a-z0-9]+$/i, "");
    return new File([blob], `${base}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}
