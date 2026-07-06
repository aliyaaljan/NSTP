import { NextResponse } from "next/server"
import { uploadToGoogleDrive } from "@/lib/google-drive"

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
    if (!folderId) {
      return NextResponse.json(
        { error: "Server misconfiguration: Missing GOOGLE_DRIVE_FOLDER_ID" },
        { status: 500 }
      )
    }

    const driveResponse = await uploadToGoogleDrive(file, folderId)

    return NextResponse.json(
      {
        success: true,
        message: "File uploaded successfully",
        data: driveResponse,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Upload handler error:", error)
    return NextResponse.json(
      { error: error.message || "Unknown Internal Server Error" },
      { status: 500 }
    )
  }
}
