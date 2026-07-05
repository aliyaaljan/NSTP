import type { KeyboardEvent, MouseEvent } from "react"

export function adminClickableRowProps(onClick: () => void) {
  return {
    className: "anim-list-item admin-table-row-clickable",
    onClick,
    onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        onClick()
      }
    },
    tabIndex: 0,
    role: "button" as const,
  }
}

export function adminClickableCardProps(onClick: () => void) {
  return {
    className: "anim-list-item admin-card-clickable",
    onClick,
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        onClick()
      }
    },
    tabIndex: 0,
    role: "button" as const,
  }
}

export function stopRowClickPropagation(event: MouseEvent) {
  event.stopPropagation()
}
