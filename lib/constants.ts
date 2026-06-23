export const DATABASE_IDS = {
  roles: {
    student: "c8f96f6b-27ac-4dc0-a912-c79c0491f7a6",
    adviser: "85f7a7e6-e34d-4b94-83a7-1dd433ad715b",
  },
  enrollmentStatuses: {
    active: "e25b6af1-3a83-4698-9d5b-5ed9cab8f12e",
  },
  appealStatuses: {
    open: "01bd18cd-7058-49df-b3fe-da06dbcdd4d0",
    underReview: "ef5bdb99-d134-484b-ab95-c3902fd0f7ec",
  },
  attendanceEventTypes: {
    timeIn: "a5875822-8dbf-47d5-bd3e-ec495bded29a",
  },
  formSubmissionStatuses: {
    submitted: "edd0dbcf-f3a0-4e09-8201-20ae70eba840",
    approved: "cec6417f-6d9c-4fe0-8772-cc37866a5b84",
    rejected: "981d88d0-bf44-4fde-b873-a20c5b20daa8",
  },
} as const
