"use client"

import { useMemo, useState, useEffect, useRef } from "react"

export type FormStatus = "submitted" | "pending"

export interface FormItem {
  id: string
  name: string
  status: FormStatus
  note?: string
}

export interface FormsProps {
  Forms?: FormItem[]
  variant?: "compact" | "full"
  maxListHeight?: number
}

const STATUS_META: Record<FormStatus, { label: string; color: string; bg: string; icon: string }> = {
  submitted: { label: "Submitted", color: "#2D6A4F", bg: "rgba(45,106,79,0.10)", icon: "ti-check" },
  pending: { label: "Pending", color: "#F3AA2C", bg: "rgba(243,170,44,0.12)", icon: "ti-clock" },
}

export default function Forms({
  Forms = [],
  variant = "compact",
  maxListHeight = 360,
}: FormsProps) {
  if (variant === "compact") {
    return <FormsCompact Forms={Forms} />
  }
  return <FormsFull Forms={Forms} maxListHeight={maxListHeight} />
}

function FormsCompact({ Forms }: { Forms: FormItem[] }) {
  const [filter, setFilter] = useState<"all" | FormStatus>("all")
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
  
  const submitted = Forms.filter((d) => d.status === "submitted")
  const pendingDocs = Forms.filter((d) => d.status === "pending")
  
  const getFilteredForms = () => {
    if (filter === "all") {
      return [...pendingDocs, ...submitted]
    } else if (filter === "submitted") {
      return submitted
    } else if (filter === "pending") {
      return pendingDocs
    }
    return Forms
  }

  const displayForms = getFilteredForms()

  const getSectionTitle = () => {
    if (filter === "all") return "All Forms"
    if (filter === "submitted") return "Submitted Forms"
    if (filter === "pending") return "Pending Forms"
    return "Forms"
  }

  const totalItems = displayForms.length
  const maxIndex = Math.max(0, Math.ceil(totalItems / itemsPerRow) - 1)

  const getVisibleItems = () => {
    const start = scrollIndex * itemsPerRow
    const end = start + itemsPerRow
    return displayForms.slice(start, end)
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
        background: '#FFFFFF',
        borderTopLeftRadius: '14px',
        borderTopRightRadius: '14px',
        borderBottomLeftRadius: '14px',
        borderBottomRightRadius: '14px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 2px 6px rgba(0,0,0,0.07)',
        padding: isMobile ? '28px 16px' : '28px 24px',
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? "10px" : "14px",
        height: "100%",
        width: "100%",
        fontFamily: 'var(--font-content, sans-serif)',
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
            fontWeight: 700,
            fontSize: "13px",
            color: '#111827',
            letterSpacing: "0.5px",
          }}
        >
          FORMS
        </span>
        <span style={{ 
          fontSize: "11px", 
          color: '#6B7280', 
          fontWeight: 400 
        }}>
          {submitted.length}/{Forms.length} forms submitted
        </span>
      </div>

      <div style={{ 
        display: "flex", 
        gap: isMobile ? "6px" : "8px", 
        flexWrap: "wrap",
        flexShrink: 0,
      }}>
        {(["all", "submitted", "pending"] as const).map((key) => {
          const active = filter === key
          const isAll = key === "all"           
          const meta = isAll ? null : STATUS_META[key]
          
          let activeColor = '#111827'         
          let activeBg = '#F5F5F5'        
          let label = "All"
          
          if (!isAll) {
            activeColor = meta!.color          
            activeBg = meta!.bg
            label = meta!.label
          }
          
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                fontSize: "11px",
                fontWeight: 600,
                padding: isMobile ? "4px 12px" : "4px 16px",
                borderRadius: "8px",
                border: active ? `1.5px solid ${activeColor}` : '1.5px solid #E5E7EB',
                background: active ? activeBg : '#FFFFFF',
                color: active ? activeColor : '#6B7280',
                cursor: "pointer",
                textTransform: "capitalize",
                whiteSpace: "nowrap",
                transition: "all 0.15s",
                fontFamily: 'var(--font-content, sans-serif)',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = '#F5F5F5'
                  e.currentTarget.style.borderColor = '#6B7280'
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = '#FFFFFF'
                  e.currentTarget.style.borderColor = '#E5E7EB'
                }
              }}
            >
              {label}
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
                  border: `1.5px solid ${isSubmitted ? '#2D6A4F' : '#F3AA2C'}`,
                  background: isSubmitted ? meta.bg : 'rgba(243,170,44,0.08)',
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isSubmitted ? meta.color : '#B8860B',
                  transition: "all 0.2s ease-in-out",
                  cursor: "pointer",
                  fontSize: isMobile ? "14px" : "16px",
                  gap: "2px",
                  position: "relative",
                  minWidth: 0,
                  padding: "4px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderWidth = "2px"
                  e.currentTarget.style.transform = "scale(1.05)"
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"
                  e.currentTarget.style.borderColor = isSubmitted ? '#2D6A4F' : '#F3AA2C'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderWidth = "1.5px"
                  e.currentTarget.style.transform = "scale(1)"
                  e.currentTarget.style.boxShadow = "none"
                  e.currentTarget.style.borderColor = isSubmitted ? '#2D6A4F' : '#F3AA2C'
                }}
              >
                <i className="ti ti-Form-text" style={{ fontSize: isMobile ? "14px" : "16px" }} />
                <span style={{ 
                  fontSize: isMobile ? "6px" : "7px", 
                  fontWeight: 600,
                  opacity: 0.8,
                  maxWidth: "100%",
                  textAlign: "center",
                  wordBreak: "break-word",
                  whiteSpace: "normal",
                  lineHeight: "1.2",
                  display: "block",
                }}>
                  {doc.name}
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

        {hasMore && showLeftArrow && (
          <button
            onClick={handlePrev}
            style={{
              position: "absolute",
              left: "0",
              top: "50%",
              transform: "translateY(-50%)",
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
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
              e.currentTarget.style.background = '#F5F5F5'
              e.currentTarget.style.transform = "translateY(-50%) scale(1.1)"
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FFFFFF'
              e.currentTarget.style.transform = "translateY(-50%) scale(1)"
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)"
            }}
          >
            <i className="ti ti-chevron-left" style={{ 
              fontSize: isMobile ? "12px" : "14px",
              color: '#111827',
            }} />
          </button>
        )}

        {hasMore && showRightArrow && (
          <button
            onClick={handleNext}
            style={{
              position: "absolute",
              right: "0",
              top: "50%",
              transform: "translateY(-50%)",
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
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
              e.currentTarget.style.background = '#F5F5F5'
              e.currentTarget.style.transform = "translateY(-50%) scale(1.1)"
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FFFFFF'
              e.currentTarget.style.transform = "translateY(-50%) scale(1)"
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)"
            }}
          >
            <i className="ti ti-chevron-right" style={{ 
              fontSize: isMobile ? "12px" : "14px",
              color: '#111827',
            }} />
          </button>
        )}
      </div>

      <div style={{ 
        height: "1px", 
        background: '#F5F5F5',
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
            fontSize: "11px",
            fontWeight: 700,
            color: '#111827',
            letterSpacing: "0.3px",
            flexShrink: 0,
          }}
        >
          {getSectionTitle()}
        </span>
        {displayForms.length === 0 ? (
          <span style={{ 
            fontSize: "11px", 
            color: '#6B7280',
            padding: "8px 0",
          }}>
            No forms to show.
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
            {displayForms.map((doc) => {
              const meta = STATUS_META[doc.status]
              return (
                <li
                  key={doc.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: isMobile ? "6px" : "8px",
                    fontSize: "11px",
                    color: '#6B7280',
                    opacity: 0.8,
                    padding: "2px 0",
                    transition: "all 0.2s ease-in-out",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "1"
                    e.currentTarget.style.color = '#111827'
                    e.currentTarget.style.transform = "translateX(4px)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "0.8"
                    e.currentTarget.style.color = '#6B7280'
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
                    fontSize: "10px", 
                    color: '#6B7280', 
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

function FormsFull({
  Forms,
  maxListHeight,
}: {
  Forms: FormItem[]
  maxListHeight: number
}) {
  const [filter, setFilter] = useState<"all" | FormStatus>("all")
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const submittedCount = useMemo(() => Forms.filter((d) => d.status === "submitted").length, [Forms])
  const total = Forms.length
  const pct = total === 0 ? 0 : Math.round((submittedCount / total) * 100)

  const getVisibleForms = () => {
    const pendingDocs = Forms.filter((d) => d.status === "pending")
    const submittedDocs = Forms.filter((d) => d.status === "submitted")
    
    if (filter === "all") {
      return [...pendingDocs, ...submittedDocs]
    } else if (filter === "submitted") {
      return submittedDocs
    } else if (filter === "pending") {
      return pendingDocs
    }
    return Forms
  }

  const visible = getVisibleForms()

  const getSectionTitle = () => {
    if (filter === "all") return "All Forms"
    if (filter === "submitted") return "Submitted Forms"
    if (filter === "pending") return "Pending Forms"
    return "Forms"
  }

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderTopLeftRadius: '14px',
        borderTopRightRadius: '14px',
        borderBottomLeftRadius: '14px',
        borderBottomRightRadius: '14px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 2px 6px rgba(0,0,0,0.07)',
        padding: isMobile ? '28px 16px' : '28px 24px',
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? "12px" : "16px",
        height: "100%",
        fontFamily: 'var(--font-content, sans-serif)',
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
            fontWeight: 700,
            fontSize: "13px",
            color: '#111827',
            letterSpacing: "0.5px",
          }}
        >
          FormS
        </span>
        <span style={{ 
          fontSize: "11px", 
          color: '#6B7280', 
          fontWeight: 600 
        }}>
          {submittedCount} / {total} submitted
        </span>
      </div>

      <div style={{ 
        width: "100%", 
        height: isMobile ? "6px" : "8px", 
        borderRadius: "5px", 
        background: '#F5F5F5', 
        overflow: "hidden",
        flexShrink: 0,
      }}>
        <div style={{ 
          width: `${pct}%`, 
          height: "100%", 
          background: '#F3AA2C', 
          borderRadius: "5px", 
          transition: "width 0.3s ease" 
        }} />
      </div>

      <div style={{ 
        display: "flex", 
        gap: isMobile ? "6px" : "8px", 
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
                fontSize: "11px",
                fontWeight: 600,
                padding: isMobile ? "4px 12px" : "4px 16px",
                borderRadius: "8px",
                border: active ? `1.5px solid ${meta?.color ?? '#111827'}` : '1.5px solid #E5E7EB',
                background: active ? (meta?.bg ?? '#F5F5F5') : '#FFFFFF',
                color: active ? (meta?.color ?? '#111827') : '#6B7280',
                cursor: "pointer",
                textTransform: "capitalize",
                whiteSpace: "nowrap",
                transition: "all 0.15s",
                fontFamily: 'var(--font-content, sans-serif)',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = '#F5F5F5'
                  e.currentTarget.style.borderColor = '#6B7280'
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = '#FFFFFF'
                  e.currentTarget.style.borderColor = '#E5E7EB'
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
            fontSize: "11px", 
            color: '#BBBBBB', 
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
                border: `1.5px solid ${isSubmitted ? '#2D6A4F' : '#F3AA2C'}`,
                background: isSubmitted ? 'rgba(45,106,79,0.06)' : 'rgba(243,170,44,0.08)',
                transition: "all 0.2s ease-in-out",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderWidth = "2.5px"
                e.currentTarget.style.transform = "scale(1.02)"
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"
                e.currentTarget.style.borderColor = isSubmitted ? '#2D6A4F' : '#F3AA2C'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderWidth = "1.5px"
                e.currentTarget.style.transform = "scale(1)"
                e.currentTarget.style.boxShadow = "none"
                e.currentTarget.style.borderColor = isSubmitted ? '#2D6A4F' : '#F3AA2C'
              }}
            >
              <span
                style={{
                  width: isMobile ? "30px" : "34px",
                  height: isMobile ? "30px" : "34px",
                  flexShrink: 0,
                  borderRadius: "8px",
                  border: `1.5px solid ${isSubmitted ? '#2D6A4F' : '#F3AA2C'}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isSubmitted ? meta.bg : 'rgba(243,170,44,0.15)',
                  color: isSubmitted ? meta.color : '#B8860B',
                }}
              >
                <i className="ti ti-Form-text" style={{ fontSize: isMobile ? "15px" : "17px" }} />
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: isSubmitted ? '#2D6A4F' : '#B8860B',
                    wordBreak: "break-word",
                    whiteSpace: "normal",
                    lineHeight: "1.3",
                  }}
                >
                  {doc.name}
                </div>
                {doc.note && (
                  <div style={{ 
                    fontSize: "11px", 
                    fontWeight: 500,
                    color: isSubmitted ? '#2D6A4F' : '#B8860B', 
                    marginTop: "1px",
                    opacity: 0.7,
                    wordBreak: "break-word",
                    whiteSpace: "normal",
                    lineHeight: "1.2",
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
                  fontSize: "10px",
                  fontWeight: 700,
                  color: isSubmitted ? '#2D6A4F' : '#B8860B',
                  background: isSubmitted ? meta.bg : 'rgba(243,170,44,0.15)',
                  padding: isMobile ? "3px 8px" : "4px 9px",
                  borderRadius: "999px",
                  flexShrink: 0,
                }}
              >
                <i className={`ti ${meta.icon}`} style={{ fontSize: "10px" }} />
                {meta.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}