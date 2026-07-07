"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import {
  commitAdviserImportChunk,
  parseAdviserImport,
} from "@/lib/admin/adviser-list-actions"
import type { AdviserImportRow } from "@/lib/admin/adviser-import"
import {
  addCommitResults,
  emptyCommitResult,
  IMPORT_ACCEPT,
  IMPORT_CHUNK_SIZE,
  isAcceptedImportFile,
  type ImportCommitResult,
  type RowIssue,
} from "@/lib/admin/import/types"
import {
  commitStudentImportChunk,
  ensureImportSection,
  getImportPickerData,
  parseStudentImport,
} from "@/lib/admin/student-list-actions"
import type { ImportPickerData, StudentImportRow } from "@/lib/admin/student-import"
import { FONT_HEADING, TYPE } from "@/lib/admin-typography"

// Same palette every other admin modal (Add/Edit Student/Adviser, ConfirmDelete)
// uses — this is the modal-chrome palette, distinct from the list-page palette
// in lib/admin-theme.ts. `amber` matches ADMIN_COLORS.amber so warning text
// reads the same shade as everywhere else in the admin UI (audit log notes,
// progress-status accents), rather than inventing a new tone.
const COLORS = {
  textDark: "#2C2C2A",
  textGray: "#8C8C88",
  headerGreen: "#14492E",
  fieldBg: "#EBEBE8",
  uploadBtnBg: "#D4E4DA",
  error: "#7B1113",
  amber: "#D97706",
  border: "#ECECEA",
  cardBg: "#F9F9F7",
}

type Phase = "pick" | "preview" | "committing" | "done"

interface PreviewState {
  totalRows: number
  issues: RowIssue[]
  studentRows: StudentImportRow[]
  adviserRows: AdviserImportRow[]
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

type CommitFnResult = { ok: true; result: ImportCommitResult } | { ok: false; error: string }

/** Runs one entity's rows through its commit action in IMPORT_CHUNK_SIZE slices,
 * reporting cumulative progress. Kept generic so the student/adviser branches
 * never need to cast between their (structurally unrelated) row types. */
async function runChunkedCommit<T>(
  rows: T[],
  commitFn: (batch: T[]) => Promise<CommitFnResult>,
  onProgress: (done: number) => void
): Promise<CommitFnResult> {
  let total = emptyCommitResult()
  let done = 0
  for (const batch of chunk(rows, IMPORT_CHUNK_SIZE)) {
    const res = await commitFn(batch)
    if (!res.ok) return res
    total = addCommitResults(total, res.result)
    done += batch.length
    onProgress(done)
  }
  return { ok: true, result: total }
}

// --- Form primitives mirrored from AddStudentModal / AddAdviserModal so this
// modal's section step looks like it belongs next to them, not bolted on. ---

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{ ...TYPE.bodyBold, color: COLORS.textDark, display: "block", marginBottom: 8 }}
    >
      {children}
    </label>
  )
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        boxSizing: "border-box",
        ...TYPE.body,
        fontStyle: "normal",
        color: COLORS.textDark,
        background: COLORS.fieldBg,
        border: "none",
        borderRadius: 6,
        padding: "12px 14px",
        outline: "none",
      }}
    />
  )
}

function PickerSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  options: { value: string; label: string }[]
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          ...TYPE.body,
          fontStyle: "normal",
          color: value ? COLORS.textDark : COLORS.textGray,
          background: COLORS.fieldBg,
          border: "none",
          borderRadius: 6,
          padding: "12px 40px 12px 14px",
          appearance: "none",
          cursor: "pointer",
          outline: "none",
        }}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <i
        className="ti ti-chevron-down"
        style={{
          position: "absolute",
          right: 14,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          fontSize: 16,
          color: COLORS.textGray,
        }}
      />
    </div>
  )
}

function RadioRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: () => void
  label: string
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
        ...TYPE.body,
        fontStyle: "normal",
        color: COLORS.textDark,
        marginBottom: 8,
      }}
    >
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        style={{ width: 16, height: 16, accentColor: COLORS.headerGreen, cursor: "pointer" }}
      />
      {label}
    </label>
  )
}

export default function ImportFileModal({
  variant,
  open,
  onClose,
}: {
  variant: "students" | "advisers"
  open: boolean
  onClose: () => void
}) {
  const isStudents = variant === "students"
  // Modal chrome elsewhere in the admin UI says "Adviser" (AddAdviserModal:
  // "Add Adviser", EditAdviserModal: "Edit Adviser", and the placeholder this
  // replaces: "Import Adviser/s") even though in-form copy elsewhere uses
  // "facilitator" — match the modal-title convention here.
  const entityLabel = isStudents ? "Student/s" : "Adviser/s"

  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>("pick")
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [picker, setPicker] = useState<ImportPickerData | null>(null)
  const [sectionMode, setSectionMode] = useState<"existing" | "new">("existing")
  const [sectionId, setSectionId] = useState("")
  const [newSectionName, setNewSectionName] = useState("")
  const [newCourseCode, setNewCourseCode] = useState("")
  const [newAdviserId, setNewAdviserId] = useState("")
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [summary, setSummary] = useState<ImportCommitResult | null>(null)
  const [isPending, startTransition] = useTransition()

  const reset = useCallback(() => {
    setFile(null)
    setError(null)
    setDragOver(false)
    setPhase("pick")
    setPreview(null)
    setPicker(null)
    setSectionMode("existing")
    setSectionId("")
    setNewSectionName("")
    setNewCourseCode("")
    setNewAdviserId("")
    setProgress({ done: 0, total: 0 })
    setSummary(null)
    if (inputRef.current) inputRef.current.value = ""
  }, [])

  const close = useCallback(() => {
    if (phase === "committing") return
    const succeeded = phase === "done" && summary !== null
    reset()
    onClose()
    if (succeeded) window.location.reload()
  }, [onClose, phase, reset, summary])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open, close])

  function pickFile(next: File | null) {
    if (!next) {
      setFile(null)
      return
    }
    if (!isAcceptedImportFile(next.name)) {
      setError("Only .csv and .xlsx files are accepted.")
      setFile(null)
      return
    }
    setError(null)
    setFile(next)
  }

  function handleParse() {
    if (!file) {
      setError("Please choose a .csv or .xlsx file to import.")
      return
    }
    const formData = new FormData()
    formData.append("file", file)

    startTransition(async () => {
      setError(null)
      if (isStudents) {
        const [parsed, pickerRes] = await Promise.all([
          parseStudentImport(formData),
          getImportPickerData(),
        ])
        if (!parsed.ok) return setError(parsed.error)
        if (!pickerRes.ok) return setError(pickerRes.error)
        setPicker(pickerRes.data)
        setNewCourseCode(parsed.uniformCourseCode ?? "")
        setPreview({
          totalRows: parsed.totalRows,
          issues: parsed.issues,
          studentRows: parsed.validRows,
          adviserRows: [],
        })
      } else {
        const parsed = await parseAdviserImport(formData)
        if (!parsed.ok) return setError(parsed.error)
        setPreview({
          totalRows: parsed.totalRows,
          issues: parsed.issues,
          studentRows: [],
          adviserRows: parsed.validRows,
        })
      }
      setPhase("preview")
    })
  }

  function handleImport() {
    if (!preview) return

    startTransition(async () => {
      setError(null)

      let targetSectionId = ""
      if (isStudents) {
        const choice =
          sectionMode === "existing"
            ? ({ kind: "existing", sectionId } as const)
            : ({
                kind: "new",
                name: newSectionName,
                courseCode: newCourseCode,
                adviserUserId: newAdviserId,
              } as const)
        const ensured = await ensureImportSection(choice)
        if (!ensured.ok) return setError(ensured.error)
        targetSectionId = ensured.sectionId
      }

      const rowCount = isStudents ? preview.studentRows.length : preview.adviserRows.length
      setPhase("committing")
      setProgress({ done: 0, total: rowCount })
      const onProgress = (done: number) => setProgress({ done, total: rowCount })

      const committed = isStudents
        ? await runChunkedCommit(
            preview.studentRows,
            (batch) => commitStudentImportChunk({ sectionId: targetSectionId, rows: batch }),
            onProgress
          )
        : await runChunkedCommit(
            preview.adviserRows,
            (batch) => commitAdviserImportChunk({ rows: batch }),
            onProgress
          )

      if (!committed.ok) {
        setError(`${committed.error} Already-imported rows were saved — fix the file and re-run.`)
        setPhase("preview")
        return
      }

      // Rows that failed validation during parse still count as skipped.
      const parseFailures = preview.totalRows - rowCount
      setSummary({
        ...committed.result,
        skipped: committed.result.skipped + parseFailures,
        issues: [...preview.issues, ...committed.result.issues],
      })
      setPhase("done")
    })
  }

  if (!open) return null

  const allIssues = phase === "done" ? (summary?.issues ?? []) : (preview?.issues ?? [])
  const validCount = preview
    ? (isStudents ? preview.studentRows : preview.adviserRows).length
    : 0
  const sectionReady =
    !isStudents ||
    (sectionMode === "existing"
      ? sectionId !== ""
      : newSectionName.trim() !== "" && newCourseCode.trim() !== "" && newAdviserId !== "")

  const cancelBtnStyle = {
    ...TYPE.bodyBold,
    color: COLORS.textDark,
    background: COLORS.fieldBg,
    border: "none",
    borderRadius: 999,
    padding: "10px 24px",
    cursor: isPending ? "not-allowed" : "pointer",
    opacity: isPending ? 0.6 : 1,
  } as const

  return (
    <div
      role="presentation"
      onClick={close}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "rgba(44, 44, 42, 0.35)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-file-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 16,
          overflow: "hidden",
          background: "#fff",
          boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 22px",
            background: COLORS.headerGreen,
          }}
        >
          <h2 id="import-file-title" style={{ ...TYPE.h2, color: "#fff", margin: 0 }}>
            Import {entityLabel}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              padding: 4,
              display: "flex",
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 20 }} />
          </button>
        </div>

        <div
          style={{
            padding: "24px 22px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            maxHeight: "min(70vh, 560px)",
            overflowY: "auto",
          }}
        >
          {phase === "pick" && (
            <div>
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOver(false)
                  pickFile(e.dataTransfer.files?.[0] ?? null)
                }}
                style={{
                  border: `2px dashed ${dragOver ? COLORS.headerGreen : "#CFCFCB"}`,
                  borderRadius: 10,
                  background: COLORS.fieldBg,
                  padding: "36px 20px",
                  textAlign: "center",
                  marginBottom: 14,
                }}
              >
                <i
                  className="ti ti-upload"
                  style={{ fontSize: 36, color: COLORS.textGray, display: "block", marginBottom: 12 }}
                />
                <div style={{ ...TYPE.bodyBold, color: COLORS.textDark }}>
                  {file ? file.name : "Drop file here"}
                </div>
                <div style={{ ...TYPE.body, color: COLORS.textGray, marginTop: 6 }}>
                  Accepted file types: .csv, .xlsx
                </div>
              </div>

              <input
                ref={inputRef}
                type="file"
                accept={IMPORT_ACCEPT}
                hidden
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />

              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                style={{
                  width: "100%",
                  ...TYPE.bodyBold,
                  color: COLORS.textDark,
                  background: COLORS.uploadBtnBg,
                  border: "none",
                  borderRadius: 999,
                  padding: "12px 20px",
                  cursor: "pointer",
                }}
              >
                Upload from file
              </button>
            </div>
          )}

          {phase !== "pick" && preview && (
            <div
              style={{
                background: COLORS.cardBg,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                padding: "12px 14px",
              }}
            >
              <div style={{ ...TYPE.bodyBold, color: COLORS.textDark }}>
                {file?.name} — {preview.totalRows} row{preview.totalRows !== 1 ? "s" : ""},{" "}
                {validCount} valid
              </div>
              {allIssues.length > 0 && (
                <details style={{ marginTop: 8 }} open={phase === "done"}>
                  <summary style={{ ...TYPE.body, color: COLORS.amber, cursor: "pointer" }}>
                    {allIssues.length} note{allIssues.length !== 1 ? "s" : ""} / skipped row
                    {allIssues.length !== 1 ? "s" : ""}
                  </summary>
                  <ul
                    style={{
                      ...TYPE.body,
                      color: COLORS.textGray,
                      margin: "8px 0 0",
                      paddingLeft: 18,
                      maxHeight: 160,
                      overflowY: "auto",
                    }}
                  >
                    {allIssues.map((issue, index) => (
                      <li key={index}>
                        Row {issue.rowNumber}: {issue.message}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          {phase === "preview" && isStudents && picker && (
            <div>
              <FieldLabel>Import into section</FieldLabel>

              <RadioRow
                checked={sectionMode === "existing"}
                onChange={() => setSectionMode("existing")}
                label="Existing section"
              />
              {sectionMode === "existing" && (
                <div style={{ marginBottom: 12 }}>
                  <PickerSelect
                    value={sectionId}
                    onChange={setSectionId}
                    placeholder="Choose a section…"
                    options={picker.sections.map((section) => ({
                      value: section.sectionId,
                      label: `${section.name} (${section.courseCode})`,
                    }))}
                  />
                </div>
              )}

              <RadioRow
                checked={sectionMode === "new"}
                onChange={() => setSectionMode("new")}
                label="Create new section"
              />
              {sectionMode === "new" && (
                <div style={{ display: "grid", gap: 10 }}>
                  <TextInput
                    value={newSectionName}
                    onChange={setNewSectionName}
                    placeholder="Section name"
                  />
                  <TextInput
                    value={newCourseCode}
                    onChange={setNewCourseCode}
                    placeholder="Course code (e.g. NSTP 2 CWTS)"
                  />
                  <PickerSelect
                    value={newAdviserId}
                    onChange={setNewAdviserId}
                    placeholder="Choose a facilitator…"
                    options={picker.advisers.map((adviser) => ({
                      value: adviser.adviserUserId,
                      label: adviser.fullName,
                    }))}
                  />
                </div>
              )}
            </div>
          )}

          {phase === "committing" && (
            <div>
              <div style={{ ...TYPE.body, color: COLORS.textDark, marginBottom: 6 }}>
                Importing… {progress.done}/{progress.total}
              </div>
              <div style={{ height: 8, borderRadius: 999, background: COLORS.fieldBg }}>
                <div
                  style={{
                    height: 8,
                    borderRadius: 999,
                    background: COLORS.headerGreen,
                    width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%`,
                    transition: "width 200ms",
                  }}
                />
              </div>
            </div>
          )}

          {phase === "done" && summary && (
            <div
              style={{
                background: COLORS.cardBg,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                padding: "12px 14px",
                ...TYPE.bodyBold,
                color: COLORS.textDark,
              }}
            >
              Imported {summary.imported} · Updated {summary.updated} · Skipped {summary.skipped}
            </div>
          )}

          {error && (
            <p style={{ ...TYPE.body, color: COLORS.error, margin: 0 }}>{error}</p>
          )}
        </div>

        <div style={{ padding: "0 22px 22px", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          {phase === "pick" && (
            <>
              <button type="button" onClick={close} disabled={isPending} style={cancelBtnStyle}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleParse}
                disabled={!file || isPending}
                style={{
                  ...TYPE.bodyBold,
                  fontFamily: FONT_HEADING,
                  color: "#fff",
                  background: file && !isPending ? COLORS.headerGreen : "#A8B5AD",
                  border: "none",
                  borderRadius: 999,
                  padding: "10px 24px",
                  cursor: file && !isPending ? "pointer" : "not-allowed",
                }}
              >
                {isPending ? "Checking…" : "Check file"}
              </button>
            </>
          )}
          {phase === "preview" && (
            <>
              <button type="button" onClick={close} disabled={isPending} style={cancelBtnStyle}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={isPending || validCount === 0 || !sectionReady}
                style={{
                  ...TYPE.bodyBold,
                  fontFamily: FONT_HEADING,
                  color: "#fff",
                  background: !isPending && validCount > 0 && sectionReady ? COLORS.headerGreen : "#A8B5AD",
                  border: "none",
                  borderRadius: 999,
                  padding: "10px 24px",
                  cursor: !isPending && validCount > 0 && sectionReady ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <i className="ti ti-file-import" style={{ fontSize: 16 }} />
                Import {validCount} row{validCount !== 1 ? "s" : ""}
              </button>
            </>
          )}
          {phase === "done" && (
            <button
              type="button"
              onClick={close}
              style={{
                ...TYPE.bodyBold,
                fontFamily: FONT_HEADING,
                color: "#fff",
                background: COLORS.headerGreen,
                border: "none",
                borderRadius: 999,
                padding: "10px 24px",
                cursor: "pointer",
              }}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
