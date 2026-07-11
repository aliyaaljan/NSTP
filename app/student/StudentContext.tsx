// yo prevent repeated API calls
"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { getStudentDashboard } from "@/lib/student/dashboard-actions"

interface StudentContextType {
  isLeader: boolean
  isLoading: boolean
  studentData: any
}

const StudentContext = createContext<StudentContextType | undefined>(undefined)

export function StudentProvider({ children }: { children: ReactNode }) {
  const [isLeader, setIsLeader] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [studentData, setStudentData] = useState<any>(null)

  useEffect(() => {
    async function loadStudentData() {
      try {
        const result = await getStudentDashboard()
        if (result.ok && result.data) {
          setIsLeader(result.data.isLeader || false)
          setStudentData(result.data)
        }
      } catch (error) {
        console.error("Failed to fetch student data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadStudentData()
  }, [])

  return (
    <StudentContext.Provider value={{ isLeader, isLoading, studentData }}>
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