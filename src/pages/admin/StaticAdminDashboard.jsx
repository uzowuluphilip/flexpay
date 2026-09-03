import { Ban, Bell, ChevronRight, CircleDollarSign, Eye, KeyRound, Link2, Menu, RotateCcw, ShieldCheck, Users, WalletCards, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../../lib/api/admin'
import './static-admin-dashboard.css'

const navigation = [
  ['Dashboard', CircleDollarSign, '/admin', null], ['Users', Users, '/admin/users', 'totalUsers'], ['Banned', Ban, '/admin/users?status=banned', 'bannedUsers'],
  ['Broadcast', Bell, '/admin', null], ['Withdraw', WalletCards, '/admin/withdrawals', null], ['Keys', KeyRound, '/admin', 52],
  ['Master Key', KeyRound, '/admin', null], ['Balances', WalletCards, '/admin/users', null], ['Transactions', WalletCards, '/admin/transactions', null],
]

const paymentLinks = [['Nexora Key', KeyRound, '0'], ['Withdraw Verify', Eye, '1'], ['Upgrade Payment', Link2, '0'], ['Final Payment', WalletCards, '0']]
const stats = [
  ['Total Users', 'totalUsers', 'All registered accounts', Users, false], ['Pending', 'pendingWithdrawals', 'Requires action', CircleDollarSign, false],
  ['Approved', 'approvedWithdrawals', '', ShieldCheck, false], ['Rejected', 'rejectedWithdrawals', '', X, true], ['Banned Accounts', 'bannedUsers', '', Ban, false],
]

export default function StaticAdminDashboard() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [overview, setOverview] = useState(null)
  const [latestPending, setLatestPending] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([adminApi.getOverview(), adminApi.listPendingTransactions()])
      .then(([overviewData, pendingData]) => {
        setOverview(overviewData)
        setLatestPending(pendingData.transactions?.[0] || null)
      })
      .catch((requestError) => setError(requestError.message))
  }, [])

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
          {navigation.map(([label, Icon, to, count]) => <button type="button" key={label} className={`static-admin-nav-item ${label === 'Dashboard' ? 'is-active' : ''}`} onClick={() => { setMenuOpen(false); navigate(to) }}><Icon size={14} /><span>{label}</span>{count ? <small>{typeof count === 'string' ? overview?.[count] ?? '...' : count}</small> : null}</button>)}
        </nav>
        <p className="static-admin-section-label">Payments</p>
        <div className="static-admin-payments">{paymentLinks.map(([label, Icon, count]) => <button type="button" key={label} className="static-admin-payment" onClick={() => navigate('/admin')}><Icon size={12} /><span>{label}</span><small>{count}</small></button>)}</div>
      </aside>
      {menuOpen ? <button type="button" className="static-admin-backdrop" onClick={() => setMenuOpen(false)} aria-label="Close admin menu" /> : null}

      <main className="static-admin-main">
        <section className="static-admin-stats" aria-label="Platform statistics">
          {stats.map(([label, value, note, Icon, danger]) => <article key={label} className={`static-admin-stat ${danger ? 'is-danger' : ''}`}><div className="static-admin-stat-label"><Icon size={13} /><span>{label}</span></div><strong>{overview ? overview[value] : '...'}</strong>{note ? <small>{note}</small> : null}{label === 'Banned Accounts' ? <Ban className="static-admin-ban" size={22} /> : null}</article>)}
        </section>

        <div className="static-admin-section-head"><h1>Recent Pending</h1><button type="button" onClick={() => navigate('/admin/transactions')}>View all <ChevronRight size={13} /></button></div>
        {error ? <p className="static-admin-error">{error}</p> : null}
        {latestPending ? <PendingTransactionCard transaction={latestPending} /> : <p className="static-admin-empty">No pending transactions</p>}
      </main>
    </div>
  )
}

function PendingTransactionCard({ transaction }) {
  const meta = JSON.parse(transaction.meta || '{}')
  const typeLabels = { top_up: 'Top-up', withdrawal: 'Withdrawal', upgrade_fee: 'Upgrade', lock_hold: 'Investment' }
  const amountKobo = transaction.type === 'top_up' ? Number(meta.claimed_amount_kobo || transaction.amount_kobo) : Number(transaction.amount_kobo)
  const detail = transaction.bank_name
    ? `${transaction.bank_name} · ${transaction.account_number} · ${transaction.account_name}`
    : transaction.type === 'upgrade_fee'
      ? `${meta.tier || 'Upgrade'} payment`
      : transaction.type === 'lock_hold' ? `${(Math.abs(amountKobo) / 100).toLocaleString('en-NG')} locked for 30 days` : 'Receipt attached'

  return <article className="static-admin-pending">
    <div className="static-admin-pending-top"><div><h2>{transaction.full_name}</h2><p>{transaction.email}</p><span>{typeLabels[transaction.type] || transaction.type} · Pending</span></div><b>Pending</b></div>
    <div className="static-admin-pending-details"><strong>₦{(Math.abs(amountKobo) / 100).toLocaleString('en-NG')}</strong><span>{new Date(transaction.created_at).toLocaleString('en-NG')}</span></div>
    <div className="static-admin-receipt"><div className="static-admin-receipt-brand"><span>{detail}</span><i>₦</i></div><div className="static-admin-receipt-paper"><strong>{typeLabels[transaction.type] || 'Transaction'}</strong><span>{detail}</span><span>Reference · {transaction.reference}</span><span>Awaiting admin review</span></div></div>
  </article>
}
