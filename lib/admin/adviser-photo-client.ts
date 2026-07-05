export const ADVISER_PHOTO_MAX_BYTES = 2 * 1024 * 1024 // 2 MB

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

export function validateAdviserPhotoFile(file: File): string | null {
  if (file.size === 0) {
    return "Please choose an image to upload."
  }

  if (file.size > ADVISER_PHOTO_MAX_BYTES) {
    return "Image must be 2 MB or smaller."
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return "Only JPG, PNG, WebP, and GIF images are allowed."
  }

  return null
}
