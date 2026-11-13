import StandCustomizer from "./components/StandCustomizer";
import Nav from "./components/Nav";
import Hero from "./components/Hero";
import TapToReview from "./components/TapToReview";
import WhyReviews from "./components/WhyReviews";
import WhyRevora from "./components/WhyRevora";
import Products from "./components/Products";
import Pricing from "./components/Pricing";
import Faq from "./components/Faq";
import Cta from "./components/Cta";
import Footer from "./components/Footer";
import DemoModal from "./components/DemoModal";

export default function MarketingSite() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <Nav />
      <main id="main-content" tabIndex={-1}>
        <Hero />
        <StandCustomizer />
        <Products />
        <TapToReview />
        <WhyReviews />
        <WhyRevora />
        <Pricing />
        <Faq />
        <Cta />
      </main>
      <Footer />
      <DemoModal />
    </>
  );
}
