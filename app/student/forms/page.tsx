"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import {
  IconSearch,
  IconFileText,
  IconUpload,
  IconX,
  IconFilter,
  IconChevronUp,
  IconChevronDown as IconChevronDownArrow,
  IconFile,
  IconPhoto,
  IconFileZip,
  IconLink,
  IconPlus,
  IconEye,
  IconDownload,
} from "@tabler/icons-react"
import StudentSidebar from "@/components/shared/ResponsiveStudentSidebar"
import ProfilePill from "@/components/shared/StudentProfilePill"
import {
  KpiStatCard,
  KpiStatCardGrid,
  ChartStyles,
} from "@/components/shared/ChartModule"
import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"
import { createClient } from "@/lib/client"

import {
  getMyForms,
  saveDriveSubmission,
  getStudentActiveEnrollmentId,
  type StudentFormView,
} from "@/lib/forms/submission-actions"

import { getTemplateDownloadUrl } from "@/lib/forms/requirement-actions"
import { getStudentDashboard } from "@/lib/student/dashboard-actions"

const studentFilesStyles = `
  .sf-root { display: flex; min-height: 100vh; background: #F0F0F0; font-family: var(--font-montserrat, 'Montserrat', sans-serif); font-size: 13px; color: #111827; }
  .sf-main { flex: 1; display: flex; flex-direction: column; padding: 28px 32px 28px 120px; min-width: 0; width: 100%; max-width: 100%; transition: padding 0.3s ease; }
  
  /* Header */
  .sf-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
  .sf-header-left { flex: 1; min-width: 200px; }
  .sf-header-title { font-size: 34px; font-weight: 800; color: #7B1D1D; font-family: var(--font-montserrat, 'Montserrat', sans-serif); margin: 0; letter-spacing: -0.01em; }
  .sf-profile-pill { display: flex; align-items: center; gap: 10px; background: #7B1D1D; border-radius: 24px; padding: 4px 16px 4px 4px; flex-shrink: 0; }
  .sf-profile-avatar { width: 38px; height: 38px; border-radius: 50%; background: #C8A84B; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; color: #7B1D1D; flex-shrink: 0; }
  .sf-profile-name { color: #FFFFFF; font-size: 13px; font-weight: 600; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sf-profile-section { color: #C8A84B; font-size: 11px; line-height: 1.2; font-weight: 500; }

  /* Table Card */
  .sf-adv-table-card { background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.07); display: flex; flex-direction: column; overflow: hidden; width: 100%; }
  .sf-adv-table-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #E5E7EB; background: #FFFFFF; }
  .sf-adv-table-title { font-weight: 700; font-size: 15px; color: #111827; }
  .sf-adv-table-count { font-size: 12px; color: #6B7280; margin-top: 2px; }
  .sf-adv-search-bar { display: flex; align-items: center; gap: 8px; border: 1.5px solid #7B1D1D; border-radius: 999px; padding: 8px 18px; min-width: 280px; background: #FFFFFF; transition: border-color 0.15s; }
  .sf-adv-search-bar:focus-within { border-color: #1B4332; }
  .sf-adv-search-input { border: none; outline: none; font-size: 13px; font-family: var(--font-montserrat, 'Montserrat', sans-serif); color: #111827; width: 100%; background: transparent; }
  .sf-adv-search-input::placeholder { color: #9CA3AF; }
  .sf-adv-filter-btn { display: flex; align-items: center; gap: 6px; border: none; border-radius: 999px; padding: 8px 18px; background: #1B4332; font-size: 13px; font-family: var(--font-montserrat, 'Montserrat', sans-serif); font-weight: 500; cursor: pointer; color: #FFFFFF; transition: background 0.13s; }
  .sf-adv-filter-btn:hover { background: #14532D; }
  
  .sf-adv-table-wrapper { overflow-y: visible; max-height: none; scrollbar-width: thin; scrollbar-color: #CFCFCB transparent; }
  .sf-adv-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .sf-adv-table thead tr { background: #F9FAFB; border-bottom: 1px solid #E5E7EB; }
  .sf-adv-table thead th { position: sticky; top: 0; z-index: 2; background: #F9FAFB; padding: 10px 20px; text-align: left; font-size: 11px; font-weight: 700; color: #7B1D1D; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; white-space: nowrap; }
  .sf-adv-table thead th:last-child { text-align: center; cursor: default; }
  .sf-adv-table thead th .sf-sort-icons { display: inline-flex; flex-direction: column; align-items: center; margin-left: 4px; vertical-align: middle; line-height: 1; }
  .sf-adv-table thead th .sf-sort-icons .sf-sort-up, .sf-adv-table thead th .sf-sort-icons .sf-sort-down { opacity: 0.5; color: #4A4A4A; }
  .sf-adv-table thead th .sf-sort-icons .active { opacity: 1 !important; color: #7B1D1D !important; }
  .sf-adv-table td { padding: 14px 20px; border-bottom: 1px solid #F3F4F6; vertical-align: middle; font-size: 13px; }
  .sf-adv-table tbody tr:hover td { background: #FAFAFA; }
  .sf-adv-empty { text-align: center; padding: 48px 0; color: #6B7280; font-size: 13px; }
  
  .sf-form-name { display: flex; align-items: center; gap: 10px; font-weight: 500; color: #111827; }
  .sf-form-icon { color: #1B4332; flex-shrink: 0; }
  .sf-deadline { color: #6B7280; font-size: 13px; text-align: left; }
  .sf-status-cell { text-align: center; }
  .sf-status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 20px; border-radius: 20px; font-size: 13px; font-weight: 600; white-space: nowrap; background: #E8EDE5; color: #1B4332; min-width: 100px; justify-content: center; cursor: pointer; }
  .sf-status-badge-submitted { background: #D1FAE5; color: #065F46; }
  .sf-upload-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 20px; border-radius: 20px; font-size: 13px; font-weight: 600; background: #1B4332; color: #FFFFFF; border: none; cursor: pointer; font-family: var(--font-montserrat, 'Montserrat', sans-serif); min-width: 100px; justify-content: center; }
  .sf-upload-btn:hover { opacity: 0.85; }
  .sf-download-template-btn { display: inline-flex; align-items: center; justify-content: center; background: #F3F4F6; border: 1px solid #E5E7EB; border-radius: 6px; padding: 4px; cursor: pointer; transition: all 0.2s; color: #6B7280; }
  .sf-download-template-btn:hover { background: #E5E7EB; color: #1B4332; }

  .sf-adv-pagination { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-top: 1px solid #E5E7EB; position: relative; }
  .sf-adv-pagination-info { font-size: 12px; color: #6B7280; }
  .sf-adv-pagination-controls { display: flex; align-items: center; gap: 4px; position: absolute; left: 50%; transform: translateX(-50%); }
  .sf-adv-page-btn { width: 28px; height: 28px; border-radius: 6px; border: 1px solid #E5E7EB; background: #FFFFFF; font-size: 12px; color: #111827; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .sf-adv-page-btn:hover:not(.sf-adv-page-btn-active):not(:disabled) { background: #F9FAFB; }
  .sf-adv-page-btn.sf-adv-page-btn-active { background: #7B1D1D; color: #FFFFFF; border-color: #7B1D1D; font-weight: 700; }
  .sf-adv-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  
  /* Modal */
  .sf-modal-backdrop { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 100; background: rgba(0,0,0,0.35); backdrop-filter: blur(2px); padding: 16px; }
  .sf-modal { width: 100%; max-width: 480px; max-height: 90vh; background: #FFFFFF; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.12); display: flex; flex-direction: column; }
  .sf-modal-header { padding: 16px 24px; background: #1B4332; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
  .sf-modal-title { color: #FFFFFF; font-size: 13px; font-weight: 700; }
  .sf-modal-close { background: transparent; border: none; cursor: pointer; color: #FFFFFF; }
  .sf-modal-body { padding: 24px; overflow-y: auto; display: flex; flex-direction: column; flex: 1; min-height: 0; scrollbar-width: thin; scrollbar-color: #CFCFCB transparent; }
  .sf-modal-body::-webkit-scrollbar { width: 4px; }
  .sf-modal-body::-webkit-scrollbar-track { background: transparent; }
  .sf-modal-body::-webkit-scrollbar-thumb { background: #CFCFCB; border-radius: 4px; }
  .sf-modal-footer { padding-top: 16px; border-top: 1px solid #E5E7EB; margin-top: 16px; flex-shrink: 0; }

  /* Add Button & Upload Submit */
  .sf-add-btn-wrapper { display: flex; flex-direction: column; gap: 10px; width: 100%; }
  .sf-add-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px 20px; background: transparent; border: 2px solid #1B4332; border-radius: 10px; color: #1B4332; font-size: 14px; font-weight: 700; cursor: pointer; font-family: var(--font-montserrat, 'Montserrat', sans-serif); }
  .sf-add-btn:hover { background: rgba(27, 67, 50, 0.05); }
  .sf-upload-submit-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px 20px; background: #1B4332; border: 2px solid #1B4332; border-radius: 10px; color: #FFFFFF; font-size: 14px; font-weight: 700; cursor: pointer; font-family: var(--font-montserrat, 'Montserrat', sans-serif); }
  .sf-upload-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .sf-upload-submit-btn:hover:not(:disabled) { background: #14532D; }

  /* Dropdown container */
  .sf-add-dropdown { position: relative; width: 100%; }
  .sf-dropdown-menu { position: absolute; bottom: calc(100% + 4px); left: 0; right: 0; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); z-index: 10; overflow: hidden;}
  .sf-dropdown-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px 16px; background: none; border: none; font-size: 13px; font-weight: 500; cursor: pointer; text-align: left; }
  .sf-dropdown-item:hover { background: #F5F5F7; }

  /* File Preview Cards */
  .sf-file-grid { display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto; margin-bottom: 16px; scrollbar-width: thin; scrollbar-color: #CFCFCB transparent; }
  .sf-file-grid::-webkit-scrollbar { width: 4px; }
  .sf-file-grid::-webkit-scrollbar-track { background: transparent; }
  .sf-file-grid::-webkit-scrollbar-thumb { background: #CFCFCB; border-radius: 4px; }
  .sf-file-preview-card { display: flex; align-items: center; gap: 14px; padding: 12px 16px; background: #F9FAFB; border-radius: 10px; border: 1px solid #E5E7EB; flex-shrink: 0; }
  .sf-file-preview-icon-wrapper { width: 40px; height: 40px; border-radius: 8px; background: #E8EDE5; display: flex; align-items: center; justify-content: center; color: #1B4332; flex-shrink: 0; }
  .sf-file-preview-info { flex: 1; min-width: 0; }
  .sf-file-preview-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sf-file-preview-meta { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
  .sf-file-preview-type { font-size: 10px; font-weight: 700; color: #FFFFFF; background: #1B4332; padding: 2px 10px; border-radius: 12px; flex-shrink: 0; }
  .sf-file-preview-size { font-size: 11px; color: #6B7280; }
  .sf-file-preview-remove { background: none; border: none; color: #9CA3AF; cursor: pointer; padding: 6px; flex-shrink: 0; }
  .sf-file-preview-remove:hover { color: #7B1D1D}
  .sf-empty-state { text-align: center; padding: 60px 20px; color: #9CA3AF; display: flex; flex-direction: column; align-items: center; }
  
  /* Link Input */
  .sf-link-input-container { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: #E8EDE5; border-radius: 10px; border: 1px solid #8AAE8A; margin-bottom: 12px; flex-shrink: 0; width: 100%; }
  .sf-link-input { border: none; outline: none; background: transparent; font-size: 13px; width: 100%; min-width: 0; font-family: var(--font-montserrat, 'Montserrat', sans-serif); }
  .sf-link-add-btn { background: #1B4332; color: #FFF; border: none; padding: 6px 24px; border-radius: 6px; cursor: pointer; font-family: var(--font-montserrat, 'Montserrat', sans-serif); font-size: 13px; font-weight: 600; white-space: nowrap; flex-shrink: 0; }
  .sf-link-add-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .sf-link-cancel-btn { background: #FFFFFF; border: 1px solid #B0B0B0; padding: 6px 16px; border-radius: 6px; cursor: pointer; font-family: var(--font-montserrat, 'Montserrat', sans-serif); font-size: 13px; font-weight: 500; color: #111827; flex-shrink: 0; }
  .sf-link-cancel-btn:hover { background: #F5F5F5; }
`

// Types
type SortField = "name" | "deadline" | null
type SortDirection = "asc" | "desc" | null
type FilterField = "status"
type ActiveFilters = Partial<Record<FilterField, string[]>>

interface Form {
  id: string
  name: string
  deadline: string
  sortDate: Date | null
  status: "uploaded" | "pending"
  hasTemplate: boolean
  submittedFiles?: { name: string; type: string; size: string; url?: string }[]
  submittedLinks?: string[]
}

export default function StudentFilesPage() {
  const [forms, setForms] = useState<Form[]>([])
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [selectedForm, setSelectedForm] = useState<Form | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewingForm, setViewingForm] = useState<Form | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const [student, setStudent] = useState({
    initials: "ST",
    displayName: "Student",
    section: "NSTP",
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [activeFilter, setActiveFilter] = useState<string>("All")
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [links, setLinks] = useState<string[]>([])
  const [linkInput, setLinkInput] = useState("")
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [sortField, setSortField] = useState<SortField>("deadline")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [pageSize, setPageSize] = useState(5)
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({})
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const filterPanelRef = useRef<HTMLDivElement>(null)

  // Filter groups
  const filterGroups: { label: string; field: FilterField; values: () => string[] }[] = [
    { label: "Status", field: "status", values: () => ["uploaded", "pending"] },
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
    setSearchQuery("")
    setActiveFilter("All")
    setCurrentPage(1)
  }

  // Filter count 
  const totalActiveFilters = Object.values(activeFilters).reduce((sum, arr) => sum + (arr?.length ?? 0), 0)

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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const loadData = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const parts = (user.user_metadata?.full_name || "").split(" ")
      setStudent((prev) => ({
        ...prev,
        initials: (parts[0]?.[0] || "") + (parts.at(-1)?.[0] || ""),
        displayName: user.user_metadata?.full_name || "Student",
      }))
    }

    const dashboardRes = await getStudentDashboard()
    if (dashboardRes.ok) {
      setStudent((prev) => ({
        ...prev,
        section: dashboardRes.data.sectionName ?? "",
      }))
    }

    const enrollRes = await getStudentActiveEnrollmentId()
    if (!enrollRes.ok) return
    setEnrollmentId(enrollRes.data)

    const formsRes = await getMyForms(enrollRes.data)
    if (formsRes.ok) {
      const mappedForms: Form[] = formsRes.data.map((req) => {
        // Evaluate links and files if submission exists
        const submittedFiles = []
        const submittedLinks = []
        if (req.submission) {
          const path = req.submission.storage_path
          if (path.startsWith("gdrive:")) {
            submittedLinks.push(path.replace("gdrive:", ""))
          } else {
            submittedFiles.push({
              name: req.submission.file_name || "Submission",
              type:
                req.submission.content_type?.split("/")?.pop()?.toUpperCase() ||
                "FILE",
              size: req.submission.file_size_byte
                ? formatFileSize(req.submission.file_size_byte)
                : "0 KB",
              url: path,
            })
          }
        }

        // Parse date for sorting
        let sortDate: Date | null = null
        let formattedDeadline = "—"
        if (req.due_date) {
          const dateObj = new Date(req.due_date)
          if (!isNaN(dateObj.getTime())) {
            sortDate = dateObj
            formattedDeadline = dateObj.toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })
          }
        }

        return {
          id: req.form_requirement_id,
          name: req.title,
          deadline: formattedDeadline,
          sortDate: sortDate,
          status:
            req.status === "missing" || req.status === "rejected"
              ? "pending"
              : "uploaded",
          hasTemplate: req.has_template,
          submittedFiles,
          submittedLinks,
        }
      })
      setForms(mappedForms)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Handlers

  const handleUploadClick = (form: Form) => {
    setSelectedForm(form)
    setSelectedFiles([])
    setLinks([])
    setLinkInput("")
    setShowLinkInput(false)
    setIsDropdownOpen(false)
    setShowModal(true)
  }

  const handleViewClick = (form: Form) => {
    setViewingForm(form)
    setShowViewModal(true)
  }

  const handleTemplateDownload = async (reqId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const res = await getTemplateDownloadUrl(reqId)
    if (res.ok) window.open(res.url, "_blank")
    else alert(`Download Error: ${res.error}`)
  }

  const handleUploadExecute = async () => {
    if (!selectedForm || !enrollmentId) return
    setIsUploading(true)

    try {
      if (selectedFiles.length > 0) {
        const file = selectedFiles[0]
        const formData = new FormData()
        formData.append("file", file)

        const driveRes = await fetch("/api/upload/drive", {
          method: "POST",
          body: formData,
        })
        const driveData = await driveRes.json()
        if (!driveRes.ok)
          throw new Error(driveData.error || "Drive upload failed")

        const dbRes = await saveDriveSubmission(
          enrollmentId,
          selectedForm.id,
          driveData.data.id,
          driveData.data.webViewLink,
          file.name
        )
        if (!dbRes.ok) throw new Error(dbRes.error)
      } else if (links.length > 0) {
        const dbRes = await saveDriveSubmission(
          enrollmentId,
          selectedForm.id,
          "link_only",
          links[0],
          "External Link Submission"
        )
        if (!dbRes.ok) throw new Error(dbRes.error)
      }

      setShowModal(false)
      setSelectedFiles([])
      setLinks([])
      loadData()
      alert("Submitted Successfully!")
    } catch (e: any) {
      alert(`Upload failed: ${e.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  // Table & Filter Logic 

  const uploadedCount = forms.filter((f) => f.status === "uploaded").length
  const totalCount = forms.length

  const stats = [
    {
      label: "Submitted",
      value: uploadedCount,
      icon: "ti-circle-check",
      color: {
        bg: "#C8D8C0",
        text: "#2D5C3A",
        border: "#8AAE8A",
        icon: "#3A7A4A",
      },
    },
    {
      label: "Pending",
      value: totalCount - uploadedCount,
      icon: "ti-clock",
      color: {
        bg: "#F5E6C0",
        text: "#8B5E1A",
        border: "#D4A840",
        icon: "#C8882A",
      },
    },
  ]

  const filteredForms = forms.filter((form) => {
    if (
      activeFilter !== "All" &&
      form.status !== (activeFilter === "Submitted" ? "uploaded" : "pending")
    )
      return false

    if (searchQuery.trim() !== "")
      return form.name.toLowerCase().includes(searchQuery.toLowerCase().trim())

    const matchFilters = (Object.entries(activeFilters) as [FilterField, string[]][]).every(([field, values]) => {
      if (!values || values.length === 0) return true
      if (field === "status") {
        return values.includes(form.status)
      }
      if (field === "hasTemplate") {
        const label = form.hasTemplate ? "Yes" : "No"
        return values.includes(label)
      }
      return true
    })

    return matchFilters
  })

  const sortedForms = useMemo(() => {
    if (!sortField || !sortDirection) return filteredForms
    return [...filteredForms].sort((a, b) => {
      let comparison = 0
      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name)
      } else if (sortField === "deadline") {
        const dateA = a.sortDate
        const dateB = b.sortDate
        
        // Handle null dates
        if (dateA === null && dateB === null) comparison = 0
        else if (dateA === null) comparison = 1 // goes to end
        else if (dateB === null) comparison = -1
        else comparison = dateA.getTime() - dateB.getTime()
      }
      return sortDirection === "asc" ? comparison : -comparison
    })
  }, [filteredForms, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") setSortDirection("desc")
      else if (sortDirection === "desc") {
        setSortField(null)
        setSortDirection(null)
      }
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
    setCurrentPage(1)
  }

  const filteredTotalPages = Math.max(
    1,
    Math.ceil(sortedForms.length / pageSize)
  )
  const filteredPaginatedForms = sortedForms.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const getSortIcons = (field: SortField) => {
    const isAsc = sortField === field && sortDirection === "asc"
    const isDesc = sortField === field && sortDirection === "desc"
    return (
      <span className="sf-sort-icons">
        <IconChevronUp
          size={12}
          stroke={2}
          className={`sf-sort-up ${isAsc ? "active" : ""}`}
          style={{ marginBottom: -2 }}
        />
        <IconChevronDownArrow
          size={12}
          stroke={2}
          className={`sf-sort-down ${isDesc ? "active" : ""}`}
          style={{ marginTop: -2 }}
        />
      </span>
    )
  }

  const getFileIcon = (file: File) => {
    const name = file.name.toLowerCase()
    if (name.endsWith(".pdf"))
      return <IconFile size={20} stroke={1.75} style={{ color: "#1B4332" }} />
    if (name.endsWith(".jpg") || name.endsWith(".png"))
      return <IconPhoto size={20} stroke={1.75} />
    if (name.endsWith(".zip") || name.endsWith(".rar"))
      return <IconFileZip size={20} stroke={1.75} />
    return <IconFile size={20} stroke={1.75} />
  }

  const isUploadDisabled = () =>
    selectedFiles.length === 0 && links.length === 0
  
  // URL Validation
  const isValidUrl = (url: string) => {
    if (!url || url.trim() === "") return false
    
    try {
      const urlObj = new URL(url)
      return urlObj.protocol === "http:" || 
            urlObj.protocol === "https:" || 
            urlObj.protocol === "ftp:" ||
            urlObj.protocol === "ftps:"
    } catch {
      const urlPattern = /^(https?:\/\/|ftp:\/\/|ftps:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/i
      return urlPattern.test(url.trim())
    }
  }

  // Merge files and links for display
  const mergedItems = [
    ...selectedFiles.map((file) => ({ type: "file" as const, data: file })),
    ...links.map((link) => ({ type: "link" as const, data: link })),
  ]

  return (
    <>
      <style>{studentFilesStyles}</style>
      <div className="sf-root">
        <StudentSidebar />
        <main className="sf-main">
          {/* Header */}
          <div className="sf-header">
            <div className="sf-header-left">
              <h1 className="sf-header-title">Forms</h1>
            </div>
            <ProfilePill
              name={student.displayName}
              initials={student.initials}
              section={student.section}
            />
          </div>

          <ChartStyles />

          {/* Stat Cards */}
          <KpiStatCardGrid columns={2}>
            {stats.map((stat) => {
              const isHovered = hoveredCard === stat.label
              const isActive = activeFilter === stat.label
              return (
                <div
                  key={stat.label}
                  onClick={() => {
                    setActiveFilter(isActive ? "All" : stat.label)
                    setCurrentPage(1)
                  }}
                  onMouseEnter={() => setHoveredCard(stat.label)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    cursor: "pointer",
                    borderRadius: COLORS.radius,
                    overflow: "hidden",
                    background: COLORS.cardBg,
                    color:
                      hoveredCard === stat.label || activeFilter === stat.label
                        ? stat.color.icon
                        : "#666666",
                    border: `2px solid ${
                      hoveredCard === stat.label || activeFilter === stat.label
                        ? stat.color.icon
                        : COLORS.border
                    }`,
                    transform:
                      hoveredCard === stat.label
                        ? "translateY(-8px)"
                        : "translateY(0)",
                    boxShadow:
                      hoveredCard === stat.label
                        ? "0 14px 28px rgba(0,0,0,.12)"
                        : "0 4px 10px rgba(0,0,0,.05)",
                    transition:
                      "transform .25s ease, box-shadow .25s ease, border-color .18s ease, color .18s ease",
                  }}
                >
                  <KpiStatCard
                    icon={stat.icon}
                    label={stat.label}
                    value={stat.value}
                  />
                </div>
              )
            })}
          </KpiStatCardGrid>

          {/* Table Card */}
          <div className="sf-adv-table-card" style={{ marginTop: 24 }}>
            <div className="sf-adv-table-toolbar">
              <div>
                <div className="sf-adv-table-title">
                  {activeFilter === "All"
                    ? "All Forms"
                    : `${activeFilter} Forms`}
                </div>
                <div className="sf-adv-table-count">
                  {sortedForms.length} form{sortedForms.length !== 1 ? "s" : ""}{" "}
                  found
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Search Bar */}
                <div className="sf-adv-search-bar">
                  <IconSearch size={16} stroke={1.75} color="#6B7280" />
                  <input
                    className="sf-adv-search-input"
                    placeholder="Search forms..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCurrentPage(1)
                    }}
                  />
                </div>

                {/* Filter Button */}
                <div ref={filterPanelRef} style={{ position: "relative" }}>
                  <button
                    className="sf-adv-filter-btn"
                    onClick={() => setShowFilterPanel(v => !v)}
                    style={{
                      width: 60,
                      height: 38,
                      border: `1.5px solid ${totalActiveFilters > 0 ? "#7B1D1D" : "#1B4332"}`,
                      borderRadius: 999,
                      background: "white",
                      color: totalActiveFilters > 0 ? "#7B1D1D" : "#1B4332",
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
                      <span style={{
                        position: "absolute",
                        top: -6,
                        right: -6,
                        background: "#7B1D1D",
                        color: "#fff",
                        borderRadius: "50%",
                        width: 16,
                        height: 16,
                        fontSize: 9,
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                        {totalActiveFilters}
                      </span>
                    )}
                  </button>

                  {/* Filter Popup */}
                  {showFilterPanel && (
                    <div style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      right: 0,
                      background: "#FFFFFF",
                      border: "1px solid #E5E7EB",
                      borderRadius: 14,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      zIndex: 100,
                      padding: 16,
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 12,
                      }}>
                        <span style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#6B7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}>Filter</span>
                        {totalActiveFilters > 0 && (
                          <button
                            onClick={clearAllFilters}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: 11.5,
                              color: "#7B1D1D",
                              fontWeight: 600,
                              fontFamily: "var(--font-montserrat, 'Montserrat', sans-serif)",
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
                            <div key={field} style={{ minWidth: 130 }}>
                              <div style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#111827",
                                marginBottom: 8,
                                textTransform: "uppercase",
                                letterSpacing: "0.4px",
                              }}>{label}</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {opts.map(v => {
                                  // Format display value
                                  let displayValue = v
                                  if (field === "status") {
                                    displayValue = v === "uploaded" ? "Submitted" : "Pending"
                                  }
                                  return (
                                    <label
                                      key={v}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        cursor: "pointer",
                                        fontSize: 13,
                                        color: "#111827",
                                        fontFamily: "var(--font-montserrat, 'Montserrat', sans-serif)",
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked.includes(v)}
                                        onChange={() => toggleFilter(field, v)}
                                        style={{
                                          accentColor: "#7B1D1D",
                                          width: 14,
                                          height: 14,
                                          cursor: "pointer",
                                          flexShrink: 0,
                                        }}
                                      />
                                      {displayValue}
                                    </label>
                                  )
                                })}
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

            <div className="sf-adv-table-wrapper">
              {sortedForms.length === 0 ? (
                <div className="sf-adv-empty">No forms available.</div>
              ) : (
                <table className="sf-adv-table">
                  <thead>
                    <tr>
                      <th
                        style={{ width: "45%" }}
                        onClick={() => handleSort("name")}
                      >
                        File {getSortIcons("name")}
                      </th>
                      <th
                        style={{ width: "25%", textAlign: "left" }}
                        onClick={() => handleSort("deadline")}
                      >
                        Deadline {getSortIcons("deadline")}
                      </th>
                      <th style={{ width: "30%", textAlign: "center" }}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPaginatedForms.map((form) => (
                      <tr key={form.id}>
                        <td>
                          <div className="sf-form-name">
                            <IconFileText
                              size={16}
                              stroke={1.75}
                              className="sf-form-icon"
                            />
                            {form.name}
                            {form.hasTemplate && (
                              <button
                                title="Download Template"
                                className="sf-download-template-btn"
                                onClick={(e) =>
                                  handleTemplateDownload(form.id, e)
                                }
                              >
                                <IconDownload size={14} stroke={1.75} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="sf-deadline">{form.deadline}</td>
                        <td className="sf-status-cell">
                          {form.status === "uploaded" ? (
                            <span
                              className="sf-status-badge sf-status-badge-submitted"
                              onClick={() => handleViewClick(form)}
                            >
                              <IconEye size={14} stroke={2} /> Submitted
                            </span>
                          ) : (
                            <button
                              className="sf-upload-btn"
                              onClick={() => handleUploadClick(form)}
                            >
                              <IconUpload size={14} stroke={2.5} /> Upload
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="sf-adv-pagination">
              <div className="sf-adv-pagination-info">
                Showing{" "}
                {sortedForms.length === 0
                  ? 0
                  : (currentPage - 1) * pageSize + 1}
                –{Math.min(currentPage * pageSize, sortedForms.length)} of{" "}
                {sortedForms.length} forms
              </div>
              <div className="sf-adv-pagination-controls">
                <button
                  className="sf-adv-page-btn"
                  disabled={currentPage === 1 || sortedForms.length === 0}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  &#8249;
                </button>
                {Array.from(
                  { length: Math.min(filteredTotalPages, 5) },
                  (_, i) => i + 1
                ).map((p) => (
                  <button
                    key={p}
                    className={`sf-adv-page-btn${
                      p === currentPage ? " sf-adv-page-btn-active" : ""
                    }`}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  className="sf-adv-page-btn"
                  disabled={
                    currentPage === filteredTotalPages ||
                    sortedForms.length === 0
                  }
                  onClick={() =>
                    setCurrentPage((p) => Math.min(filteredTotalPages, p + 1))
                  }
                >
                  &#8250;
                </button>
              </div>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: "#6B7280",
                fontFamily: "'Montserrat', 'Fallback Montserrat'",
              }}>
                <span>Rows per page:</span>
                <select
                  style={{
                    border: "1.5px solid #E5E7EB",
                    borderRadius: 8,
                    padding: "4px 8px",
                    fontSize: 12,
                    fontFamily: "'Montserrat', 'Fallback Montserrat'",
                    color: "#111827",
                    background: "#FFFFFF",
                    cursor: "pointer",
                    outline: "none",
                  }}
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                >
                  {[5, 10, 20, 50].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Upload Modal */}
          {showModal && selectedForm && (
            <div
              className="sf-modal-backdrop"
              onClick={() => setShowModal(false)}
            >
              <div className="sf-modal" onClick={(e) => e.stopPropagation()}>
                <div className="sf-modal-header">
                  <span className="sf-modal-title">
                    Upload: {selectedForm.name}
                  </span>
                  <button
                    className="sf-modal-close"
                    onClick={() => setShowModal(false)}
                  >
                    <IconX size={18} stroke={2} />
                  </button>
                </div>
                <div className="sf-modal-body">
                  <div className="sf-modal-content">
                    <input
                      id="file-input"
                      type="file"
                      multiple
                      style={{ display: "none" }}
                      onChange={(e) => {
                        if (e.target.files) {
                          setSelectedFiles((prev) => [
                            ...prev,
                            ...Array.from(e.target.files!),
                          ])
                          setIsDropdownOpen(false)
                        }
                      }}
                    />

                    {showLinkInput && (
                      <div className="sf-link-input-container">
                        <IconLink size={18} stroke={1.75} />
                        <input
                          id="link-input-field"
                          className="sf-link-input"
                          type="url"
                          placeholder="Paste link here..."
                          value={linkInput}
                          onChange={(e) => setLinkInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              if (isValidUrl(linkInput.trim())) {
                                setLinks((p) => [...p, linkInput.trim()])
                                setLinkInput("")
                                setShowLinkInput(false)
                              }
                            } else if (e.key === "Escape") {
                              setShowLinkInput(false)
                              setLinkInput("")
                            }
                          }}
                        />
                        <button
                          className="sf-link-add-btn"
                          onClick={() => {
                            if (isValidUrl(linkInput.trim())) {
                              setLinks((p) => [...p, linkInput.trim()])
                              setLinkInput("")
                              setShowLinkInput(false)
                            }
                          }}
                          disabled={!isValidUrl(linkInput.trim())}
                          style={{ display: "flex", alignItems: "center", gap: "6px" }}
                        >
                          <IconPlus size={14} stroke={2} style={{ color: "#FFFFFF", flexShrink: 0 }} />
                          <span style={{ whiteSpace: "nowrap" }}>Add</span>
                        </button>
                        <button
                          className="sf-link-cancel-btn"
                          onClick={() => {
                            setShowLinkInput(false)
                            setLinkInput("")
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {/* Files & Links Display */}
                    {mergedItems.length > 0 && (
                      <div className="sf-file-grid">
                        {mergedItems.map((item, index) => {
                          if (item.type === "file") {
                            const file = item.data
                            return (
                              <div key={`file-${index}`} className="sf-file-preview-card">
                                <div className="sf-file-preview-icon-wrapper">
                                  {getFileIcon(file)}
                                </div>
                                <div className="sf-file-preview-info">
                                  <div className="sf-file-preview-name">
                                    {file.name}
                                  </div>
                                  <div className="sf-file-preview-meta">
                                    <span className="sf-file-preview-type">
                                      FILE
                                    </span>
                                    <span className="sf-file-preview-size">
                                      {formatFileSize(file.size)}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  className="sf-file-preview-remove"
                                  onClick={() =>
                                    setSelectedFiles((p) =>
                                      p.filter((_, i) => i !== index)
                                    )
                                  }
                                >
                                  <IconX size={18} stroke={2} />
                                </button>
                              </div>
                            )
                          } else {
                            const link = item.data
                            return (
                              <div key={`link-${index}`} className="sf-file-preview-card">
                                <div
                                  className="sf-file-preview-icon-wrapper"
                                  style={{
                                    background: "#E8EDE5",
                                    color: "#1B4332",
                                  }}
                                >
                                  <IconLink size={20} stroke={1.75} />
                                </div>
                                <div className="sf-file-preview-info">
                                  <div className="sf-file-preview-name">{link}</div>
                                  <div className="sf-file-preview-meta">
                                    <span
                                      className="sf-file-preview-type"
                                      style={{ background: "#1B4332" }}
                                    >
                                      LINK
                                    </span>
                                  </div>
                                </div>
                                <button
                                  className="sf-file-preview-remove"
                                  onClick={() =>
                                    setLinks((p) => p.filter((_, i) => i !== index))
                                  }
                                >
                                  <IconX size={18} stroke={2} />
                                </button>
                              </div>
                            )
                          }
                        })}
                      </div>
                    )}

                    {mergedItems.length === 0 && !showLinkInput && (
                      <div className="sf-empty-state">
                        <IconPlus size={40} stroke={1.5} />
                        <p>Click "Add" to get started</p>
                        <p className="sf-empty-sub">
                          Choose to upload a file or add a link
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="sf-modal-footer">
                    <div className="sf-add-btn-wrapper">
                      <div className="sf-add-dropdown" ref={dropdownRef}>
                        <button
                          className="sf-add-btn"
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          style={{
                            position: "relative",
                            justifyContent: "center",
                          }}
                        >
                          <IconPlus
                            size={18}
                            stroke={2}
                            className={
                              isDropdownOpen ? "sf-add-icon-rotated" : ""
                            }
                            style={{ position: "absolute", left: "16px" }}
                          />
                          <span>Add File / Link</span>
                          <IconChevronUp
                            size={16}
                            stroke={2}
                            style={{ position: "absolute", right: "16px" }}
                          />
                        </button>
                        {isDropdownOpen && (
                          <div className="sf-dropdown-menu">
                            <button
                              className="sf-dropdown-item"
                              onClick={() => {
                                setIsDropdownOpen(false)
                                document.getElementById("file-input")?.click()
                              }}
                            >
                              <IconFile size={18} stroke={1.75} /> Add File
                            </button>
                            <button
                              className="sf-dropdown-item"
                              onClick={() => {
                                setIsDropdownOpen(false)
                                setShowLinkInput(true)
                                setLinkInput("")
                                setTimeout(
                                  () =>
                                    document
                                      .getElementById("link-input-field")
                                      ?.focus(),
                                  50
                                )
                              }}
                            >
                              <IconLink size={18} stroke={1.75} /> Add Link
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        className="sf-upload-submit-btn"
                        disabled={isUploadDisabled() || isUploading}
                        onClick={handleUploadExecute}
                        style={{
                          position: "relative",
                          justifyContent: "center",
                        }}
                      >
                        <IconUpload
                          size={18}
                          stroke={2}
                          style={{ position: "absolute", left: "16px" }}
                        />
                        <span>
                          {isUploading ? "Uploading..." : "Upload to Drive"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* View Submitted Modal */}
          {showViewModal && viewingForm && (
            <div
              className="sf-modal-backdrop"
              onClick={() => setShowViewModal(false)}
            >
              <div className="sf-modal" onClick={(e) => e.stopPropagation()}>
                <div className="sf-modal-header">
                  <span className="sf-modal-title">
                    Submitted: {viewingForm.name}
                  </span>
                  <button
                    className="sf-modal-close"
                    onClick={() => setShowViewModal(false)}
                  >
                    <IconX size={18} stroke={2} />
                  </button>
                </div>
                <div className="sf-modal-body">
                  <div className="sf-modal-content">
                    {/* Submitted Links / Drive Web View */}
                    {viewingForm.submittedLinks &&
                      viewingForm.submittedLinks.length > 0 && (
                        <div className="sf-file-grid">
                          {viewingForm.submittedLinks.map((link, index) => (
                            <div key={index} className="sf-file-preview-card">
                              <div
                                className="sf-file-preview-icon-wrapper"
                                style={{
                                  background: "#E8EDE5",
                                  color: "#1B4332",
                                }}
                              >
                                <IconLink size={20} stroke={1.75} />
                              </div>
                              <div className="sf-file-preview-info">
                                <div
                                  className="sf-file-preview-name"
                                  style={{
                                    cursor: "pointer",
                                    color: "#1B4332",
                                    textDecoration: "underline",
                                  }}
                                  onClick={() => window.open(link, "_blank")}
                                >
                                  Open in Google Drive
                                </div>
                                <div className="sf-file-preview-meta">
                                  <span
                                    className="sf-file-preview-type"
                                    style={{ background: "#1B4332" }}
                                  >
                                    DRIVE
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    {(!viewingForm.submittedLinks ||
                      viewingForm.submittedLinks.length === 0) && (
                      <div className="sf-empty-state">
                        <IconFileText size={40} stroke={1.5} />
                        <p>No files submitted</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}