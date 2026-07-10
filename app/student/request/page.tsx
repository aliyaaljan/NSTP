import RequestsView from "@/components/student/RequestsView"

// Single request page for all students. Leader-specific behaviour (sidebar nav +
// hiding "Leader Role Transfer") is decided by the user's real leader status
// inside RequestsView, so there is no separate leader route.
export default function StudentRequestPage() {
  return <RequestsView />
}
