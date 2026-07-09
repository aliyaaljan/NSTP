"use client"

import {MapContainer, TileLayer, Marker, Popup, Circle} from "react-leaflet"
import "leaflet/dist/leaflet.css"
import { divIcon } from "leaflet"
import { Fragment } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { FaMapMarkerAlt } from "react-icons/fa"

interface StudentLocation {
  eventType: string //time_in, time_out
  eventSource: string // system_auto, self_leader, adviser_manual, self_student, qr_scan
  recordedAt: string
  recordedBy: string //scanner
  generatedLat: number | null
  generatedLong: number | null
  scanLat: number | null
  scanLong: number | null
}

interface Geofence {
  label: string
  centerLat: number
  centerLong: number
  radius: number
}

interface StudentSession {
  id: string
  date: string
  timeIn: string
  timeOut: string | null
  hours: number
  statusId:string
  status: string
  locations: StudentLocation[] | null
  geofence: Geofence[] | null
}

interface MapProps {
  student_name: string
  session: StudentSession
}

const redIcon = divIcon({
  html: renderToStaticMarkup(<FaMapMarkerAlt size={40} color="#B91C1C" />),
  className: "",
  iconSize: [40, 40],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
})

const blueIcon = divIcon({
  html: renderToStaticMarkup(<FaMapMarkerAlt size={40} color="blue" />),
  className: "",
  iconSize: [40, 40],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
})

export default function Map({ student_name, session }: MapProps) {
    // Only keep locations that actually have valid scan coordinates
    const locations = (session.locations ?? []).filter((loc) => loc.scanLat != null && loc.scanLong != null)
    const geofence = session.geofence?.[0] ?? null

    const first = locations[0]
    const center: [number, number] = first ? [first.scanLat as number, first.scanLong as number] : [16.41639, 120.59306] // Baguio 

    return (
        <MapContainer center={center} zoom={18} style={{ height: "100%", width: "100%", borderRadius: 8 }}>
        <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {geofence !== null && geofence.centerLat != null && geofence.centerLong != null && (
            <Circle center={[geofence.centerLat, geofence.centerLong] } pathOptions={{color: 'green'}} radius={geofence.radius}> {/* radius in meters */}
                <Popup>
                    {geofence.label}
                </Popup>
            </Circle>
        )}
        
        {locations.map((loc, i) => (
            <Fragment key={i}>
            {loc.generatedLat != null && loc.generatedLong != null && (
                <Marker position={[loc.generatedLat, loc.generatedLong]} icon={redIcon}>
                <Popup>
                    <div className="flex flex-col p-4">
                        <div>Student {student_name}</div>
                        <div>Scanned by {loc.recordedBy}</div>
                        <div>Recorded at {loc.recordedAt}</div>
                    </div>
                </Popup>
                </Marker>
            )}
            {/* {loc.scanLat != null && loc.scanLong != null && (
                <Marker position={[loc.scanLat as number, loc.scanLong as number]} icon={blueIcon}>
                <Popup>
                Scanned by {loc.recordedBy ?? "Unknown"}
                </Popup>
            </Marker>
            )} */}
            </Fragment>
        ))}
        </MapContainer>
    )
}