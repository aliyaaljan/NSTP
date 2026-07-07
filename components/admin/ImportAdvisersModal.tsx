"use client"

import ImportFileModal from "@/components/admin/ImportFileModal"

export default function ImportAdvisersModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return <ImportFileModal variant="advisers" open={open} onClose={onClose} />
}
