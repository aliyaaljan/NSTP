export type Geo = { latitude: number; longitude: number; accuracy_meter: number }

export type GeoFailReason = "denied" | "timeout" | "unavailable" | "unsupported"
export type GeoResult = { ok: true; geo: Geo } | { ok: false; reason: GeoFailReason }

export function captureGeo(): Promise<GeoResult> {
  return new Promise((resolve) => {
    if (!navigator.geolocation)
      return resolve({ ok: false, reason: "unsupported" })
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          ok: true,
          geo: {
            latitude: p.coords.latitude,
            longitude: p.coords.longitude,
            accuracy_meter: p.coords.accuracy,
          },
        }),
      (err) => {
        const reason: GeoFailReason =
          err.code === err.PERMISSION_DENIED
            ? "denied"
            : err.code === err.TIMEOUT
            ? "timeout"
            : "unavailable"
        resolve({ ok: false, reason })
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    )
  })
}

export function geoErrorMessage(reason: GeoFailReason): string {
  switch (reason) {
    case "denied":
      return "Location access is off. Enable location for this site in your browser settings."
    case "timeout":
      return "Couldn't get your location in time. Make sure location is on and you have a signal."
    case "unavailable":
      return "Your location is currently unavailable. Make sure location services are on."
    case "unsupported":
      return "This device or browser doesn't support location."
  }
}
