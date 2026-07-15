"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import {
  IconSearch,
  IconFileText,
  IconUpload,
  IconX,
  IconChevronUp,
  IconChevronDown as IconChevronDownArrow,
  IconFile,
  IconPhoto,
  IconFileZip,
  IconLink,
  IconPlus,
  IconEye,
  IconDownload,
} from "@tabler/icons-react"
import StudentSidebar from "@/components/shared/ResponsiveStudentSidebar"
import ProfilePill from "@/components/shared/StudentProfilePill"
import {
  KpiStatCard,
  KpiStatCardGrid,
  ChartStyles,
} from "@/components/shared/ChartModule"
import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"
import { createClient } from "@/lib/client"
import LoadingPage from "@/components/shared/LoadingPage"
import { useStudent } from "@/app/student/StudentContext"
import SuccessToast from "@/components/shared/SuccessModal"

import {
  getMyForms,
  saveDriveSubmission,
  getStudentActiveEnrollmentId,
  getMySubmissionUrl,
  unsubmitForm,
  type StudentFormView,
} from "@/lib/forms/submission-actions"

import { getTemplateDownloadUrl } from "@/lib/forms/requirement-actions"
import { getStudentDashboard } from "@/lib/student/dashboard-actions"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

const studentFilesStyles = `
  .sf-root { display: flex; min-height: 100vh; background: #F0F0F0; font-family: var(--font-montserrat, 'Montserrat', sans-serif); font-size: 13px; color: #111827; }
  .sf-main { flex: 1; display: flex; flex-direction: column; min-width: 0; width: 100%; max-width: 100%; transition: padding 0.3s ease; }
  
  /* Header */
  .sf-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
  .sf-header-left { flex: 1; min-width: 200px; }
  .sf-header-title { font-size: 34px; font-weight: 800; color: #6B1A1A; font-family: var(--font-montserrat, 'Montserrat', sans-serif); margin: 0; letter-spacing: -0.01em; }
  
  /* Table Card */
  .sf-adv-table-card { background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,.06); display: flex; flex-direction: column; overflow: hidden; width: 100%; }
  .sf-adv-table-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #EEEEEE; background: #FFFFFF; flex-wrap: wrap; gap: 8px; }
  .sf-adv-table-title { font-weight: 700; font-size: 15px; color: #111827; }
  .sf-adv-table-count { font-size: 13px; color: #7A7A7A; font-weight: 500; margin-top: 0; }
  .sf-adv-search-bar { display: flex; align-items: center; gap: 10px; border: 1.5px solid #1A3C2D; border-radius: 999px; padding: 0 16px; min-width: 200px; height: 38px; background: #FFFFFF; transition: border-color 0.15s; flex: 1; max-width: 260px; }
  .sf-adv-search-bar:focus-within { border-color: #1A3C2D; }
  .sf-adv-search-input { border: none; outline: none; font-size: 13px; font-family: var(--font-montserrat, 'Montserrat', sans-serif); color: #2C2C2A; width: 100%; background: transparent; }
  .sf-adv-search-input::placeholder { color: #9CA3AF; }
  
  .sf-adv-table-wrapper { overflow-y: visible; max-height: none; scrollbar-width: thin; scrollbar-color: #CFCFCB transparent; overflow-x: auto; }
  .sf-adv-table { width: 100%; border-collapse: collapse; table-layout: fixed; min-width: 400px; }
  .sf-adv-table thead tr { background: #F9FAFB; border-top: 1px solid #E7E7E7; border-bottom: 1px solid #EEEEEE; }
  .sf-adv-table thead th { position: sticky; top: 0; z-index: 2; background: #F9FAFB; padding: 10px 32px; text-align: left; font-size: 11px; font-weight: 700; color: #6B1A1A; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; white-space: nowrap; }
  .sf-adv-table thead th:last-child { text-align: center; cursor: default; }
  .sf-adv-table thead th .sf-sort-icons { display: inline-flex; flex-direction: column; align-items: center; margin-left: 4px; vertical-align: middle; line-height: 1; }
  .sf-adv-table thead th .sf-sort-icons .sf-sort-up, .sf-adv-table thead th .sf-sort-icons .sf-sort-down { opacity: 0.5; color: #4A4A4A; }
  .sf-adv-table thead th .sf-sort-icons .active { opacity: 1 !important; color: #6B1A1A !important; }
  .sf-adv-table td { padding: 16px 28px; border-bottom: 1px solid #EEEEEE; vertical-align: middle; font-size: 13px; }
  .sf-adv-table tbody tr:hover td { background: #FAFAFA; }
  .sf-adv-empty { text-align: center; padding: 48px 0; color: #7A7A7A; font-size: 13px; }
  
  .sf-form-name { font-weight: 500; color: #2C2C2A; font-size: 15px; }
  .sf-form-deadline { color: #7A7A7A; font-size: 13px; }
  .sf-status-cell { text-align: center; }
  .sf-status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap; background: #E8EDE5; color: #1A3C2D; min-width: 100px; justify-content: center; cursor: pointer; }
  .sf-status-badge-submitted { background: #D1FAE5; color: #065F46; }
  .sf-upload-btn { display: inline-flex; align-items: center; gap: 6px; padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #1A3C2D; color: #FFFFFF; border: none; cursor: pointer; font-family: var(--font-montserrat, 'Montserrat', sans-serif); min-width: 100px; justify-content: center; transition: transform .25s ease, box-shadow .25s ease; }
  .sf-upload-btn:hover { transform: scale(1.05); }
  .sf-download-template-btn { display: inline-flex; align-items: center; justify-content: center; background: #F3F4F6; border: 1px solid #E5E7EB; border-radius: 6px; padding: 4px; cursor: pointer; transition: all 0.2s; color: #6B7280; flex-shrink: 0; margin-left: 6px; }
  .sf-download-template-btn:hover { background: #E5E7EB; color: #1A3C2D; }

  .sf-adv-pagination { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; border-top: 1px solid #E7E7E7; flex-wrap: wrap; gap: 12px; }
  .sf-adv-pagination-info { font-size: 11px; color: #7A7A7A; font-weight: 500; flex-shrink: 0; white-space: nowrap; }
  .sf-adv-pagination-controls { display: flex; align-items: center; gap: 8px; flex-shrink: 0; justify-content: center; }
  .sf-adv-page-btn { min-width: 28px; height: 28px; border-radius: 8px; border: 1px solid #E5E7EB; background: #FFFFFF; font-size: 11px; color: #2C2C2A; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0 4px; transition: background 0.12s, border-color 0.12s; font-weight: 500; }
  .sf-adv-page-btn:hover:not(.sf-adv-page-btn-active):not(:disabled) { background: #F9FAFB; }
  .sf-adv-page-btn.sf-adv-page-btn-active { background: #6B1A1A; color: #FFFFFF; border-color: #6B1A1A; font-weight: 700; }
  .sf-adv-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .sf-adv-page-size-select-wrapper { display: flex; align-items: center; gap: 10px; font-size: 11px; color: #7A7A7A; font-weight: 500; flex-shrink: 0; white-space: nowrap; }
  .sf-adv-page-size-select { height: 30px; width: 60px; border: 1px solid #D1D5DB; border-radius: 8px; padding: 0 12px; font-size: 11px; font-family: var(--font-montserrat, 'Montserrat', sans-serif); color: #2C2C2A; background: #FFFFFF; cursor: pointer; outline: none; }
  
  /* Mobile card view */
  .sf-mobile-card { background: #FAFAFA; border-radius: 8px; padding: 12px; margin-bottom: 6px; border: 1px solid #E5E7EB; }
  .sf-mobile-card-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .sf-mobile-card-name { font-weight: 600; color: #2C2C2A; font-size: 13px; word-break: break-word; flex: 1; }
  .sf-mobile-card-deadline { font-size: 11px; color: #7A7A7A; flex-shrink: 0; margin-top: 2px; }
  .sf-mobile-card-status { flex-shrink: 0; }
  
  /* Modal */
  .sf-modal-backdrop { 
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
    animation: sfFadeIn 0.18s ease; 
  }
  @keyframes sfFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes sfSlideUp {
    from { opacity: 0; transform: translateY(16px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .sf-modal { 
    width: 100%; 
    max-width: 480px; 
    max-height: 90vh; 
    background: #FFFFFF; 
    border-radius: 20px; 
    overflow: hidden; 
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.18); 
    display: flex; 
    flex-direction: column; 
    animation: sfSlideUp 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .sf-modal-header { 
    background: #1A3C2D; 
    padding: 24px 24px; 
    display: flex; 
    align-items: center; 
    gap: 14px; 
    justify-content: space-between; 
    flex-shrink: 0; 
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
  }
  .sf-modal-title { 
    font-weight: 700; 
    font-size: 17px; 
    color: #FFFFFF; 
    word-break: break-word; 
  }
  .sf-modal-close { 
    background: none; 
    border: none; 
    cursor: pointer; 
    color: #FFFFFF; 
    display: flex; 
    align-items: center; 
    padding: 6px; 
    border-radius: 8px; 
    transition: background 0.13s; 
    flex-shrink: 0; 
  }
  .sf-modal-close:hover { background: rgba(255, 255, 255, 0.18); }
  .sf-modal-body { 
    padding: 22px 24px; 
    overflow-y: auto; 
    display: flex; 
    flex-direction: column; 
    flex: 1; 
    min-height: 0; 
    scrollbar-width: thin; 
    scrollbar-color: #D1D5DB transparent; 
  }
  .sf-modal-body::-webkit-scrollbar { width: 5px; }
  .sf-modal-body::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 99px; }
  .sf-modal-footer { 
    display: flex; 
    flex-direction: column;
    gap: 10px; 
    padding: 14px 24px 24px; 
    flex-shrink: 0; 
    border-top: 1px solid #E5E7EB; 
  }
  
  .sf-modal-content { display: flex; flex-direction: column; gap: 14px; }
  .sf-file-grid { display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto; margin-bottom: 16px; scrollbar-width: thin; scrollbar-color: #D1D5DB transparent; }
  .sf-file-grid::-webkit-scrollbar { width: 5px; }
  .sf-file-grid::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 99px; }
  .sf-file-preview-card { display: flex; align-items: center; gap: 14px; padding: 12px 16px; background: #F9FAFB; border-radius: 10px; border: 1px solid #E5E7EB; flex-shrink: 0; }
  .sf-file-preview-icon-wrapper { width: 40px; height: 40px; border-radius: 8px; background: #E8EDE5; display: flex; align-items: center; justify-content: center; color: #1A3C2D; flex-shrink: 0; }
  .sf-file-preview-info { flex: 1; min-width: 0; }
  .sf-file-preview-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sf-file-preview-meta { display: flex; align-items: center; gap: 8px; margin-top: 2px; flex-wrap: wrap; }
  .sf-file-preview-type { font-size: 10px; font-weight: 700; color: #FFFFFF; background: #1A3C2D; padding: 2px 10px; border-radius: 12px; flex-shrink: 0; }
  .sf-file-preview-size { font-size: 11px; color: #6B7280; display: flex; align-items: center; gap: 4px; }
  .sf-file-preview-remove { background: none; border: none; color: #9CA3AF; cursor: pointer; padding: 6px; flex-shrink: 0; }
  .sf-file-preview-remove:hover { color: #6B1A1A}
  .sf-empty-state { text-align: center; padding: 60px 20px; color: #9CA3AF; display: flex; flex-direction: column; align-items: center; }
  .sf-empty-sub { font-size: 12px; color: #B0B0B0; margin-top: 4px; }
  
  /* Link Input */
  .sf-link-input-container { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: #E8EDE5; border-radius: 10px; border: 1px solid #8AAE8A; margin-bottom: 12px; flex-shrink: 0; width: 100%; flex-wrap: wrap; }
  .sf-link-input { border: none; outline: none; background: transparent; font-size: 13px; width: 100%; min-width: 0; font-family: var(--font-montserrat, 'Montserrat', sans-serif); flex: 1; }
  .sf-link-add-btn { background: #1A3C2D; color: #FFF; border: none; padding: 6px 24px; border-radius: 6px; cursor: pointer; font-family: var(--font-montserrat, 'Montserrat', sans-serif); font-size: 13px; font-weight: 600; white-space: nowrap; flex-shrink: 0; }
  .sf-link-add-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .sf-link-cancel-btn { background: #FFFFFF; border: 1px solid #B0B0B0; padding: 6px 16px; border-radius: 6px; cursor: pointer; font-family: var(--font-montserrat, 'Montserrat', sans-serif); font-size: 13px; font-weight: 500; color: #111827; flex-shrink: 0; }
  .sf-link-cancel-btn:hover { background: #F5F5F5; }

  .sf-toolbar-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .sf-add-btn-wrapper { display: flex; flex-direction: column; gap: 10px; width: 100%; }
  .sf-add-btn { 
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 12px 20px;
    background: transparent;
    border: 2px solid #1A3C2D;
    border-radius: 10px;
    color: #1A3C2D;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    font-family: var(--font-montserrat, 'Montserrat', sans-serif);
    position: relative;
  }
  .sf-add-btn:hover { background: rgba(27, 67, 50, 0.05); }
  .sf-upload-submit-btn { 
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 12px 20px;
    background: #1A3C2D;
    border: 2px solid #1A3C2D;
    border-radius: 10px;
    color: #FFFFFF;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    font-family: var(--font-montserrat, 'Montserrat', sans-serif);
    position: relative;
  }
  .sf-upload-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .sf-upload-submit-btn:hover:not(:disabled) { background: #14532D; }
  .sf-add-dropdown { position: relative; width: 100%; }
  .sf-dropdown-menu { position: absolute; bottom: calc(100% + 4px); left: 0; right: 0; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); z-index: 10; overflow: hidden;}
  .sf-dropdown-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px 16px; background: none; border: none; font-size: 13px; font-weight: 500; cursor: pointer; text-align: left; }
  .sf-dropdown-item:hover { background: #F5F5F7; }
  
  /* Unsubmit inline confirmation styles */
  .sf-unsubmit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 12px 20px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    font-family: var(--font-montserrat, 'Montserrat', sans-serif);
    position: relative;
    transition: all 0.2s ease;
    background: transparent;
    color: #6B1A1A;
    border: 2px solid #6B1A1A;
  }
  .sf-unsubmit-btn:hover:not(.sf-unsubmit-confirming) {
    background: rgba(123, 29, 29, 0.05);
  }
  .sf-unsubmit-btn.sf-unsubmit-confirming {
    background: #6B1A1A;
    color: #FFFFFF;
    border: 2px solid #6B1A1A;
  }
  .sf-unsubmit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .sf-unsubmit-confirm-text {
    font-size: 11px;
    font-weight: 400;
    opacity: 0.7;
    margin-left: 4px;
  }
  
  .sf-dropzone {
    width: 100%;
    min-height: 170px;
    border: 2px dashed #E5E7EB;
    border-radius: 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    background: #FAFAF7;
    box-sizing: border-box;
    font-family: var(--font-montserrat, 'Montserrat', sans-serif);
    transition: border-color 0.15s, background 0.15s;
    padding: 24px 20px;
    text-align: center;
    margin-bottom: 14px;
  }
  .sf-dropzone:hover,
  .sf-dropzone.sf-dropzone-active {
    border-color: #1A3C2D;
    background: #F0FDF4;
  }
  .sf-dropzone-icon-wrapper {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: #E8EDE5;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #1A3C2D;
    transition: background 0.15s;
  }
  .sf-dropzone.sf-dropzone-active .sf-dropzone-icon-wrapper {
    background: #D1E7C8;
  }
  .sf-dropzone-text { font-size: 13.5px; color: #2C2C2A; margin-top: 10px; font-weight: 700; }
  .sf-dropzone-sub { font-size: 11.5px; color: #7A7A7A; margin-top: 4px; }
  .sf-dropzone-link-btn {
    margin-top: 12px;
    background: none;
    border: none;
    color: #1A3C2D;
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
    text-decoration: underline;
    font-family: inherit;
    padding: 0;
  }

  .sf-divider { background: #D9DDD8; margin-top: 10px; margin-bottom: 24px; height: 1px; border: none; }
  
  /* Desktop: 1024px and above */
  @media (min-width: 1024px) {
    .sf-main { padding: 34px 40px 34px 130px !important; }
  }
  
  /* Tablet: 820px to 1023px */
  @media (min-width: 820px) and (max-width: 1024px) {
    .sf-main { padding: 28px 20px 28px 125px !important; }
    .sf-header-title { font-size: 34px; }
    .sf-adv-search-bar { min-width: 180px; max-width: 220px; }
    .sf-adv-table thead th { padding: 10px 20px; }
    .sf-adv-table td { padding: 14px 20px; }
    .sf-adv-pagination { padding: 12px 16px; }
    
    .sf-db-kpi-grid { display: grid !important; grid-template-columns: repeat(2, 1fr) !important; gap: 14px; width: 100%; }
    .sf-db-kpi-grid > * { width: 100% !important; min-width: 0 !important; }
    .sf-db-kpi-grid > div { padding: 18px !important; height: auto !important; min-height: unset !important; }
  }
  
  /* Mobile: 767px and below */
  @media (max-width: 767px) {
    .sf-root { font-size: 12px; }
    .sf-main { margin-left: 0 !important; padding: 20px 16px 110px 16px !important; }
    .sf-header { gap: 12px; align-items: center; margin-bottom: 16px; }
    .sf-header-title { font-size: 28px; padding-top: clamp(43px, 0.5vw, 20px); }
    .sf-divider { margin-top: 1px; margin-bottom: 13px; }
    
    .sf-adv-table-toolbar { padding: 12px 14px; flex-direction: column; align-items: stretch; }
    .sf-adv-search-bar { min-width: unset; max-width: unset; flex: 1; height: 30px; }
    .sf-adv-table-wrapper { overflow-x: auto; }
    .sf-adv-table { min-width: 400px; font-size: 12px; }
    .sf-adv-table thead th { padding: 8px 12px; font-size: 10px; }
    .sf-adv-table td { padding: 20px 18px 20px 28px; font-size: 11px; }
    .sf-adv-table td:first-child { padding-left: 28px; }
    .sf-form-name { font-size: 11px; font-weight: 500; }
    .sf-form-deadline { font-size: 10px; }
    
    .sf-status-badge { padding: 3px 8px; font-size: 8px; min-width: 70px; gap: 4px; }
    .sf-upload-btn { padding: 3px 8px; font-size: 8px; min-width: 70px; gap: 4px; }
    
    .sf-adv-pagination { gap: 2px; padding: 12px 10px; flex-wrap: wrap; }
    .sf-adv-pagination-info { font-size: 7px; }
    .sf-adv-pagination-controls { gap: 2px; }
    .sf-adv-page-btn { min-width: 20px; height: 20px; font-size: 9px; border-radius: 5px; font-weight: 100; }
    .sf-adv-page-size-select-wrapper { font-size: 7px; gap: 4px; }
    .sf-adv-page-size-select { height: 20px; width: 40px; font-size: 8px; padding: 0 2px; }
    
    .sf-modal { max-width: 95%; margin: 8px; }
    .sf-modal-body { padding: 16px; }
    .sf-modal-header { padding: 16px 18px; border-top-left-radius: 16px; border-top-right-radius: 16px; }
    .sf-modal-title { font-size: 15px; }
    .sf-modal-footer { padding: 10px 16px 16px; }
    
    .sf-dropzone { min-height: 130px; padding: 18px 16px; }
    .sf-dropzone-text { font-size: 12px; }
    .sf-dropzone-sub { font-size: 10px; }
    
    .sf-db-kpi-grid { display: flex !important; flex-direction: column; gap: 12px; width: 100%; }
    .sf-db-kpi-grid > * { width: 100% !important; min-width: 0 !important; }
    .sf-db-kpi-grid > div { padding: 18px !important; height: auto !important; min-height: unset !important; }
    
    .profile-pill-wrapper { display: none; }
  }
`

// Types
type SortField = "name" | "deadline" | null
type SortDirection = "asc" | "desc" | null
type FilterField = "status"
type ActiveFilters = Partial<Record<FilterField, string[]>>

interface Form {
  id: string
  name: string
  deadline: string
  sortDate: Date | null
  status: "uploaded" | "pending"
  realStatus: "missing" | "submitted" | "approved" | "rejected"
  hasTemplate: boolean
  submittedFiles?: {
    name: string
    type: string
    size: string
    url?: string
    submissionId?: string
  }[]
  submittedLinks?: {
    url: string
    fileName?: string
    submissionId?: string
  }[]
  reviewerComment?: string | null
  submissionDate?: string
  submissionTime?: string
}

export default function StudentFilesPage() {
  const [forms, setForms] = useState<Form[]>([])
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { isLeader, isLoading: contextLoading } = useStudent()

  const [showModal, setShowModal] = useState(false)
  const [selectedForm, setSelectedForm] = useState<Form | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewingForm, setViewingForm] = useState<Form | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragActive, setIsDragActive] = useState(false)
  
  // Toast state
  const [toast, setToast] = useState<{
    show: boolean
    message: string
    type: "success" | "error"
  }>({
    show: false,
    message: "",
    type: "success",
  })

  const [isConfirmingUnsubmit, setIsConfirmingUnsubmit] = useState(false)

  const [student, setStudent] = useState({
    initials: "ST",
    displayName: "Student",
    section: "NSTP",
    avatarUrl: null as string | null,
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [activeFilter, setActiveFilter] = useState<string>("All")
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [links, setLinks] = useState<{ url: string; fileName: string }[]>([])
  const [linkInput, setLinkInput] = useState("")
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [sortField, setSortField] = useState<SortField>("deadline")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [pageSize, setPageSize] = useState(5)

  // Responsive state
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isSmallMobile, setIsSmallMobile] = useState(false)

  const unsubmitTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      setIsMobile(width < 768)
      setIsTablet(width >= 768 && width < 1024)
      setIsSmallMobile(width < 480)
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    return () => {
      if (unsubmitTimeoutRef.current) {
        clearTimeout(unsubmitTimeoutRef.current)
      }
    }
  }, [])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const loadData = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const parts = (user.user_metadata?.full_name || "").split(" ")
      setStudent((prev) => ({
        ...prev,
        initials: (parts[0]?.[0] || "") + (parts.at(-1)?.[0] || ""),
        displayName: user.user_metadata?.full_name || "Student",
      }))
    }

    const dashboardRes = await getStudentDashboard()
    if (dashboardRes.ok) {
      setStudent((prev) => ({
        ...prev,
        section: dashboardRes.data.sectionName ?? "",
        avatarUrl: dashboardRes.data.avatarUrl ?? null,
      }))
    }

    const enrollRes = await getStudentActiveEnrollmentId()
    if (!enrollRes.ok) {
      setLoading(false)
      return
    }
    setEnrollmentId(enrollRes.data)

    const formsRes = await getMyForms(enrollRes.data)
    if (formsRes.ok) {
      const mappedForms: Form[] = formsRes.data.map((req) => {
        // Evaluate links and files if submission exists
        const submittedFiles = []
        const submittedLinks = []
        if (req.submission) {
          const path = req.submission.storage_path
          if (path.startsWith("gdrive:")) {
            const url = path.replace("gdrive:", "")
            const fileName = req.submission.file_name || "Google Drive File"
            submittedLinks.push({
              url: url,
              fileName: fileName,
              submissionId: req.submission.form_submission_id,
            })
          } else {
            submittedFiles.push({
              name: req.submission.file_name || "Submission",
              type:
                req.submission.content_type?.split("/")?.pop()?.toUpperCase() ||
                "FILE",
              size: req.submission.file_size_byte
                ? formatFileSize(req.submission.file_size_byte)
                : "0 KB",
              url: path,
              submissionId: req.submission.form_submission_id,
            })
          }
        }

        // Parse date for sorting
        let sortDate: Date | null = null
        let formattedDeadline = "—"
        if (req.due_date) {
          const dateObj = new Date(req.due_date)
          if (!isNaN(dateObj.getTime())) {
            sortDate = dateObj
            formattedDeadline = dateObj.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })
          }
        }

        return {
          id: req.form_requirement_id,
          name: req.title,
          deadline: formattedDeadline,
          sortDate: sortDate,
          status:
            req.status === "missing" || req.status === "rejected"
              ? "pending"
              : "uploaded",
          realStatus: req.status,
          hasTemplate: req.has_template,
          submittedFiles,
          submittedLinks,
          reviewerComment: req.submission?.reviewer_comment,
          submissionDate: req.submission?.submitted_at
            ? new Date(req.submission.submitted_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : undefined,
          submissionTime: req.submission?.submitted_at
            ? new Date(req.submission.submitted_at).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })
            : undefined,
        }
      })
      setForms(mappedForms)
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search)
        const targetId = params.get("formId")
        if (targetId) {
          const targetForm = mappedForms.find((f) => f.id === targetId)
          if (targetForm) {
            if (targetForm.status === "uploaded") {
              setViewingForm(targetForm)
              setShowViewModal(true)
            } else {
              setSelectedForm(targetForm)
              setShowModal(true)
              // Reset upload modal states
              setSelectedFiles([])
              setLinks([])
              setLinkInput("")
              setShowLinkInput(false)
              setIsDropdownOpen(false)
            }
            // Clean up the URL so refresh doesn't re-trigger the modal
            window.history.replaceState(null, "", "/student/forms")
          }
        }
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Handlers
  const handleFilesSelected = (fileList: FileList | File[]) => {
    const files = Array.from(fileList)
    const validFiles = files.filter((f) => f.size <= MAX_FILE_SIZE)

    if (validFiles.length < files.length) {
      alert("Some files were ignored because they exceed the 10MB limit.")
    }

    setSelectedFiles((prev) => [...prev, ...validFiles])
    setIsDropdownOpen(false)
  }

  const handleUploadClick = (form: Form) => {
    setSelectedForm(form)
    setSelectedFiles([])
    setLinks([])
    setLinkInput("")
    setShowLinkInput(false)
    setIsDropdownOpen(false)
    setShowModal(true)
  }

  const handleViewClick = (form: Form) => {
    setViewingForm(form)
    setShowViewModal(true)
  }

  const handleTemplateDownload = async (reqId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const res = await getTemplateDownloadUrl(reqId)
    if (res.ok) window.open(res.url, "_blank")
    else alert(`Download Error: ${res.error}`)
  }

  const handleUnsubmitClick = () => {
    if (isConfirmingUnsubmit) {
      // Second click - unsubmit
      executeUnsubmit()
    } else {
      // First click - show confirmation state
      setIsConfirmingUnsubmit(true)
      
      // Auto-reset after 5 seconds if not clicked
      if (unsubmitTimeoutRef.current) {
        clearTimeout(unsubmitTimeoutRef.current)
      }
      unsubmitTimeoutRef.current = setTimeout(() => {
        setIsConfirmingUnsubmit(false)
        unsubmitTimeoutRef.current = null
      }, 5000)
    }
  }

  const executeUnsubmit = async () => {
    if (!viewingForm) return

    if (unsubmitTimeoutRef.current) {
      clearTimeout(unsubmitTimeoutRef.current)
      unsubmitTimeoutRef.current = null
    }

    try {
      const submissionId = viewingForm.submittedFiles?.[0]?.submissionId || 
                         viewingForm.submittedLinks?.[0]?.submissionId
      
      if (!submissionId) {
        setToast({
          show: true,
          message: "No submission found to unsubmit.",
          type: "error",
        })
        setIsConfirmingUnsubmit(false)
        return
      }

      const result = await unsubmitForm(submissionId)
      if (result.ok) {
        const updatedForm = {
          ...viewingForm,
          status: "pending" as const,
          realStatus: "missing" as const,
          submittedFiles: [],
          submittedLinks: [],
          submissionDate: undefined,
          submissionTime: undefined,
          reviewerComment: null,
        }
        
        setForms(prevForms =>
          prevForms.map(form =>
            form.id === viewingForm.id ? updatedForm : form
          )
        )
        
        setShowViewModal(false)
        setIsConfirmingUnsubmit(false)
        
        setToast({
          show: true,
          message: "Form unsubmitted successfully! You can now re-upload.",
          type: "success",
        })
        
        loadData()
      } else {
        setToast({
          show: true,
          message: result.error || "Failed to unsubmit form.",
          type: "error",
        })
        setIsConfirmingUnsubmit(false)
      }
    } catch (error: any) {
      setToast({
        show: true,
        message: error.message || "An error occurred while unsubmitting.",
        type: "error",
      })
      setIsConfirmingUnsubmit(false)
    }
  }

  const handleUploadExecute = async () => {
    if (!selectedForm || !enrollmentId) return
    setIsUploading(true)

    try {
      const isFileUpload = selectedFiles.length > 0
      const isLinkUpload = links.length > 0
      
      if (isFileUpload) {
        const file = selectedFiles[0]
        const formData = new FormData()
        formData.append("file", file)

        const driveRes = await fetch("/api/upload/drive", {
          method: "POST",
          body: formData,
        })
        const driveData = await driveRes.json()
        if (!driveRes.ok)
          throw new Error(driveData.error || "Drive upload failed")

        const dbRes = await saveDriveSubmission(
          enrollmentId,
          selectedForm.id,
          driveData.data.id,
          driveData.data.webViewLink,
          file.name
        )
        if (!dbRes.ok) throw new Error(dbRes.error)
      } else if (isLinkUpload) {
        const link = links[0]
        const dbRes = await saveDriveSubmission(
          enrollmentId,
          selectedForm.id,
          "link_only",
          link.url,
          link.fileName || "External Link Submission"
        )
        if (!dbRes.ok) throw new Error(dbRes.error)
      }

      // Makes button change to "Submitted" instantly after Uploading
      const now = new Date()
      const updatedForm: Form = {
        ...selectedForm,
        status: "uploaded",
        realStatus: "submitted",
        submittedFiles: isFileUpload && selectedFiles.length > 0 
          ? [
              ...(selectedForm.submittedFiles || []),
              {
                name: selectedFiles[0].name,
                type: selectedFiles[0].name.split('.').pop()?.toUpperCase() || 'FILE',
                size: formatFileSize(selectedFiles[0].size),
                submissionId: 'pending',
              }
            ]
          : selectedForm.submittedFiles || [],
        submittedLinks: isLinkUpload && links.length > 0
          ? [
              ...(selectedForm.submittedLinks || []),
              {
                url: links[0].url,
                fileName: links[0].fileName,
                submissionId: 'pending',
              }
            ]
          : selectedForm.submittedLinks || [],
        submissionDate: now.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        submissionTime: now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      }

      setForms((prevForms) =>
        prevForms.map((form) =>
          form.id === selectedForm.id ? updatedForm : form
        )
      )

      // Close modal only after
      setShowModal(false)
      setSelectedFiles([])
      setLinks([])
      
      // Show success toast
      setToast({
        show: true,
        message: "Your form has been submitted successfully!",
        type: "success",
      })

      loadData()
      
    } catch (e: any) {
      setToast({
        show: true,
        message: e.message || "Upload failed. Please try again.",
        type: "error",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Table & Filter Logic

  const uploadedCount = forms.filter((f) => f.status === "uploaded").length
  const totalCount = forms.length

  const stats = [
    {
      label: "Submitted",
      value: uploadedCount,
      icon: "ti-circle-check",
      color: {
        bg: "#E8F2E3",
        text: "#2D5C3A",
        border: "#8AAE8A",
        icon: "#3A7A4A",
      },
    },
    {
      label: "Pending",
      value: totalCount - uploadedCount,
      icon: "ti-clock",
      color: {
        bg: "#FFF4D6",
        text: "#8B5E1A",
        border: "#D4A840",
        icon: "#C8882A",
      },
    },
  ]

  const filteredForms = forms.filter((form) => {
    if (
      activeFilter !== "All" &&
      form.status !== (activeFilter === "Submitted" ? "uploaded" : "pending")
    )
      return false

    if (searchQuery.trim() !== "")
      return form.name.toLowerCase().includes(searchQuery.toLowerCase().trim())

    return true
  })

  const sortedForms = useMemo(() => {
    if (!sortField || !sortDirection) return filteredForms
    return [...filteredForms].sort((a, b) => {
      let comparison = 0
      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name)
      } else if (sortField === "deadline") {
        const dateA = a.sortDate
        const dateB = b.sortDate

        // Handle null dates
        if (dateA === null && dateB === null) comparison = 0
        else if (dateA === null) comparison = 1 // goes to end
        else if (dateB === null) comparison = -1
        else comparison = dateA.getTime() - dateB.getTime()
      }
      return sortDirection === "asc" ? comparison : -comparison
    })
  }, [filteredForms, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") setSortDirection("desc")
      else if (sortDirection === "desc") {
        setSortField(null)
        setSortDirection(null)
      }
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
    setCurrentPage(1)
  }

  const filteredTotalPages = Math.max(
    1,
    Math.ceil(sortedForms.length / pageSize)
  )
  const filteredPaginatedForms = sortedForms.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const getSortIcons = (field: SortField) => {
    const isAsc = sortField === field && sortDirection === "asc"
    const isDesc = sortField === field && sortDirection === "desc"
    return (
      <span className="sf-sort-icons">
        <IconChevronUp
          size={12}
          stroke={2}
          className={`sf-sort-up ${isAsc ? "active" : ""}`}
          style={{ marginBottom: -2 }}
        />
        <IconChevronDownArrow
          size={12}
          stroke={2}
          className={`sf-sort-down ${isDesc ? "active" : ""}`}
          style={{ marginTop: -2 }}
        />
      </span>
    )
  }

  const getFileIcon = (file: File) => {
    const name = file.name.toLowerCase()
    if (name.endsWith(".pdf"))
      return <IconFile size={20} stroke={1.75} style={{ color: "#1A3C2D" }} />
    if (name.endsWith(".jpg") || name.endsWith(".png"))
      return <IconPhoto size={20} stroke={1.75} />
    if (name.endsWith(".zip") || name.endsWith(".rar"))
      return <IconFileZip size={20} stroke={1.75} />
    return <IconFile size={20} stroke={1.75} />
  }

  const isUploadDisabled = () =>
    selectedFiles.length === 0 && links.length === 0

  // URL Validation
  const isValidUrl = (url: string) => {
    if (!url || url.trim() === "") return false

    try {
      const urlObj = new URL(url)
      return (
        urlObj.protocol === "http:" ||
        urlObj.protocol === "https:" ||
        urlObj.protocol === "ftp:" ||
        urlObj.protocol === "ftps:"
      )
    } catch {
      const urlPattern =
        /^(https?:\/\/|ftp:\/\/|ftps:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/i
      return urlPattern.test(url.trim())
    }
  }

  // Extract filename from URL
  const getFileNameFromUrl = (url: string) => {
    try {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname
      const fileName = pathname.split('/').pop() || 'file'
      return decodeURIComponent(fileName) || 'Google Drive File'
    } catch {
      return 'Google Drive File'
    }
  }

  // Merge files and links for display
  const mergedItems = [
    ...selectedFiles.map((file) => ({ type: "file" as const, data: file })),
    ...links.map((link) => ({ type: "link" as const, data: link })),
  ]

  if (loading || contextLoading) {
    return (
      <LoadingPage Sidebar={() => <StudentSidebar isLeader={isLeader} />} />
    )
  }

  return (
    <>
      <style>{studentFilesStyles}</style>
      <div className="sf-root">
        <StudentSidebar isLeader={isLeader} />
        <main className="sf-main">
          {/* Toast Container */}
          <div
            style={{
              position: "fixed",
              top: isMobile ? 70 : 20,
              right: isMobile ? 12 : 20,
              left: isMobile ? 12 : "auto",
              zIndex: 300,
              display: "flex",
              flexDirection: "column",
              gap: isMobile ? 10 : 14,
              pointerEvents: "none",
            }}
          >
            <SuccessToast
              show={toast.show}
              message={toast.message}
              type={toast.type}
              onClose={() => setToast({ ...toast, show: false })}
            />
          </div>

          {/* Header */}
          <div className="sf-header">
            <div className="sf-header-left">
              <h1 className="sf-header-title">Forms</h1>
            </div>
            {!isMobile && (
              <ProfilePill
                name={student.displayName}
                initials={student.initials}
                section={student.section}
                avatarUrl={student.avatarUrl}
              />
            )}
          </div>

          <hr className="sf-divider" />

          <ChartStyles />

          {/* Stat Cards */}
          <KpiStatCardGrid columns={2} className="sf-db-kpi-grid">
            {stats.map((stat) => {
              const isHovered = hoveredCard === stat.label
              const isActive = activeFilter === stat.label
              return (
                <div
                  key={stat.label}
                  onClick={() => {
                    setActiveFilter(isActive ? "All" : stat.label)
                    setCurrentPage(1)
                  }}
                  onMouseEnter={() => setHoveredCard(stat.label)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    cursor: "pointer",
                    borderRadius: COLORS.radius,
                    overflow: "hidden",
                    background: COLORS.cardBg,
                    color:
                      isHovered || isActive ? stat.color.icon : "#666666",
                    border: `2px solid ${
                      isHovered || isActive ? stat.color.icon : COLORS.border
                    }`,
                    transform: isHovered
                      ? "translateY(-8px)"
                      : "translateY(0)",
                    boxShadow: isHovered
                      ? "0 6px 14px rgba(0,0,0,.07)"
                      : "0 4px 10px rgba(0,0,0,.05)",
                    transition:
                      "transform .2s ease, box-shadow .2s ease, border-color .18s ease, color .18s ease",
                  }}
                >
                  <KpiStatCard
                    icon={stat.icon}
                    label={stat.label}
                    value={stat.value}
                  />
                </div>
              )
            })}
          </KpiStatCardGrid>

          {/* Table Card */}
          <div className="sf-adv-table-card">
            <div className="sf-adv-table-toolbar">
              <div>
                <div className="sf-adv-table-title">
                  {activeFilter === "All"
                    ? "All Forms"
                    : `${activeFilter} Forms`}
                </div>
                <div className="sf-adv-table-count">
                  {sortedForms.length} form{sortedForms.length !== 1 ? "s" : ""}{" "}
                  found
                </div>
              </div>
              <div className="sf-toolbar-right">
                {/* Search Bar */}
                <div className="sf-adv-search-bar">
                  <IconSearch size={16} stroke={1.75} color="#6B7280" />
                  <input
                    className="sf-adv-search-input"
                    placeholder="Search forms..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCurrentPage(1)
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="sf-adv-table-wrapper">
              {sortedForms.length === 0 ? (
                <div className="sf-adv-empty">No forms available.</div>
              ) : isMobile ? (
                // Mobile card view
                <div style={{ padding: isSmallMobile ? "6px" : "8px" }}>
                  {filteredPaginatedForms.map((form) => (
                    <div key={form.id} className="sf-mobile-card">
                      <div className="sf-mobile-card-row">
                        <div>
                          <div className="sf-mobile-card-name">
                            {form.name}
                            {form.hasTemplate && (
                              <button
                                title="Download Template"
                                className="sf-download-template-btn"
                                onClick={(e) =>
                                  handleTemplateDownload(form.id, e)
                                }
                                style={{ marginLeft: 6 }}
                              >
                                <IconDownload size={12} stroke={1.75} />
                              </button>
                            )}
                          </div>
                          <div className="sf-mobile-card-deadline">
                            Deadline: {form.deadline}
                          </div>
                        </div>
                        <div className="sf-mobile-card-status">
                          {form.status === "uploaded" ? (
                            <span
                              className="sf-status-badge sf-status-badge-submitted"
                              onClick={() => handleViewClick(form)}
                            >
                              <IconEye size={12} stroke={2} /> Submitted
                            </span>
                          ) : (
                            <button
                              className="sf-upload-btn"
                              onClick={() => handleUploadClick(form)}
                            >
                              <IconUpload size={12} stroke={2.5} /> Upload
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Desktop/Tablet table view
                <table className="sf-adv-table">
                  <thead>
                    <tr>
                      <th
                        style={{ width: "55%" }}
                        onClick={() => handleSort("name")}
                      >
                        File {getSortIcons("name")}
                      </th>
                      <th
                        style={{ width: "20%", textAlign: "left" }}
                        onClick={() => handleSort("deadline")}
                      >
                        Deadline {getSortIcons("deadline")}
                      </th>
                      <th style={{ width: "25%", textAlign: "center" }}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPaginatedForms.map((form) => (
                      <tr key={form.id}>
                        <td>
                          <div className="sf-form-name">
                            {form.name}
                            {form.hasTemplate && (
                              <button
                                title="Download Template"
                                className="sf-download-template-btn"
                                onClick={(e) =>
                                  handleTemplateDownload(form.id, e)
                                }
                              >
                                <IconDownload size={14} stroke={1.75} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="sf-form-deadline">{form.deadline}</td>
                        <td className="sf-status-cell">
                          {form.status === "uploaded" ? (
                            <span
                              className="sf-status-badge sf-status-badge-submitted"
                              onClick={() => handleViewClick(form)}
                            >
                              <IconEye size={14} stroke={2} /> Submitted
                            </span>
                          ) : (
                            <button
                              className="sf-upload-btn"
                              onClick={() => handleUploadClick(form)}
                            >
                              <IconUpload size={14} stroke={2.5} /> Upload
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="sf-adv-pagination">
              <div className="sf-adv-pagination-info">
                Showing{" "}
                {sortedForms.length === 0
                  ? 0
                  : (currentPage - 1) * pageSize + 1}
                –{Math.min(currentPage * pageSize, sortedForms.length)} of{" "}
                {sortedForms.length}
              </div>
              <div className="sf-adv-pagination-controls">
                <button
                  className="sf-adv-page-btn"
                  disabled={currentPage === 1 || sortedForms.length === 0}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  ‹
                </button>
                {(() => {
                  const maxVisible = isSmallMobile ? 3 : 5
                  let pages = []

                  if (filteredTotalPages <= maxVisible + 2) {
                    for (let i = 1; i <= filteredTotalPages; i++) {
                      pages.push(i)
                    }
                  } else {
                    pages.push(1)

                    let start = Math.max(
                      2,
                      currentPage - Math.floor(maxVisible / 2)
                    )
                    let end = Math.min(
                      filteredTotalPages - 1,
                      currentPage + Math.floor(maxVisible / 2)
                    )

                    if (currentPage <= Math.floor(maxVisible / 2) + 1) {
                      end = maxVisible
                    }
                    if (
                      currentPage >=
                      filteredTotalPages - Math.floor(maxVisible / 2)
                    ) {
                      start = filteredTotalPages - maxVisible + 1
                    }

                    if (start > 2) {
                      pages.push(-1)
                    }

                    for (let i = start; i <= end; i++) {
                      if (i > 1 && i < filteredTotalPages) {
                        pages.push(i)
                      }
                    }

                    if (end < filteredTotalPages - 1) {
                      pages.push(-2)
                    }

                    if (filteredTotalPages > 1) {
                      pages.push(filteredTotalPages)
                    }
                  }

                  return pages.map((p, index) => {
                    if (p === -1 || p === -2) {
                      return (
                        <span
                          key={`ellipsis-${index}`}
                          style={{
                            color: "#6B7280",
                            fontSize: isSmallMobile ? 8 : 12,
                            fontFamily: "'Montserrat', 'Fallback Montserrat'",
                            padding: "0 2px",
                          }}
                        >
                          …
                        </span>
                      )
                    }
                    return (
                      <button
                        key={p}
                        className={`sf-adv-page-btn${
                          p === currentPage ? " sf-adv-page-btn-active" : ""
                        }`}
                        onClick={() => setCurrentPage(p)}
                      >
                        {p}
                      </button>
                    )
                  })
                })()}
                <button
                  className="sf-adv-page-btn"
                  disabled={
                    currentPage === filteredTotalPages ||
                    sortedForms.length === 0
                  }
                  onClick={() =>
                    setCurrentPage((p) => Math.min(filteredTotalPages, p + 1))
                  }
                >
                  ›
                </button>
              </div>
              <div className="sf-adv-page-size-select-wrapper">
                <span>Rows per page</span>
                <select
                  className="sf-adv-page-size-select"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                >
                  {[5, 10, 15, 20].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Upload Modal */}
          {showModal && selectedForm && (
            <div
              className="sf-modal-backdrop"
              onClick={() => !isUploading && setShowModal(false)}
            >
              <div className="sf-modal" onClick={(e) => e.stopPropagation()}>
                <div className="sf-modal-header">
                  <span className="sf-modal-title">
                    Upload: {selectedForm.name}
                  </span>
                  <button
                    className="sf-modal-close"
                    onClick={() => !isUploading && setShowModal(false)}
                    disabled={isUploading}
                  >
                    <IconX size={20} stroke={2} />
                  </button>
                </div>
                <div className="sf-modal-body">
                  <div className="sf-modal-content">
                    <input
                      id="file-input"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.jpg,.png,.zip"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        if (e.target.files) {
                          const files = Array.from(e.target.files)
                          const MAX_SIZE = 10 * 1024 * 1024 //10 MB
                          const validFiles = files.filter(
                            (f) => f.size <= MAX_SIZE
                          )

                          if (validFiles.length < files.length) {
                            alert(
                              "Some files were ignored because they exceed the 10MB limit."
                            )
                          }

                          setSelectedFiles((prev) => [...prev, ...validFiles])
                          setIsDropdownOpen(false)
                        }
                      }}
                    />

                    {showLinkInput && (
                      <div className="sf-link-input-container">
                        <IconLink size={18} stroke={1.75} />
                        <input
                          id="link-input-field"
                          className="sf-link-input"
                          type="url"
                          placeholder="Paste link here..."
                          value={linkInput}
                          onChange={(e) => setLinkInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              if (isValidUrl(linkInput.trim())) {
                                const fileName = getFileNameFromUrl(linkInput.trim())
                                setLinks((p) => [...p, { url: linkInput.trim(), fileName }])
                                setLinkInput("")
                                setShowLinkInput(false)
                              }
                            } else if (e.key === "Escape") {
                              setShowLinkInput(false)
                              setLinkInput("")
                            }
                          }}
                        />
                        <button
                          className="sf-link-add-btn"
                          onClick={() => {
                            if (isValidUrl(linkInput.trim())) {
                              const fileName = getFileNameFromUrl(linkInput.trim())
                              setLinks((p) => [...p, { url: linkInput.trim(), fileName }])
                              setLinkInput("")
                              setShowLinkInput(false)
                            }
                          }}
                          disabled={!isValidUrl(linkInput.trim())}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <IconPlus
                            size={14}
                            stroke={2}
                            style={{ color: "#FFFFFF", flexShrink: 0 }}
                          />
                          <span style={{ whiteSpace: "nowrap" }}>Add</span>
                        </button>
                        <button
                          className="sf-link-cancel-btn"
                          onClick={() => {
                            setShowLinkInput(false)
                            setLinkInput("")
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {/* Files & Links Display */}
                    {mergedItems.length > 0 && (
                      <div className="sf-file-grid">
                        {mergedItems.map((item, index) => {
                          if (item.type === "file") {
                            const file = item.data
                            return (
                              <div
                                key={`file-${index}`}
                                className="sf-file-preview-card"
                              >
                                <div className="sf-file-preview-icon-wrapper">
                                  {getFileIcon(file)}
                                </div>
                                <div className="sf-file-preview-info">
                                  <div className="sf-file-preview-name">
                                    {file.name}
                                  </div>
                                  <div className="sf-file-preview-meta">
                                    <span className="sf-file-preview-type">
                                      FILE
                                    </span>
                                    <span className="sf-file-preview-size">
                                      {formatFileSize(file.size)}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  className="sf-file-preview-remove"
                                  onClick={() =>
                                    setSelectedFiles((p) =>
                                      p.filter((_, i) => i !== index)
                                    )
                                  }
                                  disabled={isUploading}
                                >
                                  <IconX size={18} stroke={2} />
                                </button>
                              </div>
                            )
                          } else {
                            const link = item.data
                            return (
                              <div
                                key={`link-${index}`}
                                className="sf-file-preview-card"
                              >
                                <div
                                  className="sf-file-preview-icon-wrapper"
                                  style={{
                                    background: "#E8EDE5",
                                    color: "#1A3C2D",
                                  }}
                                >
                                  <IconLink size={20} stroke={1.75} />
                                </div>
                                <div className="sf-file-preview-info">
                                  <div className="sf-file-preview-name">
                                    {link.fileName || link.url}
                                  </div>
                                  <div className="sf-file-preview-meta">
                                    <span
                                      className="sf-file-preview-type"
                                      style={{ background: "#1A3C2D" }}
                                    >
                                      LINK
                                    </span>
                                  </div>
                                </div>
                                <button
                                  className="sf-file-preview-remove"
                                  onClick={() =>
                                    setLinks((p) =>
                                      p.filter((_, i) => i !== index)
                                    )
                                  }
                                  disabled={isUploading}
                                >
                                  <IconX size={18} stroke={2} />
                                </button>
                              </div>
                            )
                          }
                        })}
                      </div>
                    )}

                    {!showLinkInput && (
                      <label
                        htmlFor="file-input"
                        className={`sf-dropzone${isDragActive ? " sf-dropzone-active" : ""}`}
                        onDragEnter={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setIsDragActive(true)
                        }}
                        onDragOver={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setIsDragActive(false)
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setIsDragActive(false)
                          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                            handleFilesSelected(e.dataTransfer.files)
                          }
                        }}
                      >
                        <div className="sf-dropzone-icon-wrapper">
                          <IconUpload size={20} stroke={1.75} />
                        </div>
                        <div className="sf-dropzone-text">
                          Click to browse or drag & drop files here
                        </div>
                        <div className="sf-dropzone-sub pt-3">
                          Max file size: <strong>10 MB</strong> 
                        </div>
                        <div className="sf-dropzone-sub">
                          Supported file types: <strong>PNG, JPEG, PDF, DOC, DOCX</strong>
                        </div>
                        <button
                          type="button"
                          className="sf-dropzone-link-btn"
                          onClick={(e) => {
                            e.preventDefault()
                            setShowLinkInput(true)
                            setLinkInput("")
                            setTimeout(
                              () => document.getElementById("link-input-field")?.focus(),
                              50
                            )
                          }}
                        >
                          or add a link instead
                        </button>
                      </label>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="sf-modal-footer">
                    <div className="sf-add-btn-wrapper">
                      <div className="sf-add-dropdown" ref={dropdownRef}>
                        <button
                          className="sf-add-btn"
                          onClick={() => !isUploading && setIsDropdownOpen(!isDropdownOpen)}
                          disabled={isUploading}
                        >
                          <IconPlus
                            size={18}
                            stroke={2}
                            className={
                              isDropdownOpen ? "sf-add-icon-rotated" : ""
                            }
                            style={{ position: "absolute", left: "16px" }}
                          />
                          <span>Add File / Link</span>
                          <IconChevronUp
                            size={16}
                            stroke={2}
                            style={{ position: "absolute", right: "16px" }}
                          />
                        </button>
                        {isDropdownOpen && (
                          <div className="sf-dropdown-menu">
                            <button
                              className="sf-dropdown-item"
                              onClick={() => {
                                setIsDropdownOpen(false)
                                document.getElementById("file-input")?.click()
                              }}
                              disabled={isUploading}
                            >
                              <IconFile size={18} stroke={1.75} /> Add File
                            </button>
                            <button
                              className="sf-dropdown-item"
                              onClick={() => {
                                setIsDropdownOpen(false)
                                setShowLinkInput(true)
                                setLinkInput("")
                                setTimeout(
                                  () =>
                                    document
                                      .getElementById("link-input-field")
                                      ?.focus(),
                                  50
                                )
                              }}
                              disabled={isUploading}
                            >
                              <IconLink size={18} stroke={1.75} /> Add Link
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        className="sf-upload-submit-btn"
                        disabled={isUploadDisabled() || isUploading}
                        onClick={handleUploadExecute}
                      >
                        <IconUpload
                          size={18}
                          stroke={2}
                          style={{ position: "absolute", left: "16px" }}
                        />
                        <span>
                          {isUploading ? "Uploading..." : "Upload to Drive"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* View Submitted Modal */}
          {showViewModal && viewingForm && (
            <div
              className="sf-modal-backdrop"
              onClick={() => {
                setShowViewModal(false)
                setIsConfirmingUnsubmit(false)
                if (unsubmitTimeoutRef.current) {
                  clearTimeout(unsubmitTimeoutRef.current)
                  unsubmitTimeoutRef.current = null
                }
              }}
            >
              <div className="sf-modal" onClick={(e) => e.stopPropagation()}>
                <div className="sf-modal-header">
                  <span className="sf-modal-title">
                    Submitted: {viewingForm.name}
                  </span>
                  <button
                    className="sf-modal-close"
                    onClick={() => {
                      setShowViewModal(false)
                      setIsConfirmingUnsubmit(false)
                      if (unsubmitTimeoutRef.current) {
                        clearTimeout(unsubmitTimeoutRef.current)
                        unsubmitTimeoutRef.current = null
                      }
                    }}
                  >
                    <IconX size={20} stroke={2} />
                  </button>
                </div>
                <div className="sf-modal-body">
                  <div className="sf-modal-content">
                    {/* Status & Adviser Note Section */}
                    <div
                      style={{
                        marginBottom: 20,
                        padding: 16,
                        background: "#F9FAFB",
                        borderRadius: 10,
                        border: "1px solid #E5E7EB",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 12,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#4B5563",
                          }}
                        >
                          Status:
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            padding: "4px 12px",
                            borderRadius: "20px",
                            background:
                              viewingForm.realStatus === "approved"
                                ? "#D1FAE5"
                                : viewingForm.realStatus === "rejected"
                                ? "#FEE2E2"
                                : "#E8EDE5",
                            color:
                              viewingForm.realStatus === "approved"
                                ? "#065F46"
                                : viewingForm.realStatus === "rejected"
                                ? "#991B1B"
                                : "#1A3C2D",
                          }}
                        >
                          {viewingForm.realStatus.toUpperCase()}
                        </span>
                      </div>

                      {/* Submission Date and Time */}
                      {viewingForm.submissionDate && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: viewingForm.reviewerComment ? 12 : 0,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "#4B5563",
                            }}
                          >
                            Submitted On:
                          </span>
                          <span
                            style={{
                              fontSize: 13,
                              color: "#111827",
                              fontWeight: 500,
                              textAlign: "right",
                            }}
                          >
                            {viewingForm.submissionDate}
                            {viewingForm.submissionTime && (
                              <span style={{ 
                                display: "block", 
                                fontSize: 12, 
                                color: "#6B7280", 
                                fontWeight: 400 
                              }}>
                                at {viewingForm.submissionTime}
                              </span>
                            )}
                          </span>
                        </div>
                      )}

                      {viewingForm.reviewerComment && (
                        <div
                          style={{
                            marginTop: 12,
                            paddingTop: 12,
                            borderTop: "1px solid #E5E7EB",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: "#6B1A1A",
                              display: "block",
                              marginBottom: 6,
                            }}
                          >
                            ADVISER'S NOTE:
                          </span>
                          <p
                            style={{
                              fontSize: 13,
                              color: "#111827",
                              margin: 0,
                              fontStyle: "italic",
                              lineHeight: 1.5,
                            }}
                          >
                            "{viewingForm.reviewerComment}"
                          </p>
                        </div>
                      )}
                    </div>

                    <h4
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#111827",
                        marginBottom: 12,
                        textTransform: "uppercase",
                      }}
                    >
                      Attachments
                    </h4>

                    <div className="sf-file-grid">
                      {/* Submitted Links / Drive Web View */}
                      {viewingForm.submittedLinks?.map((link, index) => (
                        <div
                          key={`link-${index}`}
                          className="sf-file-preview-card"
                        >
                          <div
                            className="sf-file-preview-icon-wrapper"
                            style={{ background: "#E8EDE5", color: "#1A3C2D" }}
                          >
                            <IconLink size={20} stroke={1.75} />
                          </div>
                          <div className="sf-file-preview-info">
                            <div
                              className="sf-file-preview-name"
                              style={{
                                cursor: "pointer",
                                color: "#1A3C2D",
                                textDecoration: "underline",
                              }}
                              onClick={() => window.open(link.url, "_blank")}
                            >
                              {link.fileName || "Google Drive File"}
                            </div>
                            <div className="sf-file-preview-meta">
                              <span
                                className="sf-file-preview-type"
                                style={{ background: "#1A3C2D" }}
                              >
                                DRIVE
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Direct File Submissions (Supabase Storage) */}
                      {viewingForm.submittedFiles?.map((file, index) => (
                        <div
                          key={`file-${index}`}
                          className="sf-file-preview-card"
                        >
                          <div
                            className="sf-file-preview-icon-wrapper"
                            style={{ background: "#F3F4F6", color: "#4B5563" }}
                          >
                            <IconFileText size={20} stroke={1.75} />
                          </div>
                          <div className="sf-file-preview-info">
                            <div
                              className="sf-file-preview-name"
                              style={{
                                cursor: "pointer",
                                color: "#1A3C2D",
                                textDecoration: "underline",
                              }}
                            >
                              {file.name}
                            </div>
                            <div className="sf-file-preview-meta">
                              <span
                                className="sf-file-preview-type"
                                style={{ background: "#4B5563" }}
                              >
                                {file.type}
                              </span>
                              <span className="sf-file-preview-size">
                                {file.size}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {!viewingForm.submittedLinks?.length &&
                      !viewingForm.submittedFiles?.length && (
                        <div className="sf-empty-state">
                          <IconFileText size={40} stroke={1.5} />
                          <p>No files submitted</p>
                        </div>
                      )}
                  </div>
                </div>
                {/* Unsubmit button */}
                <div className="sf-modal-footer" style={{ padding: "14px 24px 24px" }}>
                  <button
                    className={`sf-unsubmit-btn ${isConfirmingUnsubmit ? 'sf-unsubmit-confirming' : ''}`}
                    onClick={handleUnsubmitClick}
                    disabled={isUploading}
                  >
                    {isConfirmingUnsubmit ? (
                      <>
                        <span>Are you sure?</span>
                        <span className="sf-unsubmit-confirm-text">tap again to confirm</span>
                      </>
                    ) : (
                      <>
                        <IconX size={18} stroke={2} style={{ position: "absolute", left: "16px" }} />
                        <span>Unsubmit Form</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}