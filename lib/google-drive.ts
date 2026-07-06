import { google } from "googleapis"
import { Readable } from "stream"

// initialize google drive auth client using service account credentials
const getAuth = () => {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_KEY environment variable")
  }

  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)

  return new google.auth.GoogleAuth({
    credentials,
    // the scope limits the bot to only access files it creates or files explicitly shared with it
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  })
}

// UPLOADS FILE TO SPECIFIC GOOGLE DRIVE FOLDER

export const uploadToGoogleDrive = async (file: File, folderId: string) => {
  const auth = getAuth()
  const drive = google.drive({ version: "v3", auth })

  // convert web file object to node.js buffer, then into readable stream
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
  } catch (error) {
    console.error("Google Drive API Error:", error)
    throw new Error("Failed to upload file to Google Drive")
  }
}
