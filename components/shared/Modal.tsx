"use client"

import { useEffect, useRef, ReactNode } from "react"
import { IconX } from "@tabler/icons-react"

export type ModalSize = "sm" | "md" | "lg" | "xl" | "wide"

export interface ModalAction {
  label: string
  onClick: () => void
  variant?: "approve" | "reject" | "primary" | "secondary" | "danger"
  disabled?: boolean
}

interface NstpModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  initials?: string
  avatarUrl?: string | null
  size?: ModalSize
  width?: number // optional pixel width, overrides the size preset
  twoCol?: boolean
  leftContent?: ReactNode
  rightContent?: ReactNode
  rightTitle?: string
  children?: ReactNode
  actions?: ModalAction[]
}

const SIZE_MAP: Record<ModalSize, number> = {
  sm:   360,
  md:   480,
  lg:   640,
  xl:   800,
  wide: 1000,
}

const STYLES = `
  .nstp-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    animation: nstpFadeIn 0.18s ease;
  }
  @keyframes nstpFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes nstpSlideUp {
    from { opacity: 0; transform: translateY(16px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .nstp-modal {
    background: var(--white, #fff);
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.28);
    display: flex;
    flex-direction: column;
    max-height: 90vh;
    animation: nstpSlideUp 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .nstp-modal-header {
    background: var(--green, #14532D);
    padding: 20px 22px;
    display: flex;
    align-items: center;
    gap: 14px;
    justify-content: space-between;
    flex-shrink: 0;
  }
  .nstp-modal-avatar {
    width: 46px;
    height: 46px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.18);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    font-weight: 700;
    color: #fff;
    letter-spacing: 0.5px;
    border: 1.5px solid rgba(255, 255, 255, 0.25);
  }
  .nstp-modal-header-info { flex: 1; min-width: 0; }
  .nstp-modal-title {
    font-weight: 700;
    font-size: 17px;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .nstp-modal-subtitle {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.72);
    margin-top: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .nstp-modal-close {
    background: none;
    border: none;
    cursor: pointer;
    color: #fff;
    display: flex;
    align-items: center;
    padding: 6px;
    border-radius: 8px;
    transition: background 0.13s;
    flex-shrink: 0;
  }
  .nstp-modal-close:hover { background: rgba(255, 255, 255, 0.18); }
  .nstp-modal-body {
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    overflow-y: auto;
    flex: 1;
    scrollbar-width: thin;
    scrollbar-color: #D1D5DB transparent;
  }
  .nstp-modal-body::-webkit-scrollbar { width: 5px; }
  .nstp-modal-body::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 99px; }
  .nstp-modal-flex { display: flex; flex: 1; overflow: hidden; }
  .nstp-modal-left {
    flex: 1;
    min-width: 0;
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #D1D5DB transparent;
  }
  .nstp-modal-left::-webkit-scrollbar { width: 5px; }
  .nstp-modal-left::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 99px; }
  .nstp-modal-right {
    width: 520px;
    flex-shrink: 0;
    border-left: 1px solid var(--border, #E5E7EB);
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
  }
  .nstp-modal-right-title {
    font-size: 11px;
    font-weight: 700;
    color: var(--muted, #9CA3AF);
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-bottom: 4px;
  }
  .nstp-modal-row { display: flex; gap: 14px; }
  .nstp-modal-field { flex: 1; }
  .nstp-modal-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--muted, #9CA3AF);
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-bottom: 5px;
  }
  .nstp-modal-value { font-size: 14px; font-weight: 600; color: var(--text, #111827); }
  .nstp-modal-footer {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 14px 22px 20px;
    flex-shrink: 0;
  }
  .nstp-modal-btn {
    flex: 0 1 auto;
    padding: 8px 14px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    font-size: 12.5px;
    font-weight: 700;
    font-family: inherit;
    transition: background 0.13s, opacity 0.13s;
  }
  .nstp-modal-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .nstp-modal-btn-primary { background: var(--green, #14532D); color: #fff; }
  .nstp-modal-btn-primary:hover:not(:disabled) { background: var(--green-dark, #0f3d21); }
  .nstp-modal-btn-secondary { background: #F3F4F6; color: var(--text, #111827); }
  .nstp-modal-btn-secondary:hover:not(:disabled) { background: #E5E7EB; }
  .nstp-modal-btn-approve { background: var(--green, #14532D); color: #fff; }
  .nstp-modal-btn-approve:hover:not(:disabled) { background: var(--green-dark, #0f3d21); }
  .nstp-modal-btn-reject { background: var(--maroon, #7B1D1D); color: #fff; }
  .nstp-modal-btn-reject:hover:not(:disabled) { filter: brightness(0.9); }
  .nstp-modal-btn-danger { background: var(--maroon, #7B1D1D); color: #fff; }
  .nstp-modal-btn-danger:hover:not(:disabled) { filter: brightness(0.9); }
`

export function NstpModal({
  open,
  onClose,
  title,
  subtitle,
  initials,
  avatarUrl,
  size = "md",
  width: widthOverride,
  twoCol = false,
  leftContent,
  rightContent,
  rightTitle,
  children,
  actions,
}: NstpModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open) return null

  const width = widthOverride ?? SIZE_MAP[size]

  return (
    <>
      <style>{STYLES}</style>
      <div
        ref={backdropRef}
        className="nstp-modal-backdrop"
        onMouseDown={(e) => { if (e.target === backdropRef.current) onClose() }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="nstp-modal" style={{ width, maxWidth: "100%" }}>
          <div className="nstp-modal-header">
            {avatarUrl ? (
              <img
                className="nstp-modal-avatar"
                src={avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                style={{ objectFit: "cover" }}
              />
            ) : initials ? (
              <div className="nstp-modal-avatar" aria-hidden="true">{initials}</div>
            ) : null}
            <div className="nstp-modal-header-info">
              <div className="nstp-modal-title">{title}</div>
              {subtitle && <div className="nstp-modal-subtitle">{subtitle}</div>}
            </div>
            <button className="nstp-modal-close" onClick={onClose} aria-label="Close modal">
              <IconX size={20} stroke={2} />
            </button>
          </div>

          {twoCol ? (
            <div className="nstp-modal-flex">
              <div className="nstp-modal-left">{leftContent}</div>
              <div className="nstp-modal-right">
                {rightTitle && <div className="nstp-modal-right-title">{rightTitle}</div>}
                {rightContent}
              </div>
            </div>
          ) : (
            <div className="nstp-modal-body">{children}</div>
          )}

          {actions && actions.length > 0 && (
            <div className="nstp-modal-footer flex flex-1">
              {actions.map((action, i) => (
                <button
                  key={i}
                  style={{ flex: 1 }}
                  className={`nstp-modal-btn nstp-modal-btn-${action.variant ?? "secondary"}`}
                  onClick={action.onClick}
                  disabled={action.disabled}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export function ModalField({ label, value, children }: { label: string; value?: string; children?: ReactNode }) {
  return (
    <div className="nstp-modal-field">
      <div className="nstp-modal-label">{label}</div>
      {value !== undefined ? <div className="nstp-modal-value">{value}</div> : children}
    </div>
  )
}

export function ModalRow({ children }: { children: ReactNode }) {
  return <div className="nstp-modal-row">{children}</div>
}