"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { SearchableCombobox } from "@/components/shared/SearchableCombobox"
import { reassignClassAction } from "@/lib/admin/adviser-list-actions"
import type {
  ReassignClassOutcome,
  ReassignSourceClass,
} from "@/lib/admin/class-reassign"
import { TYPE } from "@/lib/admin-typography"

const COLORS = {
  textDark: "#2C2C2A",
  textGray: "#8C8C88",
  headerGreen: "#14492E",
  fieldBg: "#EBEBE8",
  error: "#7B1113",
  border: "#ECECEA",
}

type SuccessOutcome = Extract<ReassignClassOutcome, { ok: true }>

export default function ReassignClassModal({
  open,
  classes,
  onClose,
  onReassigned,
}: {
  open: boolean
  /** Every class still owned by the inactive facilitator. */
  classes: ReassignSourceClass[]
  /** "Skip remaining" / close after success. Defaults to a full page reload. */
  onClose: () => void
  onReassigned?: () => void
}) {
  const [classIndex, setClassIndex] = useState(0)
  const [targetAdviserUserId, setTargetAdviserUserId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<SuccessOutcome | null>(null)
  const [completedCount, setCompletedCount] = useState(0)
  const [isPending, startTransition] = useTransition()

  const sourceClass = classes[classIndex] ?? null
  const totalClasses = classes.length
  const hasMoreAfterThis = classIndex < totalClasses - 1
  const isLastClass = classIndex >= totalClasses - 1

  useEffect(() => {
    if (open) {
      setClassIndex(0)
      setTargetAdviserUserId("")
      setError(null)
      setOutcome(null)
      setCompletedCount(0)
    }
  }, [open, classes])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) onClose()
    }
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open, isPending, onClose])

  const candidates = sourceClass?.candidates ?? []

  const targetOptions = useMemo(
    () =>
      candidates.map((c) => ({
        value: c.adviserUserId,
        label: c.fullName,
      })),
    [candidates]
  )

  const target = candidates.find((c) => c.adviserUserId === targetAdviserUserId) ?? null

  if (!open || !sourceClass || totalClasses === 0) return null

  function goToNextClass() {
    setOutcome(null)
    setError(null)
    setTargetAdviserUserId("")
    setClassIndex((i) => i + 1)
  }

  function handleSkipThis() {
    if (isPending) return
    if (hasMoreAfterThis) {
      goToNextClass()
      return
    }
    if (completedCount > 0 && onReassigned) {
      onReassigned()
      return
    }
    onClose()
  }

  function handleSkipRemaining() {
    if (isPending) return
    if (completedCount > 0 && onReassigned) {
      onReassigned()
      return
    }
    onClose()
  }

  function handleSubmit() {
    if (!target || !sourceClass) return
    setError(null)
    startTransition(async () => {
      const result = await reassignClassAction({
        sectionId: sourceClass.sectionId,
        targetAdviserUserId: target.adviserUserId,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setCompletedCount((n) => n + 1)
      setOutcome(result)
    })
  }

  function handleContinueAfterSuccess() {
    if (hasMoreAfterThis) {
      goToNextClass()
      return
    }
    if (onReassigned) {
      onReassigned()
    } else {
      window.location.reload()
    }
  }

  const title =
    totalClasses > 1
      ? `Reassign Classes (${classIndex + 1} of ${totalClasses})`
      : "Reassign Class"

  return (
    <div
      role="presentation"
      onClick={isPending ? undefined : handleSkipRemaining}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 110,
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
        aria-labelledby="reassign-class-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 16,
          overflow: "visible",
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
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }}
        >
          <h2 id="reassign-class-title" style={{ ...TYPE.h2, color: "#fff", margin: 0 }}>
            {title}
          </h2>
          {!outcome && (
            <button
              type="button"
              onClick={handleSkipRemaining}
              disabled={isPending}
              aria-label="Close"
              style={{
                background: "none",
                border: "none",
                color: "#fff",
                cursor: isPending ? "not-allowed" : "pointer",
                padding: 4,
                display: "flex",
              }}
            >
              <i className="ti ti-x" style={{ fontSize: 20 }} />
            </button>
          )}
        </div>

        <div style={{ padding: "24px 22px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {!outcome ? (
            <>
              {totalClasses > 1 && (
                <p style={{ ...TYPE.caption, color: COLORS.textGray, margin: 0 }}>
                  This facilitator still has {totalClasses} classes. Reassign each one, or skip
                  individually.
                </p>
              )}

              <div
                style={{
                  ...TYPE.bodyBold,
                  color: COLORS.textDark,
                  background: "#F9F9F7",
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  padding: "12px 14px",
                }}
              >
                {sourceClass.classLabel}
                <div style={{ ...TYPE.caption, color: COLORS.textGray, fontWeight: 400, marginTop: 4 }}>
                  {sourceClass.totalEnrollmentCount} student
                  {sourceClass.totalEnrollmentCount === 1 ? "" : "s"} total
                  {sourceClass.schoolYear ? ` · AY ${sourceClass.schoolYear}` : ""}
                </div>
              </div>

              <div>
                <label
                  style={{
                    ...TYPE.bodyBold,
                    color: COLORS.textDark,
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Move to
                </label>
                <SearchableCombobox
                  key={sourceClass.sectionId}
                  value={targetAdviserUserId}
                  onChange={setTargetAdviserUserId}
                  options={targetOptions}
                  placeholder="Select a facilitator"
                  emptyMessage="No available facilitators for this term"
                  toggleAriaLabel="Toggle facilitator list"
                />
              </div>

              {target && (
                <p style={{ ...TYPE.body, color: COLORS.textGray, margin: 0 }}>
                  This class stays separate. Its students and history remain unchanged; only the
                  facilitator changes. Choose someone who does not already have a class this term.
                </p>
              )}

              {error && (
                <p style={{ ...TYPE.body, color: COLORS.error, margin: 0 }}>{error}</p>
              )}
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ ...TYPE.bodyBold, color: COLORS.textDark, margin: 0 }}>
                Class reassigned.
              </p>
              {hasMoreAfterThis && (
                <p style={{ ...TYPE.caption, color: COLORS.textGray, margin: 0 }}>
                  {totalClasses - classIndex - 1} class
                  {totalClasses - classIndex - 1 === 1 ? "" : "es"} still need reassignment.
                </p>
              )}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "0 22px 22px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {!outcome ? (
            <>
              <button
                type="button"
                onClick={handleSkipThis}
                disabled={isPending}
                style={{
                  ...TYPE.bodyBold,
                  color: COLORS.textDark,
                  background: COLORS.fieldBg,
                  border: "none",
                  borderRadius: 999,
                  padding: "10px 24px",
                  cursor: isPending ? "not-allowed" : "pointer",
                  opacity: isPending ? 0.6 : 1,
                }}
              >
                {hasMoreAfterThis ? "Skip this class" : "Skip for now"}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!target || isPending}
                style={{
                  ...TYPE.bodyBold,
                  color: "#fff",
                  background: target && !isPending ? COLORS.headerGreen : "#A8B5AD",
                  border: "none",
                  borderRadius: 999,
                  padding: "10px 24px",
                  cursor: target && !isPending ? "pointer" : "not-allowed",
                }}
              >
                {isPending ? "Working…" : "Reassign Class"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleContinueAfterSuccess}
              style={{
                ...TYPE.bodyBold,
                color: "#fff",
                background: COLORS.headerGreen,
                border: "none",
                borderRadius: 999,
                padding: "10px 24px",
                cursor: "pointer",
              }}
            >
              {isLastClass ? "Done" : "Next class"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
