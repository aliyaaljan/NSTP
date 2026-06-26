"use client"

import { useMemo, useState, useEffect, useRef } from "react"

const COLORS = {
  maroonBase: "#7B1113",
  forestLight: "#2D6A4F",
  surface: "#F5F5F5",
  white: "#FFFFFF",
  text: "#2C2C2A",
  muted: "#888888",
  border: "#DDDDDD",
  disabled: "#BBBBBB",
  gold: "#F3AA2C",
  forestGreen: "#014421",
}

export type DocumentStatus = "submitted" | "pending"

export interface DocumentItem {
  id: string
  name: string
  status: DocumentStatus
  note?: string
}

export interface DocumentsProps {
  documents?: DocumentItem[]
  variant?: "compact" | "full"
  maxListHeight?: number
}

const STATUS_META: Record<DocumentStatus, { label: string; color: string; bg: string; icon: string }> = {
  submitted: { label: "Submitted", color: COLORS.forestLight, bg: "rgba(45,106,79,0.10)", icon: "ti-check" },
  pending: { label: "Pending", color: COLORS.gold, bg: "rgba(243,170,44,0.12)", icon: "ti-clock" },
}

export default function Documents({
  documents = [],
  variant = "compact",
  maxListHeight = 360,
}: DocumentsProps) {
  if (variant === "compact") {
    return <DocumentsCompact documents={documents} />
  }
  return <DocumentsFull documents={documents} maxListHeight={maxListHeight} />
}

function DocumentsCompact({ documents }: { documents: DocumentItem[] }) {
  const [filter, setFilter] = useState<"all" | DocumentStatus>("all")
  const [isMobile, setIsMobile] = useState(false)
  const [scrollIndex, setScrollIndex] = useState(0)
  const gridRef = useRef<HTMLDivElement>(null)
  const [itemsPerRow, setItemsPerRow] = useState(6)
  
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      setIsMobile(width < 768)
      
      if (width < 480) {
        setItemsPerRow(3)
      } else if (width < 768) {
        setItemsPerRow(4)
      } else if (width < 1024) {
        setItemsPerRow(5)
      } else {
        setItemsPerRow(6)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  const submitted = documents.filter((d) => d.status === "submitted")
  const pendingDocs = documents.filter((d) => d.status === "pending")
  
  const getFilteredDocuments = () => {
    if (filter === "all") {
      return [...pendingDocs, ...submitted]
    } else if (filter === "submitted") {
      return submitted
    } else if (filter === "pending") {
      return pendingDocs
    }
    return documents
  }

  const displayDocuments = getFilteredDocuments()

  const getSectionTitle = () => {
    if (filter === "all") return "All Documents"
    if (filter === "submitted") return "Submitted Documents"
    if (filter === "pending") return "Pending Documents"
    return "Documents"
  }

  const totalItems = displayDocuments.length
  const maxIndex = Math.max(0, Math.ceil(totalItems / itemsPerRow) - 1)

  const getVisibleItems = () => {
    const start = scrollIndex * itemsPerRow
    const end = start + itemsPerRow
    return displayDocuments.slice(start, end)
  }

  const visibleItems = getVisibleItems()

  const handlePrev = () => {
    setScrollIndex(prev => Math.max(0, prev - 1))
  }

  const handleNext = () => {
    setScrollIndex(prev => Math.min(maxIndex, prev + 1))
  }

  const hasMore = totalItems > itemsPerRow
  const showLeftArrow = scrollIndex > 0
  const showRightArrow = scrollIndex < maxIndex

  return (
    <div
      style={{
        background: COLORS.white,
        borderRadius: "14px",
        border: `1px solid ${COLORS.border}`,
        borderTop: `6px solid ${COLORS.forestGreen}`, 
        borderTopLeftRadius: "16px",
        borderTopRightRadius: "16px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        padding: isMobile ? "14px" : "18px",
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? "10px" : "14px",
        height: "100%",
        width: "100%",
        transition: "all 0.3s ease",
      }}
    >
      <div style={{ 
        display: "flex", 
        alignItems: "baseline", 
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "4px",
        flexShrink: 0,
      }}>
        <span
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontWeight: 700,
            fontSize: isMobile ? "15px" : "16px",
            color: COLORS.text,
            letterSpacing: "0.5px",
          }}
        >
          DOCUMENTS
        </span>
        <span style={{ 
          fontSize: isMobile ? "10px" : "11px", 
          color: COLORS.muted, 
          fontWeight: 600 
        }}>
          {submitted.length}/{documents.length}
        </span>
      </div>

      <div style={{ 
        display: "flex", 
        gap: isMobile ? "4px" : "6px", 
        flexWrap: "wrap",
        flexShrink: 0,
      }}>
        {(["all", "submitted", "pending"] as const).map((key) => {
          const active = filter === key
          const meta = key === "all" ? null : STATUS_META[key]
          return (
            <button
              key={key}
              onClick={() => {
                setFilter(key)
                setScrollIndex(0)
              }}
              style={{
                fontSize: isMobile ? "9px" : "10px",
                fontWeight: 600,
                padding: isMobile ? "3px 8px" : "4px 10px",
                borderRadius: "999px",
                border: `2px solid ${active ? (meta?.color ?? COLORS.maroonBase) : COLORS.border}`,
                background: active ? (meta?.bg ?? "rgba(123,17,19,0.08)") : COLORS.white,
                color: active ? (meta?.color ?? COLORS.maroonBase) : COLORS.muted,
                cursor: "pointer",
                textTransform: "capitalize",
                whiteSpace: "nowrap",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = COLORS.surface
                  e.currentTarget.style.borderColor = COLORS.muted
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = COLORS.white
                  e.currentTarget.style.borderColor = COLORS.border
                }
              }}
            >
              {key === "all" ? "All" : meta!.label}
            </button>
          )
        })}
      </div>

      <div style={{ 
        position: "relative", 
        flexShrink: 0,
        padding: "0 32px",
      }}>
        <div
          ref={gridRef}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${itemsPerRow}, 1fr)`,
            gap: isMobile ? "6px" : "8px",
            justifyItems: "center",
            transition: "all 0.3s ease-in-out",
          }}
        >
          {visibleItems.map((doc) => {
            const meta = STATUS_META[doc.status]
            const isSubmitted = doc.status === "submitted"
            return (
              <div
                key={doc.id}
                title={`${doc.name} — ${meta.label}${doc.note ? ` (${doc.note})` : ''}`}
                style={{
                  width: "100%",
                  aspectRatio: "1 / 1",
                  borderRadius: "9px",
                  border: `2px solid ${isSubmitted ? COLORS.border : "#CCCCCC"}`,
                  background: isSubmitted ? meta.bg : "#E8E8E8",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isSubmitted ? meta.color : "#999999",
                  opacity: isSubmitted ? 1 : 0.7,
                  transition: "all 0.2s ease-in-out",
                  cursor: "pointer",
                  fontSize: isMobile ? "14px" : "16px",
                  gap: "2px",
                  position: "relative",
                  minWidth: 0,
                }}
                onMouseEnter={(e) => {
                  if (isSubmitted) {
                    e.currentTarget.style.transform = "scale(1.05)"
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"
                  }
                  e.currentTarget.style.borderColor = meta.color
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)"
                  e.currentTarget.style.boxShadow = "none"
                  e.currentTarget.style.borderColor = isSubmitted ? COLORS.border : "#CCCCCC"
                }}
              >
                <i className="ti ti-file-text" style={{ fontSize: isMobile ? "14px" : "16px" }} />
                <span style={{ 
                  fontSize: isMobile ? "6px" : "7px", 
                  fontWeight: 600,
                  opacity: 0.8,
                  maxWidth: "80%",
                  textAlign: "center",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {doc.name.split(' ').slice(0, 2).join(' ')}
                </span>
              </div>
            )
          })}
          {visibleItems.length < itemsPerRow && 
            Array.from({ length: itemsPerRow - visibleItems.length }).map((_, i) => (
              <div key={`empty-${i}`} style={{ visibility: "hidden", aspectRatio: "1 / 1" }} />
            ))
          }
        </div>

        {/* Left Arrow */}
        {hasMore && showLeftArrow && (
          <button
            onClick={handlePrev}
            style={{
              position: "absolute",
              left: "0",
              top: "50%",
              transform: "translateY(-50%)",
              background: COLORS.white,
              border: `1px solid ${COLORS.border}`,
              borderRadius: "50%",
              width: isMobile ? "24px" : "28px",
              height: isMobile ? "24px" : "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              transition: "all 0.2s ease-in-out",
              zIndex: 1,
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = COLORS.surface
              e.currentTarget.style.transform = "translateY(-50%) scale(1.1)"
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = COLORS.white
              e.currentTarget.style.transform = "translateY(-50%) scale(1)"
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)"
            }}
          >
            <i className="ti ti-chevron-left" style={{ 
              fontSize: isMobile ? "12px" : "14px",
              color: COLORS.text,
            }} />
          </button>
        )}

        {/* Right Arrow */}
        {hasMore && showRightArrow && (
          <button
            onClick={handleNext}
            style={{
              position: "absolute",
              right: "0",
              top: "50%",
              transform: "translateY(-50%)",
              background: COLORS.white,
              border: `1px solid ${COLORS.border}`,
              borderRadius: "50%",
              width: isMobile ? "24px" : "28px",
              height: isMobile ? "24px" : "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              transition: "all 0.2s ease-in-out",
              zIndex: 1,
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = COLORS.surface
              e.currentTarget.style.transform = "translateY(-50%) scale(1.1)"
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = COLORS.white
              e.currentTarget.style.transform = "translateY(-50%) scale(1)"
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)"
            }}
          >
            <i className="ti ti-chevron-right" style={{ 
              fontSize: isMobile ? "12px" : "14px",
              color: COLORS.text,
            }} />
          </button>
        )}
      </div>

      <div style={{ 
        height: "1px", 
        background: COLORS.surface,
        flexShrink: 0,
      }} />

      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        gap: "8px", 
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
      }}>
        <span
          style={{
            fontSize: isMobile ? "10px" : "11px",
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: "0.3px",
            flexShrink: 0,
          }}
        >
          {getSectionTitle()}
        </span>
        {displayDocuments.length === 0 ? (
          <span style={{ 
            fontSize: isMobile ? "11px" : "12px", 
            color: COLORS.muted,
            padding: "8px 0",
          }}>
            No documents to show.
          </span>
        ) : (
          <ul style={{ 
            listStyle: "none", 
            margin: 0, 
            padding: 0,
            paddingRight: "12px",
            display: "flex", 
            flexDirection: "column", 
            gap: isMobile ? "5px" : "7px",
            flex: 1,
            overflowY: "auto",
            scrollbarWidth: "thin",
          }}>
            {displayDocuments.map((doc) => {
              const meta = STATUS_META[doc.status]
              return (
                <li
                  key={doc.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: isMobile ? "6px" : "8px",
                    fontSize: isMobile ? "11px" : "12px",
                    color: "#666666",
                    opacity: 0.8,
                    padding: "2px 0",
                    transition: "all 0.2s ease-in-out",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "1"
                    e.currentTarget.style.color = COLORS.text
                    e.currentTarget.style.transform = "translateX(4px)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "0.8"
                    e.currentTarget.style.color = "#666666"
                    e.currentTarget.style.transform = "translateX(0)"
                  }}
                >
                  <span
                    style={{
                      width: isMobile ? "5px" : "6px",
                      height: isMobile ? "5px" : "6px",
                      borderRadius: "50%",
                      background: meta.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ 
                    whiteSpace: "nowrap", 
                    overflow: "hidden", 
                    textOverflow: "ellipsis",
                    flex: 1,
                  }}>
                    {doc.name}
                  </span>
                  <span style={{ 
                    fontSize: isMobile ? "10px" : "11px", 
                    color: "#666666", 
                    fontWeight: 600,
                    flexShrink: 0,
                  }}>
                    {doc.note || meta.label}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function DocumentsFull({
  documents,
  maxListHeight,
}: {
  documents: DocumentItem[]
  maxListHeight: number
}) {
  const [filter, setFilter] = useState<"all" | DocumentStatus>("all")
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const submittedCount = useMemo(() => documents.filter((d) => d.status === "submitted").length, [documents])
  const total = documents.length
  const pct = total === 0 ? 0 : Math.round((submittedCount / total) * 100)

  const getVisibleDocuments = () => {
    const pendingDocs = documents.filter((d) => d.status === "pending")
    const submittedDocs = documents.filter((d) => d.status === "submitted")
    
    if (filter === "all") {
      return [...pendingDocs, ...submittedDocs]
    } else if (filter === "submitted") {
      return submittedDocs
    } else if (filter === "pending") {
      return pendingDocs
    }
    return documents
  }

  const visible = getVisibleDocuments()

  const getSectionTitle = () => {
    if (filter === "all") return "All Documents"
    if (filter === "submitted") return "Submitted Documents"
    if (filter === "pending") return "Pending Documents"
    return "Documents"
  }

  return (
    <div
      style={{
        background: COLORS.white,
        borderRadius: "14px",
        border: `1px solid ${COLORS.border}`,
        borderTop: `6px solid ${COLORS.forestGreen}`, 
        borderTopLeftRadius: "16px",
        borderTopRightRadius: "16px",
        padding: isMobile ? "16px" : "20px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? "12px" : "16px",
        height: "100%",
      }}
    >
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "8px",
        flexShrink: 0,
      }}>
        <span
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontWeight: 700,
            fontSize: isMobile ? "16px" : "17px",
            color: COLORS.maroonBase,
            letterSpacing: "0.5px",
          }}
        >
          DOCUMENTS
        </span>
        <span style={{ 
          fontSize: isMobile ? "11px" : "12px", 
          color: COLORS.muted, 
          fontWeight: 600 
        }}>
          {submittedCount} / {total} submitted
        </span>
      </div>

      <div style={{ 
        width: "100%", 
        height: isMobile ? "6px" : "8px", 
        borderRadius: "5px", 
        background: COLORS.surface, 
        overflow: "hidden",
        flexShrink: 0,
      }}>
        <div style={{ 
          width: `${pct}%`, 
          height: "100%", 
          background: COLORS.gold, 
          borderRadius: "5px", 
          transition: "width 0.3s ease" 
        }} />
      </div>

      <div style={{ 
        display: "flex", 
        gap: isMobile ? "4px" : "6px", 
        flexWrap: "wrap",
        flexShrink: 0,
      }}>
        {(["all", "submitted", "pending"] as const).map((key) => {
          const active = filter === key
          const meta = key === "all" ? null : STATUS_META[key]
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                fontSize: isMobile ? "10px" : "11px",
                fontWeight: 600,
                padding: isMobile ? "4px 10px" : "5px 12px",
                borderRadius: "999px",
                border: `1px solid ${active ? (meta?.color ?? COLORS.maroonBase) : COLORS.border}`,
                background: active ? (meta?.bg ?? "rgba(123,17,19,0.08)") : COLORS.white,
                color: active ? (meta?.color ?? COLORS.maroonBase) : COLORS.muted,
                cursor: "pointer",
                textTransform: "capitalize",
                whiteSpace: "nowrap",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = COLORS.surface
                  e.currentTarget.style.borderColor = COLORS.muted
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = COLORS.white
                  e.currentTarget.style.borderColor = COLORS.border
                }
              }}
            >
              {key === "all" ? "All" : meta!.label}
            </button>
          )
        })}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: isMobile ? "6px" : "8px",
          overflowY: "auto",
          maxHeight: `${maxListHeight}px`,
          paddingRight: "12px",
          flex: 1,
          scrollbarWidth: "thin",
        }}
      >
        {visible.length === 0 && (
          <div style={{ 
            fontSize: isMobile ? "11px" : "12px", 
            color: COLORS.disabled, 
            textAlign: "center", 
            padding: "20px 0" 
          }}>
            Nothing here.
          </div>
        )}
        {visible.map((doc) => {
          const meta = STATUS_META[doc.status]
          const isSubmitted = doc.status === "submitted"
          return (
            <div
              key={doc.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: isMobile ? "10px" : "12px",
                padding: isMobile ? "8px 10px" : "10px 12px",
                borderRadius: "10px",
                border: `1px solid ${isSubmitted ? COLORS.border : "#CCCCCC"}`,
                background: isSubmitted ? COLORS.surface : "#EEEEEE",
                opacity: isSubmitted ? 1 : 0.7,
                transition: "all 0.2s ease-in-out",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                if (isSubmitted) {
                  e.currentTarget.style.transform = "translateX(4px)"
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"
                } else {
                  e.currentTarget.style.opacity = "0.85"
                }
                e.currentTarget.style.borderColor = meta.color
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateX(0)"
                e.currentTarget.style.boxShadow = "none"
                if (!isSubmitted) {
                  e.currentTarget.style.opacity = "0.7"
                }
                e.currentTarget.style.borderColor = isSubmitted ? COLORS.border : "#CCCCCC"
              }}
            >
              <span
                style={{
                  width: isMobile ? "30px" : "34px",
                  height: isMobile ? "30px" : "34px",
                  flexShrink: 0,
                  borderRadius: "8px",
                  border: `1px solid ${isSubmitted ? COLORS.border : "#CCCCCC"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isSubmitted ? meta.bg : "#E0E0E0",
                  color: isSubmitted ? meta.color : "#999999",
                }}
              >
                <i className="ti ti-file-text" style={{ fontSize: isMobile ? "15px" : "17px" }} />
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: isMobile ? "12px" : "13px",
                    fontWeight: 600,
                    color: isSubmitted ? COLORS.text : "#999999",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {doc.name}
                </div>
                {doc.note && (
                  <div style={{ 
                    fontSize: isMobile ? "11px" : "12px", 
                    fontWeight: 500,
                    color: isSubmitted ? COLORS.muted : "#AAAAAA", 
                    marginTop: "1px" 
                  }}>
                    {doc.note}
                  </div>
                )}
              </div>

              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: isMobile ? "10px" : "11px",
                  fontWeight: 700,
                  color: isSubmitted ? meta.color : "#999999",
                  background: isSubmitted ? meta.bg : "#E8E8E8",
                  padding: isMobile ? "3px 8px" : "4px 9px",
                  borderRadius: "999px",
                  flexShrink: 0,
                }}
              >
                <i className={`ti ${meta.icon}`} style={{ fontSize: isMobile ? "10px" : "11px" }} />
                {meta.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}