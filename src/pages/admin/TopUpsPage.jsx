import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../../lib/api/admin'

export default function AdminTopUpsPage() {
  const navigate = useNavigate()
  const [topups, setTopups] = useState([])
  const [status, setStatus] = useState('pending')
  const [selected, setSelected] = useState(null)
  const [reason, setReason] = useState('')
  const [receiptPreview, setReceiptPreview] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const data = await adminApi.listTopups(status)
    setTopups(data.topups || [])
  }

  useEffect(() => {
    let cancelled = false
    adminApi.listTopups(status).then((data) => {
      if (!cancelled) setTopups(data.topups || [])
    }).catch((err) => {
      if (!cancelled) setError(err.message)
    })
    return () => { cancelled = true }
  }, [status])

  const approve = async (id) => {
    if (!window.confirm('Approve this top-up and credit the net amount?')) return
    setBusy(true)
    try { await adminApi.approveTopup(id); await load() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const reject = async () => {
    if (!selected || !reason.trim()) return setError('A rejection reason is required.')
    setBusy(true)
    try { await adminApi.rejectTopup(selected.id, reason); setSelected(null); setReason(''); await load() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const previewReceipt = async (id) => {
    try {
      setReceiptPreview(await adminApi.fetchReceipt(id))
    } catch (err) {
      setError(err.message)
    }
  }

  return <div className="min-h-screen bg-gray-900 text-white"><header className="sticky top-0 z-20 border-b border-gray-700 bg-gray-800"><div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4"><button onClick={() => navigate('/admin')} className="text-gray-400 hover:text-white">← Back</button><h1 className="text-2xl font-bold">Top-Ups Management</h1></div></header><main className="mx-auto max-w-7xl px-4 py-8">{error ? <p className="mb-4 rounded border border-red-700 bg-red-900 p-3 text-red-200">{error}</p> : null}<div className="mb-6 flex gap-2">{['pending', 'approved', 'rejected'].map((item) => <button key={item} onClick={() => setStatus(item)} className={`rounded px-4 py-2 capitalize ${status === item ? 'bg-blue-600' : 'border border-gray-700 bg-gray-800 text-gray-400'}`}>{item}</button>)}</div><div className="overflow-hidden rounded-lg border border-gray-700 bg-gray-800">{topups.length === 0 ? <p className="p-8 text-center text-gray-400">No top-ups found</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-700"><tr><th className="px-4 py-3 text-left">User</th><th className="px-4 py-3 text-left">Claimed</th><th className="px-4 py-3 text-left">Receipt</th><th className="px-4 py-3 text-left">Submitted</th><th className="px-4 py-3 text-center">Actions</th></tr></thead><tbody>{topups.map((topup) => <tr key={topup.id} className="border-t border-gray-700"><td className="px-4 py-3"><p className="font-medium">{topup.full_name}</p><p className="text-xs text-gray-400">{topup.email}</p></td><td className="px-4 py-3 font-medium">₦{(topup.claimed_amount_kobo / 100).toLocaleString()}</td><td className="px-4 py-3"><button onClick={() => previewReceipt(topup.id)} className="text-blue-300 underline">View receipt</button></td><td className="px-4 py-3 text-gray-400">{new Date(topup.created_at).toLocaleString()}</td><td className="px-4 py-3 text-center">{topup.status === 'pending' ? <div className="flex justify-center gap-2"><button disabled={busy} onClick={() => approve(topup.id)} className="rounded bg-green-600 px-3 py-1 text-xs">Approve</button><button disabled={busy} onClick={() => setSelected(topup)} className="rounded bg-red-600 px-3 py-1 text-xs">Reject</button></div> : <span className="capitalize text-gray-400">{topup.status}</span>}</td></tr>)}</tbody></table></div>}</div></main>{selected ? <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4"><div className="w-full max-w-md rounded-lg bg-gray-800 p-6"><h2 className="text-lg font-semibold">Reject top-up</h2><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows="4" placeholder="Reason for rejection" className="mt-4 w-full rounded border border-gray-600 bg-gray-700 p-3 text-white" /><div className="mt-4 flex gap-3"><button onClick={() => { setSelected(null); setReason('') }} className="flex-1 rounded bg-gray-700 px-4 py-2">Cancel</button><button disabled={busy} onClick={reject} className="flex-1 rounded bg-red-600 px-4 py-2">Reject</button></div></div></div> : null}{receiptPreview ? <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 p-4" onClick={() => { URL.revokeObjectURL(receiptPreview.url); setReceiptPreview(null) }}><div className="max-h-[90vh] max-w-4xl rounded-lg bg-white p-2" onClick={(event) => event.stopPropagation()}>{receiptPreview.type === 'application/pdf' ? <iframe src={receiptPreview.url} title="Uploaded top-up receipt" className="h-[82vh] w-[min(80vw,60rem)]" /> : <img src={receiptPreview.url} alt="Uploaded top-up receipt" className="max-h-[82vh] max-w-full object-contain" />}<button onClick={() => { URL.revokeObjectURL(receiptPreview.url); setReceiptPreview(null) }} className="mt-2 w-full rounded bg-gray-800 px-4 py-2 text-white">Close</button></div></div> : null}</div>
}
