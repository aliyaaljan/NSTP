// yo prevent repeated API calls
"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { getStudentDashboard } from "@/lib/student/dashboard-actions"

interface StudentContextType {
  isLeader: boolean
  isLoading: boolean
  studentData: any
  refreshStudentData: () => Promise<void>
}

const StudentContext = createContext<StudentContextType | undefined>(undefined)

export function StudentProvider({ children }: { children: ReactNode }) {
  const [isLeader, setIsLeader] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [studentData, setStudentData] = useState<any>(null)

  // Load student data with caching
  const loadStudentData = async (forceRefresh = false) => {
    try {
      setIsLoading(true)

      // Check localStorage
      if (!forceRefresh) {
        const cachedLeader = localStorage.getItem("isLeader")
        const cachedData = localStorage.getItem("studentData")
        
        if (cachedLeader !== null && cachedData) {
          setIsLeader(cachedLeader === "true")
          setStudentData(JSON.parse(cachedData))
          setIsLoading(false)
        }
      }

      const result = await getStudentDashboard()
      if (result.ok && result.data) {
        const leaderStatus = result.data.isLeader || false
        setIsLeader(leaderStatus)
        setStudentData(result.data)
        
        // Cache in localStorage
        localStorage.setItem("isLeader", String(leaderStatus))
        localStorage.setItem("studentData", JSON.stringify(result.data))
      }
    } catch (error) {
      console.error("Failed to fetch student data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Refresh function to force reload from server
  const refreshStudentData = async () => {
    await loadStudentData(true)
  }

  useEffect(() => {
    loadStudentData()
  }, [])

  return (
    <StudentContext.Provider value={{ isLeader, isLoading, studentData, refreshStudentData }}>
      {children}
    </StudentContext.Provider>
  )
}

export function useStudent() {
  const context = useContext(StudentContext)
  if (context === undefined) {
    throw new Error("useStudent must be used within a StudentProvider")
  }
  return context
}