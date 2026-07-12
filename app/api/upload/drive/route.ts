import { NextResponse } from "next/server"
import { uploadToGoogleDrive } from "@/lib/google-drive"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || !user.email) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      )
    }
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
    const driveResponse = await uploadToGoogleDrive(file, folderId, user.email)

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
