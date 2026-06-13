interface PlaceholderProps {
  title: string
  description?: string
  icon?: string
}

export default function Placeholder({ title, description, icon = 'ti-hammer' }: PlaceholderProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: '16px',
      color: '#BBBBBB',
      fontFamily: "'Cormorant', Georgia, serif",
    }}>
      <i className={`ti ${icon}`} style={{ fontSize: '48px' }} />
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#2C2C2A' }}>{title}</h2>
      {description && (
        <p style={{ fontSize: '15px', color: '#888', maxWidth: '320px', textAlign: 'center' }}>
          {description}
        </p>
      )}
      <span style={{
        marginTop: '8px',
        fontSize: '11px',
        letterSpacing: '2px',
        textTransform: 'uppercase',
        color: '#BBBBBB',
        fontWeight: 700,
      }}>
        Coming soon
      </span>
    </div>
  )
}
