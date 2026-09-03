import { ArrowLeft, Check, CircleDollarSign } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import BottomNav from '../../components/dashboard/BottomNav'
import CurrencyDisplayToggle from '../../components/dashboard/CurrencyDisplayToggle'
import '../../styles/wave-bounce.css'
import { getTasks, tasks as taskDefinitions, verifyTask } from '../../lib/api/tasks'
import { getExchangeRate, getWalletSummary } from '../../lib/api/wallet'
import { formatDisplayAmount, getStoredDisplayCurrency } from '../../lib/currency'

function DailyTasksPage() {
  const [availableTasks, setAvailableTasks] = useState(taskDefinitions)
  const [taskState, setTaskState] = useState(
    taskDefinitions.reduce((acc, task) => {
      acc[task.id] = { status: 'start', loading: false }
      return acc
    }, {})
  )
  const [wallet, setWallet] = useState({ balance: 0, referralsActive: 0, perReferral: 0, verified: true })
  const [exchangeRate, setExchangeRate] = useState(1359)
  const [displayCurrency, setDisplayCurrency] = useState(getStoredDisplayCurrency())

  useEffect(() => {
    let active = true
    getExchangeRate().then((rate) => {
      if (active) setExchangeRate(rate)
    }).catch(() => undefined)
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    getWalletSummary().then((data) => {
      if (active) {
        setWallet({
          balance: data.balance,
          referralsActive: data.referralsActive,
          perReferral: data.perReferral,
          verified: data.verified,
        })
      }
    }).catch(() => undefined)
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    getTasks().then((serverTasks) => {
      if (!active || !Array.isArray(serverTasks) || serverTasks.length === 0) return

      const serverTaskByTitle = new Map(serverTasks.map((task) => [task.title, task]))
      const mergedTasks = taskDefinitions
        .map((task) => ({ ...task, serverId: serverTaskByTitle.get(task.title)?.id }))
        .filter((task) => task.serverId !== undefined)

      setAvailableTasks(mergedTasks)
      setTaskState(mergedTasks.reduce((state, task) => {
        state[task.id] = {
          status: serverTaskByTitle.get(task.title)?.completed ? 'claimed' : 'start',
          loading: false,
        }
        return state
      }, {}))
    }).catch(() => undefined)

    return () => { active = false }
  }, [])

  const completedCount = useMemo(
    () => Object.values(taskState).filter((task) => task.status === 'claimed').length,
    [taskState]
  )

  const totalPool = useMemo(
    () => availableTasks.reduce((sum, task) => sum + task.rewardAmount, 0),
    [availableTasks]
  )
  const totalPoolLabel = useMemo(() => formatDisplayAmount(totalPool, displayCurrency, exchangeRate), [totalPool, displayCurrency, exchangeRate])

  const completedReward = useMemo(
    () => availableTasks.reduce((sum, task) => {
      return taskState[task.id]?.status === 'claimed' ? sum + task.rewardAmount : sum
    }, 0),
    [availableTasks, taskState]
  )

  const completedPercent = availableTasks.length === 0 ? 0 : Math.round((completedCount / availableTasks.length) * 100)

  const handleStart = (task) => {
    window.open(task.url, '_blank', 'noopener,noreferrer')
    setTaskState((current) => ({
      ...current,
      [task.id]: { status: 'verify', loading: false },
    }))
  }

  const handleVerify = async (task) => {
    setTaskState((current) => ({
      ...current,
      [task.id]: { status: 'verify', loading: true },
    }))

    try {
      await verifyTask(task.serverId)
    } catch (error) {
      setTaskState((current) => ({
        ...current,
        [task.id]: { status: 'verify', loading: false, error: error.message },
      }))
      return
    }

    const completed = JSON.parse(window.localStorage.getItem('flexpay-completed-tasks') || '[]')
    if (!completed.includes(task.id)) {
      completed.push(task.id)
      window.localStorage.setItem('flexpay-completed-tasks', JSON.stringify(completed))

      const history = JSON.parse(window.localStorage.getItem('flexpay-notification-history') || '[]')
      const entry = {
        id: `task-completed-${task.id}`,
        type: 'task-completion',
        title: 'Task completed',
        message: `Nice work! You completed ${task.title} and earned your reward.`,
        time: 'Just now',
      }

      const nextHistory = [entry, ...history.filter((item) => item.id !== entry.id)].slice(0, 12)
      window.localStorage.setItem('flexpay-notification-history', JSON.stringify(nextHistory))
      window.dispatchEvent(new CustomEvent('flexpay-notifications-changed'))
    }

    // Refetch wallet balance after task completion
    try {
      const walletData = await getWalletSummary()
      setWallet({
        balance: walletData.balance,
        referralsActive: walletData.referralsActive,
        perReferral: walletData.perReferral,
        verified: walletData.verified,
      })
    } catch (error) {
      console.error('Failed to update wallet:', error)
    }

    setTaskState((current) => ({
      ...current,
      [task.id]: { status: 'claimed', loading: false },
    }))
  }

  return (
    <div className="min-h-screen bg-brand-base pb-[7.5rem] text-brand-text sm:pb-[8.5rem]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-4 sm:px-5 lg:px-8 lg:py-6">
        <header className="flex items-center justify-between rounded-[1.75rem] border border-brand-border/70 bg-[rgba(21,15,46,0.92)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.18)] sm:p-5">
          <Link to="/home" className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-border/70 bg-[rgba(198,241,53,0.08)] text-brand-lime transition hover:border-brand-lime/70">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex flex-1 items-center justify-center gap-3 text-center md:gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.5rem] bg-[rgba(198,241,53,0.08)] text-brand-lime">
              <CircleDollarSign size={24} />
            </div>
            <div className="max-w-2xl">
              <p className="text-[11px] uppercase tracking-[0.28em] text-brand-muted">Daily Tasks</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-brand-text">Task Center</h1>
            </div>
          </div>
          <CurrencyDisplayToggle exchangeRate={exchangeRate} value={displayCurrency} onChange={setDisplayCurrency} />
        </header>

        <section className="rounded-[1.75rem] border border-brand-border/70 bg-[rgba(11,7,20,0.92)] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.18)] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-28 w-28 items-center justify-center rounded-full border border-brand-border/70 bg-[rgba(198,241,53,0.08)]">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[rgba(255,255,255,0.04)]">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-brand-lime/30 bg-[rgba(198,241,53,0.12)] text-brand-lime">
                    <span className="text-lg font-semibold">{completedPercent}%</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-brand-lime">EARN EVERY DAY</p>
                <h2 className="mt-3 text-2xl font-semibold text-brand-text">Task Center</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-muted">
                  {completedCount}/{availableTasks.length} completed · resets every 24h
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.5rem] border border-brand-border/70 bg-[rgba(21,15,46,0.92)] p-4">
                <p className="text-[11px] uppercase tracking-[0.28em] text-brand-muted">Total pool</p>
                <p className="mt-3 text-3xl font-semibold text-brand-text">{totalPoolLabel}</p>
              </div>
              <div className="rounded-[1.5rem] border border-brand-border/70 bg-[rgba(21,15,46,0.92)] p-4">
                <p className="text-[11px] uppercase tracking-[0.28em] text-brand-muted">Available now</p>
                <p className="mt-3 text-3xl font-semibold text-brand-text">{availableTasks.length} tasks</p>
              </div>
              <div className="rounded-[1.5rem] border border-brand-border/70 bg-[rgba(21,15,46,0.92)] p-4">
                <p className="text-[11px] uppercase tracking-[0.28em] text-brand-muted">Your balance</p>
                <p className="mt-3 text-3xl font-semibold text-brand-lime">₦{(wallet.balance / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-brand-border/70 bg-[rgba(21,15,46,0.92)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.18)] sm:p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-brand-muted">Daily Tasks</p>
              <h2 className="mt-2 text-xl font-semibold text-brand-text">Complete tasks to earn more</h2>
            </div>
            <span className="rounded-full border border-brand-lime/30 bg-[rgba(198,241,53,0.08)] px-3 py-2 text-sm font-semibold text-brand-lime">
              {availableTasks.length} tasks available
            </span>
          </div>

          <div className="space-y-4">
            {availableTasks.map((task, index) => {
              const state = taskState[task.id]
              const isVerify = state.status === 'verify'
              const isClaimed = state.status === 'claimed'

              return (
                <div key={task.id} className="flex flex-col gap-4 rounded-[1.5rem] border border-brand-border/70 bg-[rgba(11,7,20,0.54)] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                    <div style={{ '--wave-delay': `${index * 0.15}s` }} className="wave-bounce-item flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(198,241,53,0.12)] text-brand-lime">
                      <Check size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-brand-text">{task.title}</p>
                      <p className="mt-1 text-sm leading-6 text-brand-muted">{task.description}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:items-end">
                    <div className="rounded-full border border-brand-lime/30 bg-[rgba(198,241,53,0.08)] px-3 py-2 text-sm font-semibold text-brand-lime">
                      +{formatDisplayAmount(task.rewardAmount, displayCurrency, exchangeRate).replace('$', '')}
                    </div>
                    <div>
                      {isClaimed ? (
                        <div className="inline-flex items-center rounded-full border border-brand-lime/30 bg-[rgba(198,241,53,0.08)] px-4 py-2 text-sm font-semibold text-brand-lime">
                          Completed
                        </div>
                      ) : (
                        <button
                          onClick={() => (isVerify ? handleVerify(task) : handleStart(task))}
                          disabled={state.loading}
                          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand-lime to-brand-lime-light px-5 py-2.5 text-sm font-semibold text-brand-base shadow-[0_16px_40px_-20px_rgba(198,241,53,0.8)] transition disabled:cursor-not-allowed disabled:opacity-70 hover:brightness-105"
                        >
                          {state.loading ? 'Verifying…' : isVerify ? 'Verify' : 'Start'}
                        </button>
                      )}
                      {state.error ? <p className="mt-2 max-w-xs text-xs text-red-300">{state.error}</p> : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
      <BottomNav />
    </div>
  )
}

export default DailyTasksPage
