import { NextResponse } from "next/server"
import { uploadToGoogleDrive } from "@/lib/google-drive"

export async function POST(req: Request) {
  try {
    // parse form-data
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const studentID = (formData.get("studentId") as string) || null
    const taskId = (formData.get("taskId") as string) || null
    if (!file) {
      return NextResponse.json({ error: "No file provvided" }, { status: 400 })
    }

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
    if (!folderId) {
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 }
      )
    }

    // upload files to google drive
    const driveResponse = await uploadToGoogleDrive(file, folderId)

    return NextResponse.json(
      {
        success: true,
        message: "File uploaded successfully",
        data: driveResponse,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Upload handler error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
