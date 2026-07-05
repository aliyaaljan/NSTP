"use client"

import { useState, useEffect, useRef, useCallback, Suspense, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  IconSearch,
  IconChevronDown,
  IconUsers,
  IconCircleCheck,
  IconClock,
  IconAlertCircle,
  IconX,
  IconPaperclip,
  IconPencil,
} from "@tabler/icons-react"
import { Sidebar, dashboardStyles, navRoutes } from "../facilitator"
import { signOutWithAudit } from "@/lib/auth-actions"
import { ChartStyles } from "@/components/shared/ChartModule"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/client"
import { parse, format } from "date-fns"
import {
  getAdviserPendingRequests,
  resolveStudentRequest,
  transitionToUnderReview,
} from "@/lib/facilitator/appeal-actions"

// ── Data ──────────────────────────────────────────────────────────────
type Status = "Completed" | "In Progress" | "Not Started"
type studentClassification = "Freshman" | "Sophomore" | "Junior" | "Senior"

interface StudentSession {
  id: string
  date: string
  timeIn: string
  timeOut: string
  hours: number
}

interface Student {
  section_id: string
  section_name: string
  student_name: string
  student_number: string
  site_location: string
  program: string
  classification: string
  status: Status
  hours_logged: number
  total_hours: number
  sessions: StudentSession[]
}

interface Attachment {
  storage_path: string
  file_name: string
  content_type: string
  file_size_byte: number
}

interface PendingRequest {
  section_id: string
  section_name: string
  student_name: string
  student_number: string
  appeal_id: string
  appeal_type_id: string
  appeal_type_name: string
  date: string
  title: string
  note: string
  status: string
  statusCode: string
  attachment: Attachment[]
}

const statusConfig: Record<
  Status,
  { bg: string; color: string; label: string }
> = {
  Completed: { bg: "#D1FAE5", color: "#065F46", label: "Completed" },
  "In Progress": { bg: "#FEF3C7", color: "#92400E", label: "In Progress" },
  "Not Started": { bg: "#FEE2E2", color: "#991B1B", label: "Not Started" },
}

function progressColor(status: Status): string {
  if (status === "Completed") return "#059669"
  if (status === "In Progress") return "#D97706"
  return "#EF4444"
}

function formatDate(inputDate: string): string {
  const parsedDate = parse(inputDate, "MMM dd, yyyy", new Date())
  const outputDate = format(parsedDate, "yyyy-MM-dd")
  return outputDate
}

function to24HourFormat(time12: string): string {
  const match = time12.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return ""

  let [, hourStr, minuteStr, period] = match
  let hour = parseInt(hourStr, 10)

  if (period.toUpperCase() === "PM" && hour !== 12) hour += 12
  if (period.toUpperCase() === "AM" && hour === 12) hour = 0

  return `${String(hour).padStart(2, "0")}:${minuteStr}`
}

function to12HourFormat(time24: string): string {
  const [hourStr, minuteStr] = time24.split(":")
  let hour = parseInt(hourStr, 10)
  const period = hour >= 12 ? "PM" : "AM"

  if (hour === 0) hour = 12
  else if (hour > 12) hour -= 12

  return `${hour}:${minuteStr} ${period}`
}

type Tab = "list" | "pending"
type StatusFilter = "All Status" | Status
type classificationFilter = "All Classifications" | studentClassification

const myStudentsStyles = `
  ${dashboardStyles}

  /* ── My Students extras ── */
  .ms-body { flex: 1; overflow: auto; padding-top: 16px; }
  .adv-table th:nth-child(1) { width: 24%; }
  .adv-table th:nth-child(2) { width: 14%; }
  .adv-table th:nth-child(3) { width: 15%; }
  .adv-table th:nth-child(4) { width: 13%; }
  .adv-table th:nth-child(5) { width: 14%; }
  .adv-table th:nth-child(6) { width: 20%; }
  .ms-status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; min-width: 110px; text-align: center; }
  .ms-site-badge { display: inline-block; padding: 3px 0; font-size: 12px; font-weight: 500; color: var(--text); }
  .ms-hours-cell { min-width: 160px; }
  .ms-hours-label { display: flex; justify-content: space-between; font-size: 11.5px; color: var(--muted); margin-bottom: 4px; }
  .ms-hours-track { height: 11px; background: var(--border); border-radius: 999px; overflow: hidden; }
  .ms-hours-fill  { height: 100%; border-radius: 999px; transition: width 0.35s ease; }

  /* Pending Requests */
  .ms-requests-toolbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px; border-bottom: 1px solid var(--border);
  }
  .ms-requests-list { display: flex; flex-direction: column; }
  .ms-request-row {
    display: grid;
    grid-template-columns: 1.8fr 1.1fr 1fr 1fr 1.8fr 90px;
    align-items: center;
    gap: 12px;
    padding: 14px 20px;
    border-bottom: 1px solid #F3F4F6;
    cursor: pointer;
    transition: background 0.12s;
  }
  .ms-request-row:last-child { border-bottom: none; }
  .ms-request-row:hover { background: #FAFAFA; }
  .ms-request-student { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .ms-request-avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: #E5E7EB; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 11.5px; font-weight: 700; color: #4B5563;
  }
  .ms-request-name  { font-size: 13.5px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ms-request-meta  { font-size: 11.5px; color: var(--muted); margin-top: 1px; }
  .ms-request-type  { font-size: 11.5px; font-weight: 600; padding: 3px 10px; border-radius: 20px; white-space: nowrap; display: inline-block; }
  .ms-request-date  { font-size: 12px; color: var(--muted); white-space: nowrap; }
  .ms-request-note  { font-size: 12px; color: var(--muted); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .ms-attachment-tag { display: flex; align-items: center; justify-content: center; gap: 4px; font-size: 11.5px; color: var(--muted); }

  .ms-requests-thead {
    display: grid;
    grid-template-columns: 1.8fr 1.1fr 1fr 1fr 1.8fr 90px;
    gap: 12px;
    padding: 10px 20px;
    background: #F9FAFB;
    border-bottom: 1px solid var(--border);
  }
  .ms-requests-thead span {
    font-size: 11px; font-weight: 700; color: var(--maroon);
    letter-spacing: 0.8px; text-transform: uppercase;
  }
  .ms-requests-thead span:last-child { text-align: center; }

  /* Request modal */
  .ms-req-modal-section { margin-bottom: 2px; }
  .ms-req-modal-note {
    font-size: 13px; color: var(--text); line-height: 1.6;
    background: #F9FAFB; border-radius: 10px; padding: 12px 14px;
    margin-top: 4px;
  }
  .ms-req-modal-attachment {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; color: var(--maroon); font-weight: 600;
    background: #FEF2F2; border-radius: 10px; padding: 10px 14px;
    margin-top: 4px; cursor: pointer;
  }

  /* Modal */
  .ms-modal-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.4);
    backdrop-filter: blur(4px); z-index: 100;
    display: flex; align-items: center; justify-content: center;
  }
  .ms-modal {
    background: var(--white); border-radius: 20px;
    width: 440px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden;
  }
  .ms-modal-wide { width: 900px; }
  .ms-modal-flex { display: flex; }
  .ms-modal-left { flex: 1; min-width: 0; padding: 22px; display: flex; flex-direction: column; gap: 14px; }
  .ms-modal-right { width: 420px; flex-shrink: 0; border-left: 1px solid var(--border); padding: 22px; display: flex; flex-direction: column; gap: 10px; }
  .ms-modal-right-title { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.6px; }
  .ms-session-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .ms-session-table th:nth-child(1) { width: 28%; }
  .ms-session-table th:nth-child(2) { width: 21%; }
  .ms-session-table th:nth-child(3) { width: 21%; }
  .ms-session-table th:nth-child(4) { width: 17%; }
  .ms-session-table th:nth-child(5) { width: 17%; }
  .ms-session-table { width: 100%; border-collapse: collapse; }
  .ms-session-table thead { position: sticky; top: 0; background: var(--white); text-align: left; font-size: 10px; font-weight: 700; color: var(--muted); letter-spacing: 0.6px; text-transform: uppercase; padding: 0 8px 6px; border-bottom: 1px solid var(--border);}
  .ms-session-table th { position: sticky; top: 0; background: var(--white); text-align: left; font-size: 10px; font-weight: 700; color: var(--muted); letter-spacing: 0.6px; text-transform: uppercase; padding: 6px 8px; border-bottom: 1px solid var(--border);}
  .ms-session-table td { font-size: 12px; color: var(--text); padding: 8px; border-bottom: 1px solid #F3F4F6; }
  .ms-session-table tbody tr:last-child td { border-bottom: none; }
  .ms-session-action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 100%;
    background: var(--white);
    color: var(--muted);
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
  }
  .ms-session-action-btn:hover {
    background: #F9FAFB;
    color: var(--maroon);
  }
  .ms-session-empty { font-size: 12.5px; color: var(--muted); padding: 12px 0; }
  .ms-modal-header {
    background: var(--green);
    padding: 20px 22px;
    display: flex; align-items: center; justify-content: space-between; gap: 14px;
  }
  .ms-modal-avatar {
    width: 48px; height: 48px; border-radius: 50%;
    background: rgba(255,255,255,0.15); flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; font-weight: 700; color: #fff;
  }
  .ms-modal-header-info { flex: 1; min-width: 0; }
  .ms-modal-title  { font-weight: 700; font-size: 17px; color: #fff; }
  .ms-modal-subtitle { font-size: 12px; color: rgba(255,255,255,0.75); margin-top: 2px; }
  .ms-modal-close  {
    background: none; border: none; cursor: pointer; color: #fff;
    display: flex; align-items: center; padding: 4px;
    border-radius: 6px; transition: background 0.12s; flex-shrink: 0;
  }
  .ms-modal-close:hover { background: rgba(255,255,255,0.15); }
  .ms-modal-body   { padding: 22px; display: flex; flex-direction: column; gap: 14px; }
  .ms-modal-row    { display: flex; gap: 12px; }
  .ms-modal-field  { flex: 1; }
  .ms-modal-label  { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 4px; }
  .ms-modal-value  { font-size: 14px; font-weight: 600; color: var(--text); }
  .ms-modal-progress { margin-top: 4px; }

  .ms-edit-input {
    width: 100%;
    border: 1.5px solid var(--border);
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 13px;
    font-family: var(--font);
    color: var(--text);
    outline: none;
    transition: border-color 0.13s;
  }
  .ms-edit-input:focus { border-color: var(--maroon); }

  .ms-edit-cancel-btn {
    padding: 8px 16px;
    border: 1.5px solid var(--border);
    border-radius: 8px;
    background: var(--white);
    font-size: 13px;
    font-weight: 600;
    font-family: var(--font);
    color: var(--text);
    cursor: pointer;
  }
  .ms-edit-cancel-btn:hover { background: #F9FAFB; }

  .ms-edit-save-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    background: var(--green);
    font-size: 13px;
    font-weight: 600;
    font-family: var(--font);
    color: #fff;
    cursor: pointer;
  }
  .ms-edit-save-btn:hover { opacity: 0.9; }
`

function AnimatedBar({ pct, color }: { pct: number; color: string }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = requestAnimationFrame(() => setWidth(pct))
    return () => cancelAnimationFrame(t)
  }, [pct])
  return (
    <div className="ms-hours-track">
      <div
        className="ms-hours-fill"
        style={{ width: `${width}%`, background: color, transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)" }}
      />
    </div>
  )
}

function MyStudentsContent() {
  const router = useRouter()
  const supabase = createClient()
  const searchParams = useSearchParams()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>("list")
  const [headerSearch, setHeaderSearch] = useState("")
  const [tableSearch, setTableSearch] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [pendingSearch, setPendingSearch] = useState("")
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null)
  const [requestType, setRequestTypes] = useState<{ appeal_type_id: string; name: string }[]>([])
  const [requestTypeFilter, setRequestTypeFilter] = useState<string>("All Types")
  const [showTypeFilter, setShowTypeFilter] = useState(false)
  const [requestStatusFilter, setRequestStatusFilter] = useState<string>("All Status")
  const [showRequestStatusFilter, setShowRequestStatusFilter] = useState(false)

  // ── Pending unified filter ─────────────────────────────────────────
  type PendingFilterField = "appeal_type_name" | "status" | "section_name"
  type PendingActiveFilters = Partial<Record<PendingFilterField, string[]>>
  const [pendingActiveFilters, setPendingActiveFilters] = useState<PendingActiveFilters>({})
  const [showPendingFilterPanel, setShowPendingFilterPanel] = useState(false)
  const pendingFilterPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showPendingFilterPanel) return
    function handleClickOutside(e: MouseEvent) {
      if (pendingFilterPanelRef.current && !pendingFilterPanelRef.current.contains(e.target as Node)) {
        setShowPendingFilterPanel(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showPendingFilterPanel])

  function togglePendingFilter(field: PendingFilterField, value: string) {
    setPendingActiveFilters(prev => {
      const current = prev[field] ?? []
      const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
      const next = { ...prev }
      if (updated.length === 0) delete next[field]
      else next[field] = updated
      return next
    })
    setPendingPage(1)
  }

  const [pendingPage, setPendingPage] = useState(1)
  const [pendingPageSize, setPendingPageSize] = useState(5)

  const pendingFilterGroups: { label: string; field: PendingFilterField; values: () => string[] }[] = [
    { label: "Type",    field: "appeal_type_name", values: () => requestType.map(t => t.name) },
    { label: "Status",  field: "status",            values: () => ["Open", "Under Review", "Approved", "Rejected"] },
    { label: "Section", field: "section_name",      values: () => [...new Set(pendingRequests.map(r => r.section_name).filter(Boolean))].sort() },
  ]

  // ── Unified filter system ──────────────────────────────────────────
  type FilterField = "status" | "classification" | "site_location" | "section" | "program"
  type ActiveFilters = Partial<Record<FilterField, string[]>>
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({})
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const filterPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showFilterPanel) return
    function handleClickOutside(e: MouseEvent) {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) {
        setShowFilterPanel(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showFilterPanel])

  const filterGroups: { label: string; field: FilterField; values: () => string[] }[] = [
    { label: "Status",         field: "status",         values: () => ["Completed", "In Progress", "Not Started"] },
    { label: "Classification", field: "classification", values: () => ["Freshman", "Sophomore", "Junior", "Senior"] },
    { label: "Section",        field: "section",        values: () => [...new Set(students.map(s => s.section_name).filter(Boolean))].sort() },
    { label: "Site Location",  field: "site_location",  values: () => [...new Set(students.map(s => s.site_location).filter(Boolean))].sort() },
    { label: "Program",        field: "program",        values: () => [...new Set(students.map(s => s.program).filter(Boolean))].sort() },
  ]

  function toggleFilter(field: FilterField, value: string) {
    setActiveFilters(prev => {
      const current = prev[field] ?? []
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value]
      const next = { ...prev }
      if (updated.length === 0) delete next[field]
      else next[field] = updated
      return next
    })
    setCurrentPage(1)
  }

  function clearAllFilters() {
    setActiveFilters({})
    setHeaderSearch("")
    setTableSearch("")
    setCurrentPage(1)
  }

  const totalActiveFilters = Object.values(activeFilters).reduce((sum, arr) => sum + (arr?.length ?? 0), 0)

  const statusOptions: StatusFilter[] = ["All Status", "Completed", "In Progress", "Not Started"]

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab === "pending" || tab === "list") {
      setActiveTab(tab)
    }

    const status = searchParams.get("status")
    if (status && (["Completed", "In Progress", "Not Started"] as string[]).includes(status)) {
      setActiveFilters({ status: [status] })
      setCurrentPage(1)
    }
  }, [searchParams])

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [initials, setInitials] = useState("")
  const [sections, setSections] = useState<{ id: string; name: string }[]>([])
  const [selectedSection, setSelectedSection] = useState("All Sections")
  const [sectionDropdownOpen, setSectionDropdownOpen] = useState(false)
  const [statData, setStatData] = useState<
    {
      section_id: string
      section_name: string
      total: number
      completed: number
      in_progress: number
      pending_request: number
    }[]
  >([])
  const [students, setStudents] = useState<Student[]>([])
  const [animKey, setAnimKey] = useState(0)
  const [sectionKey, setSectionKey] = useState(0)
  const [editingSession, setEditingSession] = useState<StudentSession | null>(
    null
  )
  const [editDate, setEditDate] = useState("")
  const [editTimeIn, setEditTimeIn] = useState("")
  const [editTimeOut, setEditTimeOut] = useState("")
  const [isPending, startTransition] = useTransition()
  const [resolutionNote, setResolutionNote] = useState("")

  // fetch student requests from database
  const refreshRequests = async () => {
    const res = await getAdviserPendingRequests()
    if (res.ok) setPendingRequests(res.data)
  }

  // trigger fetch on mount
  useEffect(() => {
    refreshRequests()
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      // Get first name & last name
      const full: string = user?.user_metadata?.full_name ?? ""
      const parts = full.trim().split(" ")
      const fName = parts[0] ?? ""
      const lName = parts.at(-1) ?? ""
      setFirstName(fName)
      setLastName(lName)
      setInitials((fName[0] ?? "") + (lName[0] ?? ""))

      const { data: requestTypeData } = await supabase
        .from("appeal_type")
        .select(`appeal_type_id, name`)
        .order("name")
      if (requestTypeData) setRequestTypes(requestTypeData)

      const [
        { data: statData, error: statError },
        { data: sectionData, error: sectionError },
        { data: semData, error: semError },
        { data: studentsData, error: studentsError },
      ] = await Promise.all([
        supabase.rpc("get_students_stats", { p_adviser_user_id: user?.id }),
        supabase.rpc("get_sections", { p_adviser_user_id: user?.id }),
        supabase.rpc("get_active_sem", { p_adviser_user_id: user?.id }),
        supabase.rpc("get_my_students", { p_adviser_user_id: user?.id }),
      ])

      if (statError)
        console.error(
          "get_students_stats error:",
          statError.message,
          statError.details
        )
      if (statData) setStatData(statData)

      if (sectionError)
        console.error(
          "get_sections error:",
          sectionError.message,
          sectionError.details
        )
      if (sectionData && statData) {
        const mappedSection = statData.map(
          (r: { section_id: string | null; section_name: string }) => ({
            id: r.section_id ?? "all",
            name: r.section_name,
          })
        )
        const sortedSection = [...mappedSection].sort((a, b) => {
          if (a.name === "All Sections") return -1
          if (b.name === "All Sections") return 1
          return a.name.localeCompare(b.name)
        })
        setSections(sortedSection)
      }

      if (semError)
        console.error(
          "get_active_sem error:",
          semError.message,
          semError.details
        )

      if (studentsError)
        console.error(
          "get_my_students error:",
          studentsError.message,
          studentsError.details
        )
      if (studentsData) setStudents(studentsData)
    })
  }, [])

  const currentData = statData.find((r) => r.section_name === selectedSection)
  if (!currentData) return null

  // const currentSemData = selectedSection === "All Sections" ? activeSemData.slice().sort((a, b) => new Date(a.sem_end_date).getTime() - new Date(b.sem_end_date).getTime())[0] : activeSemData.find((r) => r.section_name === selectedSection)

  function getPublicUrl(path: string) {
    const { data } = supabase.storage
      .from("request attachments")
      .getPublicUrl(path)
    return data.publicUrl
  }

  function buildStatCards() {
    return [
      {
        label: "Total Students",
        value: currentData?.total,
        Icon: IconUsers,
        onClick: () => {
          setActiveTab("list")
          clearListFilters()
        },
      },
      {
        label: "Completed",
        value: currentData?.completed,
        Icon: IconCircleCheck,
        onClick: () => {
          setActiveTab("list")
          clearListFilters()
          setActiveFilters({ status: ["Completed"] })
        },
      },
      {
        label: "In Progress",
        value: currentData?.in_progress,
        Icon: IconClock,
        onClick: () => {
          setActiveTab("list")
          clearListFilters()
          setActiveFilters({ status: ["In Progress"] })
        },
      },
      {
        label: "Pending Requests",
        value: currentData?.pending_request,
        Icon: IconAlertCircle,
        onClick: () => {
          setActiveTab("pending")
          clearPendingFilters()
        },
      },
    ]
  }

  const filtered = students.filter((s) => {
    const q = (headerSearch || tableSearch).trim().toLowerCase()
    const matchSearch = q === "" ||
      (s.student_name ?? "").toLowerCase().includes(q) ||
      (s.student_number ?? "").includes(q)
    const matchFilters = (Object.entries(activeFilters) as [FilterField, string[]][]).every(([field, values]) => {
      if (!values || values.length === 0) return true
      if (field === "status")         return values.includes(s.status)
      if (field === "classification") return values.includes(s.classification)
      if (field === "site_location")  return values.includes(s.site_location)
      if (field === "section")        return values.includes(s.section_name)
      if (field === "program")        return values.includes(s.program)
      return true
    })
    return matchSearch && matchFilters
  })

  const filteredPending = pendingRequests.filter((r) => {
    const matchSearch = pendingSearch.trim() === "" ||
      r.student_name.toLowerCase().includes(pendingSearch.toLowerCase())
    const matchFilters = (Object.entries(pendingActiveFilters) as [PendingFilterField, string[]][]).every(([field, values]) => {
      if (!values || values.length === 0) return true
      return values.includes(r[field] as string)
    })
    return matchSearch && matchFilters
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const totalPendingPages = Math.max(1, Math.ceil(filteredPending.length / pendingPageSize))
  const paginatedPending = filteredPending.slice((pendingPage - 1) * pendingPageSize, pendingPage * pendingPageSize)

  const statCards = buildStatCards()

  const hasListFilters = headerSearch.trim() !== "" || tableSearch.trim() !== "" || totalActiveFilters > 0

  const totalPendingActiveFilters = Object.values(pendingActiveFilters).reduce((sum, arr) => sum + (arr?.length ?? 0), 0)

  const hasPendingFilters = pendingSearch.trim() !== "" || totalPendingActiveFilters > 0

  function clearListFilters() {
    clearAllFilters()
    router.replace(`${navRoutes["My Students"]}`)
  }

  function clearPendingFilters() {
    setPendingSearch("")
    setPendingActiveFilters({})
    router.replace(`${navRoutes["My Students"]}`)
  }

  async function handleSaveSession() {
    if (!editingSession || !selectedStudent) return

    const updatedSession: StudentSession = {
      ...editingSession,
      date: editDate,
      timeIn: to12HourFormat(editTimeIn),
      timeOut: to12HourFormat(editTimeOut),
    }

    const updatedSessions = selectedStudent.sessions.map((s) =>
      s.id === editingSession.id ? updatedSession : s
    )

    const updatedStudent = { ...selectedStudent, sessions: updatedSessions }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.rpc("update_attendance_session", {
      p_attendance_session_id: editingSession.id,
      p_adviser_user_id: user?.id,
      p_session_date: editDate,
      p_time_in: editTimeIn,
      p_time_out: editTimeOut,
    })

    if (error) {
      console.error(
        "update_attendance_session error:",
        error.message,
        error.details
      )
      return
    }

    setSelectedStudent(updatedStudent)
    setStudents((prev) =>
      prev.map((s) =>
        s.section_id === updatedStudent.section_id &&
        s.student_number === updatedStudent.student_number
          ? updatedStudent
          : s
      )
    )

    setEditingSession(null)
    router.refresh()
  }

  async function handleSignOut() {
    await signOutWithAudit()
    router.push("/")
    router.refresh()
  }

  function requestTypeStyle(type: string): { bg: string; color: string } {
    const map: Record<string, { bg: string; color: string }> = {
      "Excused Absence": { bg: "#FEF3C7", color: "#92400E" },
      "Hour Adjustment": { bg: "#DBEAFE", color: "#1E40AF" },
      "Form Submission": { bg: "#FCE7F3", color: "#9D174D" },
      Others: { bg: "#F3F4F6", color: "#374151" },
    }
    return map[type] ?? { bg: "#F3F4F6", color: "#374151" }
  }

  return (
    <>
      <style>{myStudentsStyles}</style>
      <ChartStyles />

      <div className="db-root">
        <Sidebar
          open={sidebarOpen}
          activeNav="My Students"
          onToggle={() => {
            setSidebarOpen((o) => !o)
            setShowFilterPanel(false)
            setShowTypeFilter(false)
          }}
          onNavClick={(label) => {
            setSidebarOpen(false)
            router.push(navRoutes[label])
          }}
          onSignOut={handleSignOut}
        />

        {sidebarOpen && (
          <div
            className="sb-overlay"
            onClick={() => {
              setSidebarOpen(false)
              setShowFilterPanel(false)
              setShowTypeFilter(false)
            }}
            aria-hidden="true"
          />
        )}

        <div className="main-wrapper">
          <main className="main">
            {/* Header */}
            <header className="header">
              <h1 className="header-greeting">My Students</h1>
              <div className="profile-pill">
                <div className="profile-avatar">{initials}</div>
                <div>
                  <div className="profile-name">
                    {lastName}, {firstName}
                  </div>
                </div>
              </div>
            </header>

            <div className="body">
            {/* Sections filter */}
            <div className="overview-header">
              <div className="overview-label">Class Overview</div>
              <div style={{ position: "relative" }} onMouseLeave={() => setSectionDropdownOpen(false)}>
                <button
                  className="sections-btn"
                  onClick={() => setSectionDropdownOpen((o) => !o)}
                >
                  {selectedSection} <IconChevronDown size={13} stroke={2} />
                </button>

                {sectionDropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      paddingTop: 6,
                      zIndex: 10,
                    }}
                  >
                    <div
                      style={{
                        background: "var(--white)",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        boxShadow: "var(--shadow)",
                        minWidth: 160,
                        overflow: "hidden",
                      }}
                    >
                      {sections.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            setSelectedSection(s.name)
                            setSectionDropdownOpen(false)
                            setCurrentPage(1)
                            setAnimKey((k) => k + 1)
                            setSectionKey((k) => k + 1)
                          }}
                          className={`block w-full px-4 py-2.25 text-left text-[13px] cursor-pointer border-none font-sans hover:bg-green/30 ${
                            s.name === selectedSection
                              ? "font-semibold bg-green text-white"
                              : "font-normal text-text"
                          }`}
                        >
                          {s.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stat cards */}
            <div className="stat-cards">
              {statCards.map(({ label, value, Icon, onClick }) => (
                <button key={label} className="db-kpi-card db-kpi-card--interactive" onClick={onClick} aria-label={`${label}: ${value}`}>
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

            {/* Tabs */}
            <div className="page-tabs">
              <button
                className={`page-tab${
                  activeTab === "list" ? " page-tab-active" : ""
                }`}
                onClick={() => setActiveTab("list")}
              >
                <IconUsers size={16} stroke={1.75} />
                List of Students
              </button>
              <button
                className={`page-tab${
                  activeTab === "pending" ? " page-tab-active" : ""
                }`}
                onClick={() => setActiveTab("pending")}
              >
                <IconAlertCircle size={16} stroke={1.75} />
                Pending Requests
              </button>
            </div>

            {/* Body */}
            <div className="ms-body">
              {activeTab === "list" ? (
                <div className="adv-table-card">
                  <div className="adv-table-toolbar">
                    <div>
                      <div className="adv-table-title">All Students</div>
                      <div className="adv-table-count">
                        {filtered.length} student
                        {filtered.length !== 1 ? "s" : ""} found
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: "auto" }}>
                      <div className="adv-search-bar">
                        <IconSearch size={16} stroke={1.75} color="var(--muted)" />
                        <input
                          className="adv-search-input"
                          value={tableSearch}
                          onChange={(e) => { setTableSearch(e.target.value); setHeaderSearch(""); setCurrentPage(1) }}
                          placeholder="Search..."
                        />
                      </div>

                      {/* Filter Button */}
                      <div ref={filterPanelRef} style={{ position: "relative" }}>
                        <button
                          className="adv-filter-btn"
                          onClick={() => setShowFilterPanel(v => !v)}
                          style={{
                            border: `1.5px solid ${totalActiveFilters > 0 ? "var(--maroon)" : "var(--green)"}`,
                            color: totalActiveFilters > 0 ? "var(--maroon)" : "var(--green)",
                            borderRadius: 999,
                            padding: "8px 18px",
                            fontSize: 13.5,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <IconChevronDown size={16} stroke={2} />
                          Filter
                          {totalActiveFilters > 0 && (
                            <span style={{ background: "var(--maroon)", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", marginLeft: 4 }}>
                              {totalActiveFilters}
                            </span>
                          )}
                        </button>

                        {showFilterPanel && (
                          <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "var(--white)", border: "1px solid var(--border)", borderRadius: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, padding: 16 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Filters</span>
                              {totalActiveFilters > 0 && (
                                <button onClick={() => { setActiveFilters({}); setCurrentPage(1) }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11.5, color: "var(--maroon)", fontWeight: 600, fontFamily: "var(--font)", padding: 0 }}>
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
                                  <div key={field} style={{ minWidth: 130 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                      {opts.map(v => (
                                        <label key={v} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--text)", fontFamily: "var(--font)" }}>
                                          <input
                                            type="checkbox"
                                            checked={checked.includes(v)}
                                            onChange={() => toggleFilter(field, v)}
                                            style={{ accentColor: "var(--maroon)", width: 14, height: 14, cursor: "pointer", flexShrink: 0 }}
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

                      {hasListFilters && (
                        <button className="adv-filter-btn" onClick={clearListFilters} style={{ color: "var(--maroon)", borderColor: "var(--maroon)" }}>
                          <IconX size={13} stroke={2} /> Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="adv-table-wrapper">
                    <table className="adv-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Site Location</th>
                          <th>Program</th>
                          <th>Classification</th>
                          <th>Status</th>
                          <th>Hours Logged</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="adv-empty">
                              No students match your search.
                            </td>
                          </tr>
                        ) : (
                          paginated.map((s) => {
                            const pct = Math.round(
                              (s.hours_logged / s.total_hours) * 100
                            )
                            const cfg = statusConfig[s.status]
                            const initials = s.student_name
                              ?.split(" ")
                              .slice(0, 2)
                              .map((w: string) => w[0])
                              .join("")
                              .toUpperCase()
                            return (
                              <tr
                                key={`${s.section_id}-${s.student_number}`}
                                onClick={() => setSelectedStudent(s)}
                              >
                                <td>
                                  {/* <div className="ms-student-name">{s.student_name}</div>
                                  <div className="ms-student-no">{s.student_number}</div> */}
                                  <div className="ms-request-student">
                                    <div className="ms-request-avatar">
                                      {initials}
                                    </div>
                                    <div>
                                      <div className="ms-request-name">
                                        {s.student_name}
                                      </div>
                                      <div className="ms-request-meta">
                                        {s.student_number} · {s.section_name}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span className="ms-site-badge">
                                    {s.site_location}
                                  </span>
                                </td>
                                <td>
                                  <span className="ms-site-badge">
                                    {s.program}
                                  </span>
                                </td>
                                <td>
                                  <span className="ms-site-badge">
                                    {s.classification}
                                  </span>
                                </td>
                                <td>
                                  <span
                                    className="ms-status-badge"
                                    style={{
                                      background: cfg.bg,
                                      color: cfg.color,
                                    }}
                                  >
                                    {cfg.label}
                                  </span>
                                </td>
                                <td className="ms-hours-cell">
                                  <div className="ms-hours-label">
                                    <span>{s.hours_logged}/{s.total_hours} hrs</span>
                                    <span>{pct}%</span>
                                  </div>
                                  <AnimatedBar pct={pct} color={progressColor(s.status)} />
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="adv-pagination">
                    <div className="adv-pagination-info">
                      Showing{" "}
                      {filtered.length === 0
                        ? 0
                        : (currentPage - 1) * pageSize + 1}
                      –{Math.min(currentPage * pageSize, filtered.length)} of{" "}
                      {filtered.length} students
                    </div>
                    <div className="adv-pagination-controls">
                      <button
                        className="adv-page-btn adv-page-btn-nav"
                        disabled={currentPage === 1}
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        aria-label="Previous page"
                      >
                        &#8249;
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (p) => (
                          <button
                            key={p}
                            className={`adv-page-btn${
                              p === currentPage ? " adv-page-btn-active" : ""
                            }`}
                            onClick={() => setCurrentPage(p)}
                          >
                            {p}
                          </button>
                        )
                      )}
                      <button
                        className="adv-page-btn adv-page-btn-nav"
                        disabled={currentPage === totalPages}
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        aria-label="Next page"
                      >
                        &#8250;
                      </button>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
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
                          borderRadius: 8,
                          padding: "4px 8px",
                          fontSize: 12.5,
                          fontFamily: "var(--font)",
                          color: "var(--text)",
                          background: "var(--white)",
                          cursor: "pointer",
                          outline: "none",
                        }}
                      >
                        {[5, 10, 20, 50].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="adv-table-card">
                  <div className="adv-table-toolbar">
                    <div>
                      <div className="adv-table-title">Request History</div>
                      <div className="adv-table-count">
                        {filteredPending.length} request
                        {filteredPending.length !== 1 ? "s" : ""} found
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: "auto" }}>
                      {/* Search bar */}
                      <div className="adv-search-bar">
                        <IconSearch size={16} stroke={1.75} color="var(--muted)" />
                        <input
                          className="adv-search-input"
                          value={pendingSearch}
                          onChange={(e) => { setPendingSearch(e.target.value); setPendingPage(1) }}
                          placeholder="Search student name..."
                        />
                      </div>

                      {/* Unified Filter Button */}
                      <div ref={pendingFilterPanelRef} style={{ position: "relative" }}>
                        <button
                          className="adv-filter-btn"
                          onClick={() => setShowPendingFilterPanel(v => !v)}
                          style={{
                            border: `1.5px solid ${totalPendingActiveFilters > 0 ? "var(--maroon)" : "var(--green)"}`,
                            color: totalPendingActiveFilters > 0 ? "var(--maroon)" : "var(--green)",
                            borderRadius: 999,
                            padding: "8px 18px",
                            fontSize: 13.5,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <IconChevronDown size={16} stroke={2} />
                          Filter
                          {totalPendingActiveFilters > 0 && (
                            <span style={{ background: "var(--maroon)", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", marginLeft: 4 }}>
                              {totalPendingActiveFilters}
                            </span>
                          )}
                        </button>

                        {showPendingFilterPanel && (
                          <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "var(--white)", border: "1px solid var(--border)", borderRadius: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, padding: 16 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Filters</span>
                              {totalPendingActiveFilters > 0 && (
                                <button onClick={() => { setPendingActiveFilters({}); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11.5, color: "var(--maroon)", fontWeight: 600, fontFamily: "var(--font)", padding: 0 }}>
                                  Clear all
                                </button>
                              )}
                            </div>
                            <div style={{ display: "flex", gap: 24 }}>
                              {pendingFilterGroups.map(({ label, field, values }) => {
                                const opts = values()
                                if (opts.length === 0) return null
                                const checked = pendingActiveFilters[field] ?? []
                                return (
                                  <div key={field} style={{ minWidth: 130 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                      {opts.map(v => (
                                        <label key={v} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--text)", fontFamily: "var(--font)" }}>
                                          <input
                                            type="checkbox"
                                            checked={checked.includes(v)}
                                            onChange={() => togglePendingFilter(field, v)}
                                            style={{ accentColor: "var(--maroon)", width: 14, height: 14, cursor: "pointer", flexShrink: 0 }}
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

                      {hasPendingFilters && (
                        <button className="adv-filter-btn" onClick={clearPendingFilters} style={{ color: "var(--maroon)", borderColor: "var(--maroon)" }}>
                          <IconX size={13} stroke={2} /> Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {filteredPending.length === 0 ? (
                    <div className="adv-empty">
                      No requests found for this filter.
                    </div>
                  ) : (
                    <>
                      <div className="ms-requests-thead">
                        <span>Student</span>
                        <span>Type</span>
                        <span>Status</span>
                        <span>Date</span>
                        <span>Details</span>
                        <span>Attachment</span>
                      </div>
                      <div className="ms-requests-list">
                        {paginatedPending.map((r, i) => {
                          const typeStyle = requestTypeStyle(r.appeal_type_name)
                          const initials = r.student_name
                            ?.split(" ")
                            .slice(0, 2)
                            .map((w: string) => w[0])
                            .join("")
                            .toUpperCase()

                          // Define clean history badges
                          const getStatusBadge = (status: string) => {
                            if (status === "Approved")
                              return { bg: "#D1FAE5", color: "#065F46" }
                            if (status === "Rejected")
                              return { bg: "#FEE2E2", color: "#991B1B" }
                            if (status === "Under Review")
                              return { bg: "#FEF3C7", color: "#92400E" }
                            return { bg: "#F3F4F6", color: "#374151" } // Open
                          }
                          const badge = getStatusBadge(r.status)

                          return (
                            <div
                              key={r.appeal_id || i}
                              className="ms-request-row"
                              onClick={() => {
                                setSelectedRequest(r)

                                if (
                                  r.status === "Open" ||
                                  r.statusCode === "open"
                                ) {
                                  setPendingRequests((prev) =>
                                    prev.map((req) =>
                                      req.appeal_id === r.appeal_id
                                        ? {
                                            ...req,
                                            status: "Under Review",
                                            statusCode: "under_review",
                                          }
                                        : req
                                    )
                                  )
                                }

                                startTransition(async () => {
                                  const res = await transitionToUnderReview(
                                    r.appeal_id
                                  )
                                  if (res.ok) {
                                    router.refresh()
                                  } else {
                                    console.error(
                                      "Failed to advance request status:",
                                      res.error
                                    )
                                  }
                                })
                              }}
                            >
                              <div className="ms-request-student">
                                <div className="ms-request-avatar">
                                  {initials}
                                </div>
                                <div>
                                  <div className="ms-request-name">
                                    {r.student_name}
                                  </div>
                                  <div className="ms-request-meta">
                                    {r.student_number} · {r.section_name}
                                  </div>
                                </div>
                              </div>
                              <div>
                                <span
                                  className="ms-request-type"
                                  style={{
                                    background: typeStyle.bg,
                                    color: typeStyle.color,
                                  }}
                                >
                                  {r.appeal_type_name}
                                </span>
                              </div>
                              <div>
                                <span
                                  className="ms-request-type"
                                  style={{
                                    background: badge.bg,
                                    color: badge.color,
                                    borderRadius: "6px",
                                  }}
                                >
                                  {r.status}
                                </span>
                              </div>
                              <div className="ms-request-date">{r.date}</div>

                              {/* Separated Title and Note - No Triple Pipes! */}
                              <div>
                                <div
                                  className="ms-request-name"
                                  style={{ fontSize: "13px" }}
                                >
                                  {r.title}
                                </div>
                                <div
                                  className="ms-request-note"
                                  style={{ marginTop: "2px" }}
                                >
                                  {r.note}
                                </div>
                              </div>

                              <div className="ms-attachment-tag">
                                {r.attachment?.length > 0 ? (
                                  <>
                                    <IconPaperclip size={13} stroke={1.75} />
                                    {r.attachment.length} file
                                    {r.attachment.length !== 1 ? "s" : ""}
                                  </>
                                ) : (
                                  <span style={{ opacity: 0.35 }}>—</span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      {/* Pagination */}
                      <div className="adv-pagination">
                        <div className="adv-pagination-info">
                          Showing {filteredPending.length === 0 ? 0 : (pendingPage - 1) * pendingPageSize + 1}–{Math.min(pendingPage * pendingPageSize, filteredPending.length)} of {filteredPending.length}
                        </div>
                        <div className="adv-pagination-controls">
                          <button className="adv-page-btn adv-page-btn-nav" disabled={pendingPage === 1} onClick={() => setPendingPage(p => Math.max(1, p - 1))}>&#8249;</button>
                          {Array.from({ length: totalPendingPages }, (_, i) => i + 1).map(p => (
                            <button key={p} className={`adv-page-btn${p === pendingPage ? " adv-page-btn-active" : ""}`} onClick={() => setPendingPage(p)}>{p}</button>
                          ))}
                          <button className="adv-page-btn adv-page-btn-nav" disabled={pendingPage === totalPendingPages} onClick={() => setPendingPage(p => Math.min(totalPendingPages, p + 1))}>&#8250;</button>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--muted)" }}>
                          <span>Rows per page:</span>
                          <select value={pendingPageSize} onChange={(e) => { setPendingPageSize(Number(e.target.value)); setPendingPage(1) }}
                            style={{ border: "1.5px solid var(--border)", borderRadius: 10, padding: "4px 8px", fontSize: 12.5, fontFamily: "var(--font)", color: "var(--text)", background: "var(--white)", cursor: "pointer", outline: "none", appearance: "auto" }}>
                            {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            </div>
          </main>
        </div>

        {/* Student detail modal */}
        {selectedStudent && (
          <div
            className="ms-modal-backdrop"
            onClick={() => setSelectedStudent(null)}
          >
            <div
              className="ms-modal ms-modal-wide"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ms-modal-header">
                <div className="ms-modal-avatar">
                  {selectedStudent.student_name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()}
                </div>
                <div className="ms-modal-header-info">
                  <div className="ms-modal-title">{selectedStudent.student_name}</div>
                  <div className="ms-modal-subtitle">
                    {selectedStudent.section_name} · {selectedStudent.site_location}
                  </div>
                </div>
                <button className="ms-modal-close" onClick={() => setSelectedStudent(null)}>
                  <IconX size={20} stroke={2} />
                </button>
              </div>
              <div className="ms-modal-flex">
                <div className="ms-modal-left">
                  <div className="ms-modal-row">
                    <div className="ms-modal-field">
                      <div className="ms-modal-label">Student No.</div>
                      <div className="ms-modal-value">
                        {selectedStudent.student_number}
                      </div>
                    </div>
                    <div className="ms-modal-field">
                      <div className="ms-modal-label">Site Location</div>
                      <div className="ms-modal-value">
                        {selectedStudent.site_location}
                      </div>
                    </div>
                  </div>
                  <div className="ms-modal-row">
                    <div className="ms-modal-field">
                      <div className="ms-modal-label">Program</div>
                      <div className="ms-modal-value">
                        {selectedStudent.program}
                      </div>
                    </div>
                    <div className="ms-modal-field">
                      <div className="ms-modal-label">Classification</div>
                      <div className="ms-modal-value">
                        {selectedStudent.classification}
                      </div>
                    </div>
                  </div>
                  <div className="ms-modal-row">
                    <div className="ms-modal-field">
                      <div className="ms-modal-label">Status</div>
                      <span
                        className="ms-status-badge"
                        style={{
                          background: statusConfig[selectedStudent.status].bg,
                          color: statusConfig[selectedStudent.status].color,
                        }}
                      >
                        {statusConfig[selectedStudent.status].label}
                      </span>
                    </div>
                    <div className="ms-modal-field">
                      <div className="ms-modal-label">Hours Logged</div>
                      <div className="ms-modal-value">
                        {selectedStudent.hours_logged} /{" "}
                        {selectedStudent.total_hours} hrs
                      </div>
                    </div>
                  </div>
                  <div className="ms-modal-field ms-modal-progress">
                    <div className="ms-modal-label">Progress</div>
                    <div className="ms-hours-label" style={{ marginTop: 6 }}>
                      <span>
                        {selectedStudent.hours_logged} /{" "}
                        {selectedStudent.total_hours} hrs
                      </span>
                      <span>
                        {Math.round(
                          (selectedStudent.hours_logged /
                            selectedStudent.total_hours) *
                            100
                        )}
                        %
                      </span>
                    </div>
                    <div className="ms-hours-track">
                      <div
                        className="ms-hours-fill"
                        style={{
                          width: `${Math.round(
                            (selectedStudent.hours_logged /
                              selectedStudent.total_hours) *
                              100
                          )}%`,
                          background: progressColor(selectedStudent.status),
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="ms-modal-right">
                  {/* <div className="ms-modal-right-title">Sessions</div> */}
                  {selectedStudent.sessions.length === 0 ? (
                    <div className="ms-session-empty">
                      No sessions logged yet.
                    </div>
                  ) : (
                    <div className="ms-session-table-wrapper">
                      <table className="ms-session-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Time In</th>
                            <th>Time Out</th>
                            <th>Hours</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedStudent.sessions.map((sess, i) => (
                            <tr key={i}>
                              <td>{sess.date}</td>
                              <td>{sess.timeIn}</td>
                              <td>{sess.timeOut}</td>
                              <td>{sess.hours}</td>
                              <td>
                                <button
                                  className="ms-session-action-btn"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditingSession(sess)
                                    setEditDate(formatDate(sess.date))
                                    setEditTimeIn(to24HourFormat(sess.timeIn))
                                    setEditTimeOut(to24HourFormat(sess.timeOut))
                                  }}
                                >
                                  <IconPencil size={14} stroke={1.75} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Request detail modal */}
        {selectedRequest && (
          <div
            className="ms-modal-backdrop"
            onClick={() => setSelectedRequest(null)}
          >
            <div
              className="ms-modal ms-req-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ms-modal-header">
                <div className="ms-modal-avatar">
                  {selectedRequest.student_name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()}
                </div>
                <div className="ms-modal-header-info">
                  <div className="ms-modal-title">{selectedRequest.student_name}</div>
                  <div className="ms-modal-subtitle">
                    {selectedRequest.student_number} · {selectedRequest.section_name}
                  </div>
                </div>
                <button className="ms-modal-close" onClick={() => setSelectedRequest(null)}>
                  <IconX size={20} stroke={2} />
                </button>
              </div>
              <div className="ms-modal-body">
                <div className="ms-modal-row">
                  <div className="ms-modal-field ms-req-modal-section">
                    <div className="ms-modal-label">Request Type</div>
                    <span
                      className="ms-request-type"
                      style={{
                        background: requestTypeStyle(
                          selectedRequest.appeal_type_name
                        ).bg,
                        color: requestTypeStyle(
                          selectedRequest.appeal_type_name
                        ).color,
                        padding: "4px 12px",
                      }}
                    >
                      {selectedRequest.appeal_type_name}
                    </span>
                  </div>
                  <div className="ms-modal-field ms-req-modal-section">
                    <div className="ms-modal-label">Date Submitted</div>
                    <div className="ms-modal-value">{selectedRequest.date}</div>
                  </div>
                </div>
                <div className="ms-req-modal-section">
                  <div
                    className="ms-modal-label"
                    style={{
                      fontWeight: 700,
                      color: "var(--text)",
                      fontSize: "14px",
                      textTransform: "none",
                      marginBottom: "8px",
                    }}
                  >
                    {selectedRequest.title}
                  </div>
                  <div className="ms-modal-label">Details</div>
                  <div className="ms-req-modal-note">
                    {selectedRequest.note}
                  </div>
                </div>

                {/* RESOLUTION ACTIONS */}
                <div
                  className="ms-req-modal-section"
                  style={{ marginTop: "14px" }}
                >
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.6px",
                    }}
                  >
                    Review Comment / Notes
                  </label>
                  <textarea
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="Provide context or a reason for the student regarding this evaluation..."
                    rows={3}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      marginTop: "6px",
                      padding: "10px",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      outline: "none",
                      resize: "none",
                      fontSize: "13px",
                    }}
                  />
                </div>

                <div
                  style={{ display: "flex", gap: "10px", marginTop: "18px" }}
                >
                  <button
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        const res = await resolveStudentRequest(
                          selectedRequest.appeal_id,
                          "rejected",
                          resolutionNote
                        )
                        if (res.ok) {
                          await refreshRequests()
                          setSelectedRequest(null)
                          setResolutionNote("")
                        } else {
                          alert(res.error)
                        }
                      })
                    }}
                    style={{
                      flex: 1,
                      padding: "10px",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: 700,
                      cursor: isPending ? "not-allowed" : "pointer",
                      background: "var(--maroon)",
                      color: "var(--white)",
                      fontSize: "13px",
                      opacity: isPending ? 0.6 : 1,
                    }}
                  >
                    Reject Request
                  </button>
                  <button
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        const res = await resolveStudentRequest(
                          selectedRequest.appeal_id,
                          "approved",
                          resolutionNote
                        )
                        if (res.ok) {
                          await refreshRequests()
                          setSelectedRequest(null)
                          setResolutionNote("")
                        } else {
                          alert(res.error)
                        }
                      })
                    }}
                    style={{
                      flex: 1,
                      padding: "10px",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: 700,
                      cursor: isPending ? "not-allowed" : "pointer",
                      background: "var(--green)",
                      color: "var(--white)",
                      fontSize: "13px",
                      opacity: isPending ? 0.6 : 1,
                    }}
                  >
                    Approve Request
                  </button>
                </div>
                {selectedRequest.attachment &&
                  selectedRequest.attachment.length > 0 && (
                    <div className="ms-req-modal-section">
                      <div className="ms-modal-label">
                        Attachment
                        {selectedRequest.attachment.length > 1 ? "s" : ""}
                      </div>
                      {selectedRequest.attachment.map((a, i) => (
                        <a
                          key={a.storage_path || i}
                          href={getPublicUrl(a.storage_path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ms-req-modal-attachment"
                          style={{
                            display: "inline-flex",
                            textDecoration: "none",
                          }}
                        >
                          <IconPaperclip size={16} stroke={1.75} />
                          {a.file_name}
                        </a>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}

        {/* edit Time modal */}
        {editingSession && (
          <div
            className="ms-modal-backdrop"
            onClick={() => setEditingSession(null)}
          >
            <div className="ms-modal" onClick={(e) => e.stopPropagation()}>
              <div className="ms-modal-header">
                <div className="ms-modal-title">Edit Session</div>
                <button
                  className="ms-modal-close"
                  onClick={() => setEditingSession(null)}
                >
                  <IconX size={18} stroke={1.75} />
                </button>
              </div>
              <div className="ms-modal-body">
                <div className="ms-modal-field">
                  <div className="ms-modal-label">Date</div>
                  <input
                    type="date"
                    className="ms-edit-input"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                </div>
                <div className="ms-modal-row">
                  <div className="ms-modal-field">
                    <div className="ms-modal-label">Time In</div>
                    <input
                      type="time"
                      className="ms-edit-input"
                      value={editTimeIn}
                      onChange={(e) => setEditTimeIn(e.target.value)}
                    />
                  </div>
                  <div className="ms-modal-field">
                    <div className="ms-modal-label">Time Out</div>
                    <input
                      type="time"
                      className="ms-edit-input"
                      value={editTimeOut}
                      onChange={(e) => setEditTimeOut(e.target.value)}
                    />
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 10,
                    marginTop: 6,
                  }}
                >
                  <button
                    className="ms-edit-cancel-btn"
                    onClick={() => setEditingSession(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="ms-edit-save-btn"
                    onClick={handleSaveSession}
                    disabled={
                      !editDate || !editTimeIn || !editTimeOut ||
                      (
                        editDate === editingSession.date &&
                        editTimeIn === to24HourFormat(editingSession.timeIn) &&
                        editTimeOut === to24HourFormat(editingSession.timeOut)
                      )
                    }
                    style={{
                      opacity: (
                        !editDate || !editTimeIn || !editTimeOut ||
                        (
                          editDate === editingSession.date &&
                          editTimeIn === to24HourFormat(editingSession.timeIn) &&
                          editTimeOut === to24HourFormat(editingSession.timeOut)
                        )
                      ) ? 0.4 : 1,
                      cursor: (
                        !editDate || !editTimeIn || !editTimeOut ||
                        (
                          editDate === editingSession.date &&
                          editTimeIn === to24HourFormat(editingSession.timeIn) &&
                          editTimeOut === to24HourFormat(editingSession.timeOut)
                        )
                      ) ? "not-allowed" : "pointer",
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default function MyStudentsPage() {
  return (
    <Suspense>
      <MyStudentsContent />
    </Suspense>
  )
}