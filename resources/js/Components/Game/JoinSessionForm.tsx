import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { gameApi } from '@/services/gameApi';
import { gsap } from 'gsap';

// ============================================
// CONSTANTS & CONFIGURATIONS
// ============================================
const CONFIG = {
  TEAM_CODE_LENGTH: 6,
  MAX_NICKNAME_LENGTH: 32,
  MIN_NICKNAME_LENGTH: 2,
  TEAM_CODE_REGEX: /[^A-Z0-9]/g,
  TORCH_FLICKER_INTERVAL: 2200,
  ENTRANCE_DURATION: 0.8,
} as const;

const ROLE_CONFIG = {
  defuser: {
    icon: '💣',
    title: 'Penjinakan Bom',
    description: 'Anda melihat perangkat berbahaya dan mendeskripsikannya kepada Ahli Grimoire.',
    color: 'red',
    gradient: 'from-red-600 to-red-700',
    hoverGradient: 'hover:from-red-700 hover:to-red-800',
    borderColor: 'border-red-500',
    bgColor: 'bg-red-950/40',
  },
  expert: {
    icon: '📖',
    title: 'Ahli Grimoire',
    description: 'Anda memiliki manual kuno dan membimbing Penjinakan dengan bijaksana.',
    color: 'blue',
    gradient: 'from-blue-600 to-blue-700',
    hoverGradient: 'hover:from-blue-700 hover:to-blue-800',
    borderColor: 'border-blue-500',
    bgColor: 'bg-blue-950/40',
  },
} as const;

// ============================================
// TYPE DEFINITIONS
// ============================================
interface FormData {
  teamCode: string;
  role: 'defuser' | 'expert' | '';
  nickname: string;
}

interface FormErrors {
  teamCode?: string;
  role?: string;
  nickname?: string;
  general?: string;
}

// ============================================
// CUSTOM HOOKS
// ============================================
const useDungeonAtmosphere = () => {
  const torchRefs = useRef<(HTMLElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Torch flicker animation
    const torchInterval = setInterval(() => {
      torchRefs.current.forEach((torch) => {
        if (torch) {
          gsap.to(torch, {
            opacity: Math.random() * 0.15 + 0.85,
            duration: 0.22,
            ease: 'power1.inOut',
          });
        }
      });
    }, CONFIG.TORCH_FLICKER_INTERVAL);

    // Container entrance animation
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        {
          opacity: 0,
          y: 30,
          scale: 0.95,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: CONFIG.ENTRANCE_DURATION,
          ease: 'back.out(1.4)',
        }
      );
    }

    return () => clearInterval(torchInterval);
  }, []);

  const setTorchRef = (index: number) => (el: HTMLSpanElement | null) => {
    torchRefs.current[index] = el;
  };

  return { containerRef, setTorchRef };
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function JoinSessionForm() {
  const { containerRef, setTorchRef } = useDungeonAtmosphere();

  const [formData, setFormData] = useState<FormData>({
    teamCode: '',
    role: '',
    nickname: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Validasi form
  const validateForm = useCallback((): FormErrors => {
    const newErrors: FormErrors = {};

    if (!formData.teamCode) {
      newErrors.teamCode = 'Kode guild wajib diisi untuk memasuki dungeon';
    } else if (formData.teamCode.length !== CONFIG.TEAM_CODE_LENGTH) {
      newErrors.teamCode = `Kode guild harus ${CONFIG.TEAM_CODE_LENGTH} karakter rune kuno`;
    }

    if (!formData.role) {
      newErrors.role = 'Pilih kelas petualang Anda';
    }

    if (!formData.nickname.trim()) {
      newErrors.nickname = 'Nama petualang wajib diisi';
    } else if (formData.nickname.trim().length < CONFIG.MIN_NICKNAME_LENGTH) {
      newErrors.nickname = `Nama petualang minimal ${CONFIG.MIN_NICKNAME_LENGTH} karakter`;
    }

    return newErrors;
  }, [formData]);

  // Cek apakah form valid
  const isFormValid = useMemo(() => {
    const validationErrors = validateForm();
    return Object.keys(validationErrors).length === 0;
  }, [validateForm]);

  // Handle perubahan kode tim
  const handleTeamCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
        .toUpperCase()
        .replace(CONFIG.TEAM_CODE_REGEX, '')
        .slice(0, CONFIG.TEAM_CODE_LENGTH);

      setFormData((prev) => ({ ...prev, teamCode: value }));

      if (touched.teamCode) {
        setErrors((prev) => ({
          ...prev,
          teamCode:
            value.length === CONFIG.TEAM_CODE_LENGTH
              ? undefined
              : `Kode guild harus ${CONFIG.TEAM_CODE_LENGTH} karakter rune kuno`,
        }));
      }
    },
    [touched.teamCode]
  );

  // Handle perubahan peran
  const handleRoleChange = useCallback((role: 'defuser' | 'expert') => {
    setFormData((prev) => ({ ...prev, role }));
    setErrors((prev) => ({ ...prev, role: undefined }));

    // Animate role card
    const card = document.querySelector(`[data-role="${role}"]`);
    if (card) {
      gsap.fromTo(
        card,
        { scale: 1 },
        {
          scale: 1.02,
          duration: 0.2,
          yoyo: true,
          repeat: 1,
          ease: 'power2.inOut',
        }
      );
    }
  }, []);

  // Handle perubahan nickname
  const handleNicknameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.slice(0, CONFIG.MAX_NICKNAME_LENGTH);
      setFormData((prev) => ({ ...prev, nickname: value }));

      if (touched.nickname) {
        setErrors((prev) => ({
          ...prev,
          nickname:
            value.trim().length >= CONFIG.MIN_NICKNAME_LENGTH
              ? undefined
              : `Nama petualang minimal ${CONFIG.MIN_NICKNAME_LENGTH} karakter`,
        }));
      }
    },
    [touched.nickname]
  );

  // Handle blur untuk validasi
  const handleBlur = useCallback(
    (field: keyof FormData) => {
      setTouched((prev) => ({ ...prev, [field]: true }));

      const validationErrors = validateForm();
      setErrors((prev) => ({
        ...prev,
        [field]: validationErrors[field],
      }));
    },
    [validateForm]
  );

  // Handle submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Tandai semua field sebagai touched
    setTouched({ teamCode: true, role: true, nickname: true });

    // Validasi
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const result = await gameApi.joinSession(
        formData.teamCode,
        formData.role as 'defuser' | 'expert',
        formData.nickname.trim()
      );

      // Navigasi ke halaman sesi
      router.visit(`/game/session/${result.session.id}`, {
        data: {
          role: formData.role,
          participantId: result.participant.id,
        },
      });
    } catch (error: any) {
      console.error('Error joining session:', error);

      // Tangani berbagai jenis error
      let errorMessage = 'Gagal memasuki dungeon. Portal mungkin tertutup. Silakan coba lagi.';

      if (error.response?.status === 404) {
        errorMessage = 'Kode guild tidak ditemukan di arsip kuno. Periksa kembali kode Anda.';
      } else if (error.response?.status === 409) {
        errorMessage = 'Guild sudah penuh atau kelas petualang sudah diambil oleh petualang lain.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="w-full max-w-md mx-auto">
      <div className="mb-6 text-center relative">
        <div className="absolute top-0 left-0 text-2xl">
          <span ref={setTorchRef(0)} className="dungeon-torch-flicker">
            🔥
          </span>
        </div>
        <div className="absolute top-0 right-0 text-2xl">
          <span ref={setTorchRef(1)} className="dungeon-torch-flicker">
            🔥
          </span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold text-amber-300 mb-2 dungeon-glow-text relative z-10">
          Bergabung ke Guild Dungeon
        </h3>
        <p className="text-sm sm:text-base text-stone-300 relative z-10">
          Masukkan kode guild untuk memulai ekspedisi bersama petualang lain
        </p>
      </div>

      {/* Error umum */}
      {errors.general && (
        <div className="mb-6 p-4 bg-gradient-to-r from-red-950/60 to-red-900/40 border-l-4 border-red-500 rounded-r-xl animate-[slideIn_0.3s_ease-out] backdrop-blur-sm dungeon-card-glow-red">
          <div className="flex items-start">
            <span className="text-red-400 text-xl mr-3">⚠️</span>
            <p className="text-red-200 text-sm font-medium leading-relaxed">{errors.general}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Kode Tim */}
        <div className="space-y-2">
          <label htmlFor="teamCode" className="block text-sm font-semibold text-amber-300 dungeon-glow-text">
            🗝️ Kode Guild
          </label>
          <input
            type="text"
            id="teamCode"
            value={formData.teamCode}
            onChange={handleTeamCodeChange}
            onBlur={() => handleBlur('teamCode')}
            placeholder="ABCD12"
            maxLength={CONFIG.TEAM_CODE_LENGTH}
            className={`w-full px-4 py-3 border-2 rounded-xl font-mono text-center text-xl sm:text-2xl tracking-[0.5em] uppercase
              transition-all duration-200 ease-in-out backdrop-blur-sm
              focus:outline-none focus:ring-4 focus:ring-amber-500/20
              ${
                errors.teamCode && touched.teamCode
                  ? 'border-red-500 bg-red-950/40 text-red-200 focus:border-red-600'
                  : 'border-amber-700 bg-stone-900/60 text-amber-200 focus:border-amber-500 hover:border-amber-600'
              }
              disabled:opacity-50 disabled:cursor-not-allowed placeholder-amber-500/50`}
            disabled={loading}
            required
            aria-invalid={errors.teamCode && touched.teamCode ? 'true' : 'false'}
            aria-describedby={errors.teamCode && touched.teamCode ? 'teamCode-error' : undefined}
          />
          {errors.teamCode && touched.teamCode && (
            <p
              id="teamCode-error"
              className="text-red-400 text-xs mt-1 animate-[fadeIn_0.2s_ease-out] flex items-center gap-1"
            >
              <span>⚠️</span> {errors.teamCode}
            </p>
          )}
          <p className="text-xs text-stone-400 mt-1">
            {formData.teamCode.length}/{CONFIG.TEAM_CODE_LENGTH} rune kuno
          </p>
        </div>

        {/* Pilihan Peran */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-amber-300 dungeon-glow-text">
            ⚔️ Pilih Kelas Petualang
          </label>
          <div className="space-y-3">
            {(Object.entries(ROLE_CONFIG) as [keyof typeof ROLE_CONFIG, typeof ROLE_CONFIG[keyof typeof ROLE_CONFIG]][]).map(([key, config]) => (
              <label
                key={key}
                data-role={key}
                className={`group flex items-start p-4 border-2 rounded-xl cursor-pointer
                  transition-all duration-200 ease-in-out transform backdrop-blur-sm
                  ${
                    formData.role === key
                      ? `${config.borderColor} ${config.bgColor} shadow-lg scale-[1.02] dungeon-card-glow-${config.color}`
                      : `border-stone-700 bg-stone-900/40 hover:${config.borderColor} hover:${config.bgColor} hover:shadow-md`
                  }
                  ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                  active:scale-[0.98]`}
              >
                <input
                  type="radio"
                  value={key}
                  checked={formData.role === key}
                  onChange={() => handleRoleChange(key)}
                  disabled={loading}
                  className="sr-only"
                  aria-label={`Pilih kelas ${config.title}`}
                />
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <span className="text-2xl mr-3 dungeon-rune-float">{config.icon}</span>
                    <span className="font-bold text-amber-200 text-lg dungeon-glow-text">
                      {config.title}
                    </span>
                    {formData.role === key && (
                      <span className="ml-auto text-emerald-400 animate-[scaleIn_0.2s_ease-out] text-xl">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-stone-300 ml-11 leading-relaxed">{config.description}</p>
                </div>
              </label>
            ))}
          </div>
          {errors.role && touched.role && (
            <p className="text-red-400 text-xs mt-1 animate-[fadeIn_0.2s_ease-out] flex items-center gap-1">
              <span>⚠️</span> {errors.role}
            </p>
          )}
        </div>

        {/* Nama Panggilan */}
        <div className="space-y-2">
          <label htmlFor="nickname" className="block text-sm font-semibold text-amber-300 dungeon-glow-text">
            👤 Nama Petualang
          </label>
          <input
            type="text"
            id="nickname"
            value={formData.nickname}
            onChange={handleNicknameChange}
            onBlur={() => handleBlur('nickname')}
            placeholder="Masukkan nama petualang Anda"
            maxLength={CONFIG.MAX_NICKNAME_LENGTH}
            className={`w-full px-4 py-3 border-2 rounded-xl backdrop-blur-sm
              transition-all duration-200 ease-in-out
              focus:outline-none focus:ring-4 focus:ring-amber-500/20
              ${
                errors.nickname && touched.nickname
                  ? 'border-red-500 bg-red-950/40 text-red-200 focus:border-red-600'
                  : 'border-amber-700 bg-stone-900/60 text-amber-200 focus:border-amber-500 hover:border-amber-600'
              }
              disabled:opacity-50 disabled:cursor-not-allowed placeholder-amber-500/50`}
            disabled={loading}
            required
            aria-invalid={errors.nickname && touched.nickname ? 'true' : 'false'}
            aria-describedby={errors.nickname && touched.nickname ? 'nickname-error' : undefined}
          />
          {errors.nickname && touched.nickname && (
            <p
              id="nickname-error"
              className="text-red-400 text-xs mt-1 animate-[fadeIn_0.2s_ease-out] flex items-center gap-1"
            >
              <span>⚠️</span> {errors.nickname}
            </p>
          )}
          <p className="text-xs text-stone-400 mt-1">
            {formData.nickname.length}/{CONFIG.MAX_NICKNAME_LENGTH} karakter
          </p>
        </div>

        {/* Tombol Submit */}
        <button
          type="submit"
          disabled={loading || !isFormValid}
          className={`w-full py-4 px-6 rounded-xl font-bold text-base sm:text-lg
            transition-all duration-200 ease-in-out transform backdrop-blur-sm
            focus:outline-none focus:ring-4 focus:ring-emerald-500/50
            ${
              loading || !isFormValid
                ? 'bg-stone-700 text-stone-400 cursor-not-allowed opacity-60'
                : 'bg-gradient-to-r from-emerald-600 to-green-700 text-white hover:from-emerald-700 hover:to-green-800 shadow-lg hover:shadow-xl active:scale-[0.98] dungeon-button-glow'
            }`}
          aria-busy={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin h-5 w-5 mr-3"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Memasuki Dungeon...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span>⚔️</span>
              Bergabung ke Guild
            </span>
          )}
        </button>
      </form>

      {/* ========================================
          CUSTOM DUNGEON STYLES
          ======================================== */}
      <style>{`
        /* Torch Flicker */
        .dungeon-torch-flicker {
          display: inline-block;
        }

        /* Rune Float */
        .dungeon-rune-float {
          display: inline-block;
          animation: runeFloat 3.6s ease-in-out infinite;
        }

        @keyframes runeFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        /* Card Glows */
        .dungeon-card-glow-red {
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.4), 0 0 40px rgba(239, 68, 68, 0.2);
        }

        .dungeon-card-glow-red {
          box-shadow: 0 0 20px rgba(220, 38, 38, 0.4);
        }

        .dungeon-card-glow-blue {
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
        }

        /* Button Glow */
        .dungeon-button-glow:hover:not(:disabled) {
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.5), 0 0 40px rgba(34, 197, 94, 0.3);
        }

        /* Text Glow */
        .dungeon-glow-text {
          text-shadow: 0 0 20px rgba(251, 191, 36, 0.6), 0 0 40px rgba(251, 191, 36, 0.4);
        }

        /* Animations */
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* Responsive Adjustments */
        @media (max-width: 768px) {
          .dungeon-card-glow-red,
          .dungeon-card-glow-blue {
            box-shadow: 0 0 15px rgba(251, 191, 36, 0.3);
          }
        }
      `}</style>
    </div>
  );
}
