"use client"

import { useEffect, useRef, useState } from "react"
import { Montserrat } from "next/font/google"
import Sidebar from "@/components/shared/StudentSidebar"
import ProfilePill from "@/components/shared/StudentProfilePill"
import { getStudentDashboard } from "@/lib/student/dashboard-actions"
import { getInitials } from "@/lib/student/dashboard-view"

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
})

const C = {
  maroon: "#7B1113",
  pageBg: "#F0EFE8",
  border: "#D9D9D9",
  Green: "#014421",
  goldBg: "#FFF4D9",
  goldText: "#C5871A",
  textDark: "#2C2C2A",
  textMuted: "#7A7A7A",
}
//hehe cinopy paste copy paste ko po para ma-test pagination
const students = [
    {
        name: "Charles Ansbert Joaquin",
        email: "cajoaquin@up.edu.ph",
        course: "BS Computer Science",
        year: "4th Year",
        site: "Baguio City Public Library",
    },
    {
        name: "Saffi Limbaro",
        email: "slimbaro@up.edu.ph",
        course: "BS Mathematics",
        year: "4th Year",
        site: "Baguio City Public Library",
    },
    {
        name: "Rhona Shayne Lopez",
        email: "rslopez@up.edu.ph",
        course: "BS Biology",
        year: "3rd Year",
        site: "City Hall",
    },
    {
        name: "Aliya Aljan Mendoza",
        email: "aamendoza@up.edu.ph",
        course: "BS Physics",
        year: "2nd Year",
        site: "Baguio City Public Library",
    },
  ]

export default function ClassPage() {

  const [search, setSearch] = useState("")

  const [profile, setProfile] = useState({
    fullName: "",
    sectionName: "",
  })


  useEffect(() => {
    getStudentDashboard().then((res) => {
      if (!res.ok) return

      setProfile({
        fullName: res.data.fullName,
        sectionName: res.data.sectionName ?? "",
      })
    })
  }, [])

const [showFilters, setShowFilters] = useState(false)

const [courseFilter, setCourseFilter] = useState<string[]>([])
const [yearFilter, setYearFilter] = useState<string[]>([])
const [siteFilter, setSiteFilter] = useState<string[]>([])

const [openCourse, setOpenCourse] = useState(false)
const [openYear, setOpenYear] = useState(false)
const [openSite, setOpenSite] = useState(false)

const [currentPage, setCurrentPage] = useState(1)
const [itemsPerPage, setItemsPerPage] = useState(5)

useEffect(() => {
    setCurrentPage(1)
  }, [
    search,
    courseFilter,
    yearFilter,
    siteFilter,
    itemsPerPage
  ])

const courses = [
    ...Array.from(new Set(students.map(s => s.course))).sort()
]
  
const years = [
    ...Array.from(new Set(students.map(s => s.year))).sort((a, b) => {
      const yearA = parseInt(a)
      const yearB = parseInt(b)
      return yearA - yearB
    })
]
  
const sites = [
    ...Array.from(new Set(students.map(s => s.site))).sort()
]

const toggleFilter = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter(prev =>
      prev.includes(value)
        ? prev.filter(item => item !== value)
        : [...prev, value]
    )
  }

const filteredStudents = students.filter((student) => {
    const matchesSearch =
      `${student.name} ${student.site} ${student.course}`
        .toLowerCase()
        .includes(search.toLowerCase())
  
    const matchesCourse =
        courseFilter.length === 0 ||
        courseFilter.includes(student.course)
      
    const matchesYear =
        yearFilter.length === 0 ||
        yearFilter.includes(student.year)
      
    const matchesSite =
        siteFilter.length === 0 ||
        siteFilter.includes(student.site)
  
    return (
      matchesSearch &&
      matchesCourse &&
      matchesYear &&
      matchesSite
    )
  })

const sortedStudents = [...filteredStudents].sort((a, b) =>
    a.name.localeCompare(b.name)
  )

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
  
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
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
          margin-left:120px;
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
          font-size:45px;
          font-weight:800;
          color:${C.maroon};
          letter-spacing:-1px;
        }


        .divider {
          height:2px;
          background:#D9DDD8;
          margin-top:10px;
          margin-bottom:24px;
        }


        .class-card {
          background:white;
          border-radius:28px;
          border:2px solid ${C.border};
          overflow:hidden;
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
          font-size:25px;
          font-weight:800;
          color:${C.textDark};
        }


        .prof {
          font-size:15px;
          font-weight:700;
          color:#5A5A5A;
        }


        .email {
          color:${C.textMuted};
          font-style:italic;
          font-size:13px;
        }


        .search-area {
          display:flex;
          gap:10px;
        }


        .search-box {
          width:320px;
          height:40px;
          border:2px solid ${C.maroon};
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
          height:40px;
          border:none;
          border-radius:14px;
          background:${C.Green};
          color:white;
          font-size:22px;
          cursor:pointer;
          display:flex;
          align-items:center;
          justify-content:center;
        }


        .table-head{
            display:grid;
            grid-template-columns:2.2fr 1.3fr .8fr 1.4fr;
            padding:18px 24px;
            background:#F6F8F7;
            border-top:1px solid #E7E7E7;
            border-bottom:1px solid #E7E7E7;
            color:${C.maroon};
            font-size:15px;
            font-weight:700;
            letter-spacing:1px;
            }

        .row{
            display:grid;
            grid-template-columns:2.2fr 1.3fr .8fr 1.4fr;
            padding:22px 24px;
            align-items:center;
            border-bottom:1px solid #F0F0F0;
            transition:.2s;
        }

        .row:hover{
            background:#FAFAFA;
        }

        .student{
            display:flex;
            flex-direction:column;
            gap:4px;
        }

        .student-name{
            font-size:15px;
            font-weight:700;
            color:${C.textDark};
            white-space: normal;
            word-break: break-word;
        }

        .student-email{
            font-size:10px;
            color:#7B8190;
        }

        .student-course{
            font-size:13px;
            font-weight:500;
            color:#4B5563;
            justify-content:center;
            align-items:center;
        }

        .student-year{
            font-size:13px;
            font-weight:500;
            color:#4B5563;
            justify-content:center;
            align-items:center;
        }

        .site{
            display:flex;
            justify-content:center;
            align-items:center;
        }

        .site span{
            background:#F3F4F6;
            color:#646B79;
            padding:8px 18px;
            border-radius:999px;
            font-size:14px;
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
        font-weight:700;
        font-size:12px;
        cursor:pointer;
        display:flex;
        align-items:center;
        justify-content:center;
        }

        .pagination-btn.active {
        background:${C.maroon};
        color:white;
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

        @media(max-width:900px){

        .class-main {
            margin-left:100px;
        }

        }


        @media(max-width:600px){

        .class-main {
            margin-left:0;
            padding:20px 12px 110px;
        }

        .class-title {
            font-size:28px;
        }

        .search-box {
            width:200px;
        }

        }

      `}</style>


      <div className={`${montserrat.variable} class-page`}>

        <Sidebar />


        <main className="class-main">


          <div className="class-header">

            <h1 className="class-title">
              CLASS
            </h1>


            <ProfilePill
              name={profile.fullName}
              initials={getInitials(profile.fullName)}
              section={profile.sectionName}
            />

          </div>


          <div className="divider" />

        {/* filter */}
          <div
            style={{
                position: "relative",
            }}
            >

            {showFilters && (
                <div 
                ref={filterRef}
                className="filter-menu"
                >
                
                
                <div className="filter-section">
                
                <div 
                className="filter-header"
                onClick={()=>setOpenCourse(!openCourse)}
                >
                COURSE
                <span className="filter-arrow">
                {openCourse ? "⌃" : "⌄"}
                </span>
                </div>
                
                
                {openCourse && (
                <div className="filter-options">
                
                {courses.map((course)=>(
                <label key={course} className="check-item">
                
                <input
                type="checkbox"
                checked={courseFilter.includes(course)}
                onChange={() =>
                toggleFilter(course,setCourseFilter)
                }
                />
                
                {course}
                
                </label>
                ))}
                
                </div>
                )}
                
                </div>
                
                
                <div className="filter-divider"/>
                
                
                <div className="filter-section">
                
                <div 
                className="filter-header"
                onClick={()=>setOpenYear(!openYear)}
                >
                YEAR LEVEL
                <span className="filter-arrow">
                {openYear ? "⌃" : "⌄"}
                </span>
                </div>
                
                
                {openYear && (
                <div className="filter-options">
                
                {years.map((year)=>(
                <label key={year} className="check-item">
                
                <input
                type="checkbox"
                checked={yearFilter.includes(year)}
                onChange={() =>
                toggleFilter(year,setYearFilter)
                }
                />
                
                {year}
                
                </label>
                ))}
                
                </div>
                )}
                
                </div>
                
                
                <div className="filter-divider"/>
                
                
                <div className="filter-section">
                
                <div 
                className="filter-header"
                onClick={()=>setOpenSite(!openSite)}
                >
                SITE LOCATION
                <span className="filter-arrow">
                {openSite ? "⌃" : "⌄"}
                </span>
                </div>
                
                
                {openSite && (
                <div className="filter-options">
                
                {sites.map((site)=>(
                <label key={site} className="check-item">
                
                <input
                type="checkbox"
                checked={siteFilter.includes(site)}
                onChange={() =>
                toggleFilter(site,setSiteFilter)
                }
                />
                
                {site}
                
                </label>
                ))}
                
                </div>
                )}
                
                </div>
                
                
                <button
                className="clear-filter"
                onClick={()=>{
                setCourseFilter([])
                setYearFilter([])
                setSiteFilter([])
                }}
                >
                Clear Filters
                </button>
                
                
                </div>
            )}

            <div className="class-card">

                <div className="class-top">

                <div>

                    <div className="class-name">
                    NSTP - H
                    </div>

                    <div className="prof">
                    Mr. Wonwoo Jeon
                    </div>

                    <div className="email">
                    wjeon@up.edu.ph
                    </div>

                </div>

                <div className="search-area">

                    <div className="search-box">

                    <i className="ti ti-search" />

                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search Name or Site Location"
                    />

                    </div>

                    <button
                    className="filter"
                    onClick={() => setShowFilters((prev) => !prev)}
                    >
                    <i className="ti ti-filter" />
                    </button>

                </div>

                </div>

                <div className="table-head">
                <div>STUDENT</div>
                <div>COURSE</div>
                <div>YEAR LEVEL</div>
                <div style={{ textAlign: "center" }}>
                    SITE LOCATION
                </div>
                </div>

                <div>
                {paginatedStudents.map((student, index) => (
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
                        <span>{student.site}</span>
                    </div>

                    </div>
                ))}
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
                    {" "}of {filteredStudents.length} students
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