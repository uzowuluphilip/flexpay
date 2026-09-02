import { ChevronDown, Search } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

const BANKS = [
  'OPay', 'Moniepoint', 'PalmPay', 'Paga', 'Paystack', 'Flutterwave', 'UBA', 'Moremonee', 'Kuda', 'Carbon',
  'FairMoney', 'Cowrywise', 'PiggyVest', 'Chipper Cash', 'Interswitch', 'Remita', 'Nomba', 'Baxi', 'Squad', 'Korapay',
  'VBank', 'Rubies Bank', 'Sparkle', 'Mintyn', 'VFD Bank', 'ALAT by Wema', 'Eyowo', 'Gomoney', 'Branch', 'Renmoney',
  'Migo', 'CredPal', 'Umba', 'Aella', 'Indicina', 'Page Financials', 'Zedvance', 'PalmCredit', 'Okash', 'EaseMoni',
  'QuickCheck', 'Newcredit', 'CreditWise', 'TeamApt', 'Moniepoint Business', 'OPay Business', 'PalmPay Business', 'PayCentre', 'Eversend', 'Grey',
  'Cleva', 'LemFi', 'Send App', 'Afriex', 'Raenest', 'Fincra', 'SeerBit', 'Pay4Me', 'Klasha', 'Daba',
  'Sudo Africa', 'Leatherback', 'Float', 'Duplo', 'Mono', 'Stitch', 'OnePipe', 'Bloc', 'Anchor', 'Brass',
  'Kippa', 'Prospa', 'Fez Delivery', 'Chowdeck', 'Termii', 'Access Bank', 'Alpha Morgan Bank', 'Citibank Nigeria', 'Ecobank Nigeria', 'Fidelity Bank',
  'First Bank', 'FCMB', 'Globus Bank', 'GTBank', 'Keystone Bank', 'Optimus Bank', 'Parallex Bank', 'Polaris Bank', 'Premium Trust Bank', 'Providus Bank',
  'Stanbic IBTC', 'Standard Chartered Bank', 'Sterling Bank', 'SunTrust Bank', 'Titan Trust Bank', 'Union Bank', 'Unity Bank', 'Wema Bank', 'Zenith Bank', 'Jaiz Bank',
  'Lotus Bank', 'TAJBank', 'The Alternative Bank', 'NIRSAL Microfinance Bank', 'LAPO Microfinance Bank', 'Baobab Microfinance Bank', 'MKOBO Microfinance Bank', 'Addosser Microfinance Bank', 'BOI Microfinance Bank', 'Moove',
  'Lidya', 'Moneymart', 'Alajo', 'Specta', 'Payhippo'
]

function BankSelector({ value, onChange, required = true }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const filtered = BANKS.filter((bank) => bank.toLowerCase().includes(search.toLowerCase()))

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev + 1) % filtered.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev - 1 + filtered.length) % filtered.length)
        break
      case 'Enter':
        e.preventDefault()
        if (filtered[highlightedIndex]) {
          handleSelect(filtered[highlightedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        break
      default:
        break
    }
  }

  const handleSelect = (bank) => {
    onChange(bank)
    setSearch('')
    setIsOpen(false)
    setHighlightedIndex(0)
  }

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex]
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex, isOpen])

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          required={required}
          value={isOpen ? search : value}
          onChange={(e) => {
            setSearch(e.target.value)
            setIsOpen(true)
            setHighlightedIndex(0)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search or select bank"
          className="min-h-11 w-full rounded-xl border border-brand-border/70 bg-brand-base pl-3 pr-10 text-brand-text outline-none focus:border-brand-lime"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted"
          aria-label="Toggle bank list"
        >
          <ChevronDown size={18} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-xl border border-brand-border/70 bg-brand-panel/95 shadow-[0_12px_32px_rgba(0,0,0,0.3)] backdrop-blur-sm">
          {filtered.length > 0 ? (
            <ul
              ref={listRef}
              className="max-h-64 overflow-y-auto py-1"
              role="listbox"
            >
              {filtered.map((bank, index) => (
                <li key={bank}>
                  <button
                    type="button"
                    onClick={() => handleSelect(bank)}
                    className={`w-full px-3 py-2 text-left text-sm transition ${
                      index === highlightedIndex
                        ? 'bg-brand-lime/20 text-brand-lime'
                        : 'text-brand-text hover:bg-[rgba(198,241,53,0.08)]'
                    }`}
                    role="option"
                    aria-selected={index === highlightedIndex}
                  >
                    {bank}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-4 text-center text-sm text-brand-muted">
              No banks found for "{search}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default BankSelector
