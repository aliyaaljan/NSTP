"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { SearchableCombobox } from "@/components/shared/SearchableCombobox"
import { importFormTemplate } from "@/lib/admin/form-list-actions"
import { FORM_GLOBAL_SECTION } from "@/lib/admin/form-edit"
import {
  FORM_IMPORT_ACCEPT_MIME,
  isAcceptedFormImportFile,
  titleFromImportFileName,
} from "@/lib/admin/form-import"
import type { FormListSectionOption } from "@/lib/admin/form-list"
import { FONT_HEADING, TYPE } from "@/lib/admin-typography"

const COLORS = {
  textDark: "#2C2C2A",
  textGray: "#8C8C88",
  headerGreen: "#14492E",
  fieldBg: "#EBEBE8",
  uploadBtnBg: "#D4E4DA",
  error: "#7B1113",
}

export default function ImportFormsModal({
  open,
  onClose,
  sections,
}: {
  open: boolean
  onClose: () => void
  sections: FormListSectionOption[]
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [sectionId, setSectionId] = useState(FORM_GLOBAL_SECTION)
  const [dueDate, setDueDate] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const classOptions = useMemo(
    () => [
      { value: FORM_GLOBAL_SECTION, label: "All classes (global default)" },
      ...sections.map((section) => ({
        value: section.sectionId,
        label: section.label,
      })),
    ],
    [sections]
  )

  const reset = useCallback(() => {
    setFile(null)
    setTitle("")
    setSectionId(FORM_GLOBAL_SECTION)
    setDueDate("")
    setError(null)
    setDragOver(false)
    if (inputRef.current) inputRef.current.value = ""
  }, [])

  const close = useCallback(() => {
    reset()
    onClose()
  }, [onClose, reset])

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
    if (!isAcceptedFormImportFile(next.name)) {
      setError("Only .pdf, .doc, and .docx files are accepted.")
      setFile(null)
      return
    }
    setError(null)
    setFile(next)
    if (!title.trim()) {
      setTitle(titleFromImportFileName(next.name))
    }
  }

  function handleImport() {
    if (!file) {
      setError("Please choose a PDF or Word document to import.")
      return
    }

    const formData = new FormData()
    formData.append("file", file)
    formData.append("title", title.trim() || titleFromImportFileName(file.name))
    formData.append("sectionId", sectionId)
    if (dueDate) formData.append("dueDate", dueDate)

    startTransition(async () => {
      const result = await importFormTemplate(formData)
      if (!result.ok) {
        setError(result.error)
        return
      }
      close()
      window.location.reload()
    })
  }

  if (!open) return null

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
        aria-labelledby="import-forms-title"
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
          <h2 id="import-forms-title" style={{ ...TYPE.h2, color: "#fff", margin: 0 }}>
            Import Form
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

        <div style={{ padding: "24px 22px 20px" }}>
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
              Accepted file types: .pdf, .doc, .docx
            </div>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={FORM_IMPORT_ACCEPT_MIME}
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
              marginBottom: 16,
            }}
          >
            Upload from file
          </button>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={{ display: "block" }}>
              <span
                style={{
                  ...TYPE.bodyBold,
                  color: COLORS.textDark,
                  display: "block",
                  marginBottom: 8,
                }}
              >
                Form name
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Daily Time Record"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  ...TYPE.body,
                  color: COLORS.textDark,
                  background: COLORS.fieldBg,
                  border: "none",
                  borderRadius: 6,
                  padding: "12px 14px",
                  outline: "none",
                }}
              />
            </label>

            <label style={{ display: "block" }}>
              <span
                style={{
                  ...TYPE.bodyBold,
                  color: COLORS.textDark,
                  display: "block",
                  marginBottom: 8,
                }}
              >
                Class
              </span>
              <SearchableCombobox
                value={sectionId}
                onChange={setSectionId}
                options={classOptions}
                placeholder="Select class"
                emptyMessage="No classes found"
                toggleAriaLabel="Toggle class list"
              />
            </label>

            <label style={{ display: "block" }}>
              <span
                style={{
                  ...TYPE.bodyBold,
                  color: COLORS.textDark,
                  display: "block",
                  marginBottom: 8,
                }}
              >
                Due date
              </span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  ...TYPE.body,
                  color: COLORS.textDark,
                  background: COLORS.fieldBg,
                  border: "none",
                  borderRadius: 6,
                  padding: "12px 14px",
                  outline: "none",
                }}
              />
            </label>
          </div>

          {error && (
            <p style={{ ...TYPE.body, color: COLORS.error, margin: "12px 0 0" }}>
              {error}
            </p>
          )}
        </div>

        <div style={{ padding: "0 22px 22px", display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={handleImport}
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
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <i className="ti ti-file-import" style={{ fontSize: 16 }} />
            {isPending ? "Importing…" : "Import"}
          </button>
        </div>
      </div>
    </div>
  )
}
