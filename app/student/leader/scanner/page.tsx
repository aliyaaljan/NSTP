"use client"

import { useState, useEffect, useMemo } from "react"
import Sidebar from "@/components/shared/StudentLeaderSidebar"
import { QrScanner } from "@/components/shared/QrScanner"
import { fetchLeaderScanHistory } from "@/lib/student/leader/scanner-fetch"
import {
  type ScanRecord,
  groupByMonth,
  groupByDate,
} from "@/lib/student/leader/scan-history"
import { getStudentDashboard } from "@/lib/student/dashboard-actions"
import { getInitials } from "@/lib/student/dashboard-view"

import { montserrat, C, COLLAPSED_W, RAIL_MARGIN } from "./_components/theme"
import { useIsMobile } from "./_components/useIsMobile"
import { PageHeader } from "./_components/PageHeader"
import { StatsCards } from "./_components/StatsCards"
import { QRCard } from "./_components/QRCard"
import { WeekFilter } from "./_components/WeekFilter"
import { ScanLogPanel } from "./_components/ScanLogPanel"
import { filterScansByMonthAndWeek } from "@/lib/student/leader/scan-history"
import { createClient } from "@/lib/client"
import { create } from "domain"

export default function LeaderScannerPage() {
  const { isMobile } = useIsMobile()
  const [scannerOpen, setScannerOpen] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState<string>("all")
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [shouldAutoSelect, setShouldAutoSelect] = useState(true)
  const [scans, setScans] = useState<ScanRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [classRoster, setClassRoster] = useState<string[]>([])

  const [profile, setProfile] = useState<{
    name: string
    initials: string
    section: string
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    getStudentDashboard().then((res) => {
      if (cancelled || !res.ok) return
      setProfile({
        name: res.data.fullName,
        initials: getInitials(res.data.fullName),
        section: res.data.sectionName ?? "",
      })
    })
    return () => {
      cancelled = true
    }
  }, [])

  const loadDatabaseScans = async () => {
    setIsLoading(true)

    // fetch scan history for logs
    const dbScans = await fetchLeaderScanHistory()
    setScans(dbScans)

    // fetch actual enrolled class roster for specific leader
    const supabase = createClient()
    const { data: rosterData } = await supabase.rpc(
      "get_leader_section_dashboard"
    )

    if (rosterData && rosterData.length > 0) {
      const row = rosterData[0]
      // extract only student names
      const studentNames = ((row.students as any[]) ?? [])
        .map((s: any) => s.name ?? "")
        .filter(Boolean) // removes null names

      setClassRoster(studentNames)
    } else {
      setClassRoster([])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadDatabaseScans()
  }, [])

  useEffect(() => {
    if (shouldAutoSelect && !selectedMonth && scans.length > 0) {
      const months = Array.from(
        new Set(
          scans
            .map((scan) => new Date(scan.date))
            .filter((date) => !Number.isNaN(date.getTime()))
            .map((date) =>
              date.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })
            )
        )
      ).sort((a, b) => {
        const dateA = new Date(a)
        const dateB = new Date(b)
        return dateB.getTime() - dateA.getTime()
      })

      if (months.length > 0) {
        setSelectedMonth(months[0]) 
        setShouldAutoSelect(false) 
      }
    }
  }, [scans, selectedMonth, shouldAutoSelect])

  // Handle General All 
  const handleGeneralAllClick = () => {
    setSelectedMonth("")
    setSelectedWeek("all")
    setShouldAutoSelect(false) 
  }

  // Handle month selection
  const handleSetSelectedMonth = (month: string) => {
    setSelectedMonth(month)
    // Turn off auto-select
    if (month) {
      setShouldAutoSelect(false)
    }
  }

  const leftPadding = isMobile
    ? `${COLLAPSED_W + RAIL_MARGIN * 2 + 8}px`
    : `${COLLAPSED_W + RAIL_MARGIN * 2}px`

  const filteredScans = filterScansByMonthAndWeek(
    scans,
    selectedMonth,
    selectedWeek
  )

  const groupedByMonthData =
    selectedWeek === "all" ? groupByMonth(filteredScans) : null

  const groupedByDateData =
    selectedWeek !== "all" ? groupByDate(filteredScans) : null

  // check who has not been scanned
  const scannedNames = new Set(filteredScans.map((s) => s.name))
  const notScannedNames = classRoster.filter((name) => !scannedNames.has(name))

  const totalScans = filteredScans.length
  const onTimeCount = filteredScans.filter((s) => s.status === "On Time").length
  const lateCount = filteredScans.filter((s) => s.status === "Late").length

  const notScannedCount = notScannedNames.length

  const months = useMemo(() => {
    if (!scans || scans.length === 0) return []

    const uniqueMonthStrings = Array.from(
      new Set(
        scans
          .map((scan) => new Date(scan.date))
          .filter((date) => !Number.isNaN(date.getTime()))
          .map((date) =>
            date.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })
          )
      )
    )

    return uniqueMonthStrings.sort((a, b) => {
      const dateA = new Date(a)
      const dateB = new Date(b)
      return dateB.getTime() - dateA.getTime()
    })
  }, [scans])

  return (
    <div
      className={montserrat.variable}
      style={{
        fontFamily: "'Montserrat', sans-serif",
        background: C.pageBg,
        minHeight: "100vh",
        display: "flex",
        position: "relative",
      }}
    >
      <Sidebar />
      <main
        style={{
          flex: 1,
          paddingLeft: leftPadding,
          paddingRight: isMobile ? "12px" : "32px",
          paddingTop: isMobile ? "12px" : "28px",
          paddingBottom: isMobile ? "80px" : "28px",
          display: "flex",
          flexDirection: "column",
          gap: isMobile ? "12px" : "24px",
          minWidth: 0,
          width: "100%",
          maxWidth: "100%",
          transition: "padding 0.3s ease",
        }}
      >
        <PageHeader isMobile={isMobile} profile={profile ?? undefined} />

        <StatsCards
          isMobile={isMobile}
          totalScans={totalScans}
          onTimeCount={onTimeCount}
          lateCount={lateCount}
          notScannedCount={notScannedCount}
          selectedMonth={selectedMonth}
          selectedWeek={selectedWeek}
        />

        <QRCard
          isMobile={isMobile}
          onOpenScanner={() => setScannerOpen(true)}
        />

        <WeekFilter
          isMobile={isMobile}
          selectedWeek={selectedWeek}
          onSelectWeek={setSelectedWeek}
          months={months}
          selectedMonth={selectedMonth}
          setSelectedMonth={handleSetSelectedMonth}
          onGeneralAllClick={handleGeneralAllClick}
        />

        <ScanLogPanel
          isMobile={isMobile}
          scans={filteredScans}
          groupedByMonth={groupedByMonthData}
          groupedByDate={groupedByDateData}
          selectedWeek={selectedWeek}
          notScannedNames={notScannedNames}
        />

        {scannerOpen && (
          <QrScanner
            onClose={() => {
              setScannerOpen(false)
              loadDatabaseScans()
            }}
            onScanSuccess={() => {
              // live-refresh the scan log after each successful scan
              loadDatabaseScans()
            }}
          />
        )}
      </main>
    </div>
  )
}