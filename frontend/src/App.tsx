import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || ''

interface Domain {
  id: string
  name: string
  type: string
  content: string
  proxied: boolean
  zone: string
}

const protectionStatus = (d: Domain) => {
  if (!d.proxied && d.zone === 'devgiglio.uk') return 'public'
  if (d.proxied && d.zone === 'devgiglio.uk') return 'restricted'
  if (d.zone.includes('fora')) return 'manual'
  return 'unknown'
}

const statusColor = (s: string) => {
  switch (s) {
    case 'restricted': return { bg: '#1a3a2a', dot: '#22c55e', label: '🔒 Restrito' }
    case 'public': return { bg: '#1a1a1a', dot: '#f59e0b', label: '🌐 Público' }
    case 'manual': return { bg: '#1a1a1a', dot: '#6b7280', label: '⚙️ Manual' }
    default: return { bg: '#1a1a1a', dot: '#6b7280', label: '❓' }
  }
}

function App() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/domains`)
      if (res.ok) setDomains(await res.json())
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const toggle = async (d: Domain) => {
    setToggling(d.id)
    const newProxy = !d.proxied
    try {
      const res = await fetch(`${API}/api/domains/${d.id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proxied: newProxy })
      })
      if (res.ok) await load()
    } catch(e) { console.error(e) }
    setToggling(null)
  }

  const stats = {
    total: domains.length,
    restricted: domains.filter(d => protectionStatus(d) === 'restricted').length,
    public: domains.filter(d => protectionStatus(d) === 'public').length,
    manual: domains.filter(d => protectionStatus(d) === 'manual').length,
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem', color: '#e5e5e5', fontFamily: 'system-ui, sans-serif', background: '#0f0f0f', minHeight: '100vh' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>🛡️ Access Control</h1>
        <p style={{ color: '#666', margin: '.25rem 0 0' }}>Gerencie quais domínios são públicos ou restritos</p>
      </header>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '.75rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total', value: stats.total, color: '#3b82f6' },
          { label: '🔒 Restritos', value: stats.restricted, color: '#22c55e' },
          { label: '🌐 Públicos', value: stats.public, color: '#f59e0b' },
          { label: '⚙️ Manual', value: stats.manual, color: '#6b7280' },
        ].map(s => (
          <div key={s.label} style={{ background: '#1a1a1a', borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '.8rem', color: '#666', marginTop: '.25rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', fontSize: '.85rem', color: '#666' }}>
        <span>🔒 <strong style={{ color: '#22c55e' }}>Restrito</strong> = Cloudflare Access ativo</span>
        <span>🌐 <strong style={{ color: '#f59e0b' }}>Público</strong> = DNS direto, sem proteção</span>
        <span>⚙️ <strong style={{ color: '#6b7280' }}>Manual</strong> = Fora do Cloudflare</span>
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ textAlign: 'center', color: '#555', padding: '3rem' }}>Carregando...</p>
      ) : (
        <div style={{ background: '#1a1a1a', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2a2a2a', fontSize: '.8rem', color: '#666', textAlign: 'left' }}>
                <th style={{ padding: '.75rem 1rem' }}>Domínio</th>
                <th style={{ padding: '.75rem 1rem' }}>Status</th>
                <th style={{ padding: '.75rem 1rem' }}>Proxy</th>
                <th style={{ padding: '.75rem 1rem' }}>IP</th>
                <th style={{ padding: '.75rem 1rem' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {domains.map(d => {
                const status = protectionStatus(d)
                const sc = statusColor(status)
                const isToggling = toggling === d.id
                return (
                  <tr key={d.id} style={{ borderBottom: '1px solid #222', fontSize: '.9rem' }}>
                    <td style={{ padding: '.75rem 1rem', fontWeight: 500 }}>{d.name}</td>
                    <td style={{ padding: '.75rem 1rem' }}>
                      <span style={{ background: sc.bg, padding: '.25rem .6rem', borderRadius: 6, fontSize: '.8rem' }}>
                        <span style={{ color: sc.dot }}>●</span> {sc.label}
                      </span>
                    </td>
                    <td style={{ padding: '.75rem 1rem', color: '#666' }}>
                      {d.proxied ? 'Orange Cloud ✅' : 'DNS Only'}
                    </td>
                    <td style={{ padding: '.75rem 1rem', color: '#666', fontFamily: 'monospace' }}>{d.content}</td>
                    <td style={{ padding: '.75rem 1rem' }}>
                      {status === 'manual' ? (
                        <span style={{ color: '#555', fontSize: '.8rem' }}>WireGuard/Traefik</span>
                      ) : (
                        <button
                          onClick={() => toggle(d)}
                          disabled={isToggling}
                          style={{
                            background: d.proxied ? '#f59e0b' : '#22c55e',
                            color: '#000',
                            border: 'none',
                            padding: '.35rem .75rem',
                            borderRadius: 6,
                            fontSize: '.8rem',
                            fontWeight: 600,
                            cursor: isToggling ? 'wait' : 'pointer',
                            opacity: isToggling ? .5 : 1,
                          }}
                        >
                          {isToggling ? '...' : d.proxied ? '🌐 Tornar Público' : '🔒 Restringir'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <footer style={{ marginTop: '2rem', fontSize: '.8rem', color: '#444', textAlign: 'center' }}>
        <p>Clique em "Restringir" → ativa proxy Cloudflare (Access pode ser configurado no dashboard)</p>
        <p>Clique em "Tornar Público" → desativa proxy, DNS fica direto</p>
      </footer>
    </div>
  )
}

export default App
