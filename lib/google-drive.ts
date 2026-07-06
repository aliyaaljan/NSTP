import { google } from "googleapis"
import { Readable } from "stream"

const getAuth = () => {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_KEY environment variable")
  }

  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  })
}

/**
 * Uploads a Web API File to a specific Google Drive Folder
 */
export const uploadToGoogleDrive = async (file: File, folderId: string) => {
  const auth = getAuth()
  const drive = google.drive({ version: "v3", auth })

  const buffer = Buffer.from(await file.arrayBuffer())
  const stream = new Readable()
  stream.push(buffer)
  stream.push(null)

  try {
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
    })

    return response.data
  } catch (error: any) {
    console.error("Google Drive API Error:", error)

    throw new Error(
      `Google Drive API Error: ${error.message || JSON.stringify(error)}`
    )
  }
}
