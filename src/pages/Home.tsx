import ParticleBackground from '@/components/ParticleBackground';
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import ComparisonTable from '@/components/ComparisonTable';
import RadarChart from '@/components/RadarChart';
import Leaderboard from '@/components/Leaderboard';
import ModelCards from '@/components/ModelCards';
import Timeline from '@/components/Timeline';
import Footer from '@/components/Footer';
import ScrollReveal from '@/components/ScrollReveal';

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[#0a0a0f]">
      <ParticleBackground />
      <Navbar />
      <main className="relative z-10">
        <div id="hero">
          <HeroSection />
        </div>

        <div id="comparison">
          <ScrollReveal>
            <ComparisonTable />
          </ScrollReveal>
        </div>

        <div id="radar">
          <ScrollReveal delay={100}>
            <RadarChart />
          </ScrollReveal>
        </div>

        <div id="leaderboard">
          <ScrollReveal delay={100}>
            <Leaderboard />
          </ScrollReveal>
        </div>

        <div id="cards">
          <ScrollReveal delay={100}>
            <ModelCards />
          </ScrollReveal>
        </div>

        <div id="timeline">
          <ScrollReveal delay={100}>
            <Timeline />
          </ScrollReveal>
        </div>

        <Footer />
      </main>
    </div>
  );
}
