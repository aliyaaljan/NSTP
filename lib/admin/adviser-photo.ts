import "server-only"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"

export const ADVISER_PHOTO_BUCKET = "adviser-photos"
export const ADVISER_PHOTO_MAX_BYTES = 2 * 1024 * 1024 // 2 MB

const ALLOWED_EXTENSIONS: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
}

const MAGIC_BYTES: { prefix: number[]; contentType: string }[] = [
  { prefix: [0xff, 0xd8, 0xff], contentType: "image/jpeg" },
  { prefix: [0x89, 0x50, 0x4e, 0x47], contentType: "image/png" },
  { prefix: [0x47, 0x49, 0x46], contentType: "image/gif" },
  { prefix: [0x52, 0x49, 0x46, 0x46], contentType: "image/webp" },
]

function getExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".")
  if (dot < 0) return ""
  return fileName.slice(dot).toLowerCase()
}

function detectImageContentType(buffer: Buffer): string | null {
  for (const { prefix, contentType } of MAGIC_BYTES) {
    if (
      buffer.length >= prefix.length &&
      prefix.every((byte, index) => buffer[index] === byte)
    ) {
      return contentType
    }
  }
  return null
}

export function getAdviserPhotoPublicUrl(
  storagePath: string | null | undefined
): string | null {
  if (!storagePath?.trim()) return null

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!baseUrl) return null

  return `${baseUrl}/storage/v1/object/public/${ADVISER_PHOTO_BUCKET}/${storagePath}`
}

export type AdviserPhotoUploadResult =
  | { ok: true; storagePath: string; photoUrl: string }
  | { ok: false; error: string }

export async function uploadAdviserPhotoFile(
  adviserUserId: string,
  fileBuffer: Buffer,
  originalFileName: string
): Promise<AdviserPhotoUploadResult> {
  if (!adviserUserId.trim()) {
    return { ok: false, error: "Adviser ID is required." }
  }

  if (fileBuffer.length === 0) {
    return { ok: false, error: "Image file is empty." }
  }

  if (fileBuffer.length > ADVISER_PHOTO_MAX_BYTES) {
    return { ok: false, error: "Image must be 2 MB or smaller." }
  }

  const ext = getExtension(originalFileName)
  if (!ALLOWED_EXTENSIONS[ext]) {
    return {
      ok: false,
      error: "Only JPG, PNG, WebP, and GIF images are allowed.",
    }
  }

  const detectedType = detectImageContentType(fileBuffer)
  if (!detectedType) {
    return { ok: false, error: "File content is not a supported image." }
  }

  const storagePath = `advisers/${adviserUserId}/photo${ext}`
  const service = createSupabaseServiceClient()

  const { error } = await service.storage
    .from(ADVISER_PHOTO_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: detectedType,
      upsert: true,
    })

  if (error) {
    console.error("[uploadAdviserPhotoFile] upload failed", error)
    return { ok: false, error: "Could not upload image. Please try again." }
  }

  const photoUrl = getAdviserPhotoPublicUrl(storagePath)
  if (!photoUrl) {
    return { ok: false, error: "Upload succeeded but photo URL could not be resolved." }
  }

  return { ok: true, storagePath, photoUrl }
}

export async function deleteAdviserPhotoFile(
  storagePath: string | null | undefined
): Promise<void> {
  if (!storagePath?.trim()) return

  try {
    const service = createSupabaseServiceClient()
    await service.storage.from(ADVISER_PHOTO_BUCKET).remove([storagePath])
  } catch (error) {
    console.error("[deleteAdviserPhotoFile] cleanup failed", error)
  }
}
