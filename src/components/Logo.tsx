import './Logo.css'
export default function Logo({ compact = false }: { compact?: boolean }) { return <a href="#top" className="logo" aria-label="REVORA home"><img src="/assets/revora-logo.png" alt="REVORA" width={compact ? 100 : 150} height="30" /></a> }
