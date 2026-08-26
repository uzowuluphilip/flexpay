import { ArrowLeftRight, Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getStoredDisplayCurrency, setStoredDisplayCurrency } from '../../lib/currency'

const currencies = [
  { code: 'NGN', label: 'Nigerian Naira', flag: '🇳🇬', subtitle: 'Display wallet amounts in naira.' },
  { code: 'USD', label: 'US Dollar', flag: '🇺🇸', subtitle: 'Display wallet amounts in dollars.' },
]

function CurrencyDisplayToggle({ exchangeRate, value, onChange }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(value || getStoredDisplayCurrency())

  useEffect(() => {
    setActive(value || getStoredDisplayCurrency())
  }, [value])

  const handleSelect = (code) => {
    setActive(code)
    setStoredDisplayCurrency(code)
    onChange?.(code)
    setOpen(false)
  }

  const current = currencies.find((item) => item.code === active) || currencies[0]

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-brand-border/70 bg-[rgba(11,7,20,0.54)] px-3 py-2 text-sm font-medium text-brand-text"
      >
        <span>{current.flag}</span>
        <span>{current.code}</span>
        <ArrowLeftRight size={14} className="text-brand-lime" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center">
          <div className="w-full max-w-md rounded-[1.75rem] border border-brand-border/70 bg-[rgba(21,15,46,0.98)] p-4 shadow-[0_32px_80px_rgba(0,0,0,0.45)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-brand-text">Display currency</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-brand-muted">Close</button>
            </div>

            <div className="space-y-2">
              {currencies.map((item) => {
                const selected = item.code === active
                const rateText = item.code === 'USD' && exchangeRate ? `1 USD = ₦${Number(exchangeRate).toLocaleString('en-NG')}` : '1 NGN = $0.0007'

                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => handleSelect(item.code)}
                    className={`flex w-full items-center justify-between rounded-[1.25rem] border px-3 py-3 text-left ${selected ? 'border-brand-lime/60 bg-[rgba(198,241,53,0.08)]' : 'border-brand-border/60 bg-[rgba(255,255,255,0.02)]'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{item.flag}</span>
                      <div>
                        <p className="font-medium text-brand-text">{item.label}</p>
                        <p className="text-xs text-brand-muted">{rateText}</p>
                      </div>
                    </div>
                    {selected ? <Check size={16} className="text-brand-lime" /> : null}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default CurrencyDisplayToggle
