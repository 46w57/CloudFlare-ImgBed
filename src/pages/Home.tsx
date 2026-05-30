import ParticleBackground from '@/components/ParticleBackground';
import HeroSection from '@/components/HeroSection';
import ComparisonTable from '@/components/ComparisonTable';
import RadarChart from '@/components/RadarChart';
import ModelCards from '@/components/ModelCards';
import Timeline from '@/components/Timeline';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[#0a0a0f]">
      <ParticleBackground />
      <main className="relative z-10">
        <HeroSection />
        <ComparisonTable />
        <RadarChart />
        <ModelCards />
        <Timeline />
        <Footer />
      </main>
    </div>
  );
}
