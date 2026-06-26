export function ChartStyles() {
  return (
    <style>{`
      /* ── KPI Stat Cards ───────────────────────────────────────────────── */
      .db-kpi-card {
        position: relative;
        overflow: hidden;
        flex: 1;
        background: var(--white);
        background-image: linear-gradient(to bottom right, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0));
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 16px 18px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04);
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .db-kpi-card:hover {
        border-color: var(--maroon);
        transform: translateY(-2px);
        box-shadow: 0 10px 25px -5px rgba(123, 29, 29, 0.15), 0 8px 10px -6px rgba(123, 29, 29, 0.1);
      }
      .db-kpi-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
        position: relative;
        z-index: 1;
      }
      .db-kpi-label {
        font-size: 11.5px;
        font-weight: 600;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .db-kpi-value {
        font-size: 34px;
        font-weight: 800;
        line-height: 1.1;
        font-family: var(--font);
        background: linear-gradient(135deg, var(--maroon) 0%, #ef4444 100%);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        position: relative;
        z-index: 1;
      }
      .db-kpi-deco {
        position: absolute;
        bottom: -8px;
        right: -6px;
        opacity: 0.08;
        color: var(--maroon);
        pointer-events: none;
        z-index: 0;
        transform: rotate(-5deg);
        transition: all 0.3s ease;
      }
      .db-kpi-card:hover .db-kpi-deco {
        opacity: 0.15;
        transform: rotate(0deg) scale(1.1);
      }

      /* ── List Animation ───────────────────────────────────────────────── */
      @keyframes fadeSlideIn {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .anim-list-item {
        animation: fadeSlideIn 0.3s ease both;
      }
      .anim-list-item:nth-child(1)  { animation-delay: 0ms; }
      .anim-list-item:nth-child(2)  { animation-delay: 40ms; }
      .anim-list-item:nth-child(3)  { animation-delay: 80ms; }
      .anim-list-item:nth-child(4)  { animation-delay: 120ms; }
      .anim-list-item:nth-child(5)  { animation-delay: 160ms; }
      .anim-list-item:nth-child(6)  { animation-delay: 200ms; }
      .anim-list-item:nth-child(7)  { animation-delay: 240ms; }
      .anim-list-item:nth-child(8)  { animation-delay: 280ms; }
      .anim-list-item:nth-child(9)  { animation-delay: 320ms; }
      .anim-list-item:nth-child(10) { animation-delay: 360ms; }
    `}</style>
  );
}