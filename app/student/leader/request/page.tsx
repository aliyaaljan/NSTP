import RequestsView from "@/components/student/RequestsView"

// Same shared Requests UI as /student/request, rendered with the leader sidebar.
// "Leader Role Transfer" visibility is decided by the user's real leader status
// inside RequestsView, so the two routes stay behaviourally identical.
export default function StudentLeaderRequestPage() {
  return <RequestsView isLeader={true} />
}
