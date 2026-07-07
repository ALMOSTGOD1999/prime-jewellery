import Layout from '~/components/website/layout/Layout'
import HeroSection from '~/components/website/home/HeroSection'
import TrustBadges from '~/components/website/home/TrustBadges'
import CompanyProfile from '~/components/website/home/CompanyProfile'
import MissionVision from '~/components/website/home/MissionVision'
import WhyChooseUs from '~/components/website/home/WhyChooseUs'
import CategorySection from '~/components/website/home/CategorySection'
import FeaturedProducts from '~/components/website/home/FeaturedProducts'
import CollectionBanners from '~/components/website/home/CollectionBanners'
import Newsletter from '~/components/website/home/Newsletter'
import WelcomeAnimation from '~/components/website/WelcomeAnimation'

const Index = () => {
  return (
    <>
      <WelcomeAnimation />
      <Layout>
        <HeroSection />
        <CompanyProfile />
        <TrustBadges />
        <MissionVision />
        <WhyChooseUs />
        <CategorySection />
        <FeaturedProducts />
        <CollectionBanners />
        <Newsletter />
      </Layout>
    </>
  )
}

export default Index
