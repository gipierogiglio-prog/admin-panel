import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || ''

interface Domain {
  id: string
  name: string
  content: string
  proxied: boolean
  vpn: boolean
}

function App() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [vpnDomains, setVpnDomains] = useState<string[]>([])
  const [publicDomains, setPublicDomains] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'vpn' | 'public'>('all')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/domains`)
      if (res.ok) {
        const data = await res.json()
        setDomains(data.domains || [])
        setVpnDomains(data.vpnDomains || [])
        setPublicDomains(data.publicDomains || [])
      }
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const toggleVpn = async (d: Domain) => {
    setToggling(d.name)
    const newVpn = !d.vpn
    try {
      await fetch(`${API}/api/domains/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: d.name, vpn: newVpn })
      })
      await load()
    } catch(e) { console.error(e) }
    setToggling(null)
  }

  const filtered = domains.filter(d => {
    if (filter === 'vpn') return d.vpn
    if (filter === 'public') return !d.vpn
    return true
  })

  const stats = {
    total: domains.length,
    vpn: domains.filter(d => d.vpn).length,
    public: domains.filter(d => !d.vpn).length,
  }

  const filterStyle = (f: string) => ({
    background: filter === f ? '#3b82f6' : '#1a1a1a',
    color: filter === f ? '#fff' : '#999',
    border: 'none',
    padding: '.4rem 1rem',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '.85rem',
    fontWeight: 500 as const,
  })

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem', color: '#e5e5e5', fontFamily: 'system-ui, sans-serif', background: '#0f0f0f', minHeight: '100vh' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>🛡️ VPN Access Control</h1>
        <p style={{ color: '#666', margin: '.25rem 0 0', fontSize: '.9rem' }}>
          Domínios marcados como <strong style={{ color: '#22c55e' }}>VPN Only</strong> exigem conexão VPN para acessar.
          Domínios <strong style={{ color: '#f59e0b' }}>Público</strong> são acessíveis por qualquer um.
        </p>
      </header>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total', value: stats.total, color: '#3b82f6' },
          { label: '🔒 VPN Only', value: stats.vpn, color: '#22c55e' },
          { label: '🌐 Público', value: stats.public, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{ background: '#1a1a1a', borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '.8rem', color: '#666', marginTop: '.25rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem' }}>
        <button onClick={() => setFilter('all')} style={filterStyle('all')}>Todos</button>
        <button onClick={() => setFilter('vpn')} style={filterStyle('vpn')}>🔒 VPN Only</button>
        <button onClick={() => setFilter('public')} style={filterStyle('public')}>🌐 Público</button>
        <span style={{ marginLeft: 'auto', color: '#555', fontSize: '.8rem', alignSelf: 'center' }}>
          {filtered.length} de {domains.length}
        </span>
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
                <th style={{ padding: '.75rem 1rem' }}>IP</th>
                <th style={{ padding: '.75rem 1rem' }}>Proxy CF</th>
                <th style={{ padding: '.75rem 1rem' }}>Acesso</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => {
                const isToggling = toggling === d.name
                return (
                  <tr key={d.id} style={{ borderBottom: '1px solid #222', fontSize: '.9rem' }}>
                    <td style={{ padding: '.75rem 1rem', fontWeight: 500, color: d.vpn ? '#22c55e' : '#f59e0b' }}>
                      {d.vpn ? '🔒 ' : '🌐 '} {d.name}
                    </td>
                    <td style={{ padding: '.75rem 1rem', color: '#666', fontFamily: 'monospace', fontSize: '.8rem' }}>{d.content}</td>
                    <td style={{ padding: '.75rem 1rem', color: '#666', fontSize: '.8rem' }}>
                      {d.proxied ? 'Orange Cloud' : 'DNS Only'}
                    </td>
                    <td style={{ padding: '.75rem 1rem' }}>
                      <button
                        onClick={() => toggleVpn(d)}
                        disabled={isToggling}
                        style={{
                          background: d.vpn ? '#f59e0b' : '#22c55e',
                          color: '#000',
                          border: 'none',
                          padding: '.35rem .75rem',
                          borderRadius: 6,
                          fontSize: '.8rem',
                          fontWeight: 600,
                          cursor: isToggling ? 'wait' : 'pointer',
                          opacity: isToggling ? .5 : 1,
                          minWidth: 100,
                        }}
                      >
                        {isToggling ? '...' : d.vpn ? '🌐 Tornar Público' : '🔒 VPN Only'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && !loading && (
            <p style={{ textAlign: 'center', color: '#555', padding: '2rem' }}>Nenhum domínio encontrado</p>
          )}
        </div>
      )}

      <footer style={{ marginTop: '2rem', fontSize: '.8rem', color: '#444', textAlign: 'center' }}>
        <p>🔒 <strong style={{ color: '#22c55e' }}>VPN Only</strong> = Só acessível com WireGuard ativo</p>
        <p>🌐 <strong style={{ color: '#f59e0b' }}>Público</strong> = Qualquer um pode acessar</p>
        <p style={{ marginTop: '.5rem', color: '#333' }}>
          A configuração é salva em /data/vpn-config.json e /data/traefik-vpn.yml
        </p>
      </footer>
    </div>
  )
}

export default App
