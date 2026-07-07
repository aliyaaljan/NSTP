"use client"

import { useState } from "react"

interface FileUploaderProps {
  studentId: string
  taskId?: string
  onUploadSuccess: (fileUrl: string, fileId: string) => void
}

export default function FileUploader({
  studentId,
  taskId,
  onUploadSuccess,
}: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
      setError(null)
    }
  }
  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first.")
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("studentId", studentId)
      if (taskId) formData.append("taskId", taskId)

      const response = await fetch("/api/upload/drive", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Upload failed")
      }

      // pass google drive links back to parent component so they can be saved to supabase
      onUploadSuccess(result.data.webViewLink, result.data.id)
      setFile(null) // clear file input after success
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.")
    } finally {
      setIsUploading(false)
    }
  }
  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">
        Upload Requirement
      </h3>

      <input
        type="file"
        onChange={handleFileChange}
        disabled={isUploading}
        className="block w-full text-sm text-gray-500 mb-3
          file:mr-4 file:py-2 file:px-4
          file:rounded-md file:border-0
          file:text-sm file:font-semibold
          file:bg-blue-50 file:text-blue-700
          hover:file:bg-blue-100 disabled:opacity-50"
      />

      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      <button
        onClick={handleUpload}
        disabled={!file || isUploading}
        className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isUploading ? "Uploading to Drive..." : "Upload File"}
      </button>
    </div>
  )
}
