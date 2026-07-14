/**
 * Site create/edit contract for the admin site list page.
 *
 * Backend devs: implement mutations in `lib/admin/site-list-actions.ts`.
 * The UI submits these payload shapes only.
 */

import type { SiteListRow } from "@/lib/admin/site-list"

/** Payload for creating a GPS geofence site. Maps to `section_geofence`. */
export interface SiteCreatePayload {
  /** `section_geofence.label` */
  siteName: string
  /** `section_geofence.section_id` */
  sectionId: string
  /** `section_geofence.radius_meter` */
  radiusMeters: number
  /** `section_geofence.center_latitude` */
  centerLatitude: number
  /** `section_geofence.center_longitude` */
  centerLongitude: number
}

/** Payload for updating an existing GPS geofence. */
export interface SiteUpdatePayload {
  /** `section_geofence.section_geofence_id` */
  geofenceId: string
  /** `section_geofence.section_id` — adviser is derived from this section's adviser */
  sectionId: string
  /** `section_geofence.label` */
  siteName: string
  /** `section_geofence.radius_meter` */
  radiusMeters: number
  /** `section_geofence.center_latitude` */
  centerLatitude: number
  /** `section_geofence.center_longitude` */
  centerLongitude: number
  /** `section_geofence.is_active` */
  isActive: boolean
}

export type SiteMutationResult = { ok: true } | { ok: false; error: string }

export function siteRowToUpdatePayload(site: SiteListRow): SiteUpdatePayload {
  return {
    geofenceId: site.geofenceId,
    sectionId: site.sectionId,
    siteName: site.siteName,
    radiusMeters: site.radiusMeters,
    centerLatitude: site.centerLatitude,
    centerLongitude: site.centerLongitude,
    isActive: site.isActive,
  }
}

export function emptySiteCreatePayload(): SiteCreatePayload {
  return {
    siteName: "",
    sectionId: "",
    radiusMeters: 200,
    centerLatitude: 16.4111,
    centerLongitude: 120.5966,
  }
}

function validateSiteCoordinatesAndRadius(payload: {
  radiusMeters: number
  centerLatitude: number
  centerLongitude: number
}): string | null {
  if (!Number.isFinite(payload.radiusMeters) || payload.radiusMeters < 10 || payload.radiusMeters > 1000) {
    return "Radius must be between 10 and 1000 meters."
  }
  if (!Number.isFinite(payload.centerLatitude)) return "Latitude is required."
  if (payload.centerLatitude < -90 || payload.centerLatitude > 90) {
    return "Latitude must be between -90 and 90."
  }
  if (!Number.isFinite(payload.centerLongitude)) return "Longitude is required."
  if (payload.centerLongitude < -180 || payload.centerLongitude > 180) {
    return "Longitude must be between -180 and 180."
  }
  return null
}

export function validateSiteCreatePayload(payload: SiteCreatePayload): string | null {
  if (!payload.siteName.trim()) return "Site name is required."
  if (!payload.sectionId.trim()) return "Section is required."
  return validateSiteCoordinatesAndRadius(payload)
}

export function validateSiteUpdatePayload(payload: SiteUpdatePayload): string | null {
  if (!payload.geofenceId.trim()) return "Site ID is required."
  if (!payload.sectionId.trim()) return "Section is required."
  if (!payload.siteName.trim()) return "Site name is required."
  return validateSiteCoordinatesAndRadius(payload)
}
