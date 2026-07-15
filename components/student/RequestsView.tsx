//hi po hehe may mga red (errors) pa sha pero working po 'yang code wahahaha

"use client"

import { useEffect, useState, useTransition, useRef } from "react"
import { Montserrat } from "next/font/google"
import StudentSidebar from "@/components/shared/ResponsiveStudentSidebar"
import ProfilePill from "@/components/shared/StudentProfilePill"
import { getStudentDashboard } from "@/lib/student/dashboard-actions"
import { getInitials } from "@/lib/student/dashboard-view"
import {
  getStudentRequests,
  submitStudentRequest,
  updateStudentRequest,
  cancelStudentRequest,
} from "@/lib/student/appeal-actions"
import {
  getMySessionsForRequest,
  type RequestSessionOption,
} from "@/lib/student/attendance-history-actions"
import TimeCorrectionFields from "@/components/student/TimeCorrectionFields"
import {
  EMPTY_TIME_CORRECTION,
  buildStructuredCorrection,
  inferTimeCorrectionState,
  type StructuredCorrection,
  type TimeCorrectionState,
} from "@/lib/student/time-correction"
import { createClient } from "@/lib/client"
import { AdminFilterPanel } from "@/components/shared/AdminFilterPanel"
import {
  KpiStatCard,
  KpiStatCardGrid,
  ChartStyles,
} from "@/components/shared/ChartModule"
import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"
import SuccessModal from "@/components/shared/SuccessModal" //saffi - hehe syempre import muna
import {
  IconX,
  IconCircleCheck,
  IconHourglass,
  IconClock,
  IconCircleX,
  IconFilter,
  IconChevronUp,
  IconChevronDown,
} from "@tabler/icons-react"
import LoadingPage from "@/components/shared/LoadingPage"
import { useStudent } from "@/app/student/StudentContext"
import { IconUpload } from "@tabler/icons-react"

const MAX_NUM_ATTACHMENT = 1

function checkDuplicateName(
  filename: string,
  existingNames: Set<string>
): string {
  const i = filename.lastIndexOf(".")
  const extension = i !== -1 ? filename.slice(i) : ""
  const base = i !== -1 ? filename.slice(0, i) : filename

  let final = filename
  let count = 1

  while (existingNames.has(final)) {
    final = `${base}${count}${extension}`
    count++
  }

  existingNames.add(final)
  return final
}

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
})

const C = {
  maroon: "#6B1A1A",
  green: "#1A3C2D",
  gold: "#C8963C",
  pageBg: "#F0F0F0",
  border: "#D9D9D9",
  textDark: "#2C2C2A",
  textMuted: "#7A7A7A",

  approved: {
    bg: "#E8F2E3", //to be checked pa po ulit kasi no reference atm
    text: "#2D5C3A",
    border: "#8AAE8A",
    icon: "#3A7A4A",
  },

  review: {
    bg: "#FFF4D6",
    text: "#8B5E1A",
    border: "#D4A840",
    icon: "#C8882A",
  },

  declined: {
    bg: "#F4E3E3", //to be checked pa po ulit kasi no reference atm
    text: "#6B1A1A",
    border: "#B08080",
    icon: "#8B3A3A",
  },
}

interface RequestItem {
  id: string
  title: string
  status:
    | "Pending Review"
    | "Under Review"
    | "Approved"
    | "Declined"
    | "Rejected"
    | "Canceled"
  type: string
  body: string
  note: string
  date: string
  lastEdited?: string | null
  attachments?: { storage_path: string; file_name: string }[]
  attendanceSessionId?: string | null
  requestedTimeIn?: string | null
  requestedTimeOut?: string | null
}

const LEADER_ROLE_TRANSFER_CODE = "leader role transfer"

function StatusBadge({ status }: { status: RequestItem["status"] }) {
  const map = {
    Approved: {
      ...C.approved,
      icon: "ti-circle-check",
    },

    "Under Review": {
      ...C.review,
      icon: "ti-clock",
    },

    "Pending Review": {
      ...C.review,
      icon: "ti-hourglass",
    },

    Declined: {
      ...C.declined,
      icon: "ti-circle-x",
    },
    Rejected: {
      ...C.declined,
      icon: "ti-circle-x",
    },

    // SAMPLE STYLING
    Canceled: {
      bg: "#F3F4F6",
      text: "#6B7280",
      border: "#E5E7EB",
      icon: "ti-slash",
    },
  }

  const s = map[status] || map["Pending Review"]

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 14px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        background: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
      }}
    >
      <i
        className={`ti ${s.icon}`}
        style={{
          fontSize: 14,
          color: s.icon,
        }}
      />
      {/* If status is database 'Rejected', show 'Declined' visually to the student */}
      {status === "Rejected" ? "Declined" : status}
    </span>
  )
}

export default function RequestsView() {
  // Use StudentContext instead of fetching locally
  const { isLeader: isCurrentUserLeader, isLoading: contextLoading } =
    useStudent()

  const [showModal, setShowModal] = useState(false)
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false)
    
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(
    null
  )
  const [editTitle, setEditTitle] = useState("")
  const [editBody, setEditBody] = useState("")
  const [formTitle, setFormTitle] = useState("")
  const [formBody, setFormBody] = useState("")
  const [formFiles, setFormFiles] = useState<File[]>([])
  const [sessionOptions, setSessionOptions] = useState<RequestSessionOption[]>(
    []
  )
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [timeCorrection, setTimeCorrection] = useState<TimeCorrectionState>(
    EMPTY_TIME_CORRECTION
  )
  const [editTimeCorrection, setEditTimeCorrection] =
    useState<TimeCorrectionState>(EMPTY_TIME_CORRECTION)
  const [editFiles, setEditFiles] = useState<
    { storage_path: string; file_name: string }[]
  >([])
  const [editNewFiles, setEditNewFiles] = useState<File[]>([])
  const [activeFilter, setActiveFilter] = useState("All")
  const [editUploadZoneHover, setEditUploadZoneHover] = useState(false)

  const [requestSearch, setRequestSearch] = useState("")
  const [showRequestFilters, setShowRequestFilters] = useState(false)

  type RequestFilterField = "type"
  type ActiveRequestFilters = Partial<Record<RequestFilterField, string[]>>
  const [activeRequestFilters, setActiveRequestFilters] =
    useState<ActiveRequestFilters>({})

  const requestFilterRef = useRef<HTMLDivElement>(null)

  const [isPending, startTransition] = useTransition() // for loading states
  const [requests, setRequests] = useState<RequestItem[]>([]) // empty array
  const [loading, setLoading] = useState(true)

  const [requestType, setRequestTypes] = useState<
    { appeal_type_id: string; name: string; code: string }[]
  >([])
  const [formTypeId, setFormTypeId] = useState<string>("")
  const [editTypeId, setEditTypeId] = useState<string>("")
  const [selectedTypeId, setSelectedTypeId] = useState<string>("")
  const [uploadZoneHover, setUploadZoneHover] = useState(false)

  const isEditable =
    selectedRequest &&
    normalizeStatus(selectedRequest.status) === "pending review"

  const [profile, setProfile] = useState({
    enrollmentId: "",
    fullName: "",
    sectionName: "",
    avatarUrl: null as string | null,
  })

  // fetch profile and requests on load
  const loadRequests = async (enrollmentId: string) => {
    const res = await getStudentRequests(enrollmentId)
    if (res.ok) {
      console.log("requests:", res.data)
      setRequests(res.data)
    }
  }

  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    // Fetch dynamic request/appeal types from DB
    supabase
      .from("appeal_type")
      .select("appeal_type_id, name, code")
      .order("name")
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error("appeal_type fetch error:", error.message)
          return
        }
        if (data) {
          setRequestTypes(data)
          if (data.length > 0) setFormTypeId(data[0].appeal_type_id)
        }
      })

    getStudentDashboard().then((res) => {
      if (cancelled || !res.ok) return
      setProfile({
        enrollmentId: res.data.enrollmentId ?? "",
        fullName: res.data.fullName,
        sectionName: res.data.sectionName ?? "",
        avatarUrl: res.data.avatarUrl ?? null,
      })
      if (res.data.enrollmentId) loadRequests(res.data.enrollmentId)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Load the student's sessions for the structured time-correction picker
  // (needed by both the Add and Edit modals).
  useEffect(() => {
    if (!showModal && !selectedRequest) return
    setSessionsLoading(true)
    getMySessionsForRequest().then((res) => {
      if (res.ok) setSessionOptions(res.data)
      setSessionsLoading(false)
    })
  }, [showModal, selectedRequest])

  // real-time hook for
  useEffect(() => {
    if (!profile.enrollmentId) return

    const channel = supabase
      .channel("student-appeal-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appeal" },
        (payload) => {
          // Silently refresh the list when faci changes status
          loadRequests(profile.enrollmentId)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile.enrollmentId, supabase])

  // Seed the edit modal's time-correction state once per open, inferring the
  // scenario from the stored session/times. inferTimeCorrectionState doesn't need
  // sessionOptions, so we key only on selectedRequest to avoid clobbering edits
  // when the session list arrives.
  useEffect(() => {
    if (!selectedRequest) return
    setEditTimeCorrection(
      inferTimeCorrectionState(selectedRequest, sessionOptions)
    )
    setEditNewFiles([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRequest])

  const counts = {
    Approved: requests.filter(
      (r) => r.status?.trim().toLowerCase() === "approved"
    ).length,
    "Pending Review": requests.filter(
      (r) => r.status?.trim().toLowerCase() === "pending review"
    ).length,

    "Under Review": requests.filter(
      (r) => r.status?.trim().toLowerCase() === "under review"
    ).length,
    Declined: requests.filter((r) => {
      const status = r.status?.trim().toLowerCase()
      return (
        status === "declined" || status === "rejected" || status === "canceled"
      )
    }).length,
  }

  async function handleViewAttachment(storagePath: string) {
    const { data, error } = await supabase.storage
      .from("request-attachments")
      .createSignedUrl(storagePath, 60 * 20) // valid for 20 min

    if (error || !data?.signedUrl) {
      showError("Failed to open attachment")
      return
    }

    window.open(data.signedUrl, "_blank")
  }

  function handleSubmit() {
    if (
      !formTitle.trim() ||
      !formBody.trim() ||
      !profile.enrollmentId ||
      !formTypeId
    )
      return

    const selectedTypeObj = requestType.find(
      (t) => t.appeal_type_id === formTypeId
    )
    const typeName = selectedTypeObj ? selectedTypeObj.name : "Others"
    const isTimeRequest = typeName === "Hour Adjustment"

    let structured: StructuredCorrection | undefined
    if (isTimeRequest) {
      const built = buildStructuredCorrection(timeCorrection, sessionOptions)
      if (!built.ok) {
        showError(built.error)
        return
      }
      structured = built.value
    }

    startTransition(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        showError("Not authenticated")
        return
      }

      const { data: existingFiles, error: listError } = await supabase.storage
        .from("request-attachments")
        .list(user.id)

      if (listError) {
        showError(`Failed to check existing attachments: ${listError.message}`)
        return
      }

      const existingNames = new Set(existingFiles?.map((f) => f.name) ?? [])

      const uploadedAttachments: {
        storage_path: string
        file_name: string
        content_type: string
        file_size_byte: number
      }[] = []

      for (const file of formFiles) {
        const uniqueName = checkDuplicateName(file.name, existingNames)
        const path = `${user.id}/${uniqueName}`

        const { error: uploadError } = await supabase.storage
          .from("request-attachments")
          .upload(path, file)

        if (uploadError) {
          showError(`Failed to upload ${file.name}: ${uploadError.message}`)
          return
        }

        uploadedAttachments.push({
          storage_path: path,
          file_name: uniqueName,
          content_type: file.type,
          file_size_byte: file.size,
        })
      }

      const res = await submitStudentRequest(
        profile.enrollmentId,
        formTypeId,
        formTitle,
        formBody,
        uploadedAttachments,
        structured
      )

      if (res.ok) {
        await loadRequests(profile.enrollmentId)
        setFormTitle("")
        setFormBody("")
        setFormFiles([])
        setTimeCorrection(EMPTY_TIME_CORRECTION)
        setShowModal(false)
        addToast("Your request has been submitted successfully.", "success")
      } else {
        showError(res.error)
      }
    })
  }

  function hasChanges() {
    if (!selectedRequest) return false
    const originalType = requestType.find(
      (t) => t.name === selectedRequest.type
    )
    const originalTypeId = originalType?.appeal_type_id ?? ""

    // Time-correction dirty: compare the current form against the state inferred
    // from the stored request (the same baseline the edit modal was seeded with).
    const originalTc = inferTimeCorrectionState(selectedRequest, sessionOptions)
    const timeChanged =
      JSON.stringify(originalTc) !== JSON.stringify(editTimeCorrection)

    // Attachment dirty: a new upload queued, or an existing attachment removed.
    const originalPaths = (selectedRequest.attachments ?? []).map(
      (a) => a.storage_path
    )
    const keptPaths = editFiles.map((a) => a.storage_path)
    const removedAttachment = originalPaths.some((p) => !keptPaths.includes(p))

    return (
      editTitle.trim() !== selectedRequest.title.trim() ||
      editBody.trim() !== selectedRequest.body.trim() ||
      editTypeId !== originalTypeId ||
      timeChanged ||
      removedAttachment ||
      editNewFiles.length > 0
    )
  }
  function handleEditSave() {
    if (!profile.enrollmentId || !selectedRequest || !editTypeId) return

    const editTypeName =
      requestType.find((t) => t.appeal_type_id === editTypeId)?.name ?? ""
    const editIsTimeRequest = editTypeName === "Hour Adjustment"

    let structured: StructuredCorrection
    if (editIsTimeRequest) {
      const built = buildStructuredCorrection(
        editTimeCorrection,
        sessionOptions
      )
      if (!built.ok) {
        showError(built.error)
        return
      }
      structured = built.value
    } else {
      // Non-time category: clear any stale time-correction columns.
      structured = {
        attendanceSessionId: null,
        requestedTimeIn: null,
        requestedTimeOut: null,
      }
    }

    startTransition(async () => {
      const cleanBody = editBody.replace(/^Request:\s*/, "")

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        showError("Not authenticated")
        return
      }

      // Upload any newly-attached files (same flow as handleSubmit).
      const uploadedAttachments: {
        storage_path: string
        file_name: string
        content_type: string
        file_size_byte: number
      }[] = []

      if (editNewFiles.length > 0) {
        const { data: existingFiles, error: listError } = await supabase.storage
          .from("request-attachments")
          .list(user.id)
        if (listError) {
          showError(
            `Failed to check existing attachments: ${listError.message}`
          )
          return
        }
        const existingNames = new Set(existingFiles?.map((f) => f.name) ?? [])
        for (const file of editNewFiles) {
          const uniqueName = checkDuplicateName(file.name, existingNames)
          const path = `${user.id}/${uniqueName}`
          const { error: uploadError } = await supabase.storage
            .from("request-attachments")
            .upload(path, file)
          if (uploadError) {
            showError(`Failed to upload ${file.name}: ${uploadError.message}`)
            return
          }
          uploadedAttachments.push({
            storage_path: path,
            file_name: uniqueName,
            content_type: file.type,
            file_size_byte: file.size,
          })
        }
      }

      // Existing attachments the student removed in the modal.
      const originalPaths = (selectedRequest.attachments ?? []).map(
        (a) => a.storage_path
      )
      const keptPaths = editFiles.map((a) => a.storage_path)
      const removePaths = originalPaths.filter((p) => !keptPaths.includes(p))

      const res = await updateStudentRequest(
        selectedRequest.id,
        editTypeId,
        editTitle,
        cleanBody,
        structured,
        { toInsert: uploadedAttachments, removePaths }
      )
      if (res.ok) {
        await loadRequests(profile.enrollmentId)
        setSelectedRequest(null)
        setEditNewFiles([])
        setEditTimeCorrection(EMPTY_TIME_CORRECTION)
        addToast("Your request has been updated successfully.", "success")
      } else {
        showError(
          res.error ||
            "Failed to update request or it is no longer 'Pending Review'."
        )
      }
    })
  }

  const stats = [
    {
      label: "Approved",
      value: counts.Approved,
      icon: "ti-circle-check",
      color: C.approved,
    },
    {
      label: "Pending Review",
      value: counts["Pending Review"],
      icon: "ti-hourglass",
      color: C.review,
    },
    {
      label: "Under Review",
      value: counts["Under Review"],
      icon: "ti-clock",
      color: C.review,
    },
    {
      label: "Declined",
      value: counts.Declined,
      icon: "ti-circle-x",
      color: C.declined,
    },
  ]

  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  type SortField = "title" | "type" | "status" | "date"

  const [sortField, setSortField] = useState<SortField>("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  function normalizeStatus(status: string) {
    return status?.trim().toLowerCase()
  }

  function formatTimeValue(value?: string | null): string {
    if (!value) return ""

    if (value.includes("T") || (value.includes("-") && value.length > 8)) {
      const d = new Date(value)
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      }
    }

    const match = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
    if (match) {
      const hours = parseInt(match[1], 10)
      const minutes = match[2]
      const period = hours >= 12 ? "PM" : "AM"
      const displayHour = hours % 12 === 0 ? 12 : hours % 12
      return `${displayHour}:${minutes} ${period}`
    }

    return value
  }

  const requestTypeNames = [...new Set(requestType.map((t) => t.name))].sort()

  function handleSort(field: SortField) {
    if (sortField !== field) {
      setSortField(field)
      setSortOrder("asc")
    } else if (sortOrder === "asc") {
      setSortOrder("desc")
    } else {
      setSortField("date")
      setSortOrder("desc")
    }
  }
  const getSortIcons = (field: SortField) => {
    const isActive = sortField === field
    const isAsc = isActive && sortOrder === "asc"
    const isDesc = isActive && sortOrder === "desc"
    return (
      <span
        style={{
          display: "inline-flex",
          flexDirection: "column",
          marginLeft: 6,
        }}
      >
        <IconChevronUp
          size={12}
          stroke={2}
          style={{
            color: isAsc ? C.maroon : "#CFCFCF",
            marginBottom: -2,
          }}
        />
        <IconChevronDown
          size={12}
          stroke={2}
          style={{
            color: isDesc ? C.maroon : "#CFCFCF",
            marginTop: -2,
          }}
        />
      </span>
    )
  }

  const filteredRequests = requests
    .filter((request) => {
      const status = normalizeStatus(request.status)

      let matchesStatus = true

      if (activeFilter === "Declined") {
        matchesStatus =
          status === "declined" ||
          status === "rejected" ||
          status === "canceled"
      } else if (activeFilter === "Pending Review") {
        matchesStatus = status === "pending review"
      } else if (activeFilter === "Under Review") {
        matchesStatus = status === "under review"
      } else if (activeFilter === "Approved") {
        matchesStatus = status === "approved"
      }

      const matchesSearch = request.title
        .toLowerCase()
        .includes(requestSearch.toLowerCase())

      const matchesType =
        !activeRequestFilters.type ||
        activeRequestFilters.type.length === 0 ||
        activeRequestFilters.type.includes(request.type)

      return matchesStatus && matchesSearch && matchesType
    })
    .sort((a, b) => {
      let result = 0

      switch (sortField) {
        case "title":
          result = a.title.localeCompare(b.title)
          break

        case "type":
          result = a.type.localeCompare(b.type)
          break

        case "status":
          result = a.status.localeCompare(b.status)
          break

        case "date":
          result = new Date(a.date).getTime() - new Date(b.date).getTime()
          break
      }

      return sortOrder === "asc" ? result : -result
    })

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage)
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  function getPageNumbers() {
    const pages: (number | "...")[] = []
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push("...")
      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(totalPages - 1, currentPage + 1);
        i++
      ) {
        pages.push(i)
      }
      if (currentPage < totalPages - 2) {
        pages.push("...")
      }
      pages.push(totalPages)
    }
    return pages
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [activeFilter, itemsPerPage, requestSearch, activeRequestFilters])

  //saffi - until last closing of function showError
  interface ToastItem {
    id: number
    message: string
    type: "success" | "error"
  }

  const [toasts, setToasts] = useState<ToastItem[]>([])
  const toastIdRef = useRef(0)

  function addToast(message: string, type: "success" | "error" = "success") {
    const id = toastIdRef.current++
    setToasts((prev) => [...prev, { id, message, type }])
  }

  function removeToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  function showError(message: string) {
    addToast(message, "error")
  }

  useEffect(() => {
    function handleClickOutsideRequestFilter(event: MouseEvent) {
      if (
        requestFilterRef.current &&
        !requestFilterRef.current.contains(event.target as Node)
      ) {
        setShowRequestFilters(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutsideRequestFilter)
    return () =>
      document.removeEventListener("mousedown", handleClickOutsideRequestFilter)
  }, [])

  const selectedFormTypeName =
    requestType.find((t) => t.appeal_type_id === formTypeId)?.name ?? ""
  const isTimeRequest = selectedFormTypeName === "Hour Adjustment"

  const editSelectedTypeName =
    requestType.find((t) => t.appeal_type_id === editTypeId)?.name ?? ""
  const editIsTimeRequest = editSelectedTypeName === "Hour Adjustment"

  // "Leader Role Transfer" is only offered to non-leader students. Hide it from
  // the category dropdowns when the current user is actually a section leader.
  const addRequestTypes = requestType.filter(
    (t) => !isCurrentUserLeader || t.code !== LEADER_ROLE_TRANSFER_CODE
  )
  // In the edit modal, keep the request's currently-selected type visible even if
  // it would otherwise be filtered, so editTypeId stays a valid option.
  const editRequestTypes = requestType.filter(
    (t) =>
      !isCurrentUserLeader ||
      t.code !== LEADER_ROLE_TRANSFER_CODE ||
      t.appeal_type_id === editTypeId
  )

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)

    check()
    window.addEventListener("resize", check)

    return () => window.removeEventListener("resize", check)
  }, [])

  if (loading || contextLoading) {
    return (
      <LoadingPage
        Sidebar={() => <StudentSidebar isLeader={isCurrentUserLeader} />}
      />
    )
  }

  function confirmWithdraw() {
    if (!selectedRequest) return
    startTransition(async () => {
      const res = await cancelStudentRequest(selectedRequest.id)
      if (res.ok) {
        await loadRequests(profile.enrollmentId)
        setShowWithdrawConfirm(false)
        setSelectedRequest(null)
        addToast("Request successfully withdrawn.", "success")
      } else {
        setShowWithdrawConfirm(false)
        showError(res.error)
      }
    })
  }


  return (
    <>
      <ChartStyles />

      <style>{`
      .request-status-bar {
        background: var(--bar-color);
        transition: background 0.15s, filter 0.15s;
      }
      .request-item:hover .request-status-bar {
        filter: brightness(1.15);
      }

       .requests-page{
         min-height:100vh;
         display:flex;
         background:${C.pageBg};
         font-family:'Montserrat',sans-serif;
       }

       .requests-main{
       flex:1;
       margin-left:90px;
       padding:34px 40px;
       min-width:0;
       }

       .requests-header{
         display:flex;
         justify-content:space-between;
         align-items:center;
       }

       .requests-maintitle{
       margin:0;
       font-size:32px;
       font-weight:800;
       color:${C.maroon};
       letter-spacing:-1.5px;
       }

       .divider{
         background:#D9DDD8;
         margin-top:10px;
         margin-bottom:24px;
       }

       .stats{
         display:flex;
         gap:18px;
         margin-bottom:24px;
         align-items:flex-start;
       }

       .request-card{
       background:white;
       border-radius:15px;
       border:1px solid #E2E2E2;
       overflow:visible;
       position:relative;
       box-shadow:0 10px 30px rgba(0,0,0,.06);
       }

       //.request-card-scroll{
       //max-height: 55vh;  
       //overflow-y: auto;
       //scrollbar-width: thin;
       //scrollbar-color: #CFCFCB transparent;
       //}

       .request-top-bar{
       padding:16px 20px 16px;
       display:flex;
       justify-content:space-between;
       align-items:center;
       flex-wrap:wrap;
       gap:16px;
       border-bottom: 1px solid #EEEEEE;
       }

       .request-card-title{
       font-weight: 700;
       font-size: 15px;
       color: #111827;
       }

       .request-card-count{
       font-size: 13px;
       color: #7A7A7A;
       font-weight: 500;
       margin:0;
       padding:0;
       }

       .request-actions{
       display:flex;
       align-items:center;
       gap:10px;
       flex-wrap:wrap;
       }

       .search-box{
       width:260px;
       height:38px;
       border: 1.5px solid ${C.green};
       border-radius:999px;
       display:flex;
       align-items:center;
       padding:0 16px;
       gap:10px;
       }

       .search-box input{
       width:100%;
       border:none;
       outline:none;
       font-family:inherit;
       font-size:13px;
       background:transparent;
       }

       .filter {
           width:60px;
           height:35px;
           border: 1.5px solid ${C.green};
           border-radius:999px;
           background:white;
           color:${C.green};
           font-size:22px;
           cursor:pointer;
           display:flex;
           align-items:center;
           justify-content:center;
           transition: 0.2s ease;
           }

       .filter-menu{
       position:absolute;
       top:100%;
       right:0;
       margin-top:10px;
       width:260px;
       max-height:420px;
       overflow-y:auto;
       background:#fff;
       border:1px solid #E5E7EB;
       border-radius:20px;
       padding:20px;
       box-shadow:0 12px 30px rgba(0,0,0,.12);
       z-index:40;
       display:flex;
       flex-direction:column;
       gap:8px;
       }

       .filter-section{
       display:flex;
       flex-direction:column;
       z-index:40;
       }

       .filter-title{
       font-size:11px;
       font-weight:800;
       letter-spacing:1px;
       color:${C.maroon};
       margin-bottom:4px;
       }

       .request-filter-dropdown{
       position:relative;
       }

       .request-filter-dropdown > div{
       z-index:40 !important;
       }

       .filter-header{
       display:flex;
       justify-content:space-between;
       align-items:center;
       cursor:pointer;
       padding:10px 4px;
       font-size:12px;
       font-weight:800;
       letter-spacing:1px;
       color:${C.maroon};
       }

       .filter-arrow{
       font-size:14px;
       color:${C.textMuted};
       }

       .filter-options{
       display:flex;
       flex-direction:column;
       gap:6px;
       padding:4px 0 8px;
       }

       .filter-divider{
       height:1px;
       background:#EAEAEA;
       margin:8px 0;
       }

       .check-item{
       display:flex;
       align-items:center;
       gap:10px;
       padding:8px 10px;
       border-radius:10px;
       font-size:13px;
       font-weight:500;
       color:#555;
       cursor:pointer;
       transition:.2s;
       }

       .check-item:hover{
       background:#F7F7F5;
       }

       .check-item input{
       appearance:none;
       width:16px;
       height:16px;
       border:1.5px solid #C9C9C9;
       border-radius:5px;
       cursor:pointer;
       position:relative;
       }

       .check-item input:checked{
       background:${C.maroon};
       border-color:${C.maroon};
       }

       .check-item input:checked::after{
       content:"✓";
       position:absolute;
       color:white;
       font-size:11px;
       left:3px;
       top:-1px;
       }

       .clear-filter{
       margin-top:14px;
       height:38px;
       border:none;
       border-radius:12px;
       background:${C.maroon};
       color:white;
       font-weight:700;
       cursor:pointer;
       transition:.2s;
       }

       .clear-filter:hover{
       opacity:.9;
       }

       .request-table-head{
       display:grid;
       grid-template-columns:minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.2fr);
       padding:10px 32px;
       background:#F9FAFB;
       border-top:1px solid #E7E7E7;
       border-bottom:1px solid #EEEEEE;
       color:${C.maroon};
       font-size:11px;
       font-weight:700;
       letter-spacing:1px;
       }

       .request-item{
        padding:16px 28px;
        border-bottom:1px solid #EEEEEE;
        transition:.2s ease;
        overflow-wrap: break-word;
        word-break: break-word;
        }

        .request-item:hover{
        background:#FAFAFA;
        }

        .request-top{
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:20px;
        margin-bottom:8px;
        }

        .request-title{
        font-size:15px;
        font-weight:700;
        color:${C.textDark};
        }

        .request-body{
        font-size:11px;
        line-height:1.7;
        color:#444;
        margin-bottom:8px;
        }

       .request-note{
         font-size:11px;
         color:${C.textMuted};
         font-style:italic;
       }

       .request-header{
       display:flex;
       justify-content:space-between;
       align-items:center;
       margin-bottom:16px;
       }

       .request-header h2{
       margin:0;
       font-size:20px;
       font-weight:800;
       color:${C.textDark};
       }

       .send-btn{
       height:38px;
       padding:0 15px;
       background:${C.green};
       color:white;
       border:none;
       border-radius:999px;
       font-family:inherit;
       font-size:13px;
       font-weight:600;
       cursor:pointer;

       display:flex;
       align-items:center;
       justify-content:center;
       gap:8px;

       transition:transform .25s ease, box-shadow .25s ease;
   }

   .send-btn:hover{
       transform:scale(1.05);
   }

    .pagination-container {
       display:flex;
       justify-content:space-between;
       align-items:center;
       padding:12px 20px;
       border-top:1px solid #E7E7E7;
       gap:12px;
       flex-wrap:wrap;
       }

       .pagination-info {
       font-size:11px;
       color:${C.textMuted};
       font-weight:500;
       }

       .pagination-buttons {
       display:flex;
       align-items:center;
       gap:8px;
       }

       .pagination-btn {
       width:28px;
       height:28px;
       border-radius:8px;
       border:1px solid #E5E7EB;
       background:white;
       color:${C.textDark};
       font-weight:500;
       font-size:11px;
       cursor:pointer;
       display:flex;
       align-items:center;
       justify-content:center;
       }

       .request-status-bar{
       --status-width: 6px;
       --status-height: 20%;
        }

       .pagination-btn.active {
       background:${C.maroon};
       color:white;
       font-weight:700;
       }

       .pagination-btn.disabled {
       color:#CFCFCF;
       cursor:not-allowed;
       }

       .pagination-dots {
       width:20px;
       text-align:center;
       font-weight:700;
       color:${C.textMuted};
       }

       .rows-page {
       display:flex;
       align-items:center;
       gap:10px;
       font-size:11px;
       color:${C.textMuted};
       font-weight:500;
       }

       .rows-select {
       height:30px;
       width:60px;
       border:1px solid #D1D5DB;
       border-radius:8px;
       padding:0 12px;
       font-family:inherit;
       font-size:11px;
       background:white;
       }

       .input-field:focus {
       outline: none;
       border: 1.5px solid #14532D !important;
       }

       .db-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          width: 100%;
        }

       @media (max-width:1024px){

        .requests-main{
            padding:28px 20px;
            margin-left:105px;
        }

        .requests-maintitle{
            font-size:34px;
        }

        .stats{
            display:grid !important;
            gap:14px;
            width:100%;
        }

        .stats > *{
            width:100% !important;
            min-width:0 !important;
        }

        .stats > div{
            padding:18px !important;
            height:auto !important;
            min-height:unset !important;
        }

    }

      @media (max-width:820px){

        .requests-main{
            padding:28px 20px;
        }

        .requests-maintitle{
            font-size:34px;
        }

        .stats{
            display:grid !important;
            grid-template-columns:repeat(2, minmax(0, 1fr)) !important;
            gap:10px;
            width:100%;
        }

        .stats > *{
            width:100% !important;
            min-width:0 !important;
        }

        .stats > div{
            padding:18px !important;
            height:auto !important;
            min-height:unset !important;
        }

        .search-box{
            width:220px;
            height:38px;
        }

        .request-card{
            margin-top: 30px;
        }

        .db-kpi-grid{
          gap:12px !important;
        }

    }

     @media (max-width: 768px) {
        .db-kpi-grid {
          grid-template-columns: repeat(2, 1fr) !important;
        }
      }

       @media (max-width:767px){

       .requests-main{
           margin-left:0;
           padding:20px 16px;
           padding-bottom:110px;
       }

       .requests-header{
           gap:12px;
           align-items:center;
       }

       .requests-maintitle{
           font-size:24px;
       }

       .stats{
           flex-direction:column;
           gap:12px;
       }

       .request-header{
           flex-direction:column;
           align-items:stretch;
           gap:14px;
       }

       .send-btn{
           width:100%;
           height:30px;
       }

       .request-item{
           padding:20px 18px 20px 28px;
       }

       .divider {
          background:#D9DDD8;
          margin-top:1px;
          margin-bottom:13px;
        }

        .search-area{
            width:100%;
        }

        .search-box{
            flex:1;
            width:auto;
            width:260px;
            height:30px;
        }

        .filter{
            width:46px;
            height:30px;
        }

        .profile-pill-wrapper{
            display:none;
        }

        .pagination-container{
            gap:2px;
            padding:12px 10px;
        }

        .pagination-info {
            font-size: 7px;
        }

        .pagination-buttons {
            gap:2px;
        }

        .pagination-btn{
            font-size:9px;
            font-weight: 100;
            width:20px;
            height:20px;
            border-radius:5px;
        }

        .rows-page {
            font-size: 7px;
        }

        .rows-select {
            height:20px;
            width:40px;
            font-size: 8px;
            padding:0 2px;
        }

        .profile-pill-wrapper{
          display:none;
      }

      .requests-maintitle{
          font-size:28px;
          padding-top:clamp(43px, 0.5vw, 20px);
     }

     .db-kpi-grid{
        gap:10px !important;
      }

      .request-card{
            margin-top: 30px;
        }

      .request-title{
        font-size:11px;
        font-weight:600;
        }

        .request-body{
        font-size:10px;
        }

       .request-note{
         font-size:10px;
       }

       .request-type-pill{
        padding: 3px 8px !important;
        font-size: 9px !important;
        margin-top: 3px !important;
      }

      .request-date{
          font-size:9px !important;
      }

      .request-note-box{
        padding:5px 9px !important;
        gap:4px !important;
        border-radius:10px !important;
        font-size:11px !important;
        margin-top:4px !important;
        max-width:100%;
        overflow-wrap:break-word;
        white-space:normal;
    }


    .status-badge{
    font-size:8px !important;
    padding:3px 8px !important;
    gap:4px !important;
    }

    .send-btn{
       height:20x !important;
     }

     }

     `}</style>

      <div className={`${montserrat.variable} requests-page`}>
        <StudentSidebar isLeader={isCurrentUserLeader} />

        <main className="requests-main">
          <div className="requests-header">
            <h1 className="requests-maintitle">Requests</h1>

            <div className="profile-pill-wrapper">
              <ProfilePill
                name={profile.fullName}
                initials={getInitials(profile.fullName)}
                section={profile.sectionName}
                avatarUrl={profile.avatarUrl}
              />
            </div>
          </div>

          <div className="divider" />

          <ChartStyles />

          <KpiStatCardGrid columns={4}>
            {stats.map((stat) => {
              const isActive = activeFilter === stat.label
              const isHovered = hoveredCard === stat.label
              const isHighlighted = isActive || isHovered

              return (
                <div
                  key={stat.label}
                  onClick={() =>
                    setActiveFilter(
                      activeFilter === stat.label ? "All" : stat.label
                    )
                  }
                  onMouseEnter={() => setHoveredCard(stat.label)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    cursor: "pointer",
                    borderRadius: COLORS.radius,
                    overflow: "hidden",
                    background: COLORS.cardBg,

                    color: isHighlighted ? stat.color.icon : "#666",

                    border: `2px solid ${
                      isHighlighted ? stat.color.icon : COLORS.border
                    }`,

                    transform: isHovered ? "translateY(-8px)" : "translateY(0)",

                    boxShadow: isHovered
                      ? "0 6px 14px rgba(0,0,0,.07)"
                      : "0 4px 10px rgba(0,0,0,.05)",

                    transition:
                      "transform .2s ease, box-shadow .2s ease, border-color .18s ease, color .18s ease",
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

          <div className="request-card">
            <div className="request-top-bar">
              <div>
                <div className="request-card-title">
                  {activeFilter === "All"
                    ? "Recent Requests"
                    : `${activeFilter} Requests`}
                </div>

                <div className="request-card-count">
                  {filteredRequests.length} request
                  {filteredRequests.length !== 1 ? "s" : ""} found
                </div>
              </div>

              <div className="request-actions">
                <div className="search-box">
                  <i className="ti ti-search" />
                  <input
                    value={requestSearch}
                    onChange={(e) => setRequestSearch(e.target.value)}
                    placeholder="Search requests..."
                  />
                </div>

                <div ref={requestFilterRef} style={{ position: "relative" }}>
                  <button
                    className="filter"
                    onClick={() => setShowRequestFilters((prev) => !prev)}
                    style={{
                      border: `1.5px solid ${
                        activeRequestFilters.type?.length ? C.maroon : C.green
                      }`,
                      color: activeRequestFilters.type?.length
                        ? C.maroon
                        : C.green,
                      position: "relative",
                    }}
                  >
                    <IconFilter size={18} stroke={1.75} />
                    {!!activeRequestFilters.type?.length && (
                      <span
                        className="status-badge"
                        style={{
                          position: "absolute",
                          top: -6,
                          right: -6,
                          background: C.maroon,
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
                        {activeRequestFilters.type.length}
                      </span>
                    )}
                  </button>

                  {showRequestFilters && (
                    <div className="request-filter-dropdown">
                      <AdminFilterPanel
                        groups={[
                          {
                            field: "type",
                            label: "Request Type",
                            options: requestTypeNames.map((t) => ({
                              value: t,
                              label: t,
                            })),
                          },
                        ]}
                        activeFilters={activeRequestFilters}
                        onChange={(next) => setActiveRequestFilters(next)}
                        onClear={() => setActiveRequestFilters({})}
                      />
                    </div>
                  )}
                </div>

                <button className="send-btn" onClick={() => setShowModal(true)}>
                  <span style={{ fontSize: 20 }}>+</span>
                  Send Request
                </button>
              </div>
            </div>

            <div className="request-card-scroll">
              {paginatedRequests.length === 0 ? (
                <div
                  style={{
                    padding: "40px 20px",
                    textAlign: "center",
                    fontSize: 13,
                    color: C.textMuted,
                    fontWeight: 500,
                  }}
                >
                  No request found.
                </div>
              ) : (
                paginatedRequests.map((request) => {
                  const statusColor =
                    request.status === "Approved"
                      ? C.approved.icon
                      : request.status === "Declined" ||
                        request.status === "Rejected"
                      ? C.declined.icon
                      : C.review.icon

                  return (
                    <div
                      key={request.id}
                      className="request-item"
                      onClick={() => {
                        setSelectedRequest(request)
                        setEditTitle(request.title)
                        setEditBody(request.body)
                        setEditFiles(request.attachments ?? [])

                        // Find the UUID that matches string name
                        const matchingType = requestType.find(
                          (t) => t.name === request.type
                        )
                        setEditTypeId(
                          matchingType
                            ? matchingType.appeal_type_id
                            : requestType[0]?.appeal_type_id || ""
                        )
                      }}
                      style={{
                        position: "relative",
                        paddingLeft: 34,
                        cursor: "pointer",
                      }}
                    >
                      <div
                        className="request-status-bar"
                        style={{
                          position: "absolute",
                          left: 0,
                          top: isMobile ? 12 : 15,
                          width: isMobile ? 4 : 6,
                          height: "20%",
                          ["--bar-color" as any]: statusColor,
                          borderRadius: 10,
                        }}
                      />
                      <div
                        className="request-top"
                        style={{
                          flexDirection: "column",
                          alignItems: "flex-start",
                          gap: 4,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <StatusBadge status={request.status} />
                          <div
                            className="request-type-pill"
                            style={{
                              display: "flex",
                              width: "fit-content",
                              alignItems: "center",
                              padding: "4px 10px",
                              borderRadius: 999,
                              background: "#e4e4e4",
                              color: C.textDark,
                              fontSize: 10,
                              fontWeight: 600,
                              border: `1px solid ${C.textDark}20`,
                            }}
                          >
                            {request.type}
                          </div>
                        </div>

                        <div>
                          <div className="request-title">{request.title}</div>

                          <div
                            className="request-date"
                            style={{
                              fontSize: 11,
                              color: "#999",
                              marginTop: 2,
                            }}
                          >
                            Submitted{" "}
                            {new Date(request.date).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="request-body">{request.body}</div>

                      {request.type === "Hour Adjustment" &&
                        (request.requestedTimeIn ||
                          request.requestedTimeOut) && (
                          <div
                            style={{
                              display: "flex",
                              gap: 14,
                              flexWrap: "wrap",
                              marginBottom: 8,
                              fontSize: 11,
                              color: "#555",
                              fontWeight: 600,
                            }}
                          >
                            {request.requestedTimeIn && (
                              <span>
                                Requested Time In:{" "}
                                <span style={{ color: C.textDark }}>
                                  {formatTimeValue(request.requestedTimeIn)}
                                </span>
                              </span>
                            )}
                            {request.requestedTimeOut && (
                              <span>
                                Requested Time Out:{" "}
                                <span style={{ color: C.textDark }}>
                                  {formatTimeValue(request.requestedTimeOut)}
                                </span>
                              </span>
                            )}
                          </div>
                        )}

                      <div
                        className="request-note-box"
                        style={{
                          marginTop: 5,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: "#F6F5EF",
                          padding: "7px 12px",
                          borderRadius: 12,
                          fontSize: 13,
                          color: C.textMuted,
                        }}
                      >
                        {request.note}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="pagination-container">
              <div className="pagination-info">
                Showing{" "}
                {filteredRequests.length === 0
                  ? 0
                  : (currentPage - 1) * itemsPerPage + 1}
                –{Math.min(currentPage * itemsPerPage, filteredRequests.length)}{" "}
                of {filteredRequests.length}
              </div>

              <div className="pagination-buttons">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className={`pagination-btn ${
                    currentPage === 1 ? "disabled" : ""
                  }`}
                >
                  ‹
                </button>

                {getPageNumbers().map((page, index) =>
                  page === "..." ? (
                    <span key={index} className="pagination-dots">
                      ...
                    </span>
                  ) : (
                    <button
                      key={index}
                      onClick={() => setCurrentPage(Number(page))}
                      className={`pagination-btn ${
                        currentPage === page ? "active" : ""
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages || totalPages === 0}
                  className={`pagination-btn ${
                    currentPage === totalPages || totalPages === 0
                      ? "disabled"
                      : ""
                  }`}
                >
                  ›
                </button>
              </div>

              <div className="rows-page">
                Rows per page
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="rows-select"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                </select>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(5px)",
            WebkitBackdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            fontFamily: "var(--font-montserrat), sans-serif",
          }}
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              width: "calc(100% - 32px)",
              maxWidth: 480,
              maxHeight: "90vh",
              boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: C.green,
                color: "#fff",
                padding: "24px 24px",
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontFamily: "var(--font-montserrat), sans-serif",
                flexShrink: 0,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 17,
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                Send Request / Concern
              </h2>

              <button
                onClick={() => setShowModal(false)}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background =
                    "rgba(255, 255, 255, 0.18)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: 6,
                  borderRadius: 8,
                  transition: "background 0.13s",
                  flexShrink: 0,
                }}
              >
                <IconX size={20} stroke={2} />
              </button>
            </div>

            <div
              style={{
                padding: "24px",
                overflowY: "auto",
                flex: 1,
                scrollbarWidth: "thin",
                scrollbarColor: "#CFCFCB transparent",
              }}
            >
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#6B7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.6px",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Request Category
                </label>

                <select
                  className="input-field"
                  value={formTypeId}
                  onChange={(e) => setFormTypeId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1.5px solid #E5E7EB",
                    fontSize: 14,
                  }}
                >
                  {requestType.length === 0 ? (
                    <option value="">Loading categories...</option>
                  ) : (
                    addRequestTypes.map((t) => (
                      <option key={t.appeal_type_id} value={t.appeal_type_id}>
                        {t.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#6B7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.6px",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Title
                </label>

                <textarea
                  className="input-field"
                  value={formTitle}
                  maxLength={50}
                  rows={2}
                  onChange={(e) => setFormTitle(e.target.value)}
                  style={{
                    width: "100%",
                    height: 45,
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1.5px solid #E5E7EB",
                    fontSize: 14,
                    fontFamily: "inherit",
                    resize: "none",
                    overflowY: "auto",
                    boxSizing: "border-box",
                    scrollbarWidth: "thin",
                    scrollbarColor: "#CFCFCB transparent",
                  }}
                />

                <div
                  style={{
                    fontSize: 12,
                    color: C.textMuted,
                    textAlign: "right",
                    marginTop: 1,
                  }}
                >
                  {formTitle.length}/50
                </div>
              </div>

              {isTimeRequest && (
                <TimeCorrectionFields
                  sessions={sessionOptions}
                  value={timeCorrection}
                  onChange={setTimeCorrection}
                  loading={sessionsLoading}
                />
              )}

              <div style={{ marginBottom: 24 }}>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#6B7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.6px",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Details
                </label>
                <textarea
                  className="input-field"
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  placeholder="Describe your request or concern..."
                  rows={4}
                  maxLength={500}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1.5px solid #E5E7EB",
                    fontSize: 14,
                    outline: "none",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
                <div
                  style={{
                    fontSize: 12,
                    color: C.textMuted,
                    textAlign: "right",
                    marginTop: 1,
                  }}
                >
                  {formBody.length}/500
                </div>
                <div style={{ marginTop: 16 }}>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#6B7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.6px",
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    Attachment (Optional)
                  </label>

                  {formFiles.length < MAX_NUM_ATTACHMENT && (
                    <label
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault()
                        const files = Array.from(e.dataTransfer.files)
                        if (
                          editFiles.length +
                            editNewFiles.length +
                            files.length >
                          MAX_NUM_ATTACHMENT
                        ) {
                          showError(
                            `You can attach at most ${MAX_NUM_ATTACHMENT} file.`
                          )
                          return
                        }
                        setEditNewFiles((prev) => [...prev, ...files])
                      }}
                      onMouseEnter={() => setEditUploadZoneHover(true)}
                      onMouseLeave={() => setEditUploadZoneHover(false)}
                      style={{
                        width: "100%",
                        height: 170,
                        border: `2px dashed ${
                          editUploadZoneHover ? C.green : "#E5E7EB"
                        }`,
                        borderRadius: 14,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        background: editUploadZoneHover ? "#F0FDF4" : "#FAFAF7",
                        boxSizing: "border-box",
                        fontFamily: "inherit",
                        transition: "border-color 0.15s, background 0.15s",
                      }}
                    >
                      <div className="items-center flex flex-col pt-4">
                        <div
                          style={{
                            width: "44px",
                            height: "44px",
                            borderRadius: "50%",
                            background: "#E8EDE5",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#1B4332",
                            transition: "background 0.15s",
                          }}
                        >
                          <IconUpload size={24} stroke={1.5} color={C.green} />
                        </div>

                        <div
                          style={{
                            fontSize: 13,
                            color: C.textDark,
                            marginTop: 8,
                            fontWeight: 700,
                          }}
                        >
                          Click to browse files or drag & drop files here
                        </div>
                        <div
                          style={{
                            fontSize: 11.5,
                            color: C.textMuted,
                            marginTop: 4,
                            paddingTop: 12,
                          }}
                        >
                          Max file size: <strong>500 KB</strong>
                        </div>
                        <div
                          style={{
                            fontSize: 11.5,
                            color: C.textMuted,
                            marginTop: 4,
                          }}
                        >
                          Supported file types:{" "}
                          <strong>PNG, JPEG, PDF, DOC, DOCX</strong>
                        </div>
                      </div>

                      <input
                        type="file"
                        hidden
                        multiple
                        onChange={(e) => {
                          if (e.target.files) {
                            const files = Array.from(e.target.files)

                            if (
                              formFiles.length + files.length >
                              MAX_NUM_ATTACHMENT
                            ) {
                              showError(
                                `You can attach at most ${MAX_NUM_ATTACHMENT} ${
                                  MAX_NUM_ATTACHMENT === 1 ? "file" : "files"
                                }.`
                              )
                              return
                            }

                            setFormFiles((prev) => [...prev, ...files])
                          }
                        }}
                      />
                    </label>
                  )}

                  {formFiles.length > 0 && (
                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      {formFiles.map((f, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 12px",
                            borderRadius: 10,
                            background: "#F6F5EF",
                            fontSize: 12,
                            color: C.textDark,
                          }}
                        >
                          <span>{f.name}</span>
                          <button
                            onClick={() =>
                              setFormFiles((prev) =>
                                prev.filter((_, idx) => idx !== i)
                              )
                            }
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: C.textMuted,
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                width: "100%",
                padding: "16px 24px 24px",
                borderTop: "1px solid #EEEEEE",
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => {
                  setShowModal(false)
                  setFormTitle("")
                  setFormBody("")
                  setFormFiles([])
                  setTimeCorrection(EMPTY_TIME_CORRECTION)
                  if (requestType.length > 0) {
                    setFormTypeId(requestType[0].appeal_type_id)
                  }
                }}
                style={{
                  padding: "10px 24px",
                  borderRadius: 12,
                  border: "1.5px solid #E5E7EB",
                  background: "#FFFFFF",
                  color: "#111827",
                  fontSize: 13.5,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  transition: "background 0.13s, opacity 0.13s",
                  flex: 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending || !formTitle.trim() || !formBody.trim()}
                style={{
                  padding: "10px 24px",
                  borderRadius: 12,
                  border: "none",
                  background: C.green,
                  color: "#fff",
                  fontSize: 13.5,
                  fontWeight: 700,
                  fontFamily: "inherit",
                  cursor:
                    !formTitle.trim() || !formBody.trim()
                      ? "not-allowed"
                      : "pointer",
                  transition: "background 0.13s, opacity 0.13s",
                  opacity: !formTitle.trim() || !formBody.trim() ? 0.45 : 1,
                  flex: 1,
                }}
              >
                {isPending ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedRequest && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(5px)",
            WebkitBackdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            fontFamily: "var(--font-montserrat), sans-serif",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedRequest(null)
              setShowWithdrawConfirm(false)
            }
          }}

        >
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              width: "calc(100% - 32px)",
              maxWidth: 480,
              maxHeight: "90vh",
              boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
              fontFamily: "var(--font-montserrat), sans-serif",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: C.green,
                color: "#fff",
                padding: "24px 24px",
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontFamily: "var(--font-montserrat), sans-serif",
                flexShrink: 0,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 17,
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                Review Request
              </h2>

              <button
                onClick={() => {
                  setSelectedRequest(null)
                  setShowWithdrawConfirm(false)
                }}
                onMouseEnter={(e) =>

                  (e.currentTarget.style.background =
                    "rgba(255, 255, 255, 0.18)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: 6,
                  borderRadius: 8,
                  transition: "background 0.13s",
                  flexShrink: 0,
                }}
              >
                <IconX size={20} stroke={2} />
              </button>
            </div>

            <div
              style={{
                padding: "24px",
                overflowY: "auto",
                flex: 1,
                scrollbarWidth: "thin",
                scrollbarColor: "#CFCFCB transparent",
              }}
            >
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#6B7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.6px",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Request Category
              </label>
              <select
                className="input-field"
                value={editTypeId}
                onChange={(e) => setEditTypeId(e.target.value)}
                disabled={!isEditable}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: isEditable ? "#fff" : "#F3F4F6",
                  border: isEditable ? "1.5px solid #E5E7EB" : "none",
                  color: "#444",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                  marginBottom: 16,
                  fontFamily: "inherit",
                  cursor: isEditable ? "pointer" : "default",
                  appearance: isEditable ? "auto" : "none",
                }}
              >
                {requestType.length === 0 ? (
                  <option value="">Loading types...</option>
                ) : (
                  editRequestTypes.map((t) => (
                    <option key={t.appeal_type_id} value={t.appeal_type_id}>
                      {t.name}
                    </option>
                  ))
                )}
              </select>

              <label
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#6B7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.6px",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Title
              </label>

              <textarea
                className="input-field"
                value={editTitle}
                disabled={!isEditable}
                maxLength={50}
                rows={2}
                onChange={(e) => setEditTitle(e.target.value)}
                style={{
                  width: "100%",
                  height: 45,
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: isEditable ? "#fff" : "#F3F4F6",
                  border: isEditable ? "1.5px solid #E5E7EB" : "none",
                  color: "#444",
                  fontSize: 14,
                  fontFamily: "inherit",
                  resize: "none",
                  overflowY: "auto",
                  boxSizing: "border-box",
                  cursor: isEditable ? "text" : "default",
                  scrollbarWidth: "thin",
                  scrollbarColor: "#CFCFCB transparent",
                }}
              />

              {isEditable && (
                <div
                  style={{
                    fontSize: 12,
                    color: C.textMuted,
                    textAlign: "right",
                    marginTop: 1,
                    marginBottom: 10,
                  }}
                >
                  {editTitle.length}/50
                </div>
              )}

              {/* Structured time-correction — editable "Hour Adjustment" requests only */}
              {editIsTimeRequest && (
                <div
                  style={
                    !isEditable
                      ? { pointerEvents: "none", opacity: 0.6 }
                      : undefined
                  }
                >
                  <TimeCorrectionFields
                    sessions={sessionOptions}
                    value={editTimeCorrection}
                    onChange={setEditTimeCorrection}
                    loading={sessionsLoading}
                  />
                </div>
              )}

              <label
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#6B7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.6px",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Description
              </label>

              <textarea
                className="input-field"
                value={editBody}
                disabled={!isEditable}
                onChange={(e) => setEditBody(e.target.value)}
                rows={5}
                maxLength={500}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: isEditable ? "#fff" : "#F3F4F6",
                  border: isEditable ? "1.5px solid #E5E7EB" : "none",
                  color: "#444",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                  marginBottom: 1,
                  fontFamily: "inherit",
                  cursor: isEditable ? "text" : "default",
                }}
              />

              {isEditable && (
                <div
                  style={{
                    fontSize: 12,
                    color: C.textMuted,
                    textAlign: "right",
                    marginTop: 2,
                    marginBottom: 10,
                  }}
                >
                  {editBody.length}/500
                </div>
              )}

              {isEditable ? (
                <div style={{ marginTop: 4, marginBottom: 16 }}>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#6B7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.6px",
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    Attachment (Optional)
                  </label>

                  {/* Existing attachments — view or remove */}
                  {editFiles.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        marginBottom: 10,
                      }}
                    >
                      {editFiles.map((att, i) => (
                        <div
                          key={att.storage_path}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 12px",
                            borderRadius: 10,
                            background: "#F6F5EF",
                            fontSize: 12,
                            color: C.textDark,
                            gap: 8,
                          }}
                        >
                          <span
                            onClick={() =>
                              handleViewAttachment(att.storage_path)
                            }
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              cursor: "pointer",
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            <i
                              className="ti ti-paperclip"
                              style={{
                                fontSize: 16,
                                color: C.green,
                                flexShrink: 0,
                              }}
                            />
                            <span
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {att.file_name}
                            </span>
                          </span>
                          <button
                            onClick={() =>
                              setEditFiles((prev) =>
                                prev.filter((_, idx) => idx !== i)
                              )
                            }
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: C.textMuted,
                              flexShrink: 0,
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload zone — shown while under the attachment cap */}
                  {editFiles.length + editNewFiles.length <
                    MAX_NUM_ATTACHMENT && (
                    <label
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault()
                        const files = Array.from(e.dataTransfer.files)
                        if (
                          editFiles.length +
                            editNewFiles.length +
                            files.length >
                          MAX_NUM_ATTACHMENT
                        ) {
                          showError(
                            `You can attach at most ${MAX_NUM_ATTACHMENT} file.`
                          )
                          return
                        }
                        setEditNewFiles((prev) => [...prev, ...files])
                      }}
                      style={{
                        width: "100%",
                        height: 120,
                        border: "2px dashed #E5E7EB",
                        borderRadius: 14,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        background: "#FAFAF7",
                        boxSizing: "border-box",
                        fontFamily: "inherit",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: C.green,
                        }}
                      >
                        Drop your file here
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: C.textMuted,
                          marginTop: 4,
                        }}
                      >
                        or click to browse
                      </span>
                      <input
                        type="file"
                        hidden
                        multiple
                        onChange={(e) => {
                          if (e.target.files) {
                            const files = Array.from(e.target.files)
                            if (
                              editFiles.length +
                                editNewFiles.length +
                                files.length >
                              MAX_NUM_ATTACHMENT
                            ) {
                              showError(
                                `You can attach at most ${MAX_NUM_ATTACHMENT} ${
                                  MAX_NUM_ATTACHMENT === 1 ? "file" : "files"
                                }.`
                              )
                              return
                            }
                            setEditNewFiles((prev) => [...prev, ...files])
                          }
                        }}
                      />
                    </label>
                  )}

                  {/* Newly-selected files pending upload */}
                  {editNewFiles.length > 0 && (
                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      {editNewFiles.map((f, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 12px",
                            borderRadius: 10,
                            background: "#F6F5EF",
                            fontSize: 12,
                            color: C.textDark,
                          }}
                        >
                          <span>{f.name}</span>
                          <button
                            onClick={() =>
                              setEditNewFiles((prev) =>
                                prev.filter((_, idx) => idx !== i)
                              )
                            }
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: C.textMuted,
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                editFiles.length > 0 && (
                  <div
                    style={{
                      marginTop: 15,
                      marginBottom: 16,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    {editFiles.map((att, i) => (
                      <div
                        key={i}
                        onClick={() => handleViewAttachment(att.storage_path)}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 10,
                          background: "#F6F5EF",
                          fontSize: 12,
                          color: C.textDark,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          cursor: "pointer",
                        }}
                      >
                        <i
                          className="ti ti-paperclip"
                          style={{ fontSize: 16, color: C.green }}
                        />
                        {att.file_name}
                      </div>
                    ))}
                  </div>
                )
              )}

              <div
                style={{
                  fontSize: 12,
                  color: C.textMuted,
                }}
              >
                Submitted:{" "}
                {new Date(selectedRequest.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: C.textMuted,
                  marginTop: 5,
                }}
              >
                Last edited:{" "}
                {selectedRequest.lastEdited
                  ? new Date(selectedRequest.lastEdited).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }
                    )
                  : "Not edited yet"}
              </div>
            </div>
                        <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 10,
                padding: "16px 24px 24px",
                borderTop: "1px solid #EEEEEE",
                flexShrink: 0,
              }}
            >
              {showWithdrawConfirm ? (
                <>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#991B1B",
                      lineHeight: 1.3,
                    }}
                  >
                    Withdraw this request? This can't be undone.
                  </span>

                  <button
                    onClick={() => setShowWithdrawConfirm(false)}
                    disabled={isPending}
                    style={{
                      padding: "10px 20px",
                      borderRadius: 12,
                      border: "1px solid #E5E7EB",
                      background: "#FFFFFF",
                      color: "#111827",
                      fontFamily: "inherit",
                      fontSize: 13.5,
                      fontWeight: 700,
                      cursor: isPending ? "not-allowed" : "pointer",
                    }}
                  >
                    No
                  </button>

                  <button
                    onClick={confirmWithdraw}
                    disabled={isPending}
                    style={{
                      padding: "10px 20px",
                      borderRadius: 12,
                      border: "none",
                      background: "#991B1B",
                      color: "#fff",
                      fontFamily: "inherit",
                      fontSize: 13.5,
                      fontWeight: 700,
                      cursor: isPending ? "not-allowed" : "pointer",
                      opacity: isPending ? 0.6 : 1,
                    }}
                  >
                    {isPending ? "Processing..." : "Yes, Withdraw"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    disabled={isEditable && isPending}
                    onClick={() => {
                      if (!isEditable) {
                        setSelectedRequest(null)
                        return
                      }
                      setShowWithdrawConfirm(true)
                    }}
                    style={{
                      padding: "10px 24px",
                      borderRadius: 12,
                      border: isEditable ? "none" : "1px solid #E5E7EB",
                      background: isEditable ? "#FEE2E2" : "#FFFFFF",
                      color: isEditable ? "#991B1B" : "#111827",
                      fontFamily: "inherit",
                      fontSize: 13.5,
                      fontWeight: isEditable ? 600 : 700,
                      cursor:
                        isEditable && isPending ? "not-allowed" : "pointer",
                      opacity: isEditable && isPending ? 0.6 : 1,
                      flex: 1,
                    }}
                  >
                    {isEditable
                      ? isPending
                        ? "Processing..."
                        : "Withdraw Request"
                      : "Close"}
                  </button>

                  {isEditable && (
                    <button
                      onClick={handleEditSave}
                      disabled={isPending || !hasChanges()}
                      style={{
                        background: C.green,
                        color: "white",
                        border: "none",
                        padding: "10px 24px",
                        borderRadius: 12,
                        fontFamily: "inherit",
                        fontSize: 13.5,
                        fontWeight: 600,
                        cursor: hasChanges() ? "pointer" : "not-allowed",
                        opacity: hasChanges() ? 1 : 0.45,
                        flex: 1,
                      }}
                    >
                      {isPending ? "Saving..." : "Save Changes"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* saffi - hanggang last div */}
      <div
        style={{
          position: "fixed",
          top: isMobile ? 70 : 20,
          right: isMobile ? 12 : 20,
          left: isMobile ? 12 : "auto",
          zIndex: 300,
          display: "flex",
          flexDirection: "column",
          gap: isMobile ? 10 : 14,
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => (
          <SuccessModal
            key={toast.id}
            show={true}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </>
  )
}
