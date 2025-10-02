import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useEffect, useRef, useCallback, memo } from 'react';
import { gsap } from 'gsap';

// shadcn/ui
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { Separator } from '@/Components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import React from 'react';

// ============================================
// CONSTANTS & CONFIGURATIONS
// ============================================
const CONFIG = {
  TORCH_FLICKER_INTERVAL: 2200,
  CRYSTAL_GLOW_DURATION: 3000,
  RUNE_FLOAT_DURATION: 3200,
  MOBILE_MENU_ANIMATION_DURATION: 0.3,
} as const;

// ============================================
// TYPE DEFINITIONS
// ============================================
interface Props extends PropsWithChildren {
  header?: ReactNode;
}

// ============================================
// CUSTOM HOOKS
// ============================================
const useDungeonAtmosphere = () => {
  const torchRefs = useRef<(HTMLElement | null)[]>([]);
  const brandRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Torch flicker animation
    const torchInterval = setInterval(() => {
      torchRefs.current.forEach((torch) => {
        if (torch) {
          gsap.to(torch, {
            opacity: Math.random() * 0.14 + 0.86,
            filter: `brightness(${Math.random() * 0.17 + 0.95})`,
            duration: 0.22,
            ease: 'power1.inOut',
          });
        }
      });
    }, CONFIG.TORCH_FLICKER_INTERVAL);

    // Brand float animation
    if (brandRef.current) {
      gsap.to(brandRef.current, {
        y: -6,
        duration: CONFIG.RUNE_FLOAT_DURATION / 1000,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }

    return () => clearInterval(torchInterval);
  }, []);

  const setTorchRef = (index: number) => (el: HTMLSpanElement | null) => {
    torchRefs.current[index] = el;
  };

  return { brandRef, setTorchRef };
};

const useMobileMenu = () => {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mobileMenuRef.current) {
      if (mobileOpen) {
        gsap.fromTo(
          mobileMenuRef.current,
          {
            opacity: 0,
            y: -10,
            height: 0,
          },
          {
            opacity: 1,
            y: 0,
            height: 'auto',
            duration: CONFIG.MOBILE_MENU_ANIMATION_DURATION,
            ease: 'power2.out',
          }
        );
      }
    }
  }, [mobileOpen]);

  const toggleMobileMenu = useCallback(() => {
    setMobileOpen((v) => !v);
  }, []);

  return { mobileOpen, mobileMenuRef, toggleMobileMenu };
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
const isActive = (pattern: string): boolean => {
  try {
    return (window as any).route().current(pattern);
  } catch {
    return false;
  }
};

// ============================================
// MEMOIZED COMPONENTS
// ============================================
const NavLink = memo(
  ({
    href,
    active,
    children,
    className = '',
  }: {
    href: string;
    active: boolean;
    children: ReactNode;
    className?: string;
  }) => (
    <Link
      href={href}
      className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 border ${
        active
          ? 'bg-amber-900/40 text-amber-300 border-amber-700 dungeon-card-glow'
          : 'hover:bg-stone-800 text-stone-200 border-stone-700 hover:border-amber-700/50'
      } ${className}`}
    >
      {children}
    </Link>
  )
);

NavLink.displayName = 'NavLink';

const MobileNavLink = memo(
  ({ href, active, children }: { href: string; active: boolean; children: ReactNode }) => (
    <Link
      href={href}
      className={`block rounded-md px-3 py-2 text-sm font-medium border transition-all duration-300 ${
        active
          ? 'bg-amber-900/40 text-amber-300 border-amber-700'
          : 'text-stone-200 border-stone-700 hover:bg-stone-800 hover:border-amber-700/50'
      }`}
    >
      {children}
    </Link>
  )
);

MobileNavLink.displayName = 'MobileNavLink';

const UserDropdown = memo(({ user }: { user: any }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        className="text-stone-200 hover:text-amber-300 hover:bg-stone-800/60 transition-all duration-300"
      >
        <span className="flex items-center gap-2">
          <span className="hidden sm:inline">{user?.name}</span>
          <span className="sm:hidden">👤</span>
          <span className="text-xs">⌄</span>
        </span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      align="end"
      className="min-w-56 border-2 border-stone-700 bg-stone-900 text-stone-200 backdrop-blur-sm"
    >
      <div className="px-3 py-2">
        <div className="text-sm font-medium text-amber-300">{user?.name}</div>
        <div className="text-xs text-stone-400">{user?.email}</div>
      </div>
      <DropdownMenuSeparator className="bg-stone-700" />
      <DropdownMenuItem asChild>
        <Link
          href={route('profile.edit')}
          className="w-full cursor-pointer hover:bg-stone-800 transition-colors"
        >
          👤 Profil
        </Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator className="bg-stone-700" />
      <DropdownMenuItem asChild>
        <Link
          href={route('logout')}
          method="post"
          as="button"
          className="w-full cursor-pointer text-red-300 hover:bg-red-950/40 transition-colors"
        >
          🚪 Keluar
        </Link>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
));

UserDropdown.displayName = 'UserDropdown';

// ============================================
// MAIN COMPONENT
// ============================================
export default function Authenticated({ header, children }: Props) {
  const user = (usePage().props as any).auth.user;
  const { brandRef, setTorchRef } = useDungeonAtmosphere();
  const { mobileOpen, mobileMenuRef, toggleMobileMenu } = useMobileMenu();

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 text-stone-100">
      {/* Navbar */}
      <nav className="relative border-b-4 border-amber-700 bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 shadow-xl">
        {/* Decorative Torches */}
        <div className="absolute top-1 left-2 text-lg sm:text-xl select-none">
          <span ref={setTorchRef(0)} className="dungeon-torch-flicker">
            🔥
          </span>
        </div>
        <div className="absolute top-1 right-2 text-lg sm:text-xl select-none">
          <span ref={setTorchRef(1)} className="dungeon-torch-flicker">
            🔥
          </span>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Left: Brand + Desktop Nav */}
            <div className="flex items-center gap-4 sm:gap-6">
              <Link href="/" className="flex items-center gap-2 relative z-10">
                <span
                  ref={brandRef}
                  className="text-lg sm:text-xl md:text-2xl font-semibold text-amber-300 dungeon-crystal-glow dungeon-glow-text"
                >
                  CodeAlpha Dungeon
                </span>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden sm:flex items-center gap-3 md:gap-4">
                <NavLink href={route('dashboard')} active={isActive('dashboard')}>
                  🏰 Dasbor
                </NavLink>

                <NavLink href={route('game.lobby')} active={isActive('game.*')}>
                  🎮 Gim
                </NavLink>
              </div>
            </div>

            {/* Right: User Menu (Desktop) + Mobile Toggle */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:block">
                <UserDropdown user={user} />
              </div>

              {/* Mobile Menu Toggle */}
              <Button
                variant="outline"
                onClick={toggleMobileMenu}
                className="sm:hidden border-stone-700 text-stone-200 hover:bg-stone-800/60 transition-all duration-300"
                aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'}
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? '✕' : '☰'}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div ref={mobileMenuRef} className="sm:hidden">
            <Card className="mx-2 mb-3 border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800 backdrop-blur-sm">
              <div className="space-y-1 p-3">
                <MobileNavLink href={route('dashboard')} active={isActive('dashboard')}>
                  🏰 Dasbor
                </MobileNavLink>
                <MobileNavLink href={route('game.lobby')} active={isActive('game.*')}>
                  🎮 Gim
                </MobileNavLink>
              </div>

              <Separator className="bg-stone-700" />

              <div className="p-3">
                <div className="px-2 mb-3">
                  <div className="text-base font-medium text-amber-300">{user?.name}</div>
                  <div className="text-sm text-stone-400">{user?.email}</div>
                </div>
                <div className="space-y-2">
                  <Link
                    href={route('profile.edit')}
                    className="block rounded-md px-3 py-2 text-sm font-medium text-stone-200 border border-stone-700 hover:bg-stone-800 hover:border-amber-700/50 transition-all duration-300"
                  >
                    👤 Profil
                  </Link>
                  <Link
                    href={route('logout')}
                    method="post"
                    as="button"
                    className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-red-300 border border-red-700 hover:bg-red-950 transition-all duration-300"
                  >
                    🚪 Keluar
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        )}
      </nav>

      {/* Page Header (Optional) */}
      {header && (
        <header className="border-b-4 border-amber-700 bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 shadow-lg">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{header}</div>
        </header>
      )}

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>

      {/* ========================================
          CUSTOM DUNGEON STYLES
          ======================================== */}
      <style>{`
        /* Torch Flicker */
        .dungeon-torch-flicker {
          display: inline-block;
        }

        /* Crystal Glow */
        .dungeon-crystal-glow {
          animation: crystalGlow 3s ease-in-out infinite;
        }

        @keyframes crystalGlow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(180, 83, 9, 0.6), 0 0 40px rgba(251, 191, 36, 0.25);
          }
          50% {
            box-shadow: 0 0 28px rgba(180, 83, 9, 0.8), 0 0 60px rgba(251, 191, 36, 0.45);
          }
        }

        /* Card Glow */
        .dungeon-card-glow {
          box-shadow: 0 0 15px rgba(251, 191, 36, 0.3);
        }

        /* Text Glow */
        .dungeon-glow-text {
          text-shadow: 0 0 20px rgba(251, 191, 36, 0.6), 0 0 40px rgba(251, 191, 36, 0.4);
        }

        /* Smooth Scrolling */
        html {
          scroll-behavior: smooth;
        }

        /* Custom Scrollbar */
        ::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(28, 25, 23, 0.5);
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(180, 83, 9, 0.6);
          border-radius: 5px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: rgba(180, 83, 9, 0.8);
        }

        /* Responsive Adjustments */
        @media (max-width: 768px) {
          .dungeon-crystal-glow {
            animation-duration: 4s;
          }
        }
      `}</style>
    </div>
  );
}
