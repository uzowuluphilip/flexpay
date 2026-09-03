import { useEffect, useState } from 'react'
import { ArrowLeft, Check, Eye, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../../lib/api/admin'

const labels = { top_up: 'Top-up', withdrawal: 'Withdrawal', upgrade_fee: 'Upgrade', lock_hold: 'Investment' }

export default function TransactionsPage() {
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState([])
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = () => adminApi.listPendingTransactions().then((data) => setTransactions(data.transactions || [])).catch((err) => setError(err.message))
  useEffect(load, [])

  const review = async (transaction, action) => {
    setBusy(true)
    setError('')
    try {
      if (action === 'approve') {
        await adminApi.approveTransaction(transaction.id)
      } else {
        const reason = window.prompt('Reason for rejection:')
        if (!reason?.trim()) return
        await adminApi.rejectTransaction(transaction.id, reason)
      }
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const showReceipt = async (transaction) => {
    if (!transaction.receipt_id) return
    try {
      setPreview(await adminApi.fetchTransactionReceipt(transaction.id))
    } catch (err) {
      setError(err.message)
    }
  }

  return <div className="min-h-screen bg-gray-900 text-white"><header className="sticky top-0 z-20 border-b border-gray-700 bg-gray-800"><div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4"><button type="button" onClick={() => navigate('/admin')} className="text-gray-400 hover:text-white" aria-label="Back to admin"><ArrowLeft size={20} /></button><h1 className="text-2xl font-bold">Pending Transactions</h1></div></header><main className="mx-auto max-w-6xl px-4 py-8">{error ? <p className="mb-4 rounded border border-red-700 bg-red-900 p-3 text-red-200">{error}</p> : null}<div className="space-y-4">{transactions.length === 0 ? <p className="rounded-lg border border-gray-700 bg-gray-800 p-8 text-center text-gray-400">No pending transactions</p> : transactions.map((transaction) => <article key={transaction.id} className="rounded-lg border border-gray-700 bg-gray-800 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-wider text-emerald-400">{labels[transaction.type] || transaction.type}</p><h2 className="mt-1 font-semibold">{transaction.full_name}</h2><p className="text-sm text-gray-400">{transaction.email}</p><p className="mt-2 text-sm">Amount: ₦{(Math.abs(Number(transaction.amount_kobo || 0)) / 100).toLocaleString('en-NG')}</p><p className="text-xs text-gray-500">{new Date(transaction.created_at).toLocaleString()} · {transaction.reference}</p>{transaction.bank_name ? <p className="mt-2 text-sm text-gray-300">{transaction.bank_name} · {transaction.account_number} · {transaction.account_name}</p> : null}</div><div className="flex gap-2">{transaction.receipt_id ? <button type="button" onClick={() => showReceipt(transaction)} className="inline-flex min-h-11 items-center gap-2 rounded bg-blue-600 px-3 text-sm font-semibold"><Eye size={15} /> Receipt</button> : null}<button type="button" disabled={busy} onClick={() => review(transaction, 'approve')} className="inline-flex min-h-11 items-center gap-2 rounded bg-emerald-600 px-3 text-sm font-semibold disabled:opacity-50"><Check size={15} /> Approve</button><button type="button" disabled={busy} onClick={() => review(transaction, 'reject')} className="inline-flex min-h-11 items-center gap-2 rounded bg-red-600 px-3 text-sm font-semibold disabled:opacity-50"><X size={15} /> Reject</button></div></div></article>)}</div></main>{preview ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => { URL.revokeObjectURL(preview.url); setPreview(null) }}><div className="max-h-[90vh] max-w-3xl overflow-auto rounded-lg bg-gray-900 p-4" onClick={(event) => event.stopPropagation()}>{preview.type === 'application/pdf' ? <iframe title="Payment receipt" src={preview.url} className="h-[75vh] w-[min(80vw,700px)]" /> : <img src={preview.url} alt="Payment receipt" className="max-h-[80vh] max-w-full object-contain" />}</div></div> : null}</div>
}
