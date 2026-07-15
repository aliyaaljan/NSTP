"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import AddHolidayModal from "@/components/admin/AddHolidayModal"
import ConfirmDeleteModal from "@/components/admin/ConfirmDeleteModal"
import TermCloseoutConfirmModal from "@/components/admin/TermCloseoutConfirmModal"
import ListPagination from "@/components/shared/ListPagination"
import {
  closeOutOutgoingEnrollments,
  deleteHoliday,
  getOutgoingActiveEnrollmentSummary,
  updateAcademicConfig,
} from "@/lib/admin/settings-actions"
import {
  academicConfigToPayload,
  validateAcademicConfigPayload,
  validateHolidayDelete,
  type AcademicConfigPayload,
} from "@/lib/admin/settings-edit"
import type {
  AcademicConfig,
  AdminCurrentUser,
  HolidayRow,
  SchoolYearOption,
  SemesterOption,
  SettingsMeta,
  TermCloseoutSummary,
} from "@/lib/admin/settings"
import {
  buildUniqueSchoolYearOptions,
  resolveTermOption,
  SETTINGS_LIST_PAGE_SIZE,
  paginateSettingsList,
} from "@/lib/admin/settings"
import { FONT_BODY, PAGE_TITLE, TYPE } from "@/lib/admin-typography"
import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"
import AddAcademicYearModal from "./AddAcademicYearModal"
import AdminProfilePill from "@/components/admin/AdminProfilePill"
import { RiResetLeftLine, RiSave2Fill } from "react-icons/ri";

const FIELD_BG = "#F3F4F6"
const SETTINGS_LIST_ROW_HEIGHT = 56

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
  bodyHeight,
}: {
  empty: boolean
  emptyMessage: string
  children: React.ReactNode
  scrollable?: boolean
  bodyHeight: number
}) {
  return (
    <div
      style={{
        height: bodyHeight,
        minHeight: bodyHeight,
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

function SettingsCard({
  title,
  icon,
  action,
  children,
  minHeight,
}: {
  title: string
  icon?: string
  action?: React.ReactNode
  children: React.ReactNode
  minHeight?: number
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
        minHeight,
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

function GreenButton({
  children,
  onClick,
  disabled,
  type = "button",
  fullWidth = false,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: "button" | "submit"
  fullWidth?: boolean
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
        justifyContent: "center",
        gap: 6,
        width: fullWidth ? "100%" : undefined,
        boxSizing: "border-box",
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
  holidays,
  meta,
  currentUser,
}: {
  academic: AcademicConfig
  schoolYearOptions: SchoolYearOption[]
  semesterOptions: SemesterOption[]
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
  const [addAcadYrOpen, setAddAcadYrOpen] = useState(false)

  const [closeoutOpen, setCloseoutOpen] = useState(false)
  const [closeoutSummary, setCloseoutSummary] = useState<TermCloseoutSummary | null>(null)
  const [closeoutError, setCloseoutError] = useState<string | null>(null)
  const [closeoutPending, setCloseoutPending] = useState(false)

  const [holidayPage, setHolidayPage] = useState(1)
  const [holidayPageSize, setHolidayPageSize] = useState(SETTINGS_LIST_PAGE_SIZE)
  const [addHolidayOpen, setAddHolidayOpen] = useState(false)
  const [deleteHolidayTarget, setDeleteHolidayTarget] = useState<HolidayRow | null>(null)
  const [holidayDeleteError, setHolidayDeleteError] = useState<string | null>(null)
  const [isDeletingHoliday, startDeleteHoliday] = useTransition()

  const sortedHolidays = useMemo(
    () => [...holidays].sort((a, b) => a.date.localeCompare(b.date)),
    [holidays]
  )

  const holidayListBodyHeight = holidayPageSize * SETTINGS_LIST_ROW_HEIGHT
  const holidayCardMinHeight = holidayListBodyHeight + 160

  const holidayPagination = useMemo(
    () => paginateSettingsList(sortedHolidays, holidayPage, holidayPageSize),
    [sortedHolidays, holidayPage, holidayPageSize]
  )

  function handleHolidayPageSizeChange(nextSize: number) {
    setHolidayPageSize(nextSize)
    setHolidayPage(1)
  }
  const hasAcademicChanges = useMemo(() => {
    const original = academicConfigToPayload(academic)
    return (
      academicForm.termId !== original.termId ||
      academicForm.schoolYear !== original.schoolYear ||
      academicForm.semester !== original.semester ||
      academicForm.requiredNstpHours !== original.requiredNstpHours ||
      academicForm.schoolYearStartDate !== original.schoolYearStartDate ||
      academicForm.schoolYearEndDate !== original.schoolYearEndDate
    )
  }, [academicForm, academic])

  useEffect(() => {
    setAcademicForm(academicConfigToPayload(academic))
  }, [academic])

  function patchAcademic(updates: Partial<AcademicConfigPayload>) {
    setAcademicForm((prev) => ({ ...prev, ...updates }))
    setAcademicSuccess(false)
  }

  function handleResetAcademic() {
    setAcademicForm(academicConfigToPayload(academic))
    setAcademicError(null)
    setAcademicSuccess(false)
  }

  const uniqueSchoolYearOptions = useMemo(
    () => buildUniqueSchoolYearOptions(schoolYearOptions),
    [schoolYearOptions]
  )

  function resolveTermForSelection(schoolYear: string, semester: AcademicConfigPayload["semester"]) {
    return resolveTermOption(schoolYearOptions, schoolYear, semester)
  }

  function handleSchoolYearChange(schoolYear: string) {
    const match = resolveTermForSelection(schoolYear, academicForm.semester)
    patchAcademic({
      schoolYear,
      ...(match ? { termId: match.termId } : {}),
    })
  }

  function handleSemesterChange(semester: AcademicConfigPayload["semester"]) {
    const match = resolveTermForSelection(academicForm.schoolYear, semester)
    patchAcademic({
      semester,
      ...(match ? { termId: match.termId } : {}),
    })
  }

  async function performSaveAcademic(): Promise<{ ok: true } | { ok: false; error: string }> {
    const result = await updateAcademicConfig(academicForm)
    if (!result.ok) return { ok: false, error: result.error }
    return { ok: true }
  }

  function handleSaveAcademic() {
    const validationError = validateAcademicConfigPayload(academicForm)
    if (validationError) {
      setAcademicError(validationError)
      setAcademicSuccess(false)
      return
    }

    setAcademicError(null)
    const termChanged = academicForm.termId !== academic.termId

    startSaveAcademic(async () => {
      if (termChanged) {
        const summaryResult = await getOutgoingActiveEnrollmentSummary(academicForm.termId)
        if (!summaryResult.ok) {
          setAcademicError(summaryResult.error)
          return
        }
        if (summaryResult.summary.total > 0) {
          setCloseoutSummary(summaryResult.summary)
          setCloseoutError(null)
          setCloseoutOpen(true)
          return
        }
      }

      const saved = await performSaveAcademic()
      if (!saved.ok) {
        setAcademicError(saved.error)
        setAcademicSuccess(false)
        return
      }
      setAcademicSuccess(true)
      window.location.reload()
    })
  }

  function handleSwitchOnly() {
    setCloseoutPending(true)
    setCloseoutError(null)
    performSaveAcademic().then((saved) => {
      setCloseoutPending(false)
      if (!saved.ok) {
        setCloseoutError(saved.error)
        return
      }
      setCloseoutOpen(false)
      window.location.reload()
    })
  }

  function handleCloseOutAndSwitch() {
    setCloseoutPending(true)
    setCloseoutError(null)
    ;(async () => {
      const saved = await performSaveAcademic()
      if (!saved.ok) {
        setCloseoutPending(false)
        setCloseoutError(saved.error)
        return
      }
      const result = await closeOutOutgoingEnrollments(academicForm.termId)
      setCloseoutPending(false)
      if (!result.ok) {
        setCloseoutError(result.error)
        return
      }
      setCloseoutOpen(false)
      window.location.reload()
    })()
  }

  function handleCloseCloseoutModal() {
    if (closeoutPending) return
    setCloseoutOpen(false)
    setCloseoutSummary(null)
    setCloseoutError(null)
  }

  function handleConfirmDeleteHoliday() {
    if (!deleteHolidayTarget) return
    const validationError = validateHolidayDelete(deleteHolidayTarget)
    if (validationError) {
      setHolidayDeleteError(validationError)
      return
    }

    setHolidayDeleteError(null)
    startDeleteHoliday(async () => {
      const result = await deleteHoliday(deleteHolidayTarget.holidayId)
      if (!result.ok) {
        setHolidayDeleteError(result.error)
        return
      }
      setDeleteHolidayTarget(null)
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
        <AdminProfilePill user={currentUser} />
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

        <SettingsCard
          title="Academic Configuration"
          icon="ti-calendar-event"
          action={
            <GreenButton onClick={() => setAddAcadYrOpen(true)}>
              <i className="ti ti-plus" style={{ fontSize: 14 }} />
              Add Academic Year
            </GreenButton>
          }
        >
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
                  value={academicForm.schoolYear}
                  onChange={(e) => handleSchoolYearChange(e.target.value)}
                  style={{ ...fieldInputStyle, appearance: "none", paddingRight: 36 }}
                >
                  {uniqueSchoolYearOptions.map((option) => (
                    <option key={option.schoolYear} value={option.schoolYear}>
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
                    handleSemesterChange(e.target.value as AcademicConfigPayload["semester"])
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
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);

                  patchAcademic({
                    requiredNstpHours: Number.isNaN(value) ? 1 : Math.max(1, value),
                  })
                }}
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

            <div style={{ marginTop: 4, display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <button
                  type="button"
                  onClick={handleResetAcademic}
                  disabled={isSavingAcademic || !hasAcademicChanges}
                  style={{
                    ...TYPE.bodyBold,
                    fontFamily: FONT_BODY,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#fff",
                    color: COLORS.green,
                    border: `1px solid ${COLORS.green}`,
                    borderRadius: 20,
                    padding: "8px 18px",
                    cursor: isSavingAcademic || !hasAcademicChanges ? "not-allowed" : "pointer",
                    opacity: isSavingAcademic || !hasAcademicChanges ? 0.5 : 1,
                  }}
                >
                  <RiResetLeftLine size={19}/>
                  Reset
                </button>
              </div>
              <div style={{ flex: 1 }}>
                <GreenButton type="submit" fullWidth disabled={isSavingAcademic || !hasAcademicChanges}>
                  <RiSave2Fill  size={19}/>
                  {isSavingAcademic ? "Saving…" : "Save Configuration"}
                </GreenButton>
              </div>
            </div>
          </form>
        </SettingsCard>

        <SettingsCard
          title="Holidays"
          icon="ti-calendar-event"
          minHeight={holidayCardMinHeight}
          action={
            <GreenButton onClick={() => setAddHolidayOpen(true)}>
              <i className="ti ti-plus" style={{ fontSize: 14 }} />
              Add Holiday
            </GreenButton>
          }
        >
          <SettingsListPanel>
            <FixedListBody
              empty={holidayPagination.totalCount === 0}
              emptyMessage="No holidays configured for this term."
              bodyHeight={holidayListBodyHeight}
            >
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {padToPageSize(holidayPagination.rows, holidayPageSize).map(
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
              pageSize={holidayPageSize}
              onPageChange={setHolidayPage}
              onPageSizeChange={handleHolidayPageSizeChange}
              containerStyle={{ paddingLeft: 20, paddingRight: 20 }}
            />
          </SettingsListPanel>
        </SettingsCard>
      </div>

      <TermCloseoutConfirmModal
        open={closeoutOpen}
        summary={closeoutSummary}
        isPending={closeoutPending}
        error={closeoutError}
        onSwitchOnly={handleSwitchOnly}
        onCloseOutAndSwitch={handleCloseOutAndSwitch}
        onClose={handleCloseCloseoutModal}
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
        isPending={isDeletingHoliday}
        error={holidayDeleteError}
        onConfirm={handleConfirmDeleteHoliday}
        onClose={() => {
          if (isDeletingHoliday) return
          setDeleteHolidayTarget(null)
          setHolidayDeleteError(null)
        }}
      />

      <AddAcademicYearModal
        open={addAcadYrOpen}
        onClose={() => setAddAcadYrOpen(false)}
      />

    </div>
    
  )
}
