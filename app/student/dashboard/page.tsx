export default function StudentDashboard() {
  return (
    <div>
      <h1 style={{ fontFamily: "'Cormorant', Georgia, serif", fontSize: '28px', fontWeight: 700, color: '#2C2C2A', marginBottom: '8px' }}>
        Dashboard
      </h1>
      <p style={{ color: '#888', marginBottom: '32px', fontSize: '15px' }}>
        Welcome back! Here's a summary of your NSTP progress.
      </p>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
        {[
          { label: 'Hours Completed', value: '—', icon: 'ti-clock', color: '#2D6A4F' },
          { label: 'Upcoming Sessions', value: '—', icon: 'ti-calendar', color: '#7B1113' },
          { label: 'Status', value: 'Enrolled', icon: 'ti-circle-check', color: '#5C0B18' },
        ].map(card => (
          <div key={card.label} style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <i className={`ti ${card.icon}`} style={{ fontSize: '24px', color: card.color }} />
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#2C2C2A' }}>{card.value}</div>
            <div style={{ fontSize: '13px', color: '#888', letterSpacing: '0.5px' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Placeholder section */}
      <div style={{ background: '#fff', borderRadius: '12px', padding: '32px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', textAlign: 'center', color: '#BBB' }}>
        <i className="ti ti-hammer" style={{ fontSize: '32px' }} />
        <p style={{ marginTop: '12px', fontFamily: "'Cormorant', Georgia, serif", fontSize: '16px' }}>
          Recent activity will appear here once backend is connected.
        </p>
      </div>
    </div>
  )
}
