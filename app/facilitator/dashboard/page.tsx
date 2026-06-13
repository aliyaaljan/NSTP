export default function FacilitatorDashboard() {
  return (
    <div>
      <h1 style={{ fontFamily: "'Cormorant', Georgia, serif", fontSize: '28px', fontWeight: 700, color: '#2C2C2A', marginBottom: '8px' }}>
        Facilitator Dashboard
      </h1>
      <p style={{ color: '#888', marginBottom: '32px', fontSize: '15px' }}>
        Manage your student groups, review hours, and track community outreach.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
        {[
          { label: 'Assigned Students', value: '—', icon: 'ti-users', color: '#7B1113' },
          { label: 'Pending Reviews', value: '—', icon: 'ti-clipboard-check', color: '#2D6A4F' },
          { label: 'Sessions This Month', value: '—', icon: 'ti-calendar', color: '#5C0B18' },
        ].map(card => (
          <div key={card.label} style={{
            background: '#fff', borderRadius: '12px', padding: '24px',
            display: 'flex', flexDirection: 'column', gap: '10px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <i className={`ti ${card.icon}`} style={{ fontSize: '24px', color: card.color }} />
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#2C2C2A' }}>{card.value}</div>
            <div style={{ fontSize: '13px', color: '#888' }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', padding: '32px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', textAlign: 'center', color: '#BBB' }}>
        <i className="ti ti-hammer" style={{ fontSize: '32px' }} />
        <p style={{ marginTop: '12px', fontFamily: "'Cormorant', Georgia, serif", fontSize: '16px' }}>
          Student activity and pending hour approvals will appear here.
        </p>
      </div>
    </div>
  )
}
