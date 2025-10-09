import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { useLayoutEffect, useMemo, useRef } from 'react';

// shadcn/ui (gunakan path yang konsisten dengan struktur proyek)
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';

// GSAP
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Showcase foto (galeri animasi dari public/images)
import PhotoShowcase from '@/Components/PhotoShowcase';

// Partikel magis untuk latar belakang
const Motes = () => (
  <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
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

export default function Welcome({
  auth,
  laravelVersion,
  phpVersion,
}: PageProps<{ laravelVersion: string; phpVersion: string }>) {
  const scope = useRef<HTMLDivElement>(null);

  const DungeonCSS = useMemo(() => (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Inter:wght@400;500&display=swap');

      .font-cinzel { font-family: 'Cinzel', serif; }
      .font-inter { font-family: 'Inter', sans-serif; }

      @keyframes torchFlicker { 0%,100%{opacity:1;filter:brightness(1)} 25%{opacity:.86;filter:brightness(1.12)} 50%{opacity:.75;filter:brightness(.95)} 75%{opacity:.92;filter:brightness(1.05)} }
      @keyframes crystalGlow { 0%,100%{box-shadow:0 0 20px rgba(180,83,9,.6),0 0 40px rgba(251,191,36,.25)} 50%{box-shadow:0 0 28px rgba(180,83,9,.8),0 0 60px rgba(251,191,36,.45)} }
      @keyframes runeFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
      @keyframes float { 0% { transform: translateY(0); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(-100vh) translateX(${Math.random() * 30 - 15}vw); opacity: 0; } }

      .torch-flicker { animation: torchFlicker 2.2s ease-in-out infinite; }
      .crystal-glow { animation: crystalGlow 3s ease-in-out infinite; }
      .rune-float { animation: runeFloat 3.2s ease-in-out infinite; }
    `}</style>
  ), []);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const handleMouseMove = (e: MouseEvent) => {
      // Disable parallax on mobile for better performance
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
      // Hero entrance
      gsap.from('.hero-title', { y: 24, opacity: 0, duration: 0.8, ease: 'power3.out' });
      gsap.from('.hero-sub', { y: 18, opacity: 0, duration: 0.7, ease: 'power3.out', delay: 0.05 });
      gsap.from('.hero-cta', { y: 14, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.08, delay: 0.1 });
      gsap.from('.hero-cta > *', { y: 14, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.08, delay: 0.15 });

      // Parallax ringan (disabled on mobile)
      if (window.innerWidth >= 768) {
        gsap.to('.bg-parallax', {
          yPercent: 8,
          ease: 'none',
          scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
        });
      }

      // Scroll reveal efisien untuk kartu-kartu
      ScrollTrigger.batch('.reveal-card', {
        start: 'top 80%',
        onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.12 }),
        onLeaveBack: (batch) => gsap.to(batch, { opacity: 0, y: 24, duration: 0.4, ease: 'power2.in' }),
      });

      // Torch micro-motion
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
        <nav className="relative border-b-4 border-amber-700 bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950">
          <div className="absolute top-1 left-2 text-base sm:text-xl torch-flicker torch-left">🔥</div>
          <div className="absolute top-1 right-2 text-base sm:text-xl torch-flicker torch-right">🔥</div>
          <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-amber-300 font-bold text-base sm:text-lg drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] font-cinzel">
                CodeAlpha
              </span>
              <Badge className="bg-stone-700 text-stone-200 border-stone-600 text-xs hidden xs:inline-flex">Dungeon Style</Badge>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 hero-cta">
              {auth?.user ? (
                <Button asChild className="bg-indigo-700 hover:bg-indigo-600 text-xs sm:text-sm h-8 sm:h-10 px-3 sm:px-4">
                  <Link href={route('dashboard')}>Dasbor</Link>
                </Button>
              ) : (
                <>
                  <Button variant="outline" asChild className="border-stone-700 text-stone-200 hover:bg-stone-800/60 text-xs sm:text-sm h-8 sm:h-10 px-3 sm:px-4">
                    <Link href={route('login')}>Masuk</Link>
                  </Button>
                  <Button asChild className="bg-amber-700 hover:bg-amber-600 text-xs sm:text-sm h-8 sm:h-10 px-3 sm:px-4">
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
          <div className="absolute top-3 sm:top-6 left-3 sm:left-6 text-lg sm:text-2xl torch-flicker hidden sm:block">🕯️</div>
          <div className="absolute bottom-3 sm:bottom-6 right-3 sm:right-6 text-lg sm:text-2xl torch-flicker hidden sm:block">🕯️</div>

          {/* Parallax background glow */}
          <div className="absolute -top-1/4 -left-1/4 h-1/2 w-1/2 rounded-full bg-amber-500/5 blur-3xl mouse-parallax" data-speed="1"></div>
          <div className="absolute -bottom-1/4 -right-1/4 h-1/2 w-1/2 rounded-full bg-indigo-500/5 blur-3xl mouse-parallax" data-speed="-1.5"></div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-24 grid lg:grid-cols-2 gap-6 sm:gap-8 items-center">
            <div>
              <h1 className="hero-title text-2xl sm:text-3xl lg:text-5xl font-extrabold text-amber-300 leading-tight font-cinzel">
                Masuki Dungeon Logika, Taklukkan Teka-teki Kolaboratif
              </h1>
              <p className="hero-sub mt-3 sm:mt-4 text-sm sm:text-base text-stone-300">
                CodeAlpha adalah arena pembelajaran interaktif bertema dungeon, menggabungkan penelusuran struktur data, sandi, dan debugging dalam misi multi-tahap yang menuntut kolaborasi peran Penjinak dan Pemandu.
              </p>
              <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3 hero-cta">
                <Button asChild className="bg-emerald-700 hover:bg-emerald-600 text-xs sm:text-sm h-9 sm:h-10 px-4 sm:px-6">
                  <Link href={route('game.lobby')}>Mulai Petualangan</Link>
                </Button>
                <Button variant="outline" asChild className="border-amber-700 text-crystal-glow text-amber-200 bg-amber-800 hover:bg-amber-800/60 text-xs sm:text-sm h-9 sm:h-10 px-4 sm:px-6">
                  <a href="#fitur">Jelajahi Fitur</a>
                </Button>
              </div>
              <div className="mt-4 sm:mt-6 flex items-center gap-2 text-xs sm:text-sm text-stone-400">
                <span>Laravel v{laravelVersion}</span>
                <span>•</span>
                <span>PHP v{phpVersion}</span>
              </div>
            </div>

            {/* Cuplikan Arena memakai PhotoShowcase */}
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

        {/* Fitur */}
        <section id="fitur" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <h2 className="text-xl sm:text-2xl font-bold text-amber-300 mb-4 sm:mb-6">Fitur Utama</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <Card className="reveal-card translate-y-6 opacity-0 border-2 border-emerald-700 bg-gradient-to-b from-stone-900 to-emerald-950">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-emerald-200 text-base sm:text-lg">Misi Multi-Tahap</CardTitle>
                <CardDescription className="text-stone-300 text-xs sm:text-sm">Progress, transisi, dan skor terpandu</CardDescription>
              </CardHeader>
              <CardContent className="text-stone-300 text-xs sm:text-sm p-4 sm:p-6 pt-0">
                Selesaikan rangkaian teka-teki berurutan dengan indikator kemajuan, transisi tahap, dan evaluasi skor agar pengalaman belajar terstruktur serta menantang.
              </CardContent>
            </Card>
            <Card className="reveal-card translate-y-6 opacity-0 border-2 border-indigo-700 bg-gradient-to-b from-stone-900 to-indigo-950">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-indigo-200 text-base sm:text-lg">Kolaborasi Peran</CardTitle>
                <CardDescription className="text-stone-300 text-xs sm:text-sm">Penjinak dan Pemandu</CardDescription>
              </CardHeader>
              <CardContent className="text-stone-300 text-xs sm:text-sm p-4 sm:p-6 pt-0">
                Tugas dibagi jelas antara pengambil aksi dan pemberi petunjuk, menumbuhkan komunikasi efektif serta penalaran bersama dalam memecahkan rintangan.
              </CardContent>
            </Card>
            <Card className="reveal-card translate-y-6 opacity-0 border-2 border-purple-700 bg-gradient-to-b from-stone-900 to-purple-950 sm:col-span-2 md:col-span-1">
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
            {[1, 2, 3].map((n) => (
              <Card key={n} className="reveal-card translate-y-6 opacity-0 border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-stone-200 text-base sm:text-lg">{n}. Langkah</CardTitle>
                  <CardDescription className="text-stone-300 text-xs sm:text-sm">
                    {n === 1 ? 'Pilih peran dan masuk lobi' : n === 2 ? 'Analisis, navigasi, dekripsi' : 'Transisi & ringkasan skor'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-stone-300 text-xs sm:text-sm p-4 sm:p-6 pt-0">
                  {n === 1
                    ? 'Buat sesi, bagikan kode tim, dan tugaskan Penjinak serta Pemandu untuk memulai.'
                    : n === 2
                    ? 'Tuntaskan modul-modul dengan komunikasi dua arah yang efektif.'
                    : 'Sistem memandu ke tahap selanjutnya sambil menampilkan hasil untuk refleksi.'}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Testimoni */}
        <section id="testimoni" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <h2 className="text-xl sm:text-2xl font-bold text-amber-300 mb-4 sm:mb-6">Apa Kata Mereka</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {[
              { name: 'Alya', quote: 'Kolaborasi jadi inti—teka-teki memaksa kami berpikir bersama.' },
              { name: 'Bima', quote: 'Tema dungeon bikin fokus dan tegang tapi seru; UI tetap jelas.' },
              { name: 'Citra', quote: 'Transisi tahap rapi, skor membantu refleksi strategi tim.' },
            ].map((t, i) => (
              <Card key={i} className="reveal-card translate-y-6 opacity-0 border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800">
                <CardContent className="p-4 sm:p-5">
                  <p className="text-stone-300 italic text-xs sm:text-sm">"{t.quote}"</p>
                  <div className="mt-2 sm:mt-3 text-stone-200 font-medium text-xs sm:text-sm">— {t.name}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section id="cta" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-amber-300 hero-title">Siap Memulai Ritual Pertama?</h2>
          <p className="mt-2 sm:mt-3 text-stone-300 hero-sub text-sm sm:text-base max-w-2xl mx-auto">Tantang kemampuan analitis dan kerja sama tim dalam dungeon yang menuntut strategi dan komunikasi.</p>
          <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 hero-cta">
            <Button asChild className="bg-emerald-700 hover:bg-emerald-600 rune-float text-sm sm:text-base h-10 sm:h-11 px-6 sm:px-8 w-full sm:w-auto">
              <Link href={route('game.lobby')}>Masuk ke Lobi</Link>
            </Button>
            {!auth?.user && (
              <Button asChild variant="outline" className="border-stone-700 text-stone-200 hover:bg-stone-800/60 text-sm sm:text-base h-10 sm:h-11 px-6 sm:px-8 w-full sm:w-auto">
                <Link href={route('register')}>Bergabung Sekarang</Link>
              </Button>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t-4 border-amber-700 bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="text-stone-300 text-xs sm:text-sm text-center md:text-left">© {new Date().getFullYear()} CodeAlpha — Semua hak dilindungi</div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-stone-400">
              <span>Laravel v{laravelVersion}</span>
              <span>•</span>
              <span>PHP v{phpVersion}</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
