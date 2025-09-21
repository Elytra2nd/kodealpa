import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useMemo, useState } from 'react';

// shadcn/ui
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { Separator } from '@/Components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/Components/ui/dropdown-menu';

export default function Authenticated({
  header,
  children,
}: PropsWithChildren<{ header?: ReactNode }>) {
  const user = (usePage().props as any).auth.user;
  const [mobileOpen, setMobileOpen] = useState(false);

  // Animasi & tema dungeon
  const DungeonCSS = useMemo(() => (
    <style>{`
      @keyframes torchFlicker { 0%,100%{opacity:1;filter:brightness(1)} 25%{opacity:.86;filter:brightness(1.12)} 50%{opacity:.75;filter:brightness(.95)} 75%{opacity:.92;filter:brightness(1.05)} }
      @keyframes crystalGlow { 0%,100%{box-shadow:0 0 20px rgba(180,83,9,.6),0 0 40px rgba(251,191,36,.25)} 50%{box-shadow:0 0 28px rgba(180,83,9,.8),0 0 60px rgba(251,191,36,.45)} }
      @keyframes runeFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
      .torch-flicker { animation: torchFlicker 2.2s ease-in-out infinite; }
      .crystal-glow { animation: crystalGlow 3s ease-in-out infinite; }
      .rune-float { animation: runeFloat 3.2s ease-in-out infinite; }
    `}</style>
  ), []);

  const isActive = (pattern: string) => {
    try { return (window as any).route().current(pattern); } catch { return false; }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 text-stone-100">
      {DungeonCSS}
      {/* Navbar */}
      <nav className="relative border-b-4 border-amber-700 bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950">
        <div className="absolute top-1 left-2 text-xl torch-flicker">🔥</div>
        <div className="absolute top-1 right-2 text-xl torch-flicker">🔥</div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Kiri: Brand + Nav Desktop */}
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2">
                {/* Hilangkan ApplicationLogo, gunakan teks brand */}
                <span className="text-xl sm:text-2xl font-semibold text-amber-300 crystal-glow rune-float">
                  CodeAlpha Dungeon
                </span>
              </Link>

              <div className="hidden sm:flex items-center gap-4">
                <Link
                  href={route('dashboard')}
                  className={[
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors border',
                    isActive('dashboard')
                      ? 'bg-amber-900/40 text-amber-300 border-amber-700'
                      : 'hover:bg-stone-800 text-stone-200 border-stone-700'
                  ].join(' ')}
                >
                  Dasbor
                </Link>

                <Link
                  href={route('game.lobby')}
                  className={[
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors border',
                    isActive('game.*')
                      ? 'bg-amber-900/40 text-amber-300 border-amber-700'
                      : 'hover:bg-stone-800 text-stone-200 border-stone-700'
                  ].join(' ')}
                >
                  🎮 Gim
                </Link>
              </div>
            </div>

            {/* Kanan: Menu User (Desktop) */}
            <div className="hidden sm:flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-stone-200 hover:text-amber-300">
                    {user?.name}
                    <span className="ml-2">⌄</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-56 border-stone-700 bg-stone-900 text-stone-200">
                  <div className="px-2 py-2">
                    <div className="text-sm font-medium">{user?.name}</div>
                    <div className="text-xs text-stone-400">{user?.email}</div>
                  </div>
                  <DropdownMenuSeparator className="bg-stone-700" />
                  <DropdownMenuItem asChild>
                    <Link href={route('profile.edit')} className="w-full cursor-pointer">
                      Profil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-stone-700" />
                  <DropdownMenuItem asChild>
                    {/* Logout Inertia method POST */}
                    <Link href={route('logout')} method="post" as="button" className="w-full cursor-pointer text-red-300">
                      Keluar
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Toggle Mobile (hidden di desktop) */}
              <Button
                variant="outline"
                onClick={() => setMobileOpen(v => !v)}
                className="sm:hidden border-stone-700 text-stone-200 hover:bg-stone-800/60"
                aria-label="Buka menu"
              >
                ☰
              </Button>
            </div>

            {/* Kanan: Tombol Mobile */}
            <div className="sm:hidden">
              <Button
                variant="outline"
                onClick={() => setMobileOpen(v => !v)}
                className="border-stone-700 text-stone-200 hover:bg-stone-800/60"
                aria-label="Buka menu"
              >
                {mobileOpen ? '✕' : '☰'}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={(mobileOpen ? 'block' : 'hidden') + ' sm:hidden'}>
          <Card className="mx-2 mb-3 border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800">
            <div className="space-y-1 p-3">
              <Link
                href={route('dashboard')}
                className={[
                  'block rounded-md px-3 py-2 text-sm font-medium border',
                  isActive('dashboard')
                    ? 'bg-amber-900/40 text-amber-300 border-amber-700'
                    : 'text-stone-200 border-stone-700 hover:bg-stone-800'
                ].join(' ')}
              >
                Dasbor
              </Link>
              <Link
                href={route('game.lobby')}
                className={[
                  'block rounded-md px-3 py-2 text-sm font-medium border',
                  isActive('game.*')
                    ? 'bg-amber-900/40 text-amber-300 border-amber-700'
                    : 'text-stone-200 border-stone-700 hover:bg-stone-800'
                ].join(' ')}
              >
                🎮 Gim
              </Link>
            </div>

            <Separator className="bg-stone-700" />

            <div className="p-3">
              <div className="px-2">
                <div className="text-base font-medium text-amber-300">{user?.name}</div>
                <div className="text-sm text-stone-400">{user?.email}</div>
              </div>
              <div className="mt-3 space-y-1">
                <Link
                  href={route('profile.edit')}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-stone-200 border border-stone-700 hover:bg-stone-800"
                >
                  Profil
                </Link>
                <Link
                  href={route('logout')}
                  method="post"
                  as="button"
                  className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-red-300 border border-red-700 hover:bg-red-950"
                >
                  Keluar
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </nav>

      {/* Header halaman opsional (tidak ganda, hanya tampil jika prop header di-passing) */}
      {header && (
        <header className="border-b-4 border-amber-700 bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {header}
          </div>
        </header>
      )}

      {/* Konten utama */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
