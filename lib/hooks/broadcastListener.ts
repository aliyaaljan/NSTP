import { useEffect, useRef } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"

type BroadcastPayload = {
  operation: "INSERT" | "UPDATE" | "DELETE"
  table: string
  schema: string
  record: Record<string, any> | null
  old_record: Record<string, any> | null
}

type UseAdviserBroadcastOptions = {
  adviserUserId: string | null | undefined
  onChange: (payload: BroadcastPayload) => void
  debounceMs?: number
  tables?: string[] 
}

export function useAdviserBroadcast(
  supabase: SupabaseClient,
  { adviserUserId, onChange, debounceMs = 400, tables  }: UseAdviserBroadcastOptions
) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const tablesRef = useRef(tables)
  tablesRef.current = tables

  useEffect(() => {
    if (!adviserUserId) return

    let timer: ReturnType<typeof setTimeout>
    let queuedPayloads: BroadcastPayload[] = []

    const flush = () => {
      const payloads = queuedPayloads
      queuedPayloads = []
      payloads.forEach((p) => onChangeRef.current(p))
    }

    const handleEvent = (msg: { payload: BroadcastPayload }) => {
      if (tablesRef.current && !tablesRef.current.includes(msg.payload.table)) return
      queuedPayloads.push(msg.payload)
      clearTimeout(timer)
      timer = setTimeout(flush, debounceMs)
    }

    let channel: ReturnType<typeof supabase.channel>

    ;(async () => {
      await supabase.realtime.setAuth() // required before subscribing to a private channel

      channel = supabase
        .channel(`adviser:${adviserUserId}`, { config: { private: true } })
        .on("broadcast", { event: "INSERT" }, handleEvent)
        .on("broadcast", { event: "UPDATE" }, handleEvent)
        .on("broadcast", { event: "DELETE" }, handleEvent)
        .subscribe()
    })()

    return () => {
      clearTimeout(timer)
      if (channel) supabase.removeChannel(channel)
    }
  }, [supabase, adviserUserId, debounceMs])
}