/**
 * Native platform helpers. Safe to call from any client component —
 * falls back to web behavior when Capacitor is not present (i.e. browser).
 */
import { Capacitor } from '@capacitor/core';

export const isNative = () => Capacitor.isNativePlatform();
export const nativePlatform = () => Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

/** Share text/URL. Uses native share sheet on device, Web Share API in browser. */
export async function shareContent(opts: { title?: string; text?: string; url?: string }) {
  if (isNative()) {
    const { Share } = await import('@capacitor/share');
    await Share.share({
      title: opts.title,
      text: opts.text,
      url: opts.url,
      dialogTitle: opts.title,
    });
    return true;
  }
  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      await navigator.share(opts);
      return true;
    } catch {
      return false;
    }
  }
  // Fallback: copy URL/text to clipboard
  const payload = opts.url ?? opts.text ?? '';
  const nav = typeof navigator !== 'undefined' ? (navigator as Navigator) : null;
  if (payload && nav?.clipboard) {
    await nav.clipboard.writeText(payload);
    return true;
  }
  return false;
}

/** Capture or pick a photo. Returns a data URL string. */
export async function capturePhoto(opts: { source?: 'camera' | 'gallery' } = {}) {
  if (isNative()) {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source:
        opts.source === 'gallery'
          ? CameraSource.Photos
          : opts.source === 'camera'
            ? CameraSource.Camera
            : CameraSource.Prompt,
    });
    return photo.dataUrl ?? null;
  }
  // Web fallback: file input
  return new Promise<string | null>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (opts.source === 'camera') input.setAttribute('capture', 'environment');
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

/** Light haptic feedback (no-op in browser). */
export async function hapticTap() {
  if (!isNative()) return;
  const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
  await Haptics.impact({ style: ImpactStyle.Light });
}
