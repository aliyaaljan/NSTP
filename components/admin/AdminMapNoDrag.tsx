"use client"

import {MapContainer, TileLayer, Marker, Circle} from "react-leaflet"
import "leaflet/dist/leaflet.css"
import { divIcon } from "leaflet"
import { renderToStaticMarkup } from "react-dom/server"
import { FaMapMarkerAlt } from "react-icons/fa"

const redIcon = divIcon({
  html: renderToStaticMarkup(<FaMapMarkerAlt size={40} color="#B91C1C" />),
  className: "",
  iconSize: [40, 40],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
})

interface AdminMapProps {
  center: [number, number]
  radius: number
  onCenterChange: (lat: number, lng: number) => void
}

export default function AdminMapNoDrag({center, radius, onCenterChange}:AdminMapProps) {
    const cen = center ?? [16.41639, 120.59306]

    return (
        <MapContainer center={cen} zoom={16} style={{ height: "100%", width: "100%", borderRadius: 8 }}>
             <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={cen} icon={redIcon}></Marker>
            <Circle center={cen} pathOptions={{color: 'green'}} radius={radius}></Circle>
        </MapContainer>
    )
}