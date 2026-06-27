"use client"

import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"
import { FONT_BODY, TYPE } from "@/lib/admin-typography"

const BTN_SIZE = 28
const MAX_VISIBLE_PAGES = 5

export function getVisiblePageNumbers(
  page: number,
  totalPages: number,
  maxVisible: number = MAX_VISIBLE_PAGES
): number[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  let start = page - Math.floor(maxVisible / 2)
  start = Math.max(1, start)
  start = Math.min(start, totalPages - maxVisible + 1)

  return Array.from({ length: maxVisible }, (_, i) => start + i)
}

function pageBtnStyle(active: boolean, disabled = false): React.CSSProperties {
  return {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: 6,
    border: `1px solid ${COLORS.border}`,
    background: active ? COLORS.maroon : COLORS.white,
    color: active ? "#fff" : COLORS.text,
    fontWeight: active ? 700 : 500,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.35 : 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: active ? 12 : 14,
    fontFamily: FONT_BODY,
  }
}

export function formatPaginationRange(
  page: number,
  pageSize: number,
  total: number
): string {
  if (total === 0) return "0"
  if (total === 1) return "1"
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  return `${start} - ${end}`
}

export default function ListPagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  borderTop = true,
  containerStyle,
}: {
  page: number
  totalPages: number
  totalCount: number
  pageSize: number
  onPageChange: (page: number) => void
  borderTop?: boolean
  containerStyle?: React.CSSProperties
}) {
  if (totalCount === 0) return null

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 16,
        paddingBottom: 16,
        marginTop: borderTop ? 16 : 0,
        borderTop: borderTop ? `1px solid ${COLORS.border}` : undefined,
        ...containerStyle,
      }}
    >
      <span style={{ ...TYPE.caption, color: COLORS.textGray }}>
        Showing {formatPaginationRange(page, pageSize, totalCount)} of {totalCount}
      </span>

      <div
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          style={pageBtnStyle(false, page <= 1)}
          aria-label="Previous page"
        >
          &#8249;
        </button>

        {getVisiblePageNumbers(page, totalPages).map((pageNum) => (
          <button
            key={pageNum}
            type="button"
            onClick={() => onPageChange(pageNum)}
            style={pageBtnStyle(pageNum === page)}
            aria-label={`Page ${pageNum}`}
            aria-current={pageNum === page ? "page" : undefined}
          >
            {pageNum}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          style={pageBtnStyle(false, page >= totalPages)}
          aria-label="Next page"
        >
          &#8250;
        </button>
      </div>
    </div>
  )
}
