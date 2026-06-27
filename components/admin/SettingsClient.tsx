"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import AddGpsSiteModal from "@/components/admin/AddGpsSiteModal"
import AddHolidayModal from "@/components/admin/AddHolidayModal"
import GpsSiteDetailModal from "@/components/admin/GpsSiteDetailModal"
import ConfirmDeleteModal from "@/components/admin/ConfirmDeleteModal"
import ListPagination from "@/components/shared/ListPagination"
import {
  deleteHoliday,
  updateAcademicConfig,
  updateGpsSite,
} from "@/lib/admin/settings-actions"
import {
  academicConfigToPayload,
  validateAcademicConfigPayload,
  validateGpsSiteUpdatePayload,
  validateHolidayDelete,
  type AcademicConfigPayload,
} from "@/lib/admin/settings-edit"
import type {
  AcademicConfig,
  AdminCurrentUser,
  GpsSectionOption,
  GpsSite,
  HolidayRow,
  SchoolYearOption,
  SemesterOption,
  SettingsMeta,
} from "@/lib/admin/settings"
import {
  SETTINGS_LIST_PAGE_SIZE,
  paginateSettingsList,
} from "@/lib/admin/settings"
import { FONT_BODY, PAGE_TITLE, PROFILE_PILL, TYPE } from "@/lib/admin-typography"
import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"

const FIELD_BG = "#F3F4F6"
const SETTINGS_LIST_ROW_HEIGHT = 56
const SETTINGS_LIST_BODY_HEIGHT = SETTINGS_LIST_PAGE_SIZE * SETTINGS_LIST_ROW_HEIGHT
const SETTINGS_CARD_MIN_HEIGHT = SETTINGS_LIST_BODY_HEIGHT + 160

function padToPageSize<T>(items: T[], pageSize: number): Array<T | null> {
  const padded: Array<T | null> = items.slice(0, pageSize)
  while (padded.length < pageSize) padded.push(null)
  return padded
}

function settingsListRowBorder(index: number): React.CSSProperties {
  return index > 0 ? { borderTop: `1px solid ${COLORS.border}` } : {}
}

function SettingsListPanel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        margin: "0 -20px -18px",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        borderTop: `1px solid ${COLORS.border}`,
      }}
    >
      {children}
    </div>
  )
}

function FixedListBody({
  empty,
  emptyMessage,
  children,
  scrollable = true,
}: {
  empty: boolean
  emptyMessage: string
  children: React.ReactNode
  scrollable?: boolean
}) {
  return (
    <div
      style={{
        height: SETTINGS_LIST_BODY_HEIGHT,
        minHeight: SETTINGS_LIST_BODY_HEIGHT,
        overflowY: scrollable ? "auto" : "hidden",
        flexShrink: 0,
      }}
      className={scrollable ? "nstp-scroll" : undefined}
    >
      {empty ? (
        <div
          style={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 8px",
          }}
        >
          <p style={{ ...TYPE.body, color: COLORS.textGray, margin: 0, textAlign: "center" }}>
            {emptyMessage}
          </p>
        </div>
      ) : (
        children
      )}
    </div>
  )
}

function ListPlaceholderRow({ index }: { index: number }) {
  return (
    <li
      aria-hidden
      style={{
        height: SETTINGS_LIST_ROW_HEIGHT,
        minHeight: SETTINGS_LIST_ROW_HEIGHT,
        boxSizing: "border-box",
        ...settingsListRowBorder(index),
      }}
    />
  )
}

function ProfilePill({ user }: { user: AdminCurrentUser }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: PROFILE_PILL.gap,
        background: COLORS.maroon,
        borderRadius: PROFILE_PILL.borderRadius,
        padding: PROFILE_PILL.padding,
        color: "#fff",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: PROFILE_PILL.avatarSize,
          height: PROFILE_PILL.avatarSize,
          borderRadius: "50%",
          background: user.avatarUrl
            ? `center/cover no-repeat url(${user.avatarUrl})`
            : "rgba(255,255,255,0.2)",
          flexShrink: 0,
        }}
      />
      <div style={{ lineHeight: 1.2 }}>
        <div style={{ ...PROFILE_PILL.name, fontFamily: FONT_BODY, color: "#fff" }}>
          {user.name}
        </div>
        <div
          style={{
            ...PROFILE_PILL.role,
            fontFamily: FONT_BODY,
            color: "#fff",
            marginTop: 1,
          }}
        >
          {user.role}
        </div>
      </div>
    </div>
  )
}

function SettingsCard({
  title,
  icon,
  action,
  children,
}: {
  title: string
  icon?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        background: COLORS.cardBg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: COLORS.radius,
        padding: "18px 20px",
        boxShadow: COLORS.cardShadow,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: SETTINGS_CARD_MIN_HEIGHT,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {icon && (
            <i className={`ti ${icon}`} style={{ fontSize: 18, color: COLORS.maroon }} />
          )}
          <h2 style={{ ...TYPE.h2, color: COLORS.textDark, margin: 0 }}>{title}</h2>
        </div>
        {action}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</div>
    </div>
  )
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        ...TYPE.bodyBold,
        color: COLORS.textDark,
        display: "block",
        marginBottom: 6,
      }}
    >
      {children}
    </label>
  )
}

const fieldInputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  ...TYPE.body,
  color: COLORS.textDark,
  background: FIELD_BG,
  border: "none",
  borderRadius: 8,
  padding: "11px 14px",
  outline: "none",
}

function MaroonButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: "button" | "submit"
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...TYPE.bodyBold,
        fontFamily: FONT_BODY,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: COLORS.maroon,
        color: "#fff",
        border: "none",
        borderRadius: 20,
        padding: "6px 14px",
        fontSize: "12.5px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  )
}

function GreenButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: "button" | "submit"
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...TYPE.bodyBold,
        fontFamily: FONT_BODY,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: COLORS.green,
        color: "#fff",
        border: "none",
        borderRadius: 20,
        padding: "8px 18px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  )
}

function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return "—"
  const parsed = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return isoDate
  return parsed.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function SettingsClient({
  academic,
  schoolYearOptions,
  semesterOptions,
  gpsSites,
  gpsSections,
  holidays,
  meta,
  currentUser,
}: {
  academic: AcademicConfig
  schoolYearOptions: SchoolYearOption[]
  semesterOptions: SemesterOption[]
  gpsSites: GpsSite[]
  gpsSections: GpsSectionOption[]
  holidays: HolidayRow[]
  meta: SettingsMeta
  currentUser: AdminCurrentUser
}) {
  const [academicForm, setAcademicForm] = useState<AcademicConfigPayload>(
    academicConfigToPayload(academic)
  )
  const [academicError, setAcademicError] = useState<string | null>(null)
  const [academicSuccess, setAcademicSuccess] = useState(false)
  const [isSavingAcademic, startSaveAcademic] = useTransition()

  const [selectedGpsId, setSelectedGpsId] = useState(gpsSites[0]?.geofenceId ?? "")
  const [gpsConfigSectionId, setGpsConfigSectionId] = useState(
    gpsSites[0]?.sectionId ?? ""
  )
  const [gpsConfigRadius, setGpsConfigRadius] = useState(gpsSites[0]?.radiusMeters ?? 0)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [gpsSuccess, setGpsSuccess] = useState(false)
  const [isSavingGps, startSaveGps] = useTransition()

  const [gpsPage, setGpsPage] = useState(1)
  const [holidayPage, setHolidayPage] = useState(1)
  const [detailGpsSite, setDetailGpsSite] = useState<GpsSite | null>(null)

  const [addGpsOpen, setAddGpsOpen] = useState(false)
  const [addHolidayOpen, setAddHolidayOpen] = useState(false)
  const [deleteHolidayTarget, setDeleteHolidayTarget] = useState<HolidayRow | null>(null)

  const selectedGpsSite = useMemo(
    () => gpsSites.find((s) => s.geofenceId === selectedGpsId) ?? null,
    [gpsSites, selectedGpsId]
  )

  const selectedGpsSupervisor = useMemo(() => {
    const section = gpsSections.find((s) => s.sectionId === gpsConfigSectionId)
    return section?.supervisorName ?? ""
  }, [gpsSections, gpsConfigSectionId])

  const gpsPagination = useMemo(
    () => paginateSettingsList(gpsSites, gpsPage, SETTINGS_LIST_PAGE_SIZE),
    [gpsSites, gpsPage]
  )

  const sortedHolidays = useMemo(
    () => [...holidays].sort((a, b) => a.date.localeCompare(b.date)),
    [holidays]
  )

  const holidayPagination = useMemo(
    () => paginateSettingsList(sortedHolidays, holidayPage, SETTINGS_LIST_PAGE_SIZE),
    [sortedHolidays, holidayPage]
  )

  useEffect(() => {
    setAcademicForm(academicConfigToPayload(academic))
  }, [academic])

  useEffect(() => {
    if (selectedGpsSite) {
      setGpsConfigSectionId(selectedGpsSite.sectionId)
      setGpsConfigRadius(selectedGpsSite.radiusMeters)
    }
  }, [selectedGpsSite])

  function patchAcademic(updates: Partial<AcademicConfigPayload>) {
    setAcademicForm((prev) => ({ ...prev, ...updates }))
    setAcademicSuccess(false)
  }

  function handleSchoolYearChange(termId: string) {
    const option = schoolYearOptions.find((o) => o.termId === termId)
    if (!option) return
    patchAcademic({
      termId: option.termId,
      schoolYear: option.schoolYear,
      semester: option.semester,
    })
  }

  function handleSaveAcademic() {
    const validationError = validateAcademicConfigPayload(academicForm)
    if (validationError) {
      setAcademicError(validationError)
      setAcademicSuccess(false)
      return
    }

    setAcademicError(null)
    startSaveAcademic(async () => {
      const result = await updateAcademicConfig(academicForm)
      if (!result.ok) {
        setAcademicError(result.error)
        setAcademicSuccess(false)
        return
      }
      setAcademicSuccess(true)
      window.location.reload()
    })
  }

  function handleSaveGps() {
    if (!selectedGpsSite) return

    const payload = {
      geofenceId: selectedGpsSite.geofenceId,
      sectionId: gpsConfigSectionId,
      siteName: selectedGpsSite.siteName,
      radiusMeters: gpsConfigRadius,
    }

    const validationError = validateGpsSiteUpdatePayload(payload)
    if (validationError) {
      setGpsError(validationError)
      setGpsSuccess(false)
      return
    }

    setGpsError(null)
    startSaveGps(async () => {
      const result = await updateGpsSite(payload)
      if (!result.ok) {
        setGpsError(result.error)
        setGpsSuccess(false)
        return
      }
      setGpsSuccess(true)
      window.location.reload()
    })
  }

  function handleConfirmDeleteHoliday() {
    if (!deleteHolidayTarget) return
    const validationError = validateHolidayDelete(deleteHolidayTarget)
    if (validationError) {
      setGpsError(validationError)
      setDeleteHolidayTarget(null)
      return
    }

    startSaveGps(async () => {
      const result = await deleteHoliday(deleteHolidayTarget.holidayId)
      setDeleteHolidayTarget(null)
      if (!result.ok) {
        setGpsError(result.error)
        return
      }
      window.location.reload()
    })
  }

  return (
    <div style={{ fontFamily: FONT_BODY, color: COLORS.text }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div>
          <h1 style={{ ...PAGE_TITLE, color: COLORS.maroon, margin: 0 }}>Settings</h1>
          <p style={{ ...TYPE.caption, color: COLORS.textGray, margin: "6px 0 0" }}>
            Configure system parameters · {meta.academicYear} · {meta.semester}
          </p>
        </div>
        <ProfilePill user={currentUser} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gridAutoRows: "1fr",
          alignItems: "stretch",
          gap: 20,
        }}
      >
        {/* Academic Configuration */}
        <SettingsCard title="Academic Configuration">
          <form
            id="academic_config_form"
            onSubmit={(e) => {
              e.preventDefault()
              handleSaveAcademic()
            }}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            <div>
              <FieldLabel htmlFor="academic_year">Current Academic Year</FieldLabel>
              <div style={{ position: "relative" }}>
                <select
                  id="academic_year"
                  name="academic_year"
                  value={academicForm.termId}
                  onChange={(e) => handleSchoolYearChange(e.target.value)}
                  style={{ ...fieldInputStyle, appearance: "none", paddingRight: 36 }}
                >
                  {schoolYearOptions.map((option) => (
                    <option key={option.termId} value={option.termId}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <i
                  className="ti ti-chevron-down"
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                    color: COLORS.textGray,
                  }}
                />
              </div>
            </div>

            <div>
              <FieldLabel htmlFor="current_semester">Current Semester</FieldLabel>
              <div style={{ position: "relative" }}>
                <select
                  id="current_semester"
                  name="current_semester"
                  value={academicForm.semester}
                  onChange={(e) =>
                    patchAcademic({
                      semester: e.target.value as AcademicConfigPayload["semester"],
                    })
                  }
                  style={{ ...fieldInputStyle, appearance: "none", paddingRight: 36 }}
                >
                  {semesterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <i
                  className="ti ti-chevron-down"
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                    color: COLORS.textGray,
                  }}
                />
              </div>
            </div>

            <div>
              <FieldLabel htmlFor="required_nstp_hours">Required NSTP Render Hours</FieldLabel>
              <input
                id="required_nstp_hours"
                name="required_nstp_hours"
                type="number"
                min={1}
                value={academicForm.requiredNstpHours}
                onChange={(e) =>
                  patchAcademic({
                    requiredNstpHours: parseInt(e.target.value, 10) || 0,
                  })
                }
                style={fieldInputStyle}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div>
                <FieldLabel htmlFor="school_year_start_date">School Year Start Date</FieldLabel>
                <input
                  id="school_year_start_date"
                  name="school_year_start_date"
                  type="date"
                  value={academicForm.schoolYearStartDate}
                  onChange={(e) =>
                    patchAcademic({ schoolYearStartDate: e.target.value })
                  }
                  style={fieldInputStyle}
                />
              </div>
              <div>
                <FieldLabel htmlFor="school_year_end_date">School Year End Date</FieldLabel>
                <input
                  id="school_year_end_date"
                  name="school_year_end_date"
                  type="date"
                  value={academicForm.schoolYearEndDate}
                  onChange={(e) => patchAcademic({ schoolYearEndDate: e.target.value })}
                  style={fieldInputStyle}
                />
              </div>
            </div>

            {academicError && (
              <p style={{ ...TYPE.caption, color: COLORS.maroon, margin: 0 }}>
                {academicError}
              </p>
            )}
            {academicSuccess && (
              <p style={{ ...TYPE.caption, color: COLORS.green, margin: 0 }}>
                Academic configuration saved.
              </p>
            )}

            <div style={{ marginTop: 4 }}>
              <GreenButton type="submit" disabled={isSavingAcademic}>
                <i className="ti ti-device-floppy" style={{ fontSize: 16 }} />
                {isSavingAcademic ? "Saving…" : "Save Configuration"}
              </GreenButton>
            </div>
          </form>
        </SettingsCard>

        {/* Holidays */}
        <SettingsCard
          title="Holidays"
          icon="ti-calendar-event"
          action={
            <MaroonButton onClick={() => setAddHolidayOpen(true)}>
              <i className="ti ti-plus" style={{ fontSize: 14 }} />
              Add Holiday
            </MaroonButton>
          }
        >
          <SettingsListPanel>
            <FixedListBody
              empty={holidayPagination.totalCount === 0}
              emptyMessage="No holidays configured for this term."
            >
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {padToPageSize(holidayPagination.rows, SETTINGS_LIST_PAGE_SIZE).map(
                  (holiday, index) =>
                    holiday ? (
                      <li
                        key={holiday.holidayId}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          height: SETTINGS_LIST_ROW_HEIGHT,
                          minHeight: SETTINGS_LIST_ROW_HEIGHT,
                          padding: "0 18px",
                          boxSizing: "border-box",
                          ...settingsListRowBorder(index),
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              ...TYPE.bodyBold,
                              color: COLORS.textDark,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {holiday.name}
                          </div>
                          <div style={{ ...TYPE.caption, color: COLORS.textGray, marginTop: 2 }}>
                            {formatDisplayDate(holiday.date)}
                            {holiday.description ? ` · ${holiday.description}` : ""}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDeleteHolidayTarget(holiday)}
                          aria-label={`Delete ${holiday.name}`}
                          style={{
                            background: "none",
                            border: "none",
                            color: COLORS.maroon,
                            cursor: "pointer",
                            padding: 4,
                            display: "flex",
                            flexShrink: 0,
                          }}
                        >
                          <i className="ti ti-trash" style={{ fontSize: 16 }} />
                        </button>
                      </li>
                    ) : (
                      <ListPlaceholderRow key={`holiday-pad-${index}`} index={index} />
                    )
                )}
              </ul>
            </FixedListBody>

            <ListPagination
              page={holidayPage}
              totalPages={holidayPagination.totalPages}
              totalCount={holidayPagination.totalCount}
              pageSize={SETTINGS_LIST_PAGE_SIZE}
              onPageChange={setHolidayPage}
              containerStyle={{ paddingLeft: 20, paddingRight: 20 }}
            />
          </SettingsListPanel>
        </SettingsCard>

        {/* GPS Sites */}
        <SettingsCard
          title="GPS Sites"
          icon="ti-map-pin"
          action={
            <MaroonButton onClick={() => setAddGpsOpen(true)}>
              <i className="ti ti-plus" style={{ fontSize: 14 }} />
              Add Site
            </MaroonButton>
          }
        >
          <SettingsListPanel>
            <FixedListBody
              empty={gpsPagination.totalCount === 0}
              emptyMessage="No GPS sites configured."
            >
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {padToPageSize(gpsPagination.rows, SETTINGS_LIST_PAGE_SIZE).map((site, index) => {
                  if (!site) {
                    return <ListPlaceholderRow key={`gps-pad-${index}`} index={index} />
                  }

                  return (
                    <li
                      key={site.geofenceId}
                      style={{ boxSizing: "border-box", ...settingsListRowBorder(index) }}
                    >
                      <button
                        type="button"
                        onClick={() => setDetailGpsSite(site)}
                        aria-label={`View details for ${site.siteName}`}
                        style={{
                          width: "100%",
                          height: SETTINGS_LIST_ROW_HEIGHT,
                          minHeight: SETTINGS_LIST_ROW_HEIGHT,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          padding: "0 18px",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          textAlign: "left",
                          fontFamily: FONT_BODY,
                          boxSizing: "border-box",
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              ...TYPE.bodyBold,
                              color: COLORS.textDark,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {site.siteName}
                          </div>
                          <div style={{ ...TYPE.caption, color: COLORS.textGray, marginTop: 2 }}>
                            Radius: {site.radiusMeters} m · Supervisor: {site.supervisorName}
                          </div>
                        </div>
                        <i
                          className="ti ti-eye"
                          style={{ fontSize: 16, color: COLORS.textGray, flexShrink: 0 }}
                        />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </FixedListBody>

            <ListPagination
              page={gpsPage}
              totalPages={gpsPagination.totalPages}
              totalCount={gpsPagination.totalCount}
              pageSize={SETTINGS_LIST_PAGE_SIZE}
              onPageChange={setGpsPage}
              containerStyle={{ paddingLeft: 20, paddingRight: 20 }}
            />
          </SettingsListPanel>
        </SettingsCard>

        {/* GPS Configuration */}
        <SettingsCard title="GPS Configuration" icon="ti-current-location">
          <form
            id="gps_config_form"
            onSubmit={(e) => {
              e.preventDefault()
              handleSaveGps()
            }}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              flex: 1,
              height: "100%",
            }}
          >
              <div>
                <FieldLabel htmlFor="gps_site_select">NSTP Site</FieldLabel>
                <div style={{ position: "relative" }}>
                  <select
                    id="gps_site_select"
                    name="gps_site_id"
                    value={selectedGpsId}
                    onChange={(e) => setSelectedGpsId(e.target.value)}
                    style={{ ...fieldInputStyle, appearance: "none", paddingRight: 36 }}
                  >
                    <option value="" disabled>
                      Select Site
                    </option>
                    {gpsSites.map((site) => (
                      <option key={site.geofenceId} value={site.geofenceId}>
                        {site.siteName}
                      </option>
                    ))}
                  </select>
                  <i
                    className="ti ti-chevron-down"
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                      color: COLORS.textGray,
                    }}
                  />
                </div>
              </div>

              <div>
                <FieldLabel htmlFor="gps_section_id">Section</FieldLabel>
                <div style={{ position: "relative" }}>
                  <select
                    id="gps_section_id"
                    name="section_id"
                    value={gpsConfigSectionId}
                    onChange={(e) => setGpsConfigSectionId(e.target.value)}
                    disabled={!selectedGpsSite}
                    style={{ ...fieldInputStyle, appearance: "none", paddingRight: 36 }}
                  >
                    <option value="" disabled>
                      Select Section
                    </option>
                    {gpsSections.map((section) => (
                      <option key={section.sectionId} value={section.sectionId}>
                        {section.label}
                      </option>
                    ))}
                  </select>
                  <i
                    className="ti ti-chevron-down"
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                      color: COLORS.textGray,
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ ...TYPE.caption, color: COLORS.textGray, marginBottom: 4 }}>
                  Supervisor
                </div>
                <p
                  style={{
                    ...TYPE.body,
                    color: COLORS.textDark,
                    fontWeight: 600,
                    margin: 0,
                    minHeight: 20,
                  }}
                >
                  {selectedGpsSupervisor || "—"}
                </p>
                <p style={{ ...TYPE.caption, color: COLORS.light, margin: "6px 0 0" }}>
                  Assigned automatically from the selected section&apos;s adviser.
                </p>
              </div>

              <div>
                <FieldLabel htmlFor="gps_current_radius">Current Radius (m)</FieldLabel>
                <input
                  id="gps_current_radius"
                  name="gps_current_radius"
                  type="number"
                  min={1}
                  value={gpsConfigRadius}
                  onChange={(e) =>
                    setGpsConfigRadius(parseInt(e.target.value, 10) || 0)
                  }
                  style={fieldInputStyle}
                  disabled={!selectedGpsSite}
                />
              </div>

            {(gpsError || gpsSuccess) && (
              <div>
                {gpsError && (
                  <p style={{ ...TYPE.caption, color: COLORS.maroon, margin: 0 }}>
                    {gpsError}
                  </p>
                )}
                {gpsSuccess && (
                  <p style={{ ...TYPE.caption, color: COLORS.green, margin: 0 }}>
                    GPS site updated.
                  </p>
                )}
              </div>
            )}

            <div style={{ marginTop: "auto", paddingTop: 4 }}>
              <GreenButton
                type="submit"
                disabled={!selectedGpsSite || !gpsConfigSectionId || isSavingGps}
              >
                <i className="ti ti-device-floppy" style={{ fontSize: 16 }} />
                {isSavingGps ? "Saving…" : "Update Site"}
              </GreenButton>
            </div>
          </form>
        </SettingsCard>
      </div>

      <AddGpsSiteModal
        open={addGpsOpen}
        gpsSections={gpsSections}
        onClose={() => setAddGpsOpen(false)}
      />

      <GpsSiteDetailModal
        open={detailGpsSite !== null}
        site={detailGpsSite}
        onClose={() => setDetailGpsSite(null)}
      />

      <AddHolidayModal
        open={addHolidayOpen}
        termId={academicForm.termId}
        onClose={() => setAddHolidayOpen(false)}
      />

      <ConfirmDeleteModal
        open={Boolean(deleteHolidayTarget)}
        title="Delete Holiday"
        message={
          deleteHolidayTarget
            ? `Remove "${deleteHolidayTarget.name}" (${formatDisplayDate(deleteHolidayTarget.date)}) from the holiday list?`
            : ""
        }
        onConfirm={handleConfirmDeleteHoliday}
        onClose={() => setDeleteHolidayTarget(null)}
      />
    </div>
  )
}
