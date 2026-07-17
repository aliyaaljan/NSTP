"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { SearchableCombobox } from "@/components/shared/SearchableCombobox"
import {
  getMergePreviewAction,
  reassignClassAction,
} from "@/lib/admin/adviser-list-actions"
import type {
  MergePreview,
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

const MAROON = "#7B1113"

type SuccessOutcome = Extract<ReassignClassOutcome, { ok: true }>
type Step = "pick" | "confirmMerge"

export default function ReassignClassModal({
  open,
  classes,
  onClose,
  onReassigned,
}: {
  open: boolean
  /** Every class still owned by the inactive facilitator, or the single class picked from the Classes page. */
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

  const [step, setStep] = useState<Step>("pick")
  const [preview, setPreview] = useState<MergePreview | null>(null)
  const [isPreviewLoading, setPreviewLoading] = useState(false)
  const [keepLeaderIds, setKeepLeaderIds] = useState<Set<string>>(new Set())

  const sourceClass = classes[classIndex] ?? null
  const totalClasses = classes.length
  const hasMoreAfterThis = classIndex < totalClasses - 1
  const isLastClass = classIndex >= totalClasses - 1

  function resetPerClassState() {
    setStep("pick")
    setPreview(null)
    setPreviewLoading(false)
    setKeepLeaderIds(new Set())
    setTargetAdviserUserId("")
    setError(null)
    setOutcome(null)
  }

  useEffect(() => {
    if (open) {
      setClassIndex(0)
      setCompletedCount(0)
      resetPerClassState()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        description:
          c.mode === "merge"
            ? `Has ${c.targetCourseCode} · ${c.targetStudentCount} student${
                c.targetStudentCount === 1 ? "" : "s"
              } — classes will merge`
            : "No class this term — class transfers as-is",
      })),
    [candidates]
  )

  const target = candidates.find((c) => c.adviserUserId === targetAdviserUserId) ?? null

  if (!open || !sourceClass || totalClasses === 0) return null

  function goToNextClass() {
    setClassIndex((i) => i + 1)
    resetPerClassState()
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

  function handleContinueToMerge() {
    if (!target || target.mode !== "merge" || !target.targetSectionId || !sourceClass) return
    setError(null)
    setPreviewLoading(true)
    setStep("confirmMerge")
    startTransition(async () => {
      const res = await getMergePreviewAction(sourceClass.sectionId, target.targetSectionId!)
      if (!res.ok) {
        setError(res.error)
        setStep("pick")
        setPreviewLoading(false)
        return
      }
      setPreview(res.preview)
      setKeepLeaderIds(new Set(res.preview.leaders.map((l) => l.enrollmentId)))
      setPreviewLoading(false)
    })
  }

  function handleBackToPick() {
    if (isPending) return
    setStep("pick")
    setPreview(null)
    setError(null)
  }

  function handleSubmit() {
    if (!target || !sourceClass) return
    setError(null)
    startTransition(async () => {
      const result = await reassignClassAction({
        sectionId: sourceClass.sectionId,
        targetAdviserUserId: target.adviserUserId,
        ...(target.mode === "merge"
          ? { merge: true, keepLeaderEnrollmentIds: [...keepLeaderIds] }
          : {}),
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

  const title = (() => {
    if (step === "confirmMerge" && !outcome) {
      return totalClasses > 1
        ? `Merge Classes (${classIndex + 1} of ${totalClasses})`
        : "Merge Classes"
    }
    return totalClasses > 1
      ? `Reassign Classes (${classIndex + 1} of ${totalClasses})`
      : "Reassign Class"
  })()

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
          {!outcome && step === "pick" && (
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
                  emptyMessage="No eligible facilitators for this class"
                  toggleAriaLabel="Toggle facilitator list"
                />
              </div>

              {target && target.mode === "transfer" && (
                <p style={{ ...TYPE.body, color: COLORS.textGray, margin: 0 }}>
                  This class transfers as-is to {target.fullName} — students, history, sites, and
                  forms are unchanged; only the facilitator changes.
                </p>
              )}
              {target && target.mode === "merge" && (
                <p style={{ ...TYPE.body, color: COLORS.textGray, margin: 0 }}>
                  {target.fullName} already has {target.targetCourseCode} this term. Continuing
                  will merge this class into theirs — you&apos;ll see a full preview before
                  anything happens.
                </p>
              )}

              {error && <p style={{ ...TYPE.body, color: COLORS.error, margin: 0 }}>{error}</p>}
            </>
          )}

          {!outcome && step === "confirmMerge" && (
            <>
              {isPreviewLoading || !preview ? (
                <p style={{ ...TYPE.body, color: COLORS.textGray, margin: 0 }}>Loading preview…</p>
              ) : (
                <>
                  <div
                    style={{
                      ...TYPE.body,
                      color: COLORS.textDark,
                      background: "#F9F9F7",
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 8,
                      padding: "12px 14px",
                    }}
                  >
                    <strong>
                      {preview.moveStudentCount} student{preview.moveStudentCount === 1 ? "" : "s"}
                    </strong>{" "}
                    ({preview.activeStudentCount} active) will move into{" "}
                    <strong>{preview.targetClassLabel}</strong>.
                  </div>

                  <div
                    role="alert"
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-start",
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: "rgba(123, 17, 19, 0.08)",
                      color: MAROON,
                      fontSize: 13,
                      fontWeight: 600,
                      lineHeight: 1.4,
                    }}
                  >
                    <i
                      className="ti ti-alert-triangle"
                      aria-hidden="true"
                      style={{ fontSize: 16, marginTop: 1, flexShrink: 0 }}
                    />
                    <span>
                      {sourceClass.classLabel} will be removed after the merge.
                      {preview.siteCount > 0 || preview.requirementCount > 0
                        ? ` Its ${[
                            preview.siteCount > 0
                              ? `${preview.siteCount} site${preview.siteCount === 1 ? "" : "s"}`
                              : null,
                            preview.requirementCount > 0
                              ? `${preview.requirementCount} form requirement${
                                  preview.requirementCount === 1 ? "" : "s"
                                }`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" and ")} carry over.`
                        : " Attendance history moves with the students."}
                    </span>
                  </div>

                  {preview.settingsDiffer && (
                    <p style={{ ...TYPE.caption, color: COLORS.textGray, margin: 0 }}>
                      The merged class uses {preview.targetClassLabel}&apos;s settings:{" "}
                      {preview.targetRequiredHourTotal} required hours,{" "}
                      {preview.targetDailyCutoffTime} daily cutoff.
                    </p>
                  )}

                  {preview.leaders.length > 0 && (
                    <div>
                      <p style={{ ...TYPE.bodyBold, color: COLORS.textDark, margin: "0 0 6px" }}>
                        Student leaders in the merged class
                      </p>
                      <p style={{ ...TYPE.caption, color: COLORS.textGray, margin: "0 0 8px" }}>
                        Uncheck anyone who should become a regular student.
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {preview.leaders.map((l) => (
                          <label
                            key={l.enrollmentId}
                            style={{
                              ...TYPE.body,
                              color: COLORS.textDark,
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={keepLeaderIds.has(l.enrollmentId)}
                              onChange={(e) => {
                                setKeepLeaderIds((prev) => {
                                  const next = new Set(prev)
                                  if (e.target.checked) next.add(l.enrollmentId)
                                  else next.delete(l.enrollmentId)
                                  return next
                                })
                              }}
                            />
                            {l.fullName}
                            <span style={{ ...TYPE.caption, color: COLORS.textGray }}>
                              ({l.side === "source" ? sourceClass.courseCode : "current class"}{" "}
                              leader)
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {error && <p style={{ ...TYPE.body, color: COLORS.error, margin: 0 }}>{error}</p>}
            </>
          )}

          {outcome && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ ...TYPE.bodyBold, color: COLORS.textDark, margin: 0 }}>
                {outcome.mode === "merged" ? "Classes merged." : "Class reassigned."}
              </p>
              {outcome.mode === "merged" && (
                <div
                  style={{
                    ...TYPE.caption,
                    color: COLORS.textGray,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <span>
                    {outcome.summary.movedStudentCount} student
                    {outcome.summary.movedStudentCount === 1 ? "" : "s"} moved into{" "}
                    {outcome.summary.targetClassLabel}.
                  </span>
                  {outcome.summary.mergedDuplicateNames.length > 0 && (
                    <span>
                      Duplicate enrollments auto-merged for:{" "}
                      {outcome.summary.mergedDuplicateNames.join(", ")}.
                    </span>
                  )}
                  {outcome.summary.leadersDemoted > 0 && (
                    <span>
                      {outcome.summary.leadersKept} leader
                      {outcome.summary.leadersKept === 1 ? "" : "s"} kept,{" "}
                      {outcome.summary.leadersDemoted} set to regular student.
                    </span>
                  )}
                </div>
              )}
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
            step === "pick" ? (
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
                  onClick={target?.mode === "merge" ? handleContinueToMerge : handleSubmit}
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
                    : target?.mode === "merge"
                      ? "Continue"
                      : "Reassign Class"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleBackToPick}
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
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isPending || isPreviewLoading || !preview}
                  style={{
                    ...TYPE.bodyBold,
                    color: "#fff",
                    background: isPending || isPreviewLoading || !preview ? "#B58F90" : MAROON,
                    border: "none",
                    borderRadius: 999,
                    padding: "10px 24px",
                    cursor: isPending || isPreviewLoading || !preview ? "not-allowed" : "pointer",
                  }}
                >
                  {isPending ? "Merging…" : "Merge Classes"}
                </button>
              </>
            )
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
