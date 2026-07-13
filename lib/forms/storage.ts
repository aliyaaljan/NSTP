import "server-only"
import { randomUUID } from "crypto"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"

const BUCKET = "forms"
const MAX_SIZE_BYTES = 2 * 1024 * 1024

const ALLOWED_EXTENSIONS: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

// Magic-byte signatures for server-side MIME validation
const MAGIC_BYTES: { prefix: number[]; contentType: string }[] = [
  { prefix: [0x25, 0x50, 0x44, 0x46], contentType: "application/pdf" }, // %PDF
  {
    prefix: [0x50, 0x4b, 0x03, 0x04],
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  }, // PK (docx/zip)
  {
    prefix: [0xd0, 0xcf, 0x11, 0xe0],
    contentType: "application/msword",
  }, // legacy .doc (OLE2)
]

function detectContentType(buffer: Buffer): string | null {
  for (const { prefix, contentType } of MAGIC_BYTES) {
    if (
      buffer.length >= prefix.length &&
      prefix.every((b, i) => buffer[i] === b)
    ) {
      return contentType
    }
  }
  return null
}

function getExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".")
  if (dot < 0) return ""
  return fileName.slice(dot).toLowerCase()
}

function sanitizeFileName(raw: string): string {
  const name = raw.replace(/[^\w.\-() ]/g, "_").slice(0, 200)
  return name || "file"
}

export type UploadResult =
  | { ok: true; storagePath: string; contentType: string; fileSize: number; sanitizedName: string }
  | { ok: false; error: string }

export async function uploadFormFile(
  fileBuffer: Buffer,
  originalFileName: string,
  pathPrefix: string
): Promise<UploadResult> {
  if (fileBuffer.length > MAX_SIZE_BYTES) {
    return { ok: false, error: `File exceeds ${MAX_SIZE_BYTES / 1024 / 1024} MB limit` }
  }

  if (fileBuffer.length === 0) {
    return { ok: false, error: "File is empty" }
  }

  const ext = getExtension(originalFileName)
  if (!ALLOWED_EXTENSIONS[ext]) {
    return { ok: false, error: `File type "${ext || "(none)"}" is not allowed. Accepted: .pdf, .doc, .docx` }
  }

  const detectedType = detectContentType(fileBuffer)
  if (!detectedType) {
    return { ok: false, error: "File content does not match a supported document type" }
  }

  // Cross-check: extension must be compatible with magic bytes
  if (ext === ".pdf" && detectedType !== "application/pdf") {
    return { ok: false, error: "File extension is .pdf but content is not a PDF" }
  }
  if (
    (ext === ".doc" || ext === ".docx") &&
    detectedType !== "application/msword" &&
    detectedType !==
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return { ok: false, error: "File content does not match a Word document" }
  }

  const objectKey = `${pathPrefix}/${randomUUID()}${ext}`
  const sanitizedName = sanitizeFileName(originalFileName)
  const contentType = ext === ".pdf" ? "application/pdf" : detectedType

  const service = createSupabaseServiceClient()
  const { error } = await service.storage
    .from(BUCKET)
    .upload(objectKey, fileBuffer, { contentType, upsert: false })

  if (error) {
    console.error("[uploadFormFile] upload failed", error)
    return { ok: false, error: "Storage upload failed" }
  }

  return {
    ok: true,
    storagePath: objectKey,
    contentType,
    fileSize: fileBuffer.length,
    sanitizedName,
  }
}

export async function getSignedUrl(
  storagePath: string,
  ttlSeconds = 120
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const service = createSupabaseServiceClient()
  const { data, error } = await service.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, ttlSeconds)

  if (error || !data?.signedUrl) {
    console.error("[getSignedUrl] failed", error)
    return { ok: false, error: "Could not generate download link" }
  }

  return { ok: true, url: data.signedUrl }
}

export async function deleteFormFile(storagePath: string): Promise<void> {
  try {
    const service = createSupabaseServiceClient()
    await service.storage.from(BUCKET).remove([storagePath])
  } catch (err) {
    console.error("[deleteFormFile] best-effort cleanup failed", err)
  }
}
