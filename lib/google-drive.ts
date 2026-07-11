import { google } from "googleapis"
import { Readable } from "stream"

const getOAuthClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Google OAuth environment variables")
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    "https://developers.google.com/oauthplayground"
  )

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  })

  return oauth2Client
}

/**
 * direct file upload using personal account's 15GB GDrive quota via Oauthv2
 */
export const uploadToGoogleDrive = async (file: File, folderId: string) => {
  const auth = getOAuthClient()
  const drive = google.drive({ version: "v3", auth })

  // convert browser-based file structure into a server-compatible readable stream
  const buffer = Buffer.from(await file.arrayBuffer())
  const stream = new Readable()
  stream.push(buffer)
  stream.push(null)

  try {
    // using OAuthv2, direct file transfer to GDrive Folder
    // no need for permissions

    const response = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [folderId],
      },
      media: {
        mimeType: file.type,
        body: stream,
      },
      fields: "id, webViewLink, webContentLink",
      supportsAllDrives: true, // allow to write into workspace shared drive
    })
    const fileId = response.data.id

    if (fileId) {
      try {
        await drive.permissions.create({
          fileId: fileId,
          supportsAllDrives: true, // Crucial for Shared Drives
          requestBody: {
            type: "anyone", // Allows the student who holds the link to view it
            role: "reader", // Restricts them to Read-Only so they can't delete or modify it after submission
          },
        })
      } catch (permError) {
        console.warn("Non-blocking Permission Error:", permError)
      }
    }
    return response.data
  } catch (error: any) {
    console.error("Google Drive API Error:", error)
    throw new Error(
      `Google Drive API Error: ${error.message || "Failed to upload file"}`
    )
  }
}
