import { createClient } from "@/lib/client"

type SubscribeOptions = {
  filter?: string
  channelName?: string
}

export function subscribeToAttendanceSessions(
  onChange: () => void,
  options: SubscribeOptions = {}
): () => void {
  const supabase = createClient()
  const channelName = options.channelName ?? "attendance_session_changes"

  const channel = supabase.channel(channelName).on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "attendance_session",
      ...(options.filter ? { filter: options.filter } : {}),
    },
    () => onChange()
  )

  supabase.auth.getSession().then(({ data }) => {
    const token = data.session?.access_token
    if (token) supabase.realtime.setAuth(token)
    channel.subscribe()
  })

  return () => {
    supabase.removeChannel(channel)
  }
}

export function subscribeToAttendanceSignal(onSignal: () => void): () => void {
  const supabase = createClient()
  let channel: ReturnType<typeof supabase.channel> | null = null
  let cancelled = false

  supabase.auth.getSession().then(({ data }) => {
    const uid = data.session?.user?.id
    const token = data.session?.access_token
    if (!uid || cancelled) return
    if (token) supabase.realtime.setAuth(token)
    channel = supabase
      .channel(`attendance-user:${uid}`, { config: { private: true } })
      .on("broadcast", { event: "scanned" }, () => onSignal())
      .subscribe()
  })

  return () => {
    cancelled = true
    if (channel) supabase.removeChannel(channel)
  }
}
