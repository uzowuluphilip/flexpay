import { Ban, Bell, ChevronRight, CircleDollarSign, Eye, KeyRound, Link2, Menu, RotateCcw, ShieldCheck, Users, WalletCards, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './static-admin-dashboard.css'

const navigation = [
  ['Dashboard', CircleDollarSign, '/admin', null], ['Users', Users, '/admin/users', '584'], ['Banned', Ban, '/admin/users?status=banned', '6'],
  ['Broadcast', Bell, '/admin', null], ['Withdraw', WalletCards, '/admin/withdrawals', null], ['Keys', KeyRound, '/admin', '52'],
  ['Master Key', KeyRound, '/admin', null], ['Balances', WalletCards, '/admin/users', null],
]

const paymentLinks = [['Nexora Key', KeyRound, '0'], ['Withdraw Verify', Eye, '1'], ['Upgrade Payment', Link2, '0'], ['Final Payment', WalletCards, '0']]
const stats = [
  ['Total Users', '584', 'All registered accounts', Users, false], ['Pending', '1', 'Requires action', CircleDollarSign, false],
  ['Approved', '87', '', ShieldCheck, false], ['Rejected', '113', '', X, true], ['Banned Accounts', '6', '', Ban, false],
]

export default function StaticAdminDashboard() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="static-admin-shell">
      <header className="static-admin-mobile-header">
        <button type="button" className="static-admin-icon" onClick={() => setMenuOpen(true)} aria-label="Open admin menu"><Menu size={18} /></button>
        <div><p className="static-admin-brand">Admin Panel</p><p className="static-admin-kicker">System overview</p></div>
        <div className="static-admin-actions"><button type="button" className="static-admin-icon static-admin-icon-accent" aria-label="Refresh dashboard"><RotateCcw size={15} /></button><span className="static-admin-access"><i /> Root access</span></div>
      </header>

      <aside className={`static-admin-sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div className="static-admin-sidebar-head"><div><p className="static-admin-brand">Admin Panel</p><p className="static-admin-kicker">System overview</p></div><button type="button" className="static-admin-icon static-admin-close" onClick={() => setMenuOpen(false)} aria-label="Close admin menu"><X size={18} /></button></div>
        <nav className="static-admin-nav" aria-label="Admin navigation">
          {navigation.map(([label, Icon, to, count]) => <button type="button" key={label} className={`static-admin-nav-item ${label === 'Dashboard' ? 'is-active' : ''}`} onClick={() => { setMenuOpen(false); navigate(to) }}><Icon size={14} /><span>{label}</span>{count ? <small>{count}</small> : null}</button>)}
        </nav>
        <p className="static-admin-section-label">Payments</p>
        <div className="static-admin-payments">{paymentLinks.map(([label, Icon, count]) => <button type="button" key={label} className="static-admin-payment" onClick={() => navigate('/admin')}><Icon size={12} /><span>{label}</span><small>{count}</small></button>)}</div>
      </aside>
      {menuOpen ? <button type="button" className="static-admin-backdrop" onClick={() => setMenuOpen(false)} aria-label="Close admin menu" /> : null}

      <main className="static-admin-main">
        <section className="static-admin-stats" aria-label="Platform statistics">
          {stats.map(([label, value, note, Icon, danger]) => <article key={label} className={`static-admin-stat ${danger ? 'is-danger' : ''}`}><div className="static-admin-stat-label"><Icon size={13} /><span>{label}</span></div><strong>{value}</strong>{note ? <small>{note}</small> : null}{label === 'Banned Accounts' ? <Ban className="static-admin-ban" size={22} /> : null}</article>)}
        </section>

        <div className="static-admin-section-head"><h1>Recent Pending</h1><button type="button" onClick={() => navigate('/admin/withdrawals')}>View all <ChevronRight size={13} /></button></div>
        <article className="static-admin-pending">
          <div className="static-admin-pending-top"><div><h2>okereke anthony chimakpa</h2><p>anthonylenorah@gmail.com</p><span>Withdrawal · Verify (₦7,200)</span></div><b>Pending</b></div>
          <div className="static-admin-pending-details"><strong>₦7,200</strong><span>26/06/2026 · 12:54</span></div>
          <div className="static-admin-receipt"><div className="static-admin-receipt-brand"><span>Moniepoint</span><i>₦</i></div><div className="static-admin-receipt-paper"><strong>₦7,950.00</strong><span>Transfer successful</span><span>Recipient · FlexPay</span><span>Reference · 204891</span></div></div>
        </article>
      </main>
    </div>
  )
}
