"use client"

import { useEffect, useRef, useState } from "react"
import { Montserrat } from "next/font/google"
import ProfilePill from "@/components/shared/StudentProfilePill"
import { getStudentDashboard } from "@/lib/student/dashboard-actions"
import { getMyClassmates } from "@/lib/student/classlist-actions"
import { getInitials } from "@/lib/student/dashboard-view"
import { AdminFilterPanel } from "@/components/shared/AdminFilterPanel"
import { IconChevronUp, IconChevronDown, IconFilter } from "@tabler/icons-react"
import Sidebar from "@/components/shared/ResponsiveStudentSidebar"

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
})

const C = {
  maroon: "#7B1113",
  pageBg: "#F0F0F0",
  border: "#D9D9D9",
  Green: "#014421",
  goldBg: "#FFF4D9",
  goldText: "#C5871A",
  textDark: "#2C2C2A",
  textMuted: "#7A7A7A",
}

const CLASSIFICATION_ORDER = ["Freshman", "Sophomore", "Junior", "Senior"]
const classRank = (v: string) => {
  const i = CLASSIFICATION_ORDER.indexOf(v)
  return i === -1 ? CLASSIFICATION_ORDER.length : i
}

type RosterRow = {
  name: string
  email: string
  course: string
  year: string
  site: string
}

export default function ClassList() {
  const [search, setSearch] = useState("")

  const [profile, setProfile] = useState({
    fullName: "",
    sectionName: "",
    adviserName: "",
    adviserEmail: "",
  })

  const [roster, setRoster] = useState<RosterRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getStudentDashboard(), getMyClassmates()]).then(
      ([dash, mates]) => {
        if (dash.ok) {
          setProfile({
            fullName: dash.data.fullName,
            sectionName: dash.data.sectionName ?? "",
            adviserName: dash.data.adviserName ?? "",
            adviserEmail: dash.data.adviserEmail ?? "",
          })
        }

        if (mates.ok) {
          setRoster(
            mates.data.map((m) => ({
              name: m.fullName,
              email: m.email,
              course: m.program ?? "—",
              year: m.classification ?? "—",
              site: m.siteLocation ?? "Unassigned",
            }))
          )
        } else {
          console.error("[ClassList] failed to load classmates", mates.error)
        }

        setLoading(false)
      }
    )
  }, [])

//for reset sorting
type FilterField = "course" | "year" | "site"
type ActiveFilters = Partial<Record<FilterField, string[]>>
  
const [showFilters, setShowFilters] = useState(false)
const [activeFilters, setActiveFilters] = useState<ActiveFilters>({})

const DEFAULT_SORT = {
    field: "name" as const,
    order: "asc" as const,
  }

const [sortField, setSortField] = useState<"name" | "course" | "year" | "site">("name")
const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

const handleSort = (field: "name" | "course" | "year" | "site") => {
    if (sortField !== field) {

      setSortField(field)
      setSortOrder("asc")
    } else if (sortOrder === "asc") {

      setSortOrder("desc")
    } else {

      setSortField(DEFAULT_SORT.field)
      setSortOrder(DEFAULT_SORT.order)
    }
  }

const [currentPage, setCurrentPage] = useState(1)
const [itemsPerPage, setItemsPerPage] = useState(5)

useEffect(() => {
    setCurrentPage(1)
  }, [search, activeFilters, itemsPerPage])

  function clearAllFilters() {
    setActiveFilters({})
    setSearch("")
    setCurrentPage(1)
  }

  const totalActiveFilters = Object.values(activeFilters).reduce((sum, arr) => sum + (arr?.length ?? 0), 0)
  const hasFilters = search.trim() !== "" || totalActiveFilters > 0

const courses = [
    ...Array.from(new Set(roster.map(s => s.course))).sort()
]

const years = [
    ...Array.from(new Set(roster.map(s => s.year))).sort(
      (a, b) => classRank(a) - classRank(b)
    )
]

const sites = [
    ...Array.from(new Set(roster.map(s => s.site))).sort()
]

const filteredStudents = roster.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(search.toLowerCase())

    const matchFilters = (Object.entries(activeFilters) as [FilterField, string[]][]).every(([field, values]) => {
      if (!values || values.length === 0) return true
      if (field === "course") return values.includes(student.course)
      if (field === "year")   return values.includes(student.year)
      if (field === "site")   return values.includes(student.site)
      return true
    })

    return matchesSearch && matchFilters
  })

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (sortField === "year") {
      const rankA = classRank(a.year)
      const rankB = classRank(b.year)
      return sortOrder === "asc" ? rankA - rankB : rankB - rankA
    }

    let valA = a[sortField]
    let valB = b[sortField]

    valA = valA.toString().toLowerCase()
    valB = valB.toString().toLowerCase()

    if (valA < valB) return sortOrder === "asc" ? -1 : 1
    if (valA > valB) return sortOrder === "asc" ? 1 : -1
    return 0
  })

  const [isMobile, setIsMobile] = useState(false)

useEffect(() => {
  const handleResize = () => setIsMobile(window.innerWidth <= 767)

  handleResize()
  window.addEventListener("resize", handleResize)

  return () => window.removeEventListener("resize", handleResize)
}, [])

  const getSortIcons = (field: typeof sortField) => {
    const isActive = sortField === field
    const isAsc = isActive && sortOrder === "asc"
    const isDesc = isActive && sortOrder === "desc"
  
    return (
      <span
        style={{
          display: "inline-flex",
          flexDirection: "column",
          marginLeft: isMobile ? 3 : 6,
        }}
      >
        <IconChevronUp
          size={isMobile ? 10 : 12}
          stroke={2}
          style={{
            color: isAsc ? "#7B1113" : "#CFCFCF",
            marginBottom: -2,
          }}
        />
        <IconChevronDown
          size={isMobile ? 10 : 12}
          stroke={2}
          style={{
            color: isDesc ? "#7B1113" : "#CFCFCF",
            marginTop: -2,
          }}
        />
      </span>
    )
  }
const totalPages = Math.ceil(filteredStudents.length / itemsPerPage)

const paginatedStudents = sortedStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

const getPageNumbers = () => {
const pages = []

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, "...", totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, "...", currentPage, "...", totalPages)
      }
    }

    return pages
  }

  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setShowFilters(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])


  return (
    <>
      <style>{`

        .class-page {
          min-height:100vh;
          display:flex;
          background:${C.pageBg};
          font-family:'Montserrat',sans-serif;
        }


        .class-main {
          flex:1;
          margin-left:90px;
          padding:28px 32px;
          min-width:0;
        }


        .class-header {
          display:flex;
          justify-content:space-between;
          align-items:center;
        }


        .class-title {
          margin:0;
          font-size:34px;
          font-weight:800;
          color:${C.maroon};
          letter-spacing:-1px;
        }


        .divider {
          background:#D9DDD8;
          margin-top:10px;
          margin-bottom:24px;
        }


        .class-card {
          background:white;
          border-radius:15px;
          overflow:visible;
          box-shadow: 0 15px 15px rgba(0, 0, 0, 0.08);
        }


        .class-top {
          padding:24px 32px;
          display:flex;
          justify-content:space-between;
          align-items:center;
          flex-wrap:wrap;
          gap:16px;
        }


        .class-name {
          font-size:20px;
          font-weight:800;
          color:${C.textDark};
        }


        .prof {
          font-size:13px;
          font-weight:300;
          color:#5A5A5A;
        }


        .email {
          color:${C.textMuted};
          font-size:13px;
        }


        .search-area {
          display:flex;
          gap:10px;
        }


        .search-box {
          width:320px;
          height:35px;
          border: 1.5px solid ${C.Green};
          border-radius:999px;
          display:flex;
          align-items:center;
          padding:0 18px;
          gap: 10px;
        }


        .search-box input {
          width:100%;
          border:none;
          outline:none;
          font-family:inherit;
          font-size:13px;
        }


        .filter {
            width:60px;
            height:35px;
            border: 1.5px solid ${C.Green};
            border-radius:999px;
            background:white;
            color:${C.Green};
            font-size:22px;
            cursor:pointer;
            display:flex;
            align-items:center;
            justify-content:center;
            transition: 0.2s ease;
            }


        .table-head{
            display:grid;
            grid-template-columns:2fr 1.3fr 1fr 1.4fr;
            padding:8px 24px;
            background:#F9FAFB;
            border-top:1px solid #E7E7E7;
            border-bottom:1px solid #E7E7E7;
            color:${C.maroon};
            font-size:11px;
            font-weight:700;
            letter-spacing:1px;

            min-width:0;
        }

        .table-head > div{
            min-width:0;
        }


        .row{
            display:grid;
            grid-template-columns:2fr 1.3fr 1fr 1.4fr;
            padding:18px 24px;
            border-bottom:1px solid #F0F0F0;
            transition:.2s;

            min-width:0;
        }

        .row > div{
            min-width:0;
        }

        .row:hover{
            background:#FAFAFA;
        }

        .status-row{
            padding:32px 24px;
            text-align:center;
            color:${C.textMuted};
            font-size:13px;
        }

        .student{
            display:flex;
            flex-direction:column;
            gap:4px;
        }

        .student-name{
            font-size:13px;
            font-weight:700;
            color:${C.textDark};
            white-space: normal;
            min-width:0;
            overflow-wrap: break-word;
            word-break: break-word;
        }

        .student-email{
            font-size:11px;
            color:#7B8190;
            min-width:0;
            overflow-wrap: break-word;
            word-break: break-word;
        }

        .student-course{
            font-size:13px;
            font-weight:500;
            color:#4B5563;
            min-width:0;
            overflow-wrap: break-word;
            word-break: break-word;
        }

        .student-year{
            font-size:13px;
            font-weight:500;
            color:#4B5563;
            min-width:0;
            overflow-wrap: break-word;
            word-break: break-word;
        }

        .site{
            display:flex;
            align-items:center;
            min-width:0;
            font-size:13px;
            font-weight:500;
            color:#4B5563;
            overflow-wrap:anywhere;
        }

        .site span{
            background:#F3F4F6;
            color:#646B79;
            padding:8px 18px;
            border-radius:999px;
            font-size:13px;
            font-weight:600;
            }

        .filter-menu{
        position:absolute;
        top:90px;
        right:32px;
        width:280px;
        max-height:420px;
        overflow-y:auto;
        background:#fff;
        border:1px solid #E5E7EB;
        border-radius:20px;
        padding:20px;
        box-shadow:0 12px 30px rgba(0,0,0,.12);
        z-index:9999;

        display:flex;
        flex-direction:column;
        gap:8px;
        }


        .filter-section{
        display:flex;
        flex-direction:column;
        gap:8px;
        }


        .filter-title{
        font-size:11px;
        font-weight:800;
        letter-spacing:1px;
        color:${C.maroon};
        margin-bottom:4px;
        }


        .filter-divider{
        height:1px;
        background:#EAEAEA;
        margin:12px 0;
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

        .filter-section{
        display:flex;
        flex-direction:column;
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
        color:#555;
        cursor:pointer;
        }


        .check-item:hover{
        background:#F7F7F5;
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
        font-size:13px;
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
        font-size:12px;
        cursor:pointer;
        display:flex;
        align-items:center;
        justify-content:center;
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
        font-size:13px;
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
        font-size:12px;
        background:white;
        }

        @media (max-width:1024px){

          .class-main{
              margin-left:90px;
              padding:24px;
          }

          .class-title{
              font-size:30px;
          }

          .class-top{
              flex-direction:column;
              align-items:stretch;
          }

          .search-area{
              width:100%;
          }

          .search-box{
              flex:1;
              width:auto;
          }

          .table-head,
          .row{
              grid-template-columns:2fr 1fr 1fr 1fr;
              gap:12px;
              padding-left:18px;
              padding-right:18px;
          }

          .student-name{
              font-size:13px;
          }

          .student-email,
          .student-course,
          .student-year,
          .site{
              font-size:12px;
          }

        }


        @media (max-width:767px){

        .class-main{
            margin-left:0;
            padding:18px 14px 100px;
        }

        .class-title{
            font-size:28px;
            padding-top:clamp(43px, 0.5vw, 20px);
        }

        .class-top{
            flex-direction:column;
            align-items:stretch;
            gap:16px;
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
        }

        .filter{
            width:46px;
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

        .student-name{
              font-size:11px;
          }

          .student-email,
          .student-course,
          .student-year,
          .site{
              font-size:9px;
          }

        .table-head{
            font-size: 9px;
            align-items: center;
        }

        }

      `}</style>


      <div className={`${montserrat.variable} class-page`}>

        <Sidebar />


        <main className="class-main">


          <div className="class-header">

            <h1 className="class-title">
              Class
            </h1>

            <div className="profile-pill-wrapper">
            <ProfilePill
              name={profile.fullName}
              initials={getInitials(profile.fullName)}
              section={profile.sectionName}
            />
            </div>

          </div>


          <div className="divider" />

        {/* filter */}
          <div
            style={{
                position: "relative",
            }}
            >

            <div className="class-card">

                <div className="class-top">

                <div>

                    <div className="class-name">
                    {profile.sectionName || "—"}
                    </div>

                    <div className="prof">
                    Adviser: {profile.adviserName || "—"}
                    </div>

                    <div className="email">
                    Email: {profile.adviserEmail || "—"}
                    </div>

                </div>

                <div ref={filterRef} style={{ position: "relative" }}>

                {/* search n filter */}
                <div className="search-area">
                    <div className="search-box">
                    <i className="ti ti-search" />
                    <input
                        value={search}
                        onChange={(e) => {
                        setSearch(e.target.value)
                        setShowFilters(false)
                        }}
                        placeholder="Search Name..."
                    />
                    </div>

                    <button
                    className="filter"
                    onClick={() => setShowFilters((prev) => !prev)}
                    style={{
                        border: `1.5px solid ${totalActiveFilters > 0 ? C.maroon : C.Green}`,
                        color: totalActiveFilters > 0 ? C.maroon : C.Green,
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
                        {totalActiveFilters}
                        </span>
                    )}
                    </button>

                </div>

                {/* filter */}
                {showFilters && (
                    <div
                    style={{
                        position: "absolute",
                        top: "100%",
                        right: 0,
                        marginTop: "10px",
                        zIndex: 9999,
                    }}
                    >
                    <AdminFilterPanel
                        groups={[
                        {
                            field: "course",
                            label: "Course",
                            options: courses.map((c) => ({ value: c, label: c })),
                        },
                        {
                            field: "year",
                            label: "Year Level",
                            options: years.map((y) => ({ value: y, label: y })),
                        },
                        {
                            field: "site",
                            label: "Site Location",
                            options: sites.map((s) => ({ value: s, label: s })),
                        },
                        ]}
                        activeFilters={activeFilters}
                        onChange={(next) => setActiveFilters(next)}
                        onClear={() => setActiveFilters({})}
                    />
                    </div>
                )}
                </div>


                </div>

                <div className="table-head">
                <div
                    style={{ cursor: "pointer", display: "flex", }}
                    onClick={() => handleSort("name")}
                    >
                    STUDENT
                    {getSortIcons("name")}
                    </div>

                <div
                    style={{ cursor: "pointer", display: "flex", }}
                    onClick={() => handleSort("course")}
                    >
                    COURSE
                    {getSortIcons("course")}
                    </div>

                <div
                    style={{ cursor: "pointer", display: "flex",}}
                    onClick={() => handleSort("year")}
                    >
                    YEAR LEVEL
                    {getSortIcons("year")}
                    </div>

                <div
                    style={{
                        textAlign: "center",
                        cursor: "pointer",
                        display: "flex",
                    }}
                    onClick={() => handleSort("site")}
                    >
                    SITE
                    {getSortIcons("site")}
                    </div>
                    </div>

                <div>
                {loading ? (
                    <div className="status-row">Loading classmates…</div>
                ) : paginatedStudents.length === 0 ? (
                    <div className="status-row">No classmates found.</div>
                ) : (
                    paginatedStudents.map((student, index) => (
                    <div
                    className="row"
                    key={`${student.email}-${index}`}
                    >

                    <div className="student">
                        <div className="student-name">{student.name}</div>
                        <div className="student-email">{student.email}</div>
                    </div>

                    <div className="student-course">
                        {student.course}
                    </div>

                    <div className="student-year">
                        {student.year}
                    </div>

                    <div className="site">
                        {student.site}
                    </div>

                    </div>
                    ))
                )}
                </div>

                {/* pagination */}
                <div className="pagination-container">

                <div className="pagination-info">
                    Showing{" "}
                    {filteredStudents.length === 0
                    ? 0
                    : (currentPage - 1) * itemsPerPage + 1}
                    –
                    {Math.min(
                    currentPage * itemsPerPage,
                    filteredStudents.length
                    )}
                    {" "}of {filteredStudents.length}
                    </div>


                    {/* page buttons */}
                    <div className="pagination-buttons">

                    <button
                    onClick={() =>
                    setCurrentPage(prev => Math.max(prev - 1,1))
                    }
                    disabled={currentPage === 1}
                    className={`pagination-btn ${
                        currentPage === 1 ? "disabled" : ""
                      }`}
                    >
                    ‹
                    </button>


                    {getPageNumbers().map((page,index)=>(

                    page === "..." ?

                    <span
                    key={index}
                    className="pagination-dots"
                    >
                    ...
                    </span>

                    :

                    <button
                    key={index}
                    onClick={()=>setCurrentPage(Number(page))}
                    className={`pagination-btn ${
                        currentPage === page ? "active" : ""
                      }`}
                    >
                    {page}
                    </button>

                    ))}


                    <button
                    onClick={() =>
                    setCurrentPage(prev => Math.min(prev+1,totalPages))
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



                    {/* rows per page */}
                    <div
                    className="rows-page"
                    >

                    Rows per page:

                    <select
                    value={itemsPerPage}
                    onChange={(e)=>{
                    setItemsPerPage(Number(e.target.value))
                    }}
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

            </div>


        </main>


      </div>


    </>
  )
}
