import { CheckCircle2, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

const names = [
  'Aisha Mohammed', 'Morenike Lawal', 'Sade Adeola', 'Esther Okafor', 'Yetunde Afolabi', 'Salisu Mohammed', 'Uduak Essien', 'Chiamaka Nwankwo', 'Nafisa Usman', 'Muktar Bello', 'Lara Oladipo', 'Pere George', 'Edesiri Okiemute', 'Lubabatu Ibrahim', 'Folarin Adebayo', 'Obinna Okoro', 'Tarela George', 'Haruna Abdullahi', 'Torhile Iorwuese', 'Bode Olawale', 'Ismail Yusuf', 'Doyin Ogunleye', 'Erefa Alagoa', 'Abiola Adeyinka', 'Ahmed Garba', 'Timi Inengite', 'Kelechi Umeh', 'Bilkisu Sani', 'Mustapha Aliyu', 'Daniel Eze', 'Idongesit Udo', 'Fatima Bello', 'Ebitare Alali', 'Dooshima Terna', 'Victory Nwosu', 'Emmanuel Nwosu', 'Tersoo Iorliam', 'Ebiye George', 'Uchechukwu Eze', 'Favour Okeke', 'Wale Odukoya', 'Umar Farouk', 'Nasiru Abdullahi', 'Olumide Ogunleye', 'Hauwa Sani', 'Rahma Abubakar', 'Deji Oladipo', 'Mercy Nwachukwu', 'Akpan Bassey', 'Lanre Adegboye', 'Damilola Adesanya', 'Destiny Afolabi', 'Ibrahim Musa', 'Oghenekevwe Edewor', 'Wisdom Eze', 'Ikyurav-Yaikyo Iorfa', 'Ifunanya Okafor', 'Chinonso Eze', 'Ubong Udo', 'Tamunoemi George', 'Ronke Ojo', 'Bashir Lawal', 'Kosisochukwu Ibe', 'Ayodeji Akinyemi', 'Abdulrahman Yusuf', 'Edidiong Essien', 'Oghenerukevbe Urhobo', 'Titi Adebayo', 'Torkuma Aondofa', 'Femi Adeola', 'Ekemini Akpan', 'Pere Tamuno', 'Etim Akpan', 'Terkimbi Iorliam', 'Preye Briggs', 'Imeobong Essien', 'Nsisong Ekong', 'Segun Akinola', 'Doosuur Tersoo', 'Seiyefa Ebi', 'Mfoniso Etim', 'Ruqayya Bello', 'Abdullahi Bello', 'Ijeoma Okoro', 'Blessing Adekunle', 'Toluwa Akinyemi', 'Mfon Udofia', 'Sani Mohammed', 'Oghenekaro Ovwigho', "Asma'u Bello", 'Ebiere Seiyefa', 'Deborah Akinyemi', 'Aminu Ibrahim', 'Efeoghene Akpobome', 'Zainab Ibrahim', 'Hafsat Mohammed', 'Bisola Akinwale', 'Suleiman Umar', 'Adewale Adekunle', 'Aondofa Iorfa', 'Eghosa Aigbe', 'Chidinma Okeke', 'Seyi Adebisi', 'Terdoo Kpamor', 'Michael Adeyemi', 'Tari Erekpore', 'Iornenge Terna', 'Hamza Sani', 'Sa’adatu Musa', 'Ejiro Oghenekaro', 'Nsikak Udoh', 'Tare Porri', 'Precious Obi', 'Aôndohemba Terkimbi', 'Asuquo Ekong', 'David Okoro', 'Adetokunbo Bello', 'Nnamdi Ibe', 'Mnena Torkuma', 'Chinedu Okafor', 'Tunde Balogun', 'Folake Adegbite', 'Somtochukwu Anya', 'Ime Umana', 'Koroye Briggs', 'Tochukwu Nwachukwu', 'Bukola Ojo', 'Oluwaseun Adeyemi', 'Modupeola Lawal', 'Iniobong Akpan', 'Miracle Nwankwo', 'Divine Okoro', 'Mnena Iorlamen', 'Kabiru Suleiman', 'Adebisi Ogunbiyi', 'Khadija Abubakar', 'Anietie Udo', 'Yemi Ajibade', 'Mnguember Terkula', 'Iorwuese Torkuma', 'Praise Eze', 'Osaigbovo Igiebor', 'Eseoghene Okoro', 'Nneka Nwosu', 'Iorlamen Mnguember', 'Jamila Abdullahi', 'Babatunde Adebayo', 'Maryam Usman', 'Nengi Iorfa', 'Tonye Briggs', 'Ebiye Tamuno', 'Kunle Adetayo', 'Eno Williams', 'Oluwatobi Oni', 'Tosin Adebisi', 'Tari Briggs', 'Gbenga Olatunji', 'Halima Yusuf', 'Temitope Ajayi', 'Amarachi Okeke', 'Omoregie Osagie', 'Preye Erekpore', 'Oghenetega Erhunse', 'Adaeze Obi', 'Dooshima Iorver', 'Terna Iorlamen', 'Ifeanyi Obi', 'Oladipupo Alabi', 'Amina Garba', 'Efe Ighodaro', 'Funmilayo Oladimeji', 'Ejiroghene Ovwigho', 'Ebiowei Seiyefa', 'Opeyemi Adebisi', 'Samuel Chukwu', 'Osaretin Omoregie', 'Enoabasi Akpan', 'Usman Abubakar', 'Safiya Umar', 'Osagie Eghosa', 'Eseosa Igbinovia', 'Ngozi Eze', 'Ekaette Eyo', 'Nike Adekunle', 'Abdulaziz Musa', 'Emeka Nwosu', 'Ivie Osagie', 'Mngohol Tersoo', 'Rukayya Suleiman', 'Uduakobong Etuk', 'Famous Tamuno', 'Joseph Abubakar', 'Bashir Ibrahim', 'Onoriode Ojo', 'Gift Adeyemi', 'Osamudiamen Aigbe', 'Oghenekaro Efe', 'Hadiza Musa', 'Chukwuemeka Eze', 'Simisola Ajayi',
]

function makeActivity(index) {
  const amount = 125000 + ((index * 13791) % 875000)
  return {
    id: index,
    name: names[index % names.length],
    amount: Math.round(amount / 1000) * 1000,
  }
}

const activities = Array.from({ length: names.length }, (_, index) => makeActivity(index))
const notificationDelays = [30 * 1000, 45 * 1000, 60 * 1000]
const notificationVisibleDuration = 4200

function formatAmount(amount) {
  return `₦${amount.toLocaleString('en-NG')}`
}

function WithdrawalActivityToast() {
  const [activityIndex, setActivityIndex] = useState(() => Math.floor(Math.random() * activities.length))
  const [visible, setVisible] = useState(true)
  const activity = useMemo(() => activities[activityIndex], [activityIndex])

  useEffect(() => {
    let hideTimer
    let showTimer

    const scheduleNext = (waitBeforeShowing = false) => {
      if (waitBeforeShowing) {
        showTimer = window.setTimeout(() => {
          setActivityIndex((current) => (current + 1) % activities.length)
          setVisible(true)
          scheduleNext()
        }, notificationDelays[Math.floor(Math.random() * notificationDelays.length)])
        return
      }

      hideTimer = window.setTimeout(() => {
        setVisible(false)
        scheduleNext(true)
      }, notificationVisibleDuration)
    }

    scheduleNext()

    return () => {
      window.clearTimeout(showTimer)
      window.clearTimeout(hideTimer)
    }
  }, [])

  return (
    <aside
      aria-live="polite"
      aria-label="Development withdrawal activity"
      className={`pointer-events-none fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[60] flex justify-center transition-all duration-500 sm:inset-x-6 ${visible ? 'translate-y-0 opacity-100' : '-translate-y-5 opacity-0'}`}
    >
      <div className="flex w-full max-w-[365px] items-center gap-2.5 rounded-[1.25rem] border border-brand-lime/20 bg-[linear-gradient(110deg,rgba(21,15,46,0.97),rgba(16,47,53,0.96))] px-2.5 py-2 shadow-[0_14px_40px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:max-w-[410px] sm:gap-3 sm:px-3 sm:py-2.5">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-lime to-cyan-400 text-brand-base shadow-[0_0_18px_rgba(198,241,53,0.25)] sm:h-11 sm:w-11">
          <CheckCircle2 size={22} strokeWidth={2.5} />
          <Sparkles className="absolute -right-1 -top-1 text-cyan-300" size={12} fill="currentColor" />
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[13px] font-bold text-brand-text sm:text-sm">{activity.name}</p>
          <p className="mt-1 truncate text-[11px] text-brand-muted sm:text-xs">just withdrew <span className="font-mono font-bold text-cyan-300">{formatAmount(activity.amount)}</span></p>
        </div>
        <span className="shrink-0 rounded-full border border-brand-success/25 bg-brand-success/10 px-2.5 py-1 text-[11px] font-semibold text-brand-success sm:text-xs">● Paid</span>
      </div>
    </aside>
  )
}

export default WithdrawalActivityToast
