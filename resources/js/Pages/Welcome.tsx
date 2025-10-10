import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';

// shadcn/ui components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';

// GSAP
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Photo showcase component
import PhotoShowcase from '@/Components/PhotoShowcase';

// Magical background particles
const Motes = () => (
  <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none" aria-hidden="true">
    {Array.from({ length: 20 }).map((_, i) => (
      <div
        key={i}
        className="absolute rounded-full bg-amber-400/50 mote"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          width: `${Math.random() * 2 + 1}px`,
          height: `${Math.random() * 2 + 1}px`,
          animation: `float ${Math.random() * 20 + 15}s linear infinite`,
          animationDelay: `${Math.random() * -30}s`,
        }}
      />
    ))}
  </div>
);

// FAQ Accordion Component
const FAQAccordion = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'Apa itu CodeAlpha Dungeon?',
      answer: 'CodeAlpha adalah platform pembelajaran interaktif berbasis game yang menggabungkan konsep dungeon crawling dengan tantangan logika, struktur data, dan algoritma. Siswa bekerja dalam tim dengan peran berbeda untuk menyelesaikan misi kolaboratif.'
    },
    {
      question: 'Bagaimana cara kerja sistem kolaborasi peran?',
      answer: 'Setiap sesi melibatkan dua peran utama: Penjinak (Tamer) yang mengambil aksi langsung dalam game, dan Pemandu (Dungeon Master) yang memberikan petunjuk strategis. Komunikasi efektif antara kedua peran adalah kunci untuk menyelesaikan tantangan.'
    },
    {
      question: 'Apakah CodeAlpha cocok untuk pemula?',
      answer: 'Ya! Kami menyediakan tantangan bertingkat mulai dari level dasar hingga lanjutan. Setiap misi dirancang dengan tutorial dan petunjuk yang membantu pemula memahami konsep pemrograman secara bertahap sambil tetap menantang bagi yang berpengalaman.'
    },
    {
      question: 'Berapa jumlah pemain dalam satu tim?',
      answer: 'Setiap tim terdiri dari minimal 2 pemain (1 Penjinak dan 1 Pemandu). Untuk pengalaman optimal, kami merekomendasikan tim berisi 2-4 orang yang dapat bergantian peran dalam sesi yang berbeda.'
    },
    {
      question: 'Apa yang dimaksud dengan "misi multi-tahap"?',
      answer: 'Setiap misi terdiri dari beberapa tahap tantangan yang harus diselesaikan secara berurutan. Setiap tahap memiliki tujuan spesifik seperti memecahkan sandi Caesar, menavigasi struktur data tree, atau men-debug kode. Progress dan skor ditampilkan setelah setiap tahap.'
    },
    {
      question: 'Bagaimana sistem penilaian bekerja?',
      answer: 'Skor diberikan berdasarkan akurasi jawaban, waktu penyelesaian, dan efektivitas kolaborasi. Sistem juga melacak achievement dan milestone yang dicapai tim. Semua data tersimpan untuk refleksi dan peningkatan strategi di sesi berikutnya.'
    },
    {
      question: 'Apakah ada mode turnamen atau kompetisi?',
      answer: 'Ya! CodeAlpha menyediakan sistem turnamen dengan bracket elimination dan leaderboard global. Tim dapat berkompetisi dalam event khusus atau membuat kompetisi custom untuk kelas atau komunitas mereka.'
    },
    {
      question: 'Apakah CodeAlpha benar-benar gratis?',
      answer: 'Ya, CodeAlpha adalah platform pembelajaran gratis sepenuhnya. Semua fitur termasuk misi, turnamen, analytics, dan sistem kolaborasi dapat diakses tanpa biaya apapun. Komitmen kami adalah membuat pendidikan pemrograman dapat diakses oleh semua orang.'
    }
  ];

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-3">
      {faqs.map((faq, index) => (
        <div
          key={index}
          className="reveal-card translate-y-6 opacity-0 border-2 border-stone-700 rounded-lg bg-gradient-to-b from-stone-900 to-stone-800 overflow-hidden"
        >
          <button
            onClick={() => toggleAccordion(index)}
            aria-expanded={openIndex === index}
            aria-controls={`faq-panel-${index}`}
            className="w-full px-4 sm:px-6 py-4 flex items-center justify-between text-left hover:bg-stone-800/50 transition-colors"
          >
            <span className="text-stone-200 font-medium text-sm sm:text-base pr-4">{faq.question}</span>
            <span
              className="text-amber-400 text-xl flex-shrink-0 transform transition-transform duration-200"
              style={{ transform: openIndex === index ? 'rotate(45deg)' : 'rotate(0deg)' }}
              aria-hidden="true"
            >
              ⊕
            </span>
          </button>
          <div
            id={`faq-panel-${index}`}
            role="region"
            aria-labelledby={`faq-button-${index}`}
            className="overflow-hidden transition-all duration-300"
            style={{
              maxHeight: openIndex === index ? '500px' : '0px',
              opacity: openIndex === index ? 1 : 0
            }}
          >
            <div className="px-4 sm:px-6 pb-4 text-stone-300 text-xs sm:text-sm leading-relaxed">
              {faq.answer}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Stats Component
const StatsSection = () => {
  const stats = [
    { value: '10,000+', label: 'Siswa Aktif', icon: '👥' },
    { value: '500+', label: 'Sekolah & Institusi', icon: '🏫' },
    { value: '50,000+', label: 'Misi Diselesaikan', icon: '✨' },
    { value: '100%', label: 'Gratis Selamanya', icon: '🎁' }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {stats.map((stat, index) => (
        <Card
          key={index}
          className="reveal-card translate-y-6 opacity-0 border-2 border-amber-700/50 bg-gradient-to-b from-stone-900 to-amber-950/30 text-center"
        >
          <CardContent className="p-4 sm:p-6">
            <div className="text-2xl sm:text-3xl mb-2" aria-hidden="true">{stat.icon}</div>
            <div className="text-2xl sm:text-3xl font-bold text-amber-300 mb-1">{stat.value}</div>
            <div className="text-xs sm:text-sm text-stone-300">{stat.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Technology Stack Section
const TechStackSection = () => {
  const technologies = [
    {
      category: 'Frontend',
      icon: '⚛️',
      techs: ['React', 'TypeScript', 'Inertia.js', 'Tailwind CSS', 'GSAP Animations'],
      color: 'blue'
    },
    {
      category: 'Backend',
      icon: '🔧',
      techs: ['Laravel', 'MySQL', 'RESTful API', 'Real-time Events', 'WebSocket'],
      color: 'green'
    },
    {
      category: 'Features',
      icon: '✨',
      techs: ['AI Integration', 'Voice Chat', 'Analytics', 'Leaderboards', 'Achievements'],
      color: 'purple'
    }
  ];

  const colorClasses = {
    blue: 'border-blue-700 from-stone-900 to-blue-950/30',
    green: 'border-green-700 from-stone-900 to-green-950/30',
    purple: 'border-purple-700 from-stone-900 to-purple-950/30'
  };

  return (
    <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
      {technologies.map((tech, index) => (
        <Card
          key={index}
          className={`reveal-card translate-y-6 opacity-0 border-2 bg-gradient-to-b ${colorClasses[tech.color as keyof typeof colorClasses]}`}
        >
          <CardHeader className="p-4 sm:p-6 text-center">
            <div className="text-3xl sm:text-4xl mb-2" aria-hidden="true">{tech.icon}</div>
            <CardTitle className="text-amber-300 text-lg sm:text-xl">{tech.category}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <ul className="space-y-2">
              {tech.techs.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-stone-300 text-xs sm:text-sm">
                  <span className="text-amber-400">▸</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Benefits Section for Free Platform
const BenefitsSection = () => {
  const benefits = [
    {
      title: 'Sepenuhnya Gratis',
      description: 'Tidak ada biaya tersembunyi, tidak ada pembatasan fitur, tidak ada upsell. Semua yang Anda butuhkan untuk pembelajaran kolaboratif tersedia tanpa biaya.',
      icon: '💎',
      color: 'amber'
    },
    {
      title: 'Open Source',
      description: 'Kode sumber terbuka dan dapat dikustomisasi sesuai kebutuhan institusi atau komunitas Anda. Kontribusi dari developer disambut!',
      icon: '🔓',
      color: 'green'
    },
    {
      title: 'Berbasis Web',
      description: 'Tidak perlu instalasi, cukup buka browser dan mulai bermain. Kompatibel dengan desktop, tablet, dan smartphone.',
      icon: '🌐',
      color: 'blue'
    },
    {
      title: 'Privasi Terjamin',
      description: 'Data pengguna dilindungi dengan enkripsi. Kami tidak menjual data, tidak ada tracking pihak ketiga, dan mematuhi standar privasi internasional.',
      icon: '🔒',
      color: 'purple'
    },
    {
      title: 'Komunitas Aktif',
      description: 'Bergabung dengan komunitas educator dan developer yang aktif. Dapatkan dukungan, berbagi strategi, dan ikut mengembangkan platform.',
      icon: '🤝',
      color: 'indigo'
    },
    {
      title: 'Update Berkala',
      description: 'Fitur baru, misi tambahan, dan perbaikan bug dirilis secara berkala berdasarkan feedback komunitas dan kebutuhan pembelajaran.',
      icon: '🚀',
      color: 'pink'
    }
  ];

  const colorClasses = {
    amber: 'border-amber-700/50 hover:border-amber-600',
    green: 'border-green-700/50 hover:border-green-600',
    blue: 'border-blue-700/50 hover:border-blue-600',
    purple: 'border-purple-700/50 hover:border-purple-600',
    indigo: 'border-indigo-700/50 hover:border-indigo-600',
    pink: 'border-pink-700/50 hover:border-pink-600'
  };

  return (
    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
      {benefits.map((benefit, index) => (
        <Card
          key={index}
          className={`reveal-card translate-y-6 opacity-0 border-2 bg-gradient-to-b from-stone-900 to-stone-800 transition-all duration-300 ${colorClasses[benefit.color as keyof typeof colorClasses]}`}
        >
          <CardHeader className="p-4 sm:p-6">
            <div className="text-3xl sm:text-4xl mb-3" aria-hidden="true">{benefit.icon}</div>
            <CardTitle className="text-amber-300 text-base sm:text-lg mb-2">{benefit.title}</CardTitle>
            <CardDescription className="text-stone-300 text-xs sm:text-sm leading-relaxed">
              {benefit.description}
            </CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
};

export default function Welcome({ auth }: PageProps) {
  const scope = useRef<HTMLDivElement>(null);

  const DungeonCSS = useMemo(() => (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Inter:wght@400;500&display=swap');

      .font-cinzel { font-family: 'Cinzel', serif; }
      .font-inter { font-family: 'Inter', sans-serif; }

      @keyframes torchFlicker {
        0%, 100% { opacity: 1; filter: brightness(1); }
        25% { opacity: 0.86; filter: brightness(1.12); }
        50% { opacity: 0.75; filter: brightness(0.95); }
        75% { opacity: 0.92; filter: brightness(1.05); }
      }
      @keyframes crystalGlow {
        0%, 100% { box-shadow: 0 0 20px rgba(180, 83, 9, 0.6), 0 0 40px rgba(251, 191, 36, 0.25); }
        50% { box-shadow: 0 0 28px rgba(180, 83, 9, 0.8), 0 0 60px rgba(251, 191, 36, 0.45); }
      }
      @keyframes runeFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      @keyframes float {
        0% { transform: translateY(0); opacity: 0; }
        50% { opacity: 1; }
        100% { transform: translateY(-100vh) translateX(${Math.random() * 30 - 15}vw); opacity: 0; }
      }

      .torch-flicker { animation: torchFlicker 2.2s ease-in-out infinite; }
      .crystal-glow { animation: crystalGlow 3s ease-in-out infinite; }
      .rune-float { animation: runeFloat 3.2s ease-in-out infinite; }
    `}</style>
  ), []);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth < 768) return;

      const { clientX, clientY } = e;
      const xPercent = (clientX / window.innerWidth - 0.5) * 2;
      const yPercent = (clientY / window.innerHeight - 0.5) * 2;

      gsap.to('.mouse-parallax', {
        x: (index, target) => {
          const speed = parseFloat((target as HTMLElement).dataset.speed ?? '0');
          return speed * xPercent * 15;
        },
        y: (index, target) => {
          const speed = parseFloat((target as HTMLElement).dataset.speed ?? '0');
          return speed * yPercent * 15;
        },
        ease: 'power1.out',
        duration: 0.5,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    const ctx = gsap.context(() => {
      gsap.from('.hero-title', { y: 24, opacity: 0, duration: 0.8, ease: 'power3.out' });
      gsap.from('.hero-sub', { y: 18, opacity: 0, duration: 0.7, ease: 'power3.out', delay: 0.05 });
      gsap.from('.hero-cta', { y: 14, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.08, delay: 0.1 });
      gsap.from('.hero-cta > *', { y: 14, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.08, delay: 0.15 });

      if (window.innerWidth >= 768) {
        gsap.to('.bg-parallax', {
          yPercent: 8,
          ease: 'none',
          scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
        });
      }

      ScrollTrigger.batch('.reveal-card', {
        start: 'top 80%',
        onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.12 }),
        onLeaveBack: (batch) => gsap.to(batch, { opacity: 0, y: 24, duration: 0.4, ease: 'power2.in' }),
      });

      gsap.to('.torch-left', { y: -6, repeat: -1, yoyo: true, duration: 2.2, ease: 'sine.inOut' });
      gsap.to('.torch-right', { y: 6, repeat: -1, yoyo: true, duration: 2.4, ease: 'sine.inOut' });
    }, scope);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      ctx.revert();
    };
  }, []);

  return (
    <>
      <Head title="CodeAlpha — Dungeon of Logic" />
      {DungeonCSS}

      <div
        ref={scope}
        className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 text-stone-100 font-inter relative overflow-x-hidden"
      >
        <Motes />

        {/* Navbar */}
        <nav className="sticky border-b-4 border-amber-700 bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 top-0 z-50">
          <div className="absolute top-1 left-2 text-base sm:text-xl torch-flicker torch-left" aria-hidden="true">🔥</div>
          <div className="absolute top-1 right-2 text-base sm:text-xl torch-flicker torch-right" aria-hidden="true">🔥</div>
          <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-amber-300 font-bold text-base sm:text-lg drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] font-cinzel">
                CodeAlpha
              </span>
              <Badge className="bg-stone-700 text-stone-200 border-stone-600 text-xs hidden xs:inline-flex">Dungeon Style</Badge>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 hero-cta">
              {auth?.user ? (
                <Button asChild className="bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-stone-900 text-xs sm:text-sm h-8 sm:h-10 px-3 sm:px-4">
                  <Link href={route('dashboard')}>Dasbor</Link>
                </Button>
              ) : (
                <>
                  <Button variant="outline" asChild className="border-stone-600 text-stone-200 hover:bg-stone-700 hover:text-white focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 focus:ring-offset-stone-900 text-xs sm:text-sm h-8 sm:h-10 px-3 sm:px-4">
                    <Link href={route('login')}>Masuk</Link>
                  </Button>
                  <Button asChild className="bg-amber-600 hover:bg-amber-700 focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-stone-900 text-xs sm:text-sm h-8 sm:h-10 px-3 sm:px-4">
                    <Link href={route('register')}>Daftar</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="relative hero">
          <div className="absolute inset-0 pointer-events-none bg-parallax" />
          <div className="absolute top-3 sm:top-6 left-3 sm:left-6 text-lg sm:text-2xl torch-flicker hidden sm:block" aria-hidden="true">🕯️</div>
          <div className="absolute bottom-3 sm:bottom-6 right-3 sm:right-6 text-lg sm:text-2xl torch-flicker hidden sm:block" aria-hidden="true">🕯️</div>

          <div className="absolute -top-1/4 -left-1/4 h-1/2 w-1/2 rounded-full bg-amber-500/5 blur-3xl mouse-parallax" data-speed="1" aria-hidden="true"></div>
          <div className="absolute -bottom-1/4 -right-1/4 h-1/2 w-1/2 rounded-full bg-blue-500/5 blur-3xl mouse-parallax" data-speed="-1.5" aria-hidden="true"></div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-24 grid lg:grid-cols-2 gap-6 sm:gap-8 items-center">
            <div>
              <Badge className="bg-green-700 text-white border-green-600 text-xs mb-4 inline-flex">🎁 Gratis Selamanya</Badge>
              <h1 className="hero-title text-2xl sm:text-3xl lg:text-5xl font-extrabold text-amber-300 leading-tight font-cinzel">
                Masuki Dungeon Logika, Taklukkan Teka-teki Kolaboratif
              </h1>
              <p className="hero-sub mt-3 sm:mt-4 text-sm sm:text-base text-stone-300">
                CodeAlpha adalah platform pembelajaran interaktif berbasis game yang menggabungkan penelusuran struktur data, sandi, dan debugging dalam misi multi-tahap yang menuntut kolaborasi peran Penjinak dan Pemandu.
              </p>
              <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3 hero-cta">
                <Button asChild className="bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-stone-900 text-xs sm:text-sm h-9 sm:h-10 px-4 sm:px-6">
                  <Link href={route('game.lobby')}>Mulai Petualangan</Link>
                </Button>
                <Button variant="outline" asChild className="border-amber-600 text-amber-200 bg-amber-900/40 hover:bg-amber-800/60 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-stone-900 crystal-glow text-xs sm:text-sm h-9 sm:h-10 px-4 sm:px-6">
                  <a href="#fitur">Jelajahi Fitur</a>
                </Button>
              </div>
            </div>

            <Card
              className="reveal-card translate-y-6 opacity-0 border-2 sm:border-4 border-amber-700 bg-gradient-to-b from-stone-900 to-stone-800 mouse-parallax"
              data-speed="-0.5"
            >
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-amber-300 text-base sm:text-lg">Cuplikan Arena</CardTitle>
                <CardDescription className="text-stone-300 text-xs sm:text-sm">
                  Tantangan disajikan dalam ritual tahap demi tahap
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <PhotoShowcase />
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Social Proof / Stats */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <StatsSection />
        </section>

        {/* Fitur */}
        <section id="fitur" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <h2 className="text-xl sm:text-2xl font-bold text-amber-300 mb-4 sm:mb-6">Fitur Utama</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <Card className="reveal-card translate-y-6 opacity-0 border-2 border-green-700 bg-gradient-to-b from-stone-900 to-green-950/30">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-green-200 text-base sm:text-lg">Misi Multi-Tahap</CardTitle>
                <CardDescription className="text-stone-300 text-xs sm:text-sm">Progress, transisi, dan skor terpandu</CardDescription>
              </CardHeader>
              <CardContent className="text-stone-300 text-xs sm:text-sm p-4 sm:p-6 pt-0">
                Selesaikan rangkaian teka-teki berurutan dengan indikator kemajuan, transisi tahap, dan evaluasi skor agar pengalaman belajar terstruktur serta menantang.
              </CardContent>
            </Card>
            <Card className="reveal-card translate-y-6 opacity-0 border-2 border-blue-700 bg-gradient-to-b from-stone-900 to-blue-950/30">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-blue-200 text-base sm:text-lg">Kolaborasi Peran</CardTitle>
                <CardDescription className="text-stone-300 text-xs sm:text-sm">Penjinak dan Pemandu</CardDescription>
              </CardHeader>
              <CardContent className="text-stone-300 text-xs sm:text-sm p-4 sm:p-6 pt-0">
                Tugas dibagi jelas antara pengambil aksi dan pemberi petunjuk, menumbuhkan komunikasi efektif serta penalaran bersama dalam memecahkan rintangan.
              </CardContent>
            </Card>
            <Card className="reveal-card translate-y-6 opacity-0 border-2 border-purple-700 bg-gradient-to-b from-stone-900 to-purple-950/30 sm:col-span-2 md:col-span-1">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-purple-200 text-base sm:text-lg">Tema Dungeon Imersif</CardTitle>
                <CardDescription className="text-stone-300 text-xs sm:text-sm">Animasi & palet medieval</CardDescription>
              </CardHeader>
              <CardContent className="text-stone-300 text-xs sm:text-sm p-4 sm:p-6 pt-0">
                Palet gelap-hangat dan animasi obor menghadirkan atmosfer fantasi yang konsisten, tanpa mengorbankan keterbacaan dan aksesibilitas antarmuka.
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Cara Kerja */}
        <section id="alur" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <h2 className="text-xl sm:text-2xl font-bold text-amber-300 mb-4 sm:mb-6">Cara Kerja</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {[
              { step: 1, title: '1. Langkah', desc: 'Pilih peran dan masuk lobi', content: 'Buat sesi, bagikan kode tim, dan tugaskan Penjinak serta Pemandu untuk memulai.' },
              { step: 2, title: '2. Langkah', desc: 'Analisis, navigasi, dekripsi', content: 'Tuntaskan modul-modul dengan komunikasi dua arah yang efektif.' },
              { step: 3, title: '3. Langkah', desc: 'Transisi & ringkasan skor', content: 'Sistem memandu ke tahap selanjutnya sambil menampilkan hasil untuk refleksi.' }
            ].map(({ step, title, desc, content }) => (
              <Card key={step} className="reveal-card translate-y-6 opacity-0 border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-stone-200 text-base sm:text-lg">{title}</CardTitle>
                  <CardDescription className="text-stone-300 text-xs sm:text-sm">{desc}</CardDescription>
                </CardHeader>
                <CardContent className="text-stone-300 text-xs sm:text-sm p-4 sm:p-6 pt-0">
                  {content}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Benefits - Why Free */}
        <section id="benefits" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-amber-300 mb-2">Mengapa CodeAlpha Gratis?</h2>
            <p className="text-stone-300 text-sm sm:text-base max-w-2xl mx-auto">
              Kami percaya pendidikan pemrograman berkualitas harus dapat diakses oleh semua orang, tanpa hambatan finansial
            </p>
          </div>
          <BenefitsSection />
        </section>

        {/* Tech Stack */}
        <section id="tech" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-amber-300 mb-2">Teknologi Modern & Andal</h2>
            <p className="text-stone-300 text-sm sm:text-base">Dibangun dengan stack teknologi terkini untuk performa optimal</p>
          </div>
          <TechStackSection />
        </section>

        {/* Testimoni */}
        <section id="testimoni" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <h2 className="text-xl sm:text-2xl font-bold text-amber-300 mb-4 sm:mb-6">Apa Kata Mereka</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {[
              { name: 'Alya', role: 'Siswa SMA', quote: 'Kolaborasi jadi inti—teka-teki memaksa kami berpikir bersama dan berkomunikasi dengan efektif.' },
              { name: 'Bima', role: 'Mahasiswa Informatika', quote: 'Tema dungeon bikin fokus dan tegang tapi seru; UI tetap jelas dan mudah dipahami.' },
              { name: 'Citra', role: 'Guru Komputer', quote: 'Gratis tapi kualitasnya luar biasa! Siswa jadi lebih antusias belajar struktur data.' },
            ].map((t, i) => (
              <Card key={i} className="reveal-card translate-y-6 opacity-0 border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800">
                <CardContent className="p-4 sm:p-5">
                  <p className="text-stone-300 italic text-xs sm:text-sm mb-3">"{t.quote}"</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-700/50 flex items-center justify-center text-amber-300 font-bold">
                      {t.name[0]}
                    </div>
                    <div>
                      <div className="text-stone-200 font-medium text-xs sm:text-sm">{t.name}</div>
                      <div className="text-stone-400 text-xs">{t.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-amber-300 mb-2">Pertanyaan yang Sering Diajukan</h2>
            <p className="text-stone-300 text-sm sm:text-base">Temukan jawaban untuk pertanyaan umum tentang CodeAlpha</p>
          </div>
          <div className="max-w-4xl mx-auto">
            <FAQAccordion />
          </div>
        </section>

        {/* CTA */}
        <section id="cta" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-amber-300 hero-title">Siap Memulai Ritual Pertama?</h2>
          <p className="mt-2 sm:mt-3 text-stone-300 hero-sub text-sm sm:text-base max-w-2xl mx-auto">
            Tantang kemampuan analitis dan kerja sama tim dalam dungeon yang menuntut strategi dan komunikasi. 100% gratis, tidak ada kartu kredit diperlukan.
          </p>
          <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 hero-cta">
            <Button asChild className="bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-stone-900 rune-float text-sm sm:text-base h-10 sm:h-11 px-6 sm:px-8 w-full sm:w-auto">
              <Link href={route('game.lobby')}>Masuk ke Lobi</Link>
            </Button>
            {!auth?.user && (
              <Button asChild variant="outline" className="border-stone-600 text-stone-200 hover:bg-stone-700 hover:text-white focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 focus:ring-offset-stone-900 text-sm sm:text-base h-10 sm:h-11 px-6 sm:px-8 w-full sm:w-auto">
                <Link href={route('register')}>Bergabung Sekarang</Link>
              </Button>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t-4 border-amber-700 bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="grid md:grid-cols-4 gap-6 sm:gap-8 mb-8">
              <div>
                <h3 className="text-amber-300 font-bold text-base sm:text-lg mb-3 font-cinzel">CodeAlpha</h3>
                <p className="text-stone-400 text-xs sm:text-sm mb-3">
                  Platform pembelajaran interaktif berbasis game untuk menguasai logika pemrograman.
                </p>
                <Badge className="bg-green-700 text-white border-green-600 text-xs">🎁 Gratis Selamanya</Badge>
              </div>
              <div>
                <h4 className="text-stone-200 font-medium text-sm sm:text-base mb-3">Produk</h4>
                <ul className="space-y-2 text-xs sm:text-sm">
                  <li><a href="#fitur" className="text-stone-400 hover:text-amber-300 transition-colors">Fitur</a></li>
                  <li><a href="#benefits" className="text-stone-400 hover:text-amber-300 transition-colors">Keunggulan</a></li>
                  <li><a href={route('game.lobby')} className="text-stone-400 hover:text-amber-300 transition-colors">Mulai Game</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-stone-200 font-medium text-sm sm:text-base mb-3">Sumber Daya</h4>
                <ul className="space-y-2 text-xs sm:text-sm">
                  <li><a href="#alur" className="text-stone-400 hover:text-amber-300 transition-colors">Cara Kerja</a></li>
                  <li><a href="#testimoni" className="text-stone-400 hover:text-amber-300 transition-colors">Testimoni</a></li>
                  <li><a href="#faq" className="text-stone-400 hover:text-amber-300 transition-colors">FAQ</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-stone-200 font-medium text-sm sm:text-base mb-3">Dukungan</h4>
                <ul className="space-y-2 text-xs sm:text-sm">
                  <li><a href="#" className="text-stone-400 hover:text-amber-300 transition-colors">Kontak</a></li>
                  <li><a href="#" className="text-stone-400 hover:text-amber-300 transition-colors">Dokumentasi</a></li>
                  <li><a href="#" className="text-stone-400 hover:text-amber-300 transition-colors">Komunitas</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-stone-700 pt-6 text-center">
              <div className="text-stone-400 text-xs sm:text-sm">© {new Date().getFullYear()} CodeAlpha — Semua hak dilindungi</div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
