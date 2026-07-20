"use client"

import { useState, useRef, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  IconSearch,
  IconCircleCheck,
  IconClock,
  IconDownload,
  IconFilter,
  IconUpload,
  IconTrash,
  IconFile,
  IconPlus,
  IconChevronUp,
  IconChevronDown,
  IconSelector,
  IconEdit,
  IconEye,
} from "@tabler/icons-react"
import { FaSortAlphaDown, FaSortAlphaUp  } from "react-icons/fa";
import { Sidebar, dashboardStyles, navRoutes } from "../facilitator"
import { signOutWithAudit } from "@/lib/auth-actions"
import { ChartStyles } from "@/components/shared/ChartModule"
import { createClient } from "@/lib/client"
import { googleAvatarUrl } from "@/lib/auth/avatar"
import { NstpModal, ModalField, ModalRow } from "@/components/shared/Modal"
import { useAdviserBroadcast } from "@/lib/hooks/broadcastListener"
import LoadingPage from "@/components/shared/LoadingPage"
import FacilitatorProfilePill from "@/components/facilitator/FacilitatorProfilePill"
import {
  getSubmissionsByForm,
  getFacilitatorSectionId,
  reviewSubmission,
  type SubmissionByFormEntry,
} from "@/lib/forms/submission-actions"

import {
  getRequirementsForSection,
  deleteSectionRequirement,
  uploadRequirementFromData,
  getTemplateDownloadUrl,
  updateRequirementFromData,
  type FormRequirement,
} from "@/lib/forms/requirement-actions"

// ── Types ──────────────────────────────────────────────────────────────
type FormStatus = "Submitted" | "Not Yet Submitted"
type FormType =
  | "Daily Time Record"
  | "Accomplishment Report"
  | "Attendance Sheet"
  | "Incident Report"
  | "All"

interface DisplayEntry extends SubmissionByFormEntry {
  type: string
  dueDate: string | null
}

const statusConfig: Record<string, { bg: string; color: string }> = {
  Submitted: { bg: "#D1FAE5", color: "#065F46" },
  "Not Yet Submitted": { bg: "#FEE2E2", color: "#991B1B" },
  missing: { bg: "#FEE2E2", color: "#991B1B" },
  submitted: { bg: "#D1FAE5", color: "#065F46" },
  approved: { bg: "#D1FAE5", color: "#065F46" },
  rejected: { bg: "#FEE2E2", color: "#991B1B" },
}

const statusLabel: Record<string, string> = {
  missing: "Not Yet Submitted",
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
}

const typeConfig: Record<string, { bg: string; color: string }> = {
  "Daily Time Record": { bg: "#F3E8FF", color: "#6B21A8" },
  "Accomplishment Report": { bg: "#FEF3C7", color: "#92400E" },
  "Attendance Sheet": { bg: "#DBEAFE", color: "#1E40AF" },
  "Incident Report": { bg: "#FEE2E2", color: "#991B1B" },
  default: { bg: "#F3F4F6", color: "#374151" },
}

// The four standard NSTP form types, shown first; any other/custom form
// type added later is appended after these, sorted alphabetically.
const OFFICIAL_FORM_ORDER = [
  "Daily Time Record",
  "Accomplishment Report",
  "Attendance Sheet",
  "Incident Report",
]

function sortFormTypes(types: string[]): string[] {
  return [...types].sort((a, b) => {
    const ai = OFFICIAL_FORM_ORDER.indexOf(a)
    const bi = OFFICIAL_FORM_ORDER.indexOf(b)
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    return a.localeCompare(b)
  })
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  const gap = 2
  const shown = new Set<number>()

  shown.add(1)
  shown.add(total)
  let start = current - gap
  let end = current + gap

  if (start < 1) {
    end += 1 - start
    start = 1
  }

  if (end > total) {
    start -= end - total
    end = total
  }

  for (let i = Math.max(1, start); i <= Math.min(total, end); i++) {
    shown.add(i)
  }

  const sorted = Array.from(shown).sort((a, b) => a - b)
  const result: (number | "...")[] = []

  for (let i = 0; i < sorted.length; i++) {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1)
    }
    if (i > 0) {
      const gap = sorted[i] - sorted[i - 1]
      if (gap === 2) {
        result.push(sorted[i - 1] + 1)
      } else if (gap > 2) {
        result.push("...")
      }
    }
    result.push(sorted[i])
  }

  return result
}

const formsStyles = `
  ${dashboardStyles}
  .fm-body { flex: 1; overflow: auto; padding-top: 16px; }
  .fm-body .stat-cards { margin-bottom: 20px; }
  .adv-table th:nth-child(1) { width: 40%; }
  .adv-table th:nth-child(2) { width: 22%; }
  .adv-table th:nth-child(3) { width: 22%; }
  .adv-table th:nth-child(4) { width: 16%; text-align: center; }
  .adv-th-sort {
    display: flex; align-items: center; gap: 4px;
    cursor: pointer; user-select: none;
  }
  .adv-th-sort:hover { color: var(--maroon); }
  .adv-th-sort svg { flex-shrink: 0; }
  .fm-student-name { font-weight: 600; color: var(--text); }
  .fm-student-no   { font-size: 11.5px; color: var(--muted); margin-top: 2px; }
  .fm-upload-btn {
    display: flex; align-items: center; gap: 7px;
    background: var(--green); color: #fff; border: none;
    border-radius: 20px; padding: 8px 18px;
    font-size: 13px; font-weight: 700; font-family: var(--font);
    cursor: pointer; transition: background 0.13s;
  }
  .fm-upload-btn:hover { background: var(--green-dark); }
  .fm-repo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; padding: 20px; }
  .fm-repo-card {
    background: var(--white); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 16px 18px; box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 12px;
    transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
  }
  .fm-repo-card:hover { border-color: var(--maroon); transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.1); }
  .fm-repo-card--clickable { cursor: pointer; }
  .fm-repo-card--clickable:focus-visible { outline: 2px solid var(--maroon); outline-offset: 2px; }
  .fm-repo-card-top { display: flex; align-items: flex-start; gap: 12px; }
  .fm-repo-info { min-width: 0; flex: 1; }
  .fm-repo-icon { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: #F3E8FF; }
  .fm-repo-name { font-size: 13.5px; font-weight: 700; color: var(--text); line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .fm-repo-meta { font-size: 11.5px; color: var(--muted); margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .fm-repo-card-bottom { display: flex; align-items: center; justify-content: space-between; padding-top: 10px; border-top: 1px solid #F3F4F6; }
  .fm-repo-actions { display: flex; gap: 6px; }
  .fm-icon-btn {
    width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--border);
    background: var(--white); cursor: pointer; display: flex; align-items: center;
    justify-content: center; color: var(--muted); transition: all 0.13s;
  }
  .fm-icon-btn:hover { border-color: var(--maroon); color: var(--maroon); background: #FEF2F2; }
  .fm-icon-btn.danger:hover { border-color: #EF4444; color: #EF4444; background: #FEF2F2; }
  .fm-kpi-active {
    border-color: var(--maroon) !important;
    box-shadow: 0 0 0 2px rgba(123, 29, 29, 0.14);
  }
  .fm-upload-zone {
    border: 2px dashed var(--border); border-radius: 12px;
    padding: 32px; text-align: center; cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }
  .fm-upload-zone:hover { border-color: var(--green); background: #F0FDF4; }
  .fm-upload-zone-text { font-size: 13px; color: var(--muted); margin-top: 8px; }
  .fm-upload-zone-sub  { font-size: 11.5px; color: var(--light); margin-top: 4px; }

  /* Submission Bin modal — fixed width + fixed height so the modal is
     always the exact same size, whether 0 rows or 50 rows match the
     current filters/search (prevents the resize "jump" entirely). */
  .fm-bin-modal-body {
    width: 100%;
    display: flex;
    flex-direction: column;
  }
  .fm-bin-table-wrapper {
    height: 560px;
    overflow-y: auto;
    overflow-x: auto;
  }
  .fm-bin-table-wrapper .adv-empty {
    vertical-align: middle;
  }
  .fm-bin-table-wrapper tbody tr:hover {
    background: #F9FAFB;
  }
  .fm-bin-table-wrapper .adv-badge {
    display: inline-block;
    min-width: 108px;
    text-align: center;
  }
`

export default function FormsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showSubmissionBin, setShowSubmissionBin] = useState(false)

  // Filters
  const [search, setSearch] = useState("")
  const [binSearch, setBinSearch] = useState("")
  type SubmissionFilterField = "status" | "type"
  type SubmissionActiveFilters = Partial<
    Record<SubmissionFilterField, string[]>
  >
  const [activeFilters, setActiveFilters] = useState<SubmissionActiveFilters>(
    {}
  )
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const filterPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showFilterPanel) return
    function handleClickOutside(e: MouseEvent) {
      if (
        filterPanelRef.current &&
        !filterPanelRef.current.contains(e.target as Node)
      ) {
        setShowFilterPanel(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showFilterPanel])

  function toggleFilter(field: SubmissionFilterField, value: string) {
    setActiveFilters((prev) => {
      const current = prev[field] ?? []
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      const next = { ...prev }
      if (updated.length === 0) delete next[field]
      else next[field] = updated
      return next
    })
    setCurrentPage(1)
  }

  function closeSubmissionBin() {
    setShowSubmissionBin(false)
    setActiveFilters((prev) => {
      const next = { ...prev }
      delete next.type
      return next
    })
  }
  const [sectionFilter, setSectionFilter] = useState("All")

  // Dropdown toggles
  const [showSectionDrop, setShowSectionDrop] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Submissions table sorting
  type SubmissionSortField = "name" | "type" | "date" | "status"
  const [sortField, setSortField] = useState<SubmissionSortField | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  function toggleSort(field: SubmissionSortField) {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const [selectedEntry, setSelectedEntry] = useState<DisplayEntry | null>(null)
  const [reviewComment, setReviewComment] = useState("")
  const [isReviewing, setIsReviewing] = useState(false)
  const isAlreadyReviewed = selectedEntry?.status === "approved" || selectedEntry?.status === "rejected"

  function openReview(entry: DisplayEntry) {
    setSelectedEntry(entry)
    setReviewComment("")
  }

  function closeReview() {
    setSelectedEntry(null)
    setReviewComment("")
  }

  async function handleReviewDecision(submissionId: string, decision: "approved" | "rejected", comment: string | null) {
    if (!selectedEntry) return
    setIsReviewing(true)
    try {
      const res = await reviewSubmission(submissionId, decision, comment)
      if (res.ok) {
        setRealEntries((prev) =>
          prev.map((e) =>
            e === selectedEntry
              ? { ...e, status: decision, submission: res.data }
              : e
          )
        )
        closeReview()
      } else {
        alert(`Review failed: ${res.error}`)
      }
    } finally {
      setIsReviewing(false)
    }
  }

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [initials, setInitials] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [sectionId, setSectionId] = useState<string | null>(null)
  const [sortForms, setSortForms] = useState<"asc" | "desc">("asc")

  // Data States
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [realEntries, setRealEntries] = useState<DisplayEntry[]>([])
  const [repoForms, setRepoForms] = useState<FormRequirement[]>([])
  const [isLoading, startTransition] = useTransition()
  const [isPageLoading, setIsPageLoading] = useState(true)

  // Upload Modal States
  const [showUpload, setShowUpload] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadTitle, setUploadTitle] = useState("Daily Time Record")
  const [customTitle, setCustomTitle] = useState("")
  const [uploadDescription, setUploadDescription] = useState("")
  const [uploadDueDate, setUploadDueDate] = useState("")
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit Modal States
  const [showEdit, setShowEdit] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editReqId, setEditReqId] = useState("")
  const [editTitle, setEditTitle] = useState("Daily Time Record")
  const [editCustomTitle, setEditCustomTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editDueDate, setEditDueDate] = useState("")
  const [editFile, setEditFile] = useState<File | null>(null)

  const loadData = async () => {
    const secRes = await getFacilitatorSectionId()
    if (!secRes.ok) {
      setErrorMsg(secRes.error)
      return
    }
    setSectionId(secRes.data)

    const [subRes, reqRes] = await Promise.all([
      getSubmissionsByForm(secRes.data),
      getRequirementsForSection(secRes.data),
    ])

    if (subRes.ok) {
      const flattened: DisplayEntry[] = subRes.data.flatMap((group) =>
        group.entries.map((entry) => ({
          ...entry,
          type: group.requirement.title,
          dueDate: group.requirement.due_date,
        }))
      )
      setRealEntries(flattened)
    }

    if (reqRes.ok) setRepoForms(reqRes.data)
    setIsPageLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      const full: string = user?.user_metadata?.full_name ?? ""
      const parts = full.trim().split(" ")
      const fName = parts[0] ?? ""
      const lName = parts.at(-1) ?? ""
      setFirstName(fName)
      setLastName(lName)
      setInitials((fName[0] ?? "") + (lName[0] ?? ""))
      setAvatarUrl(googleAvatarUrl(user))
      setUserId(user?.id ?? null)
    })
  }, [])

  useAdviserBroadcast(supabase, {
    adviserUserId: userId,
    tables: ["form_submission", "form_requirement"],
    onChange: () => {
      loadData()
    },
  })

  async function handleSignOut() {
    await signOutWithAudit()
    router.push("/")
    router.refresh()
  }
  const handleUploadSubmit = async () => {
    const finalTitle = uploadTitle === "Other" ? customTitle : uploadTitle
    if (!finalTitle.trim() || !sectionId) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append("title", finalTitle.trim())
    if (uploadDescription.trim())
      formData.append("description", uploadDescription.trim())
    if (uploadDueDate) formData.append("dueDate", uploadDueDate)
    if (uploadFile) formData.append("file", uploadFile)

    const res = await uploadRequirementFromData(formData, sectionId)
    setIsUploading(false)

    if (res.ok) {
      setShowUpload(false)
      setUploadFile(null)
      setUploadTitle("Daily Time Record")
      setCustomTitle("")
      setUploadDescription("")
      setUploadDueDate("")
      loadData()
    } else {
      alert(`Upload Failed: ${res.error}`)
    }
  }

  const openEditModal = (form: FormRequirement) => {
    setEditReqId(form.form_requirement_id)
    const standardTitles = [
      "Daily Time Record",
      "Accomplishment Report",
      "Attendance Sheet",
      "Incident Report",
    ]

    if (standardTitles.includes(form.title)) {
      setEditTitle(form.title)
      setEditCustomTitle("")
    } else {
      setEditTitle("Other")
      setEditCustomTitle(form.title)
    }

    setEditDescription(form.description || "")
    setEditDueDate(form.due_date ? form.due_date.split("T")[0] : "")
    setEditFile(null)
    setShowEdit(true)
  }

  const handleEditSubmit = async () => {
    const finalTitle = editTitle === "Other" ? editCustomTitle : editTitle
    if (!finalTitle.trim() || !sectionId || !editReqId) return

    setIsEditing(true)
    const formData = new FormData()
    formData.append("title", finalTitle.trim())
    if (editDescription.trim())
      formData.append("description", editDescription.trim())
    if (editDueDate) formData.append("dueDate", editDueDate)
    if (editFile) formData.append("file", editFile)

    const res = await updateRequirementFromData(editReqId, sectionId, formData)
    setIsEditing(false)

    if (res.ok) {
      setShowEdit(false)
      loadData()
    } else {
      alert(`Update Failed: ${res.error}`)
    }
  }

  const handleDelete = async (reqId: string) => {
    if (!sectionId) return
    if (
      !confirm(
        "Are you sure you want to delete this form template? This action cannot be undone."
      )
    )
      return

    startTransition(async () => {
      const res = await deleteSectionRequirement(reqId, sectionId)
      if (res.ok) loadData()
      else alert(`Delete Failed: ${res.error}`)
    })
  }

  const handleDownload = async (reqId: string) => {
    const res = await getTemplateDownloadUrl(reqId)
    if (res.ok) window.open(res.url, "_blank")
    else alert(`Download Error: ${res.error}`)
  }

  const filteredForms = repoForms
  .filter(
    (f) =>
      !search ||
      f.title.toLowerCase().includes(search.toLowerCase()) ||
      (f.template_file_name &&
        f.template_file_name.toLowerCase().includes(search.toLowerCase()))
  )
  .sort((a, b) => {
    const cmp = a.title.localeCompare(b.title)
    return sortForms === "asc" ? cmp : -cmp
  })

  const filteredSubmissions = realEntries.filter((f) => {
    const q = binSearch.trim().toLowerCase()
    const matchSearch =
      !q ||
      f.full_name.toLowerCase().includes(q) ||
      (f.student_number && f.student_number.includes(q))

    const dbStatusMap: Record<string, string> = {
      Submitted: "submitted",
      "Not Yet Submitted": "missing",
      Approved: "approved",
      Rejected: "rejected",
    }
    const statusSelections = activeFilters.status ?? []
    const matchStatus =
      statusSelections.length === 0 ||
      statusSelections.some((s) => dbStatusMap[s] === f.status)

    const typeSelections = activeFilters.type ?? []
    const matchType =
      typeSelections.length === 0 || typeSelections.includes(f.type)

    return matchSearch && matchStatus && matchType
  })

  const sortedSubmissions = [...filteredSubmissions].sort((a, b) => {
    if (!sortField) return 0
    const dir = sortDirection === "asc" ? 1 : -1

    let av: string | number = ""
    let bv: string | number = ""

    switch (sortField) {
      case "name":
        av = a.full_name.toLowerCase()
        bv = b.full_name.toLowerCase()
        break
      case "type":
        av = a.type.toLowerCase()
        bv = b.type.toLowerCase()
        break
      case "date":
        av = a.submission
          ? new Date(a.submission.submitted_at).getTime()
          : -Infinity
        bv = b.submission
          ? new Date(b.submission.submitted_at).getTime()
          : -Infinity
        break
      case "status":
        av = a.status.toLowerCase()
        bv = b.status.toLowerCase()
        break
    }

    if (av < bv) return -1 * dir
    if (av > bv) return 1 * dir
    return 0
  })

  const paginated = sortedSubmissions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )
  const totalPages = Math.max(
    1,
    Math.ceil(filteredSubmissions.length / pageSize)
  )

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return "0 KB"
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  const filterGroups: {
    label: string
    field: SubmissionFilterField
    values: () => string[]
  }[] = [
    {
      label: "Status",
      field: "status",
      values: () => ["Submitted", "Not Yet Submitted", "Approved", "Rejected"],
    },
  ]

  const totalActiveFilters = Object.entries(activeFilters)
  .filter(([field]) => field !== "type")
  .reduce((sum, [, arr]) => sum + (arr?.length ?? 0), 0)

  const BoundSidebar = () => (
    <Sidebar
      open={sidebarOpen}
      activeNav="Forms"
      onToggle={() => setSidebarOpen((o) => !o)}
      onNavClick={(label) => {
        setSidebarOpen(false)
        router.push(navRoutes[label])
      }}
      onSignOut={handleSignOut}
    />
  )

  if (isPageLoading) {
    return (
      <>
        <style>{dashboardStyles}</style>
        <ChartStyles />
        <LoadingPage Sidebar={BoundSidebar} />
      </>
    )
  }

  return (
    <>
      <style>{formsStyles}</style>
      <ChartStyles />
      <div className="db-root">
        <Sidebar
          open={sidebarOpen}
          activeNav="Forms"
          onToggle={() => setSidebarOpen((o) => !o)}
          onNavClick={(label) => {
            setSidebarOpen(false)
            router.push(navRoutes[label])
          }}
          onSignOut={handleSignOut}
        />
        {sidebarOpen && (
          <div
            className="sb-overlay"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <div className="main-wrapper">
          <main className="main">
            <header className="header">
              <h1 className="header-greeting">Forms</h1>
              <FacilitatorProfilePill
                name={lastName ? `${lastName}, ${firstName}` : "Adviser"}
                avatarUrl={avatarUrl}
                initials={initials || "A"}
              />
            </header>

            {errorMsg && (
              <div
                style={{
                  margin: "20px 40px 0",
                  padding: "12px",
                  background: "#FEE2E2",
                  color: "#991B1B",
                  borderRadius: "8px",
                }}
              >
                {errorMsg}
              </div>
            )}

            <div className="body">
              <div className="fm-body">
                <div className="adv-table-card">
                  <div className="adv-table-toolbar">
                    <div>
                      <div className="flex flex-row gap-1">
                        <div className="adv-table-title">All Forms</div>
                        <button
                          className=""
                          title={sortForms === "asc" ? "Sorted Alphabetically from A to Z" : "Sorted Alphabetically from Z to A"}
                          onClick={() =>
                            setSortForms((d) => (d === "asc" ? "desc" : "asc"))
                          }
                        >
                          {sortForms === "asc" ? (
                            <FaSortAlphaDown size={16} />
                          ) : (
                            <FaSortAlphaUp size={16} />
                          )}
                        </button>
                      </div>
                      
                      <div className="adv-table-count">
                        {repoForms.length} NSTP Form
                        {repoForms.length !== 1 ? "s" : ""} · Click a card to
                        view its submissions
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginLeft: "auto",
                      }}
                    >
                      <div className="adv-search-bar">
                        <IconSearch
                          size={16}
                          stroke={1.75}
                          color="var(--muted)"
                        />
                        <input
                          className="adv-search-input"
                          placeholder="Search forms..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </div>
                      <button
                        className="fm-upload-btn"
                        onClick={() => setShowUpload(true)}
                      >
                        <IconPlus size={15} stroke={2.5} /> Upload Form
                      </button>
                    </div>
                  </div>

                  <div className="fm-repo-grid">
                    {filteredForms.map((f) => {
                      const tc = typeConfig[f.title] || typeConfig.default
                      const isActive =
                        (activeFilters.type ?? []).length === 1 &&
                        activeFilters.type?.[0] === f.title
                      return (
                        <div
                          key={f.form_requirement_id}
                          className={`fm-repo-card fm-repo-card--clickable${
                            isActive ? " fm-kpi-active" : ""
                          }`}
                          onClick={() => {
                            if (isActive) {
                              closeSubmissionBin()
                              return
                            }
                            setActiveFilters((prev) => ({
                              ...prev,
                              type: [f.title],
                            }))
                            setCurrentPage(1)
                            setShowSubmissionBin(true)
                          }}
                          role="button"
                          tabIndex={0}
                          aria-pressed={isActive}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              e.currentTarget.click()
                            }
                          }}
                        >
                          <div className="fm-repo-card-top">
                            <div
                              className="fm-repo-icon"
                              style={{ background: tc.bg }}
                            >
                              <IconFile
                                size={22}
                                stroke={1.5}
                                color={tc.color}
                              />
                            </div>
                            <div className="fm-repo-info">
                              <div className="fm-repo-name" title={f.title}>
                                {f.title}
                              </div>
                              <div
                                className="fm-repo-meta"
                                title={f.template_file_name || undefined}
                              >
                                {f.template_file_name || "No template attached"}
                                {f.template_file_size_byte
                                  ? ` · ${formatBytes(
                                      f.template_file_size_byte
                                    )}`
                                  : ""}
                              </div>
                            </div>
                          </div>
                          <div className="fm-repo-card-bottom">
                            {f.section_id === null ? (
                              <span
                                style={{
                                  fontSize: "11px",
                                  color: "var(--muted)",
                                  fontWeight: "bold",
                                }}
                              >
                                GLOBAL TEMPLATE
                              </span>
                            ) : (
                              <div style={{ width: "10px" }}></div>
                            )}
                            <div className="fm-repo-actions">
                              {f.template_storage_path && (
                                <button
                                  className="fm-icon-btn"
                                  title="Download"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDownload(f.form_requirement_id)
                                  }}
                                >
                                  <IconDownload size={14} stroke={1.75} />
                                </button>
                              )}

                              {f.section_id !== null && (
                                <button
                                  className="fm-icon-btn"
                                  title="Edit"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openEditModal(f)
                                  }}
                                  disabled={isLoading}
                                >
                                  <IconEdit size={14} stroke={1.75} />
                                </button>
                              )}
                              {f.section_id !== null && (
                                <button
                                  className="fm-icon-btn danger"
                                  title="Delete"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDelete(f.form_requirement_id)
                                  }}
                                  disabled={isLoading}
                                >
                                  <IconTrash size={14} stroke={1.75} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {filteredForms.length === 0 && (
                      <div
                        style={{
                          gridColumn: "1 / -1",
                          textAlign: "center",
                          padding: "40px",
                          color: "var(--muted)",
                        }}
                      >
                        No templates found.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>

        {/* Upload modal */}
        <NstpModal
          open={showUpload}
          onClose={() => setShowUpload(false)}
          title="Upload Form Template"
          size="md"
          actions={[
            {
              label: "Cancel",
              onClick: () => setShowUpload(false),
              variant: "reject",
            },
            {
              label: isUploading ? "Uploading..." : "Upload",
              onClick: handleUploadSubmit,
              variant: "approve",
              disabled:
                isUploading ||
                !uploadFile ||
                (uploadTitle === "Other" && !customTitle.trim()),
            },
          ]}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div>
              <div className="nstp-modal-label">Form Type</div>
              <select
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                style={{
                  width: "100%",
                  border: "1.5px solid var(--border)",
                  borderRadius: 10,
                  padding: "9px 12px",
                  fontSize: 13,
                  fontFamily: "var(--font)",
                  color: "var(--text)",
                  background: "var(--white)",
                  outline: "none",
                  marginTop: 4,
                }}
              >
                <option>Daily Time Record</option>
                <option>Accomplishment Report</option>
                <option>Attendance Sheet</option>
                <option>Incident Report</option>
                <option>Other</option>
              </select>
            </div>

            {uploadTitle === "Other" && (
              <div>
                <div className="nstp-modal-label">Custom Form Title</div>
                <input
                  type="text"
                  value={customTitle}
                  maxLength={100}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Enter custom form title"
                  style={{
                    width: "100%",
                    border: "1.5px solid var(--border)",
                    borderRadius: 10,
                    padding: "9px 12px",
                    fontSize: 13,
                    fontFamily: "var(--font)",
                    outline: "none",
                    marginTop: 4,
                  }}
                />
              </div>
            )}

            <div>
              <div className="nstp-modal-label">Due Date (Optional)</div>
              <input
                type="date"
                value={uploadDueDate}
                onChange={(e) => setUploadDueDate(e.target.value)}
                style={{
                  width: "100%",
                  border: "1.5px solid var(--border)",
                  borderRadius: 10,
                  padding: "9px 12px",
                  fontSize: 13,
                  fontFamily: "var(--font)",
                  color: "var(--text)",
                  outline: "none",
                  marginTop: 4,
                }}
              />
            </div>

            <div>
              <div className="nstp-modal-label">
                Description / Instructions (Optional)
              </div>
              <textarea
                value={uploadDescription}
                maxLength={500}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="Add helpful instructions for your students..."
                rows={3}
                style={{
                  width: "100%",
                  border: "1.5px solid var(--border)",
                  borderRadius: 10,
                  padding: "9px 12px",
                  fontSize: 13,
                  fontFamily: "var(--font)",
                  color: "var(--text)",
                  outline: "none",
                  marginTop: 4,
                  resize: "none",
                }}
              />
            </div>

            <div>
              <div className="nstp-modal-label">Template File (Optional)</div>
              <div
                className="fm-upload-zone"
                onClick={() => fileInputRef.current?.click()}
                style={{ marginTop: 4 }}
              >
                {uploadFile ? (
                  <div style={{ color: "var(--green)", fontWeight: "bold" }}>
                    {uploadFile.name}
                  </div>
                ) : (
                  <div className="items-center flex flex-col pt-4">
                    <IconUpload size={28} stroke={1.5} color="var(--muted)" />
                    <div className="fm-upload-zone-text">
                      Click to browse files or drag & drop files here
                    </div>
                    <div className="fm-upload-zone-sub pt-3">
                      Max file size: <strong>2 MB</strong> 
                    </div>
                    <div className="fm-upload-zone-sub">
                      Supported file types: <strong>PDF, DOC, DOCX</strong>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) =>
                    e.target.files && setUploadFile(e.target.files[0])
                  }
                  style={{ display: "none" }}
                />
              </div>
            </div>
          </div>
        </NstpModal>

        {/* Edit modal */}
        <NstpModal
          open={showEdit}
          onClose={() => setShowEdit(false)}
          title="Edit Form Template"
          size="md"
          actions={[
            {
              label: "Cancel",
              onClick: () => setShowEdit(false),
              variant: "secondary",
            },
            {
              label: isEditing ? "Saving..." : "Save Changes",
              onClick: handleEditSubmit,
              variant: "approve",
              disabled: isEditing || !editTitle,
            },
          ]}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div>
              <div className="nstp-modal-label">Form Type</div>
              <select
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                style={{
                  width: "100%",
                  border: "1.5px solid var(--border)",
                  borderRadius: 10,
                  padding: "9px 12px",
                  fontSize: 13,
                  fontFamily: "var(--font)",
                  color: "var(--text)",
                  background: "var(--white)",
                  outline: "none",
                  marginTop: 4,
                }}
              >
                <option>Daily Time Record</option>
                <option>Accomplishment Report</option>
                <option>Attendance Sheet</option>
                <option>Incident Report</option>
                <option>Other</option>
              </select>
            </div>

            {editTitle === "Other" && (
              <div>
                <div className="nstp-modal-label">Form Title</div>
                <input
                  type="text"
                  value={editCustomTitle}
                  maxLength={100}
                  onChange={(e) => setEditCustomTitle(e.target.value)}
                  placeholder="Enter custom form title"
                  style={{
                    width: "100%",
                    border: "1.5px solid var(--border)",
                    borderRadius: 10,
                    padding: "9px 12px",
                    fontSize: 13,
                    fontFamily: "var(--font)",
                    outline: "none",
                    marginTop: 4,
                  }}
                />
              </div>
            )}

            <div>
              <div className="nstp-modal-label">Due Date (Optional)</div>
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                style={{
                  width: "100%",
                  border: "1.5px solid var(--border)",
                  borderRadius: 10,
                  padding: "9px 12px",
                  fontSize: 13,
                  fontFamily: "var(--font)",
                  color: "var(--text)",
                  outline: "none",
                  marginTop: 4,
                }}
              />
            </div>

            <div>
              <div className="nstp-modal-label">Description / Instructions</div>
              <textarea
                value={editDescription}
                maxLength={500}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  border: "1.5px solid var(--border)",
                  borderRadius: 10,
                  padding: "9px 12px",
                  fontSize: 13,
                  fontFamily: "var(--font)",
                  color: "var(--text)",
                  outline: "none",
                  marginTop: 4,
                  resize: "none",
                }}
              />
            </div>

            <div>
              <div className="nstp-modal-label">
                Replace Template File (Optional)
              </div>
              <div
                className="fm-upload-zone"
                onClick={() => fileInputRef.current?.click()}
                style={{ marginTop: 4, padding: "20px" }}
              >
                {editFile ? (
                  <div style={{ color: "var(--green)", fontWeight: "bold" }}>
                    {editFile.name}
                  </div>
                ) : (
                  <div className="fm-upload-zone-text">
                    Click to upload a new file (Leave empty to keep current
                    file)
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) =>
                    e.target.files && setEditFile(e.target.files[0])
                  }
                  style={{ display: "none" }}
                />
              </div>
            </div>
          </div>
        </NstpModal>

        {/* Submission Bin modal */}
        <NstpModal
          open={showSubmissionBin}
          onClose={closeSubmissionBin}
          title="Submission Bin"
          size="wide"
          width={1140}
          actions={
            [
              // {
              //   label: "Close",
              //   onClick: closeSubmissionBin,
              //   variant: "secondary",
              // },
            ]
          }
        >
          <div className="fm-bin-modal-body">
          <div className="adv-table-toolbar" style={{ paddingTop: 0 }}>
            <div>
              <div className="adv-table-count flex flex-col gap-0.5">
                {(activeFilters.type ?? []).length === 1 && (
                  <span className="adv-table-title text-(--text)">
                    {activeFilters.type?.[0]}
                  </span>
                )}
                {filteredSubmissions.length}  {filteredSubmissions.length === 1 ? "record" : "records"} found
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginLeft: "auto",
              }}
            >
              <div className="adv-search-bar">
                <IconSearch size={16} stroke={1.75} color="var(--muted)" />
                <input
                  className="adv-search-input"
                  value={binSearch}
                  onChange={(e) => {
                    setBinSearch(e.target.value)
                    setCurrentPage(1)
                  }}
                  placeholder="Search student..."
                />
              </div>

              {/* Unified Filter Button */}
              <div ref={filterPanelRef} style={{ position: "relative" }}>
                <button
                  className="adv-filter-btn"
                  onClick={() => setShowFilterPanel((v) => !v)}
                  style={{
                    width: 60,
                    height: 38,
                    border: `1.5px solid ${
                      totalActiveFilters > 0 ? "var(--maroon)" : "var(--green)"
                    }`,
                    borderRadius: 999,
                    background: "white",
                    color:
                      totalActiveFilters > 0 ? "var(--maroon)" : "var(--green)",
                    fontSize: 22,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "0.2s ease",
                    position: "relative",
                  }}
                >
                  <IconFilter size={18} stroke={1.75} />
                  {totalActiveFilters > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: -6,
                        right: -6,
                        background: "var(--maroon)",
                        color: "#fff",
                        borderRadius: "50%",
                        width: 16,
                        height: 16,
                        fontSize: 9,
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {totalActiveFilters}
                    </span>
                  )}
                </button>

                {showFilterPanel && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      right: 0,
                      background: "var(--white)",
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      zIndex: 100,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 12,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "var(--muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Filters
                      </span>
                      {totalActiveFilters > 0 && (
                        <button
                          onClick={() => {
                            setActiveFilters((prev) => {
                              const next = { ...prev }
                              delete next.status
                              return next
                            })
                            setCurrentPage(1)
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontSize: 11.5,
                            color: "var(--maroon)",
                            fontWeight: 600,
                            fontFamily: "var(--font)",
                            padding: 0,
                          }}
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 24 }}>
                      {filterGroups.map(({ label, field, values }) => {
                        const opts = values()
                        if (opts.length === 0) return null
                        const checked = activeFilters[field] ?? []
                        return (
                          <div key={field} style={{ minWidth: 150 }}>
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "var(--text)",
                                marginBottom: 8,
                                textTransform: "uppercase",
                                letterSpacing: "0.4px",
                              }}
                            >
                              {label}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 6,
                              }}
                            >
                              {opts.map((v) => (
                                <label
                                  key={v}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    cursor: "pointer",
                                    fontSize: 13,
                                    color: "var(--text)",
                                    fontFamily: "var(--font)",
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked.includes(v)}
                                    onChange={() => toggleFilter(field, v)}
                                    style={{
                                      accentColor: "var(--maroon)",
                                      width: 14,
                                      height: 14,
                                      cursor: "pointer",
                                      flexShrink: 0,
                                    }}
                                  />
                                  {v}
                                </label>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="adv-table-wrapper fm-bin-table-wrapper">
            <table className="adv-table">
              <thead>
                <tr>
                  <th>
                    <span
                      className="adv-th-sort"
                      onClick={() => toggleSort("name")}
                    >
                      Student
                      {sortField === "name" ? (
                        sortDirection === "asc" ? (
                          <IconChevronUp size={13} stroke={2.5} />
                        ) : (
                          <IconChevronDown size={13} stroke={2.5} />
                        )
                      ) : (
                        <IconSelector size={13} stroke={2} />
                      )}
                    </span>
                  </th>
                  <th>
                    <span
                      className="adv-th-sort"
                      onClick={() => toggleSort("date")}
                    >
                      Date Submitted
                      {sortField === "date" ? (
                        sortDirection === "asc" ? (
                          <IconChevronUp size={13} stroke={2.5} />
                        ) : (
                          <IconChevronDown size={13} stroke={2.5} />
                        )
                      ) : (
                        <IconSelector size={13} stroke={2} />
                      )}
                    </span>
                  </th>
                  <th>
                    <span
                      className="adv-th-sort"
                      onClick={() => toggleSort("status")}
                    >
                      Status
                      {sortField === "status" ? (
                        sortDirection === "asc" ? (
                          <IconChevronUp size={13} stroke={2.5} />
                        ) : (
                          <IconChevronDown size={13} stroke={2.5} />
                        )
                      ) : (
                        <IconSelector size={13} stroke={2} />
                      )}
                    </span>
                  </th>
                  <th style={{ textAlign: "center" }}>View</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="adv-empty">
                      No forms match your search.
                    </td>
                  </tr>
                ) : (
                  paginated.map((f, i) => {
                    const tc = typeConfig[f.type] || typeConfig.default
                    const sc = statusConfig[f.status] || statusConfig.missing
                    return (
                      <tr
                        key={i}
                        onClick={() => openReview(f)}
                        style={{ cursor: "pointer" }}
                      >
                        <td>
                          <div className="fm-student-name">{f.full_name}</div>
                          <div className="fm-student-no">
                            {f.student_number}
                          </div>
                        </td>
                        <td
                          style={{
                            fontSize: 12.5,
                            color: "var(--muted)",
                          }}
                        >
                          {f.submission
                            ? new Date(
                                f.submission.submitted_at
                              ).toLocaleDateString()
                            : "—"}
                        </td>
                        <td>
                          <span className="adv-badge" style={{ background: sc.bg, color: sc.color }}>
                            {statusLabel[f.status] ?? f.status}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {f.submission ? (
                            <button
                              className="fm-icon-btn"
                              title="View submission"
                              onClick={(e) => {
                                e.stopPropagation()
                                const url = f.submission!.storage_path.startsWith("gdrive:")
                                  ? f.submission!.storage_path.replace("gdrive:", "")
                                  : f.submission!.storage_path
                                window.open(url, "_blank", "noopener,noreferrer")
                              }}
                            >
                              <IconEye size={16} stroke={1.75} />
                            </button>
                          ) : (
                            <span style={{ color: "var(--light)", fontSize: 12 }}>—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="adv-pagination">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
              }}
            >
              <div className="adv-pagination-info">
                Page {currentPage} of {totalPages}
              </div>
              <div className="adv-pagination-controls">
                <button
                  className="adv-page-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((c) => Math.max(1, c - 1))}
                >
                  &#8249;
                </button>
                {getPageNumbers(currentPage, totalPages).map((p, idx) =>
                  p === "..." ? (
                    <span
                      key={`ellipsis-${idx}`}
                      style={{
                        width: 28,
                        height: 28,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        color: "var(--muted)",
                      }}
                    >
                      &#8230;
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                        background:
                          p === currentPage ? "var(--maroon)" : "var(--white)",
                        color: p === currentPage ? "#fff" : "var(--text)",
                        fontWeight: p === currentPage ? 700 : 500,
                        cursor: "pointer",
                        fontSize: 12,
                        fontFamily: "var(--font)",
                      }}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  className="adv-page-btn"
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() =>
                    setCurrentPage((c) => Math.min(totalPages, c + 1))
                  }
                >
                  &#8250;
                </button>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12.5,
                color: "var(--muted)",
              }}
            >
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                style={{
                  border: "1.5px solid var(--border)",
                  borderRadius: 10,
                  padding: "5px 10px",
                  fontSize: 13,
                  fontFamily: "var(--font)",
                  color: "var(--text)",
                  background: "var(--white)",
                  cursor: "pointer",
                  outline: "none",
                  appearance: "auto",
                  minWidth: 60,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
          </div>
        </NstpModal>

        {/* Submission Review modal — opens when a Submission Bin row is clicked */}
        <NstpModal
          open={!!selectedEntry}
          onClose={closeReview}
          title={selectedEntry?.full_name ?? "Review Submission"}
          subtitle={
            selectedEntry
              ? `${selectedEntry.student_number} • ${selectedEntry.type}`
              : undefined
          }
          initials={
            selectedEntry
              ? selectedEntry.full_name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              : undefined
          }
          size="md"
          actions={[
            {
              label: "Reject",
              onClick: () => {
                if (!selectedEntry?.submission) return
                handleReviewDecision(selectedEntry.submission.form_submission_id, "rejected", reviewComment || null)
              },
              variant: "reject",
              disabled: isReviewing || isAlreadyReviewed || !selectedEntry?.submission,
            },
            {
              label: "Accept",
              onClick: () => {
                if (!selectedEntry?.submission) return
                handleReviewDecision(selectedEntry.submission.form_submission_id, "approved", reviewComment || null)
              },
              variant: "approve",
              disabled: isReviewing || isAlreadyReviewed || !selectedEntry?.submission,
            },
          ]}
        >
          {selectedEntry && (
            <>
              {selectedEntry.submission ? (
                <ModalRow>
                  <ModalField label="Submitted File">
                    <a
                      href={
                        selectedEntry.submission.storage_path.startsWith(
                          "gdrive:"
                        )
                          ? selectedEntry.submission.storage_path.replace(
                              "gdrive:",
                              ""
                            )
                          : selectedEntry.submission.storage_path
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="fm-upload-btn"
                      style={{
                        padding: "6px 14px",
                        fontSize: 12,
                        display: "inline-flex",
                        marginTop: 4,
                      }}
                    >
                      View in Drive
                    </a>
                  </ModalField>
                  <ModalField
                    label="Date Submitted"
                    value={
                      selectedEntry.submission
                        ? new Date(
                            selectedEntry.submission.submitted_at
                          ).toLocaleDateString()
                        : "Not yet submitted"
                    }
                  />
                </ModalRow>
                
              ) : (
                <div style={{ fontSize: 12.5, color: "var(--muted)", background: "#F9FAFB", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
                  This student hasn&apos;t submitted this form yet, so there&apos;s nothing to accept or reject.
                </div>
              )}

              {isAlreadyReviewed && selectedEntry.submission && (
                <div
                  style={{
                    fontSize: 12.5,
                    background: selectedEntry.status === "approved" ? "#D1FAE5" : "#FEE2E2",
                    color: selectedEntry.status === "approved" ? "#065F46" : "#991B1B",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "10px 12px",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    {selectedEntry.status === "approved" ? "Approved" : "Rejected"}
                    {selectedEntry.submission.reviewed_at && ` at ${new Date(selectedEntry.submission.reviewed_at).toLocaleString()}`}
                  </div>
                  <div>
                    {selectedEntry.submission.reviewer_comment
                      ? selectedEntry.submission.reviewer_comment
                      : "No comment was left."}
                  </div>
                </div>
              )}

              {!isAlreadyReviewed && (
                <div>
                  <div className="nstp-modal-label">
                    "Adviser Comments (optional)"
                  </div>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Add a note for the student..."
                      rows={4}
                      style={{
                        width: "100%",
                        resize: "vertical",
                        border: "1.5px solid var(--border)",
                        borderRadius: 10,
                        padding: "10px 12px",
                        fontSize: 13,
                        fontFamily: "var(--font)",
                        color: "var(--text)",
                        boxSizing: "border-box",
                      }}
                    />
                </div>
              )}
            </>
          )}
        </NstpModal>
      </div>
    </>
  )
}