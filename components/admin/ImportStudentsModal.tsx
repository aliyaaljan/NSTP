"use client"

import ImportFileModal from "@/components/admin/ImportFileModal"

export default function ImportStudentsModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return <ImportFileModal variant="students" open={open} onClose={onClose} />
}
