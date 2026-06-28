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

export function validateSiteCreatePayload(payload: SiteCreatePayload): string | null {
  if (!payload.siteName.trim()) return "Site name is required."
  if (!payload.sectionId.trim()) return "Section is required."
  if (!Number.isFinite(payload.radiusMeters) || payload.radiusMeters < 1) {
    return "Radius must be at least 1 meter."
  }
  if (!Number.isFinite(payload.centerLatitude)) return "Latitude is required."
  if (!Number.isFinite(payload.centerLongitude)) return "Longitude is required."
  return null
}

export function validateSiteUpdatePayload(payload: SiteUpdatePayload): string | null {
  if (!payload.geofenceId.trim()) return "Site ID is required."
  if (!payload.sectionId.trim()) return "Section is required."
  if (!payload.siteName.trim()) return "Site name is required."
  if (!Number.isFinite(payload.radiusMeters) || payload.radiusMeters < 1) {
    return "Radius must be at least 1 meter."
  }
  if (!Number.isFinite(payload.centerLatitude)) return "Latitude is required."
  if (!Number.isFinite(payload.centerLongitude)) return "Longitude is required."
  return null
}

export function validateSiteDelete(site: SiteListRow): string | null {
  if (site.isSample) {
    return "Sample GPS sites cannot be deleted until database sites are available."
  }
  return null
}
