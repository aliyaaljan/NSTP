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
} from "@tabler/icons-react"
import StudentSidebar from "@/components/shared/StudentSidebar"
import {
  KpiStatCard,
  KpiStatCardGrid,
  ChartStyles,
} from "@/components/shared/ChartModule"
import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"
import {
  getMyForms,
  saveDriveSubmission,
  getStudentActiveEnrollmentId,
  type StudentFormView,
} from "@/lib/forms/submission-actions"

import { getTemplateDownloadUrl } from "@/lib/forms/requirement-actions"
// Styles
const studentFilesStyles = `
  .sf-root { display: flex; min-height: 100vh; background: #F0F0F0; font-family: var(--font-montserrat, 'Montserrat', sans-serif); font-size: 13px; color: #111827; }
  .sf-main { flex: 1; display: flex; flex-direction: column; padding: 28px 32px 28px 120px; min-width: 0; width: 100%; max-width: 100%; transition: padding 0.3s ease; }
  
  /* Header */
  .sf-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
  .sf-header-left { flex: 1; min-width: 200px; }
  .sf-header-title { font-size: 34px; font-weight: 800; color: #7B1D1D; font-family: var(--font-montserrat, 'Montserrat', sans-serif); margin: 0; letter-spacing: -0.01em; }
  .sf-header-sub { font-size: 13px; color: #6B7280; margin: 4px 0 0 0; font-weight: 500; }
  .sf-profile-pill { display: flex; align-items: center; gap: 10px; background: #7B1D1D; border-radius: 24px; padding: 4px 16px 4px 4px; flex-shrink: 0; }
  .sf-profile-avatar { width: 38px; height: 38px; border-radius: 50%; background: #C8A84B; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; color: #7B1D1D; flex-shrink: 0; }
  .sf-profile-name { color: #FFFFFF; font-size: 13px; font-weight: 600; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sf-profile-section { color: #C8A84B; font-size: 11px; line-height: 1.2; font-weight: 500; }

  
  /* Table Card */
  .sf-adv-table-card {
    background: #FFFFFF;
    border: 1px solid #E5E7EB;
    border-radius: 14px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.07);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    width: 100%;
  }
  .sf-adv-table-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #E5E7EB;
    background: #FFFFFF;
  }
  .sf-adv-table-title { font-weight: 700; font-size: 15px; color: #111827; }
  .sf-adv-table-count { font-size: 12px; color: #6B7280; margin-top: 2px; }
  .sf-adv-search-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1.5px solid #7B1D1D;
    border-radius: 999px;
    padding: 8px 18px;
    min-width: 280px;
    background: #FFFFFF;
    transition: border-color 0.15s;
  }
  .sf-adv-search-bar:focus-within { border-color: #1B4332; }
  .sf-adv-search-input {
    border: none;
    outline: none;
    font-size: 13px;
    font-family: var(--font-montserrat, 'Montserrat', sans-serif);
    color: #111827;
    width: 100%;
    background: transparent;
  }
  .sf-adv-search-input::placeholder { color: #9CA3AF; }
  .sf-adv-filter-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    border: none;
    border-radius: 999px;
    padding: 8px 18px;
    background: #1B4332;
    font-size: 13px;
    font-family: var(--font-montserrat, 'Montserrat', sans-serif);
    font-weight: 500;
    cursor: pointer;
    color: #FFFFFF;
    transition: background 0.13s;
  }
  .sf-adv-filter-btn:hover { background: #14532D; }
  .sf-adv-filter-btn svg { color: #FFFFFF; }
  
  .sf-adv-table-wrapper {
    overflow-y: auto;
    max-height: calc(100vh - 420px);
    scrollbar-width: thin;
    scrollbar-color: #CFCFCB transparent;
  }
  .sf-adv-table-wrapper::-webkit-scrollbar { width: 5px; }
  .sf-adv-table-wrapper::-webkit-scrollbar-thumb { background: #CFCFCB; border-radius: 999px; }
  
  .sf-adv-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  .sf-adv-table thead tr {
    background: #F9FAFB;
    border-bottom: 1px solid #E5E7EB;
  }
  .sf-adv-table thead th {
    position: sticky;
    top: 0;
    z-index: 2;
    background: #F9FAFB;
    padding: 10px 20px;
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    color: #7B1D1D;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
    transition: background 0.2s ease;
  }
  .sf-adv-table thead th:hover {
    background: #F5F5F7;
  }
  .sf-adv-table thead th:last-child { text-align: center; cursor: default; }
  .sf-adv-table thead th:last-child:hover { background: #F9FAFB; }
  .sf-adv-table thead th .sf-sort-icons {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    margin-left: 4px;
    vertical-align: middle;
    line-height: 1;
  }
  .sf-adv-table thead th .sf-sort-icons svg {
    display: block;
    transition: all 0.2s ease;
  }
  .sf-adv-table thead th .sf-sort-icons .sf-sort-up,
  .sf-adv-table thead th .sf-sort-icons .sf-sort-down {
    opacity: 0.5;
    color: #4A4A4A;
  }
  .sf-adv-table thead th:hover .sf-sort-icons .sf-sort-up,
  .sf-adv-table thead th:hover .sf-sort-icons .sf-sort-down {
    opacity: 0.8;
    color: #1A1A1A;
  }
  .sf-adv-table thead th .sf-sort-icons .sf-sort-up.active {
    opacity: 1 !important;
    color: #7B1D1D !important;
  }
  .sf-adv-table thead th .sf-sort-icons .sf-sort-down.active {
    opacity: 1 !important;
    color: #7B1D1D !important;
  }
  .sf-adv-table td {
    padding: 14px 20px;
    border-bottom: 1px solid #F3F4F6;
    vertical-align: middle;
    font-size: 13px;
  }
  .sf-adv-table tbody tr:last-child td { border-bottom: none; }
  .sf-adv-table tbody tr { cursor: default; transition: background 0.12s; }
  .sf-adv-table tbody tr:hover td { background: #FAFAFA; }
  .sf-adv-empty {
    text-align: center;
    padding: 48px 0;
    color: #6B7280;
    font-size: 13px;
  }
  
  .sf-form-name {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 500;
    color: #111827;
  }
  .sf-form-icon { color: #1B4332; flex-shrink: 0; transition: color 0.2s ease; }
  .sf-deadline {
    color: #6B7280;
    font-size: 13px;
    text-align: center;
  }
  .sf-status-cell { text-align: center; }
  .sf-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 20px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    background: #E8EDE5;
    color: #1B4332;
    min-width: 100px;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .sf-status-badge:hover {
    opacity: 0.85;
    transform: scale(1.02);
  }
  .sf-status-badge-submitted {
    background: #D1FAE5;
    color: #065F46;
  }
  .sf-upload-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 20px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    background: #1B4332;
    color: #FFFFFF;
    border: none;
    cursor: pointer;
    transition: opacity 0.2s ease;
    font-family: var(--font-montserrat, 'Montserrat', sans-serif);
    white-space: nowrap;
    min-width: 100px;
    justify-content: center;
  }
  .sf-upload-btn:hover { opacity: 0.85; }
  
  .sf-adv-pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    border-top: 1px solid #E5E7EB;
    position: relative;
  }
  .sf-adv-pagination-info { font-size: 12px; color: #6B7280; }
  .sf-adv-pagination-controls {
    display: flex;
    align-items: center;
    gap: 4px;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
  }
  .sf-adv-page-btn {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: 1px solid #E5E7EB;
    background: #FFFFFF;
    font-size: 12px;
    font-family: var(--font-montserrat, 'Montserrat', sans-serif);
    font-weight: 500;
    color: #111827;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.12s, border-color 0.12s;
  }
  .sf-adv-page-btn:hover:not(.sf-adv-page-btn-active):not(:disabled) {
    background: #F9FAFB;
    border-color: #9CA3AF;
  }
  .sf-adv-page-btn.sf-adv-page-btn-active {
    background: #7B1D1D;
    color: #FFFFFF;
    border-color: #7B1D1D;
    font-weight: 700;
  }
  .sf-adv-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  
  /* Modal */
  .sf-modal-backdrop {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    background: rgba(0,0,0,0.35);
    backdrop-filter: blur(2px);
    padding: 16px;
  }
  .sf-modal {
    width: 100%;
    max-width: 480px;
    background: #FFFFFF;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.12);
    margin: 16px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
  }
  .sf-modal-header {
    padding: 16px 24px;
    background: #1B4332;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }
  .sf-modal-title {
    color: #FFFFFF;
    font-size: 13px;
    font-weight: 700;
    word-break: break-word;
    margin-right: 12px;
  }
  .sf-modal-close {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #FFFFFF;
  }
  .sf-modal-close:hover { opacity: 0.7; }
  .sf-modal-body { 
    padding: 24px; 
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .sf-modal-content {
    flex: 1;
    overflow-y: auto;
  }
  .sf-modal-footer {
    padding-top: 16px;
    border-top: 1px solid #E5E7EB;
    margin-top: 16px;
    flex-shrink: 0;
  }

  /* Add Button */
  .sf-add-btn-wrapper {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
  }
  .sf-add-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 12px 20px;
    background: transparent;
    border: 2px solid #1B4332;
    border-radius: 10px;
    color: #1B4332;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: var(--font-montserrat, 'Montserrat', sans-serif);
  }
  .sf-add-btn:hover {
    background: rgba(27, 67, 50, 0.05);
    border-color: #14532D;
  }
  .sf-add-btn svg {
    flex-shrink: 0;
    transition: transform 0.3s ease;
  }
  .sf-add-btn .sf-add-icon-rotated {
    transform: rotate(45deg);
  }
  
  .sf-upload-submit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 12px 20px;
    background: #1B4332;
    border: 2px solid #1B4332;
    border-radius: 10px;
    color: #FFFFFF;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: var(--font-montserrat, 'Montserrat', sans-serif);
  }
  .sf-upload-submit-btn:hover:not(:disabled) {
    background: #14532D;
    border-color: #14532D;
  }
  .sf-upload-submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .sf-upload-submit-btn svg {
    flex-shrink: 0;
  }
  
  /* Dropdown container */
  .sf-add-dropdown {
    position: relative;
    width: 100%;
  }
  .sf-dropdown-menu {
    position: absolute;
    bottom: calc(100% + 4px);
    left: 0;
    right: 0;
    background: #FFFFFF;
    border: 1px solid #E5E7EB;
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    overflow: hidden;
    z-index: 10;
  }
  .sf-dropdown-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 12px 16px;
    background: none;
    border: none;
    font-family: var(--font-montserrat, 'Montserrat', sans-serif);
    font-size: 13px;
    font-weight: 500;
    color: #111827;
    cursor: pointer;
    transition: background 0.15s ease;
    text-align: left;
  }
  .sf-dropdown-item:hover {
    background: #F5F5F7;
  }
  .sf-dropdown-item svg {
    color: #6B7280;
    flex-shrink: 0;
  }
  
  /* File Preview Cards */
  .sf-file-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 300px;
    overflow-y: auto;
    padding-right: 4px;
    margin-bottom: 16px;
  }
  .sf-file-grid::-webkit-scrollbar { width: 4px; }
  .sf-file-grid::-webkit-scrollbar-thumb { background: #CFCFCB; border-radius: 999px; }
  
  .sf-file-preview-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 16px;
    background: #F9FAFB;
    border-radius: 10px;
    border: 1px solid #E5E7EB;
    transition: all 0.2s ease;
  }
  .sf-file-preview-card:hover {
    background: #F3F4F6;
  }
  .sf-file-preview-icon-wrapper {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: #E8EDE5;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #1B4332;
  }
  .sf-file-preview-info {
    flex: 1;
    min-width: 0;
  }
  .sf-file-preview-name {
    font-size: 13px;
    font-weight: 600;
    color: #111827;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sf-file-preview-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 2px;
  }
  .sf-file-preview-type {
    font-size: 10px;
    font-weight: 700;
    color: #FFFFFF;
    background: #1B4332;
    padding: 2px 10px;
    border-radius: 12px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .sf-file-preview-size {
    font-size: 11px;
    color: #6B7280;
  }
  .sf-file-preview-remove {
    background: none;
    border: none;
    color: #9CA3AF;
    cursor: pointer;
    padding: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    flex-shrink: 0;
    border-radius: 6px;
  }
  .sf-file-preview-remove:hover {
    color: #7B1D1D;
    background: #FEE2E2;
  }

  .sf-empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #9CA3AF;
    font-size: 13px;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .sf-empty-state svg {
    color: #D1D5DB;
    margin-bottom: 12px;
  }
  .sf-empty-state p {
    margin: 0;
  }
  .sf-empty-state .sf-empty-sub {
    font-size: 11px;
    margin-top: 4px;
  }

  /* Link Input */
  .sf-link-input-container {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: #E8EDE5;
    border-radius: 10px;
    border: 1px solid #8AAE8A;
    margin-bottom: 12px;
    transition: border-color 0.2s ease, background 0.2s ease;
  }
  .sf-link-input-container:focus-within {
    border-color: #1B4332;
    background: #F0F7F0;
  }
  .sf-link-input-container svg {
    color: #1B4332;
    flex-shrink: 0;
  }
  .sf-link-input {
    border: none;
    outline: none;
    background: transparent;
    font-size: 13px;
    font-family: var(--font-montserrat, 'Montserrat', sans-serif);
    color: #111827;
    width: 100%;
  }
  .sf-link-input::placeholder {
    color: #9CA3AF;
  }
  .sf-link-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    background: #1B4332;
    border: none;
    border-radius: 6px;
    color: #FFFFFF;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: var(--font-montserrat, 'Montserrat', sans-serif);
    flex-shrink: 0;
  }
  .sf-link-add-btn:hover:not(:disabled) {
    background: #14532D;
  }
  .sf-link-add-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .sf-link-cancel-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 16px;
    background: transparent;
    border: 1px solid #B0B0B0;
    border-radius: 6px;
    color: #666666;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: var(--font-montserrat, 'Montserrat', sans-serif);
    flex-shrink: 0;
  }
  .sf-link-cancel-btn:hover {
    background: #F0F0F0;
    border-color: #888888;
    color: #444444;
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .sf-main {
      padding: 20px 16px !important;
      padding-bottom: 90px !important;
    }
    .sf-dropdown-menu {
      bottom: calc(100% + 4px);
    }
  }

  @media (max-width: 480px) {
    .sf-main {
      padding: 16px 12px !important;
      padding-bottom: 80px !important;
    }
  }
`

// Data
interface Form {
  id: string
  name: string
  deadline: string
  status: "uploaded" | "pending"
  fileUrl?: string
  fileType?: string
  submittedFiles?: { name: string; type: string; size: string; url?: string }[]
  submittedLinks?: string[]
}

const forms: Form[] = [
  {
    id: "1",
    name: "Community Service Log Sheet",
    deadline: "July 17, 2026",
    status: "uploaded",
    fileUrl: "/sample.pdf",
    fileType: "PDF",
    submittedFiles: [
      {
        name: "community_service_log.pdf",
        type: "PDF",
        size: "2.4 MB",
        url: "/sample.pdf",
      },
    ],
    submittedLinks: ["https://docs.google.com/spreadsheets/d/example"],
  },
  {
    id: "2",
    name: "Project Proposal Form",
    deadline: "July 17, 2026",
    status: "pending",
  },
  {
    id: "3",
    name: "Progress Report Form",
    deadline: "July 24, 2026",
    status: "pending",
  },
  {
    id: "4",
    name: "Final Evaluation Form",
    deadline: "July 30, 2026",
    status: "pending",
  },
]

const student = {
  initials: "MK",
  displayName: "Kim, Mingyu",
  section: "NSTP - H",
}

type SortField = "name" | "deadline" | null
type SortDirection = "asc" | "desc" | null

// Components
function FormsTable({ forms }: { forms: Form[] }) {
  const [showModal, setShowModal] = useState(false)
  const [selectedForm, setSelectedForm] = useState<Form | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewingForm, setViewingForm] = useState<Form | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [activeFilter, setActiveFilter] = useState<string>("All")
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [links, setLinks] = useState<string[]>([])
  const [linkInput, setLinkInput] = useState("")
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pageSize = 5

  // Click outside handler
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

  const uploadedCount = forms.filter((f) => f.status === "uploaded").length
  const totalCount = forms.length

  const submittedColor = {
    bg: "#C8D8C0",
    text: "#2D5C3A",
    border: "#8AAE8A",
    icon: "#3A7A4A",
  }

  const pendingColor = {
    bg: "#F5E6C0",
    text: "#8B5E1A",
    border: "#D4A840",
    icon: "#C8882A",
  }

  const stats = [
    {
      label: "Submitted",
      value: uploadedCount,
      icon: "ti-circle-check",
      color: submittedColor,
    },
    {
      label: "Pending",
      value: totalCount - uploadedCount,
      icon: "ti-clock",
      color: pendingColor,
    },
  ]

  // Filter and search
  const filteredForms = forms.filter((form) => {
    if (
      activeFilter !== "All" &&
      form.status !== (activeFilter === "Submitted" ? "uploaded" : "pending")
    ) {
      return false
    }
    // Search filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim()
      return form.name.toLowerCase().includes(query)
    }
    return true
  })

  // Sort forms
  const sortedForms = useMemo(() => {
    if (!sortField || !sortDirection) {
      return filteredForms
    }

    return [...filteredForms].sort((a, b) => {
      let comparison = 0
      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name)
      } else if (sortField === "deadline") {
        comparison =
          new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      }
      return sortDirection === "asc" ? comparison : -comparison
    })
  }, [filteredForms, sortField, sortDirection])

  // Sort click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // asc -> desc -> null
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else if (sortDirection === "desc") {
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

  const handleFilterChange = (label: string) => {
    if (activeFilter === label) {
      setActiveFilter("All")
    } else {
      setActiveFilter(label)
    }
    setCurrentPage(1)
  }

  const getSortIcons = (field: SortField) => {
    const isActive = sortField === field
    const isAsc = isActive && sortDirection === "asc"
    const isDesc = isActive && sortDirection === "desc"

    return (
      <span className="sf-sort-icons">
        <IconChevronUp
          size={12}
          stroke={2}
          className={`sf-sort-up ${isAsc ? "active" : ""}`}
          style={{
            marginBottom: -2,
          }}
        />
        <IconChevronDownArrow
          size={12}
          stroke={2}
          className={`sf-sort-down ${isDesc ? "active" : ""}`}
          style={{
            marginTop: -2,
          }}
        />
      </span>
    )
  }

  // File size format
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // File extension and type
  const getFileType = (file: File) => {
    const name = file.name.toLowerCase()
    if (name.endsWith(".pdf")) return "PDF"
    if (name.endsWith(".doc") || name.endsWith(".docx")) return "DOC"
    if (
      name.endsWith(".xls") ||
      name.endsWith(".xlsx") ||
      name.endsWith(".csv")
    )
      return "XLS"
    if (name.endsWith(".ppt") || name.endsWith(".pptx")) return "PPT"
    if (
      name.endsWith(".jpg") ||
      name.endsWith(".jpeg") ||
      name.endsWith(".png") ||
      name.endsWith(".gif") ||
      name.endsWith(".webp")
    )
      return "IMG"
    if (name.endsWith(".zip") || name.endsWith(".rar") || name.endsWith(".7z"))
      return "ZIP"
    if (name.endsWith(".txt")) return "TXT"
    return "FILE"
  }

  const getFileIcon = (file: File) => {
    const name = file.name.toLowerCase()

    if (name.endsWith(".pdf")) {
      return <IconFile size={20} stroke={1.75} style={{ color: "#1B4332" }} />
    }
    if (name.endsWith(".doc") || name.endsWith(".docx")) {
      return <IconFile size={20} stroke={1.75} />
    }
    if (
      name.endsWith(".xls") ||
      name.endsWith(".xlsx") ||
      name.endsWith(".csv")
    ) {
      return <IconFile size={20} stroke={1.75} />
    }
    if (name.endsWith(".ppt") || name.endsWith(".pptx")) {
      return <IconFile size={20} stroke={1.75} />
    }
    if (
      name.endsWith(".jpg") ||
      name.endsWith(".jpeg") ||
      name.endsWith(".png") ||
      name.endsWith(".gif") ||
      name.endsWith(".webp")
    ) {
      return <IconPhoto size={20} stroke={1.75} />
    }
    if (
      name.endsWith(".zip") ||
      name.endsWith(".rar") ||
      name.endsWith(".7z")
    ) {
      return <IconFileZip size={20} stroke={1.75} />
    }
    return <IconFile size={20} stroke={1.75} />
  }

  const isUploadDisabled = () => {
    return selectedFiles.length === 0 && links.length === 0
  }

  const handleUpload = () => {
    const fileNames = selectedFiles.map((f) => f.name).join("\n")
    const linkList = links.join("\n")
    alert(
      `Uploading:\n${fileNames ? "Files:\n" + fileNames : ""}${
        fileNames && linkList ? "\n\n" : ""
      }${linkList ? "Links:\n" + linkList : ""}`
    )
    setShowModal(false)
    setSelectedFiles([])
    setLinks([])
    setLinkInput("")
    setShowLinkInput(false)
    setIsDropdownOpen(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setSelectedFiles((prev) => [...prev, ...newFiles])
    }
    setIsDropdownOpen(false)
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const removeLink = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index))
  }

  const addLink = () => {
    if (linkInput.trim() && linkInput.trim().startsWith("http")) {
      setLinks((prev) => [...prev, linkInput.trim()])
      setLinkInput("")
      setShowLinkInput(false)
    }
  }

  const handleLinkKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addLink()
    }
    if (e.key === "Escape") {
      setShowLinkInput(false)
      setLinkInput("")
    }
  }

  const selectAddMode = (mode: "file" | "link") => {
    setIsDropdownOpen(false)
    if (mode === "file") {
      document.getElementById("file-input")?.click()
    }
    if (mode === "link") {
      setShowLinkInput(true)
      setLinkInput("")
      setTimeout(() => {
        document.getElementById("link-input-field")?.focus()
      }, 50)
    }
  }

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen)
  }

  return (
    <>
      <ChartStyles />

      {/* Stat Cards */}
      <KpiStatCardGrid columns={2}>
        {stats.map((stat) => {
          const isHovered = hoveredCard === stat.label
          const isActive = activeFilter === stat.label

          return (
            <div
              key={stat.label}
              onClick={() => handleFilterChange(stat.label)}
              onMouseEnter={() => setHoveredCard(stat.label)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                cursor: "pointer",
                borderRadius: COLORS.radius,
                overflow: "hidden",
                background: COLORS.cardBg,
                color: isHovered || isActive ? stat.color.icon : "#000000",
                border: `2px solid ${
                  isHovered || isActive ? stat.color.icon : COLORS.border
                }`,
                transition: "all .18s ease",
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
      <div className="sf-adv-table-card">
        {/* Toolbar */}
        <div className="sf-adv-table-toolbar">
          <div>
            <div className="sf-adv-table-title">
              {activeFilter === "All" ? "All Forms" : `${activeFilter} Forms`}
            </div>
            <div className="sf-adv-table-count">
              {sortedForms.length} form{sortedForms.length !== 1 ? "s" : ""}{" "}
              found
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginLeft: "auto",
            }}
          >
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
            <button className="sf-adv-filter-btn">
              <IconFilter size={16} stroke={2} />
              Filter
            </button>
          </div>
        </div>

        {/* Table */}
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
                    File
                    {getSortIcons("name")}
                  </th>
                  <th
                    style={{ width: "25%", textAlign: "center" }}
                    onClick={() => handleSort("deadline")}
                  >
                    Deadline
                    {getSortIcons("deadline")}
                  </th>
                  <th style={{ width: "30%", textAlign: "center" }}>Status</th>
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
                      </div>
                    </td>
                    <td className="sf-deadline">{form.deadline}</td>
                    <td className="sf-status-cell">
                      {form.status === "uploaded" ? (
                        <span
                          className="sf-status-badge sf-status-badge-submitted"
                          onClick={() => handleViewClick(form)}
                        >
                          <IconEye size={14} stroke={2} />
                          Submitted
                        </span>
                      ) : (
                        <button
                          className="sf-upload-btn"
                          onClick={() => handleUploadClick(form)}
                        >
                          <IconUpload size={14} stroke={2.5} />
                          Upload
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="sf-adv-pagination">
          <div className="sf-adv-pagination-info">
            Showing{" "}
            {sortedForms.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, sortedForms.length)} of{" "}
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
            {filteredTotalPages > 5 && (
              <>
                <span style={{ color: "#6B7280", fontSize: 12 }}>...</span>
                <button
                  className="sf-adv-page-btn"
                  onClick={() => setCurrentPage(filteredTotalPages)}
                >
                  {filteredTotalPages}
                </button>
              </>
            )}
            <button
              className="sf-adv-page-btn"
              disabled={
                currentPage === filteredTotalPages || sortedForms.length === 0
              }
              onClick={() =>
                setCurrentPage((p) => Math.min(filteredTotalPages, p + 1))
              }
            >
              &#8250;
            </button>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "#6B7280",
            }}
          >
            <span>Rows per page:</span>
            <select
              style={{
                border: "1.5px solid #E5E7EB",
                borderRadius: 8,
                padding: "4px 8px",
                fontSize: 12,
                fontFamily: "var(--font-montserrat, 'Montserrat', sans-serif)",
                color: "#111827",
                background: "#FFFFFF",
                cursor: sortedForms.length === 0 ? "not-allowed" : "pointer",
                outline: "none",
                opacity: sortedForms.length === 0 ? 0.5 : 1,
              }}
              disabled={sortedForms.length === 0}
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

      {/* Upload Modal */}
      {showModal && selectedForm && (
        <div className="sf-modal-backdrop" onClick={() => setShowModal(false)}>
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
                  onChange={handleFileSelect}
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
                      onKeyDown={handleLinkKeyDown}
                    />
                    <button
                      className="sf-link-add-btn"
                      onClick={addLink}
                      disabled={
                        !linkInput.trim() ||
                        !linkInput.trim().startsWith("http")
                      }
                    >
                      <IconPlus
                        size={14}
                        stroke={2}
                        style={{ color: "#FFFFFF" }}
                      />
                      Add
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

                {selectedFiles.length > 0 && (
                  <div className="sf-file-grid">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="sf-file-preview-card">
                        <div className="sf-file-preview-icon-wrapper">
                          {getFileIcon(file)}
                        </div>
                        <div className="sf-file-preview-info">
                          <div className="sf-file-preview-name">
                            {file.name}
                          </div>
                          <div className="sf-file-preview-meta">
                            <span className="sf-file-preview-type">
                              {getFileType(file)}
                            </span>
                            <span className="sf-file-preview-size">
                              {formatFileSize(file.size)}
                            </span>
                          </div>
                        </div>
                        <button
                          className="sf-file-preview-remove"
                          onClick={() => removeFile(index)}
                          title="Remove file"
                        >
                          <IconX size={18} stroke={2} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {links.length > 0 && (
                  <div className="sf-file-grid">
                    {links.map((link, index) => (
                      <div key={index} className="sf-file-preview-card">
                        <div
                          className="sf-file-preview-icon-wrapper"
                          style={{ background: "#E8EDE5", color: "#1B4332" }}
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
                            <span className="sf-file-preview-size">
                              {link.replace(/^https?:\/\//, "").split("/")[0]}
                            </span>
                          </div>
                        </div>
                        <button
                          className="sf-file-preview-remove"
                          onClick={() => removeLink(index)}
                          title="Remove link"
                        >
                          <IconX size={18} stroke={2} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {selectedFiles.length === 0 &&
                  links.length === 0 &&
                  !showLinkInput && (
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
                      onClick={toggleDropdown}
                      style={{ position: "relative", justifyContent: "center" }}
                    >
                      <IconPlus
                        size={18}
                        stroke={2}
                        className={isDropdownOpen ? "sf-add-icon-rotated" : ""}
                        style={{ position: "absolute", left: "16px" }}
                      />
                      <span>Add</span>
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
                          onClick={() => selectAddMode("file")}
                        >
                          <IconFile size={18} stroke={1.75} />
                          Add File
                        </button>
                        <button
                          className="sf-dropdown-item"
                          onClick={() => selectAddMode("link")}
                        >
                          <IconLink size={18} stroke={1.75} />
                          Add Link
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    className="sf-upload-submit-btn"
                    disabled={isUploadDisabled()}
                    onClick={handleUpload}
                    style={{ position: "relative", justifyContent: "center" }}
                  >
                    <IconUpload
                      size={18}
                      stroke={2}
                      style={{ position: "absolute", left: "16px" }}
                    />
                    <span>Upload</span>
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
                {/* Submitted Files */}
                {viewingForm.submittedFiles &&
                  viewingForm.submittedFiles.length > 0 && (
                    <div className="sf-file-grid">
                      {viewingForm.submittedFiles.map((file, index) => (
                        <div key={index} className="sf-file-preview-card">
                          <div className="sf-file-preview-icon-wrapper">
                            <IconFile
                              size={20}
                              stroke={1.75}
                              style={{ color: "#1B4332" }}
                            />
                          </div>
                          <div className="sf-file-preview-info">
                            <div
                              className="sf-file-preview-name"
                              style={{
                                cursor: "pointer",
                                color: "#1B4332",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                file.url && window.open(file.url, "_blank")
                              }
                            >
                              {file.name}
                            </div>
                            <div className="sf-file-preview-meta">
                              <span className="sf-file-preview-type">
                                {file.type}
                              </span>
                              <span className="sf-file-preview-size">
                                {file.size}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                {/* Submitted Links */}
                {viewingForm.submittedLinks &&
                  viewingForm.submittedLinks.length > 0 && (
                    <div className="sf-file-grid">
                      {viewingForm.submittedLinks.map((link, index) => (
                        <div key={index} className="sf-file-preview-card">
                          <div
                            className="sf-file-preview-icon-wrapper"
                            style={{ background: "#E8EDE5", color: "#1B4332" }}
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
                              {link}
                            </div>
                            <div className="sf-file-preview-meta">
                              <span
                                className="sf-file-preview-type"
                                style={{ background: "#1B4332" }}
                              >
                                LINK
                              </span>
                              <span className="sf-file-preview-size">
                                {link.replace(/^https?:\/\//, "").split("/")[0]}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                {(!viewingForm.submittedFiles ||
                  viewingForm.submittedFiles.length === 0) &&
                  (!viewingForm.submittedLinks ||
                    viewingForm.submittedLinks.length === 0) && (
                    <div className="sf-empty-state">
                      <IconFileText size={40} stroke={1.5} />
                      <p>No files or links submitted</p>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function StudentFilesPage() {
  return (
    <>
      <style>{studentFilesStyles}</style>
      <div className="sf-root">
        <StudentSidebar />
        <main className="sf-main">
          <div className="sf-header">
            <div className="sf-header-left">
              <h1 className="sf-header-title">Forms &amp; Documents</h1>
            </div>
            <div className="sf-profile-pill">
              <div className="sf-profile-avatar">{student.initials}</div>
              <div style={{ minWidth: 0 }}>
                <div className="sf-profile-name">{student.displayName}</div>
                <div className="sf-profile-section">{student.section}</div>
              </div>
            </div>
          </div>
          <FormsTable forms={forms} />
        </main>
      </div>
    </>
  )
}
