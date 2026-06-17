export function parseUserAgent(ua: string | null): {
  device_type: string | null
  browser: string | null
  os: string | null
} {
  if (!ua) return { device_type: null, browser: null, os: null }

  const device_type = /Mobi|Android|iPhone|iPad/i.test(ua) ? "mobile" : "desktop"

  const browser =
    /Edg\//i.test(ua) ? "Edge" :
    /OPR|Opera/i.test(ua) ? "Opera" :
    /Chrome\//i.test(ua) ? "Chrome" :
    /Firefox\//i.test(ua) ? "Firefox" :
    /Safari\//i.test(ua) ? "Safari" :
    null

  const os =
    /Windows/i.test(ua) ? "Windows" :
    /Mac OS X|Macintosh/i.test(ua) ? "macOS" :
    /Android/i.test(ua) ? "Android" :
    /iPhone|iPad|iOS/i.test(ua) ? "iOS" :
    /Linux/i.test(ua) ? "Linux" :
    null

  return { device_type, browser, os }
}
