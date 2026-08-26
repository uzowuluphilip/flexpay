import Nav from '../components/landing/Nav'
import Hero from '../components/landing/Hero'
import StatsStrip from '../components/landing/StatsStrip'
import HowItWorks from '../components/landing/HowItWorks'
import FeaturesGrid from '../components/landing/FeaturesGrid'
import TrustSection from '../components/landing/TrustSection'
import FAQ from '../components/landing/FAQ'
import FinalCTA from '../components/landing/FinalCTA'
import Footer from '../components/landing/Footer'

function LandingPage() {
  return (
    <div className="min-h-screen bg-brand-base text-brand-text">
      <Nav />
      <Hero />
      <StatsStrip />
      <HowItWorks />
      <FeaturesGrid />
      <TrustSection />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  )
}

export default LandingPage
