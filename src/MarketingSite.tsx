import Starfield from './components/Starfield'
import Nav from './components/Nav'
import Hero from './components/Hero'
import TapToReview from './components/TapToReview'
import WhyReviews from './components/WhyReviews'
import WhyRevora from './components/WhyRevora'
import InTheWild from './components/InTheWild'
import Products from './components/Products'
import Pricing from './components/Pricing'
import Faq from './components/Faq'
import Cta from './components/Cta'
import Footer from './components/Footer'
import DemoModal from './components/DemoModal'

import DeferredMap from './components/DeferredMap'

export default function MarketingSite() {
  return (
    <>
      <Starfield />
      <Nav />
      <main>
        <Hero />
        <TapToReview />
        <WhyReviews />
        <WhyRevora />
        <InTheWild />
        <DeferredMap />
        <Products />
        <Pricing />
        <Faq />
        <Cta />
      </main>
      <Footer />
      <DemoModal />
    </>
  )
}
