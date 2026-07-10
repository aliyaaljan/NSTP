import RequestsView from "@/components/student/RequestsView"

// The Requests UI is shared with the student-leader route; the only difference is
// the sidebar. Whether "Leader Role Transfer" is offered keys off the user's real
// leader status inside RequestsView, not this route.
export default function StudentRequestPage() {
  return <RequestsView isLeader={false} />
}
