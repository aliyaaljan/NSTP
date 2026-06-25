import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"
import { FONT_BODY } from "@/lib/admin-typography"

export interface TodayAttendance {
  present: number
  absent: number
  notYet: number
  total: number
  presentPct: number
}

function StatBox({
  value,
  label,
  valueColor,
}: {
  value: number
  label: string
  valueColor: string
}) {
  return (
    <div
      style={{
        flex: 1,
        background: "#F7F5F2",
        borderRadius: 10,
        padding: "12px 8px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: FONT_BODY,
          fontSize: 26,
          fontWeight: 800,
          lineHeight: 1,
          color: valueColor,
          marginBottom: 6,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: FONT_BODY,
          fontSize: 11,
          fontWeight: 500,
          color: COLORS.textGray,
        }}
      >
        {label}
      </div>
    </div>
  )
}

export default function AdminAttendanceStrip({ data }: { data: TodayAttendance }) {
  const today = new Date()
  const dateLabel = today
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase()

  const presentPct = data.total > 0 ? (data.present / data.total) * 100 : 0
  const absentPct = data.total > 0 ? (data.absent / data.total) * 100 : 0

  return (
    <div style={{ marginTop: "auto", paddingTop: 20 }}>
      <div
        style={{
          fontFamily: FONT_BODY,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.8px",
          color: COLORS.textGray,
          marginBottom: 12,
        }}
      >
        TODAY · {dateLabel}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <StatBox value={data.present} label="Present" valueColor={COLORS.green} />
        <StatBox value={data.absent} label="Absent" valueColor={COLORS.maroon} />
        <StatBox value={data.notYet} label="Not yet" valueColor={COLORS.textGray} />
      </div>

      <div
        style={{
          height: 6,
          borderRadius: 999,
          background: COLORS.track,
          overflow: "hidden",
          display: "flex",
          marginBottom: 8,
        }}
      >
        {presentPct > 0 && (
          <div
            style={{
              width: `${presentPct}%`,
              height: "100%",
              background: COLORS.green,
            }}
          />
        )}
        {absentPct > 0 && (
          <div
            style={{
              width: `${absentPct}%`,
              height: "100%",
              background: COLORS.maroon,
            }}
          />
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: FONT_BODY,
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        <span style={{ color: COLORS.green }}>{data.presentPct}% present</span>
        <span style={{ color: COLORS.textGray }}>{data.total} total</span>
      </div>
    </div>
  )
}
