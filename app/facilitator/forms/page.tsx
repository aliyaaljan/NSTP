"use client"

import { useState, useRef, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  IconSearch,
  IconChevronDown,
  IconClipboardText,
  IconCircleCheck,
  IconClock,
  IconDownload,
  IconFilter,
  IconFolder,
  IconInbox,
  IconUpload,
  IconTrash,
  IconFile,
  IconPlus,
  IconX,
} from "@tabler/icons-react"
import { Sidebar, dashboardStyles, navRoutes } from "../facilitator"
import { signOutWithAudit } from "@/lib/auth-actions"
import { ChartStyles } from "@/components/shared/ChartModule"
import { createClient } from "@/lib/client"
import { NstpModal } from "@/components/shared/Modal"
import { useAdviserBroadcast } from "@/lib/hooks/broadcastListener"

import {
  getSubmissionsByForm,
  getFacilitatorSectionId,
  type SubmissionByFormEntry,
} from "@/lib/forms/submission-actions"

import {
  getRequirementsForSection,
  deleteSectionRequirement,
  uploadRequirementFromData,
  getTemplateDownloadUrl,
  type FormRequirement,
} from "@/lib/forms/requirement-actions"

// ── Types ──────────────────────────────────────────────────────────────
type FormTab = "repository" | "submissions"
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

function countByField<T>(
  items: T[],
  getField: (item: T) => string
): { type: string; count: number }[] {
  const counts: Record<string, number> = {}
  items.forEach((item) => {
    const key = getField(item)
    counts[key] = (counts[key] ?? 0) + 1
  })
  return sortFormTypes(Object.keys(counts)).map((type) => ({
    type,
    count: counts[type],
  }))
}

const formsStyles = `
  ${dashboardStyles}
  .fm-body { flex: 1; overflow: auto; padding-top: 16px; }
  .adv-table th:nth-child(1) { width: 28%; }
  .adv-table th:nth-child(2) { width: 12%; }
  .adv-table th:nth-child(3) { width: 24%; }
  .adv-table th:nth-child(4) { width: 18%; }
  .adv-table th:nth-child(5) { width: 18%; }
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
  .fm-repo-card-top { display: flex; align-items: flex-start; gap: 12px; }
  .fm-repo-icon { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: #F3E8FF; }
  .fm-repo-name { font-size: 13.5px; font-weight: 700; color: var(--text); line-height: 1.3; }
  .fm-repo-meta { font-size: 11.5px; color: var(--muted); margin-top: 3px; }
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
  .fm-clear-filter-btn {
    display: inline-flex; align-items: center; gap: 5px;
    background: none; border: 1.5px solid var(--maroon);
    color: var(--maroon); border-radius: 999px;
    padding: 8px 14px; font-size: 12.5px; font-weight: 700;
    font-family: var(--font); cursor: pointer; transition: background 0.13s;
  }
  .fm-clear-filter-btn:hover { background: #FEF2F2; }
  .fm-upload-zone {
    border: 2px dashed var(--border); border-radius: 12px;
    padding: 32px; text-align: center; cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }
  .fm-upload-zone:hover { border-color: var(--green); background: #F0FDF4; }
  .fm-upload-zone-text { font-size: 13px; color: var(--muted); margin-top: 8px; }
  .fm-upload-zone-sub  { font-size: 11.5px; color: var(--light); margin-top: 4px; }
`

export default function FormsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<FormTab>("repository")

  // Filters
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"All" | FormStatus>("All")
  const [typeFilter, setTypeFilter] = useState<string>("All")
  const [sectionFilter, setSectionFilter] = useState("All")

  // Dropdown toggles
  const [showStatusDrop, setShowStatusDrop] = useState(false)
  const [showTypeDrop, setShowTypeDrop] = useState(false)
  const [showSectionDrop, setShowSectionDrop] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [initials, setInitials] = useState("")
  const [sectionId, setSectionId] = useState<string | null>(null)

  // Data States
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [realEntries, setRealEntries] = useState<DisplayEntry[]>([])
  const [repoForms, setRepoForms] = useState<FormRequirement[]>([])
  const [isLoading, startTransition] = useTransition()

  // Upload Modal States
  const [showUpload, setShowUpload] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadTitle, setUploadTitle] = useState("Daily Time Record")
  const [customTitle, setCustomTitle] = useState("")
  const [uploadDescription, setUploadDescription] = useState("")
  const [uploadDueDate, setUploadDueDate] = useState("")
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      // Reset state
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

  const filteredForms = repoForms.filter(
    (f) =>
      !search ||
      f.title.toLowerCase().includes(search.toLowerCase()) ||
      (f.template_file_name &&
        f.template_file_name.toLowerCase().includes(search.toLowerCase()))
  )

  const filteredSubmissions = realEntries.filter((f) => {
    const q = search.trim().toLowerCase()
    const matchSearch =
      !q ||
      f.full_name.toLowerCase().includes(q) ||
      (f.student_number && f.student_number.includes(q))

    const dbStatusMap: Record<string, string> = {
      Submitted: "submitted",
      "Not Yet Submitted": "missing",
    }
    const mappedFilterStatus =
      statusFilter === "All" ? "All" : dbStatusMap[statusFilter]
    const matchStatus =
      statusFilter === "All" || f.status === mappedFilterStatus

    const matchType = typeFilter === "All" || f.type === typeFilter
    return matchSearch && matchStatus && matchType
  })

  const paginated = filteredSubmissions.slice(
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

  // Total count per form type — Submission Bin
  const submissionTypeCounts = countByField(realEntries, (e) => e.type)
  const typeFilterOptions = ["All", ...submissionTypeCounts.map((c) => c.type)]

  const submissionKpis = [
    {
      key: "All",
      label: "All Submissions",
      value: realEntries.length,
      Icon: IconInbox,
    },
    ...submissionTypeCounts.map(({ type, count }) => ({
      key: type,
      label: type,
      value: count,
      Icon: IconFile,
    })),
  ]

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
              <div className="profile-pill">
                <div className="profile-avatar">{initials || "A"}</div>
                <div>
                  <div className="profile-name">
                    {lastName ? `${lastName}, ${firstName}` : "Adviser"}
                  </div>
                </div>
              </div>
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
              <div className="page-tabs">
                <button
                  className={`page-tab${
                    activeTab === "repository" ? " page-tab-active" : ""
                  }`}
                  onClick={() => setActiveTab("repository")}
                >
                  <IconFolder size={16} stroke={1.75} /> Repository
                </button>
                <button
                  className={`page-tab${
                    activeTab === "submissions" ? " page-tab-active" : ""
                  }`}
                  onClick={() => setActiveTab("submissions")}
                >
                  <IconInbox size={16} stroke={1.75} /> Submission Bin
                </button>
              </div>

              {activeTab === "repository" && (
                <div className="fm-body">
                  <div className="adv-table-card">
                    <div className="adv-table-toolbar">
                      <div>
                        <div className="adv-table-title">All Forms</div>
                        <div className="adv-table-count">
                          {repoForms.length} NSTP Form
                          {repoForms.length !== 1 ? "s" : ""}
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
                        return (
                          <div
                            key={f.form_requirement_id}
                            className="fm-repo-card"
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
                              <div>
                                <div className="fm-repo-name">{f.title}</div>
                                <div className="fm-repo-meta">
                                  {f.template_file_name ||
                                    "No template attached"}
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
                                    onClick={() =>
                                      handleDownload(f.form_requirement_id)
                                    }
                                  >
                                    <IconDownload size={14} stroke={1.75} />
                                  </button>
                                )}
                                {f.section_id !== null && (
                                  <button
                                    className="fm-icon-btn danger"
                                    title="Delete"
                                    onClick={() =>
                                      handleDelete(f.form_requirement_id)
                                    }
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
              )}

              {activeTab === "submissions" && (
                <div className="fm-body">
                  <div className="stat-cards">
                    {submissionKpis.map(({ key, label, value, Icon }) => (
                      <button
                        key={key}
                        className={`db-kpi-card db-kpi-card--interactive${
                          typeFilter === key ? " fm-kpi-active" : ""
                        }`}
                        onClick={() => {
                          setTypeFilter(key)
                          setCurrentPage(1)
                        }}
                        aria-pressed={typeFilter === key}
                        aria-label={`${label}: ${value}`}
                      >
                        <div className="db-kpi-header">
                          <span className="db-kpi-label">{label}</span>
                        </div>
                        <div className="db-kpi-value">{value}</div>
                        <div className="db-kpi-deco">
                          <Icon size={110} stroke={1.2} />
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="adv-table-card">
                    <div className="adv-table-toolbar">
                      <div>
                        <div className="adv-table-title">All Submissions</div>
                        <div className="adv-table-count">
                          {filteredSubmissions.length} record(s) found
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
                            value={search}
                            onChange={(e) => {
                              setSearch(e.target.value)
                              setCurrentPage(1)
                            }}
                            placeholder="Search student..."
                          />
                        </div>

                        {/* Status filter */}
                        <div style={{ position: "relative" }}>
                          <button
                            className="adv-filter-btn"
                            onClick={() => {
                              setShowStatusDrop((v) => !v)
                              setShowTypeDrop(false)
                              setShowSectionDrop(false)
                            }}
                          >
                            <IconFilter size={13} stroke={2} />
                            {statusFilter === "All"
                              ? "All Status"
                              : statusFilter}
                            <IconChevronDown size={13} stroke={2} />
                          </button>
                          {showStatusDrop && (
                            <div
                              style={{
                                position: "absolute",
                                top: "calc(100% + 6px)",
                                right: 0,
                                background: "var(--white)",
                                border: "1px solid var(--border)",
                                borderRadius: 10,
                                boxShadow: "var(--shadow)",
                                zIndex: 50,
                                minWidth: 180,
                                overflow: "hidden",
                              }}
                            >
                              {(
                                [
                                  "All",
                                  "Submitted",
                                  "Not Yet Submitted",
                                ] as const
                              ).map((opt) => (
                                <button
                                  key={opt}
                                  onClick={() => {
                                    setStatusFilter(opt)
                                    setShowStatusDrop(false)
                                    setCurrentPage(1)
                                  }}
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "9px 16px",
                                    textAlign: "left",
                                    background:
                                      statusFilter === opt ? "#F9FAFB" : "none",
                                    border: "none",
                                    cursor: "pointer",
                                    fontSize: 13,
                                    fontFamily: "var(--font)",
                                    fontWeight:
                                      statusFilter === opt ? 700 : 400,
                                    color:
                                      statusFilter === opt
                                        ? "var(--maroon)"
                                        : "var(--text)",
                                  }}
                                >
                                  {opt === "All" ? "All Status" : opt}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Type filter */}
                        <div style={{ position: "relative" }}>
                          <button
                            className="adv-filter-btn"
                            onClick={() => {
                              setShowTypeDrop((v) => !v)
                              setShowStatusDrop(false)
                              setShowSectionDrop(false)
                            }}
                          >
                            <IconClipboardText size={13} stroke={2} />
                            {typeFilter === "All" ? "All Types" : typeFilter}
                            <IconChevronDown size={13} stroke={2} />
                          </button>
                          {showTypeDrop && (
                            <div
                              style={{
                                position: "absolute",
                                top: "calc(100% + 6px)",
                                right: 0,
                                background: "var(--white)",
                                border: "1px solid var(--border)",
                                borderRadius: 10,
                                boxShadow: "var(--shadow)",
                                zIndex: 50,
                                minWidth: 210,
                                overflow: "hidden",
                              }}
                            >
                              {typeFilterOptions.map((opt) => (
                                <button
                                  key={opt}
                                  onClick={() => {
                                    setTypeFilter(opt)
                                    setShowTypeDrop(false)
                                    setCurrentPage(1)
                                  }}
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "9px 16px",
                                    textAlign: "left",
                                    background:
                                      typeFilter === opt ? "#F9FAFB" : "none",
                                    border: "none",
                                    cursor: "pointer",
                                    fontSize: 13,
                                    fontFamily: "var(--font)",
                                    fontWeight: typeFilter === opt ? 700 : 400,
                                    color:
                                      typeFilter === opt
                                        ? "var(--maroon)"
                                        : "var(--text)",
                                  }}
                                >
                                  {opt === "All" ? "All Types" : opt}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {typeFilter !== "All" && (
                          <button
                            className="fm-clear-filter-btn"
                            onClick={() => {
                              setTypeFilter("All")
                              setCurrentPage(1)
                            }}
                          >
                            <IconX size={13} stroke={2} /> Clear Filter
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="adv-table-wrapper">
                      <table className="adv-table">
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Section</th>
                            <th>Form Type</th>
                            <th>Date Submitted</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSubmissions.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="adv-empty">
                                No forms match your search.
                              </td>
                            </tr>
                          ) : (
                            paginated.map((f, i) => {
                              const tc =
                                typeConfig[f.type] || typeConfig.default
                              const sc =
                                statusConfig[f.status] || statusConfig.missing
                              return (
                                <tr key={i}>
                                  <td>
                                    <div className="fm-student-name">
                                      {f.full_name}
                                    </div>
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
                                    NSTP-H
                                  </td>
                                  <td>
                                    <span
                                      className="adv-badge"
                                      style={{
                                        background: tc.bg,
                                        color: tc.color,
                                      }}
                                    >
                                      {f.type}
                                    </span>
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
                                    {f.submission ? (
                                      <a
                                        href={
                                          f.submission.storage_path.startsWith(
                                            "gdrive:"
                                          )
                                            ? f.submission.storage_path.replace(
                                                "gdrive:",
                                                ""
                                              )
                                            : f.submission.storage_path
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="fm-upload-btn"
                                        style={{
                                          padding: "4px 10px",
                                          fontSize: "11px",
                                          display: "inline-flex",
                                        }}
                                      >
                                        View in Drive
                                      </a>
                                    ) : (
                                      <span
                                        className="adv-badge"
                                        style={{
                                          background: sc.bg,
                                          color: sc.color,
                                        }}
                                      >
                                        Not Yet Submitted
                                      </span>
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
                      <div className="adv-pagination-info">
                        Page {currentPage} of {totalPages}
                      </div>
                      <div className="adv-pagination-controls">
                        <button
                          className="adv-page-btn"
                          disabled={currentPage === 1}
                          onClick={() =>
                            setCurrentPage((c) => Math.max(1, c - 1))
                          }
                        >
                          &#8249;
                        </button>
                        <button
                          className="adv-page-btn"
                          disabled={
                            currentPage === totalPages || totalPages === 0
                          }
                          onClick={() =>
                            setCurrentPage((c) => Math.min(totalPages, c + 1))
                          }
                        >
                          &#8250;
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
              variant: "secondary",
            },
            {
              label: isUploading ? "Uploading..." : "Upload",
              onClick: handleUploadSubmit,
              variant: "approve",
              disabled: isUploading || (!uploadFile && !uploadTitle),
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
                <div className="nstp-modal-label">Form Title</div>
                <input
                  type="text"
                  value={customTitle}
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
                  <>
                    <IconUpload size={28} stroke={1.5} color="var(--muted)" />
                    <div className="fm-upload-zone-text">
                      Click to browse or drag & drop
                    </div>
                    <div className="fm-upload-zone-sub">
                      PDF, DOCX up to 200 KB
                    </div>
                  </>
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
      </div>
    </>
  )
}
