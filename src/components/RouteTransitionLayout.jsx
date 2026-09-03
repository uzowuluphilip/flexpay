import React, { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import logoIcon from '../assets/brand/flexpay-icon.svg'

function RouteTransitionLayout({ children }) {
  const location = useLocation()
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    setIsTransitioning(true)
    const timer = window.setTimeout(() => setIsTransitioning(false), 180)
    return () => window.clearTimeout(timer)
  }, [location.key])

  return (
    <>
      {children}

      <AnimatePresence mode="wait">
        {isTransitioning && (
          <motion.div
            key="route-splash"
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-brand-base px-0 py-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="absolute inset-0 bg-brand-base" />
            <motion.div className="relative z-10 flex w-full max-w-lg flex-col items-center justify-center gap-6 px-6 py-8">
              <div className="relative flex h-48 w-48 items-center justify-center rounded-full">
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,_rgba(198,241,53,0.18),_rgba(198,241,53,0.04)_45%,_transparent_70%)]" />
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,_rgba(45,208,255,0.18),_transparent_65%)] blur-[1px]" />
                <div className="relative flex h-full w-full items-center justify-center rounded-full">
                  <img src={logoIcon} alt="FlexPay icon" className="h-28 w-28 rounded-full object-contain" />
                </div>
              </div>

              <div className="space-y-2 text-center">
                <motion.h1
                  className="text-3xl font-semibold tracking-tight text-brand-text"
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.35 }}
                >
                  FlexPay
                </motion.h1>
                <motion.p
                  className="text-sm text-brand-muted"
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.35, delay: 0.08 }}
                >
                  Naira rewards • instant cash out
                </motion.p>
              </div>

              <div className="mt-1 flex items-center justify-center gap-2">
                {[0, 1, 2].map((index) => (
                  <motion.span
                    key={index}
                    className="h-2 w-2 rounded-full bg-brand-lime/80"
                    animate={{ opacity: [0.4, 1, 0.4], y: [0, -5, 0] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: index * 0.15, ease: 'easeInOut' }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default RouteTransitionLayout
