"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { SearchableCombobox } from "@/components/shared/SearchableCombobox"
import { reassignClassAction } from "@/lib/admin/adviser-list-actions"
import type {
  ReassignCandidate,
  ReassignClassMode,
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
  warnBg: "#FDECEC",
  border: "#ECECEA",
}

export default function ReassignClassModal({
  open,
  sourceClass,
  candidates,
  onClose,
  onReassigned,
}: {
  open: boolean
  sourceClass: ReassignSourceClass | null
  candidates: ReassignCandidate[]
  /** "Skip for now" / close after success. Defaults to a full page reload. */
  onClose: () => void
  onReassigned?: () => void
}) {
  const [targetAdviserUserId, setTargetAdviserUserId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<Extract<ReassignClassOutcome, { ok: true }> | null>(
    null
  )
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      setTargetAdviserUserId("")
      setError(null)
      setOutcome(null)
    }
  }, [open, sourceClass?.sectionId])

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

  const targetOptions = useMemo(
    () =>
      candidates.map((c) => ({
        value: c.adviserUserId,
        label: c.hasClassThisTerm ? `${c.fullName} — merge into ${c.targetClassLabel}` : c.fullName,
      })),
    [candidates]
  )

  const target = candidates.find((c) => c.adviserUserId === targetAdviserUserId) ?? null
  const mode: ReassignClassMode | null = target ? (target.hasClassThisTerm ? "merge" : "transfer") : null

  if (!open || !sourceClass) return null

  function handleSkip() {
    if (isPending) return
    onClose()
  }

  function handleSubmit() {
    if (!target || !mode || !sourceClass) return
    setError(null)
    startTransition(async () => {
      const result = await reassignClassAction({
        sectionId: sourceClass.sectionId,
        targetAdviserUserId: target.adviserUserId,
        mode,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setOutcome(result)
    })
  }

  function handleDone() {
    if (onReassigned) {
      onReassigned()
    } else {
      window.location.reload()
    }
  }

  return (
    <div
      role="presentation"
      onClick={isPending ? undefined : handleSkip}
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
          <h2 id="reassign-class-title" style={{ ...TYPE.h2, color: "#fff", margin: 0 }}>
            Reassign Class
          </h2>
          {!outcome && (
            <button
              type="button"
              onClick={handleSkip}
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
                  value={targetAdviserUserId}
                  onChange={setTargetAdviserUserId}
                  options={targetOptions}
                  placeholder="Select a facilitator"
                  emptyMessage="No active facilitators found"
                  toggleAriaLabel="Toggle facilitator list"
                />
              </div>

              {target && mode === "transfer" && (
                <p style={{ ...TYPE.body, color: COLORS.textGray, margin: 0 }}>
                  The class and all its students keep their data; only the facilitator changes.
                </p>
              )}

              {target && mode === "merge" && (
                <div
                  style={{
                    ...TYPE.body,
                    color: COLORS.error,
                    background: COLORS.warnBg,
                    border: `1px solid ${COLORS.error}33`,
                    borderRadius: 8,
                    padding: "10px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <span>
                    All {sourceClass.totalEnrollmentCount} enrollments — including attendance
                    history — will move into {target.targetClassLabel}. &quot;{sourceClass.classLabel}
                    &quot; will be archived.
                  </span>
                  {target.targetCourseCode !== sourceClass.courseCode && (
                    <span>
                      Note: the course codes differ ({sourceClass.courseCode} → {target.targetCourseCode}).
                    </span>
                  )}
                  <span>
                    If both classes have a student leader, the incoming leader will lose the leader role.
                  </span>
                </div>
              )}

              {error && (
                <p style={{ ...TYPE.body, color: COLORS.error, margin: 0 }}>{error}</p>
              )}
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ ...TYPE.bodyBold, color: COLORS.textDark, margin: 0 }}>
                {outcome.mode === "transfer"
                  ? "Class transferred."
                  : `${outcome.movedStudents} student${outcome.movedStudents === 1 ? "" : "s"} moved.`}
              </p>
              {outcome.demotedLeaders.length > 0 && (
                <p style={{ ...TYPE.body, color: COLORS.textGray, margin: 0 }}>
                  Leader role removed from: {outcome.demotedLeaders.join(", ")}.
                </p>
              )}
              {outcome.skippedStudents.length > 0 && (
                <div>
                  <p style={{ ...TYPE.body, color: COLORS.textGray, margin: "0 0 4px" }}>
                    Not moved:
                  </p>
                  <ul style={{ ...TYPE.caption, color: COLORS.textGray, margin: 0, paddingLeft: 18 }}>
                    {outcome.skippedStudents.map((s, idx) => (
                      <li key={idx}>
                        {s.name} — {s.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {outcome.mode === "merge" && (
                <p style={{ ...TYPE.body, color: COLORS.textGray, margin: 0 }}>
                  {outcome.sourceArchived
                    ? "The source class was archived."
                    : "The source class could not be archived — check it manually."}
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
          }}
        >
          {!outcome ? (
            <>
              <button
                type="button"
                onClick={handleSkip}
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
                Skip for now
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
                {isPending
                  ? "Working…"
                  : mode === "merge"
                    ? "Merge Classes"
                    : "Transfer Class"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleDone}
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
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
