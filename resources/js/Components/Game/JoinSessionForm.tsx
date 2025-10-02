import React, { useState, useCallback, useMemo } from 'react';
import { router } from '@inertiajs/react';
import { gameApi } from '@/services/gameApi';

// Konstanta
const TEAM_CODE_LENGTH = 6;
const MAX_NICKNAME_LENGTH = 32;
const TEAM_CODE_REGEX = /[^A-Z0-9]/g;

// Tipe data
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

export default function JoinSessionForm() {
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
      newErrors.teamCode = 'Kode tim wajib diisi';
    } else if (formData.teamCode.length !== TEAM_CODE_LENGTH) {
      newErrors.teamCode = `Kode tim harus ${TEAM_CODE_LENGTH} karakter`;
    }

    if (!formData.role) {
      newErrors.role = 'Pilih peran Anda';
    }

    if (!formData.nickname.trim()) {
      newErrors.nickname = 'Nama panggilan wajib diisi';
    } else if (formData.nickname.trim().length < 2) {
      newErrors.nickname = 'Nama panggilan minimal 2 karakter';
    }

    return newErrors;
  }, [formData]);

  // Cek apakah form valid
  const isFormValid = useMemo(() => {
    const validationErrors = validateForm();
    return Object.keys(validationErrors).length === 0;
  }, [validateForm]);

  // Handle perubahan kode tim
  const handleTeamCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
      .toUpperCase()
      .replace(TEAM_CODE_REGEX, '')
      .slice(0, TEAM_CODE_LENGTH);

    setFormData(prev => ({ ...prev, teamCode: value }));

    if (touched.teamCode) {
      setErrors(prev => ({
        ...prev,
        teamCode: value.length === TEAM_CODE_LENGTH ? undefined : `Kode tim harus ${TEAM_CODE_LENGTH} karakter`
      }));
    }
  }, [touched.teamCode]);

  // Handle perubahan peran
  const handleRoleChange = useCallback((role: 'defuser' | 'expert') => {
    setFormData(prev => ({ ...prev, role }));
    setErrors(prev => ({ ...prev, role: undefined }));
  }, []);

  // Handle perubahan nickname
  const handleNicknameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.slice(0, MAX_NICKNAME_LENGTH);
    setFormData(prev => ({ ...prev, nickname: value }));

    if (touched.nickname) {
      setErrors(prev => ({
        ...prev,
        nickname: value.trim().length >= 2 ? undefined : 'Nama panggilan minimal 2 karakter'
      }));
    }
  }, [touched.nickname]);

  // Handle blur untuk validasi
  const handleBlur = useCallback((field: keyof FormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));

    const validationErrors = validateForm();
    setErrors(prev => ({
      ...prev,
      [field]: validationErrors[field]
    }));
  }, [validateForm]);

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
          participantId: result.participant.id
        },
      });
    } catch (error: any) {
      console.error('Error joining session:', error);

      // Tangani berbagai jenis error
      let errorMessage = 'Gagal bergabung ke sesi. Silakan coba lagi.';

      if (error.response?.status === 404) {
        errorMessage = 'Kode tim tidak ditemukan. Periksa kembali kode Anda.';
      } else if (error.response?.status === 409) {
        errorMessage = 'Sesi sudah penuh atau peran sudah diambil.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Bergabung ke Sesi
        </h3>
        <p className="text-sm text-gray-600">
          Masukkan kode tim untuk bergabung dengan pemain lain
        </p>
      </div>

      {/* Error umum */}
      {errors.general && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg animate-[slideIn_0.3s_ease-out]">
          <div className="flex items-start">
            <span className="text-red-500 text-xl mr-3">⚠️</span>
            <p className="text-red-700 text-sm font-medium">{errors.general}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Kode Tim */}
        <div className="space-y-2">
          <label htmlFor="teamCode" className="block text-sm font-semibold text-gray-700">
            Kode Tim
          </label>
          <input
            type="text"
            id="teamCode"
            value={formData.teamCode}
            onChange={handleTeamCodeChange}
            onBlur={() => handleBlur('teamCode')}
            placeholder="ABCD12"
            maxLength={TEAM_CODE_LENGTH}
            className={`w-full px-4 py-3 border-2 rounded-xl font-mono text-center text-2xl tracking-[0.5em] uppercase
              transition-all duration-200 ease-in-out
              focus:outline-none focus:ring-4 focus:ring-green-500/20
              ${errors.teamCode && touched.teamCode
                ? 'border-red-400 bg-red-50 focus:border-red-500'
                : 'border-gray-300 bg-white focus:border-green-500 hover:border-gray-400'
              }
              disabled:opacity-50 disabled:cursor-not-allowed`}
            disabled={loading}
            required
            aria-invalid={errors.teamCode && touched.teamCode ? 'true' : 'false'}
            aria-describedby={errors.teamCode && touched.teamCode ? 'teamCode-error' : undefined}
          />
          {errors.teamCode && touched.teamCode && (
            <p id="teamCode-error" className="text-red-600 text-xs mt-1 animate-[fadeIn_0.2s_ease-out]">
              {errors.teamCode}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {formData.teamCode.length}/{TEAM_CODE_LENGTH} karakter
          </p>
        </div>

        {/* Pilihan Peran */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700">
            Pilih Peran Anda
          </label>
          <div className="space-y-3">
            {/* Defuser */}
            <label
              className={`group flex items-start p-4 border-2 rounded-xl cursor-pointer
                transition-all duration-200 ease-in-out transform
                ${formData.role === 'defuser'
                  ? 'border-green-500 bg-green-50 shadow-md scale-[1.02]'
                  : 'border-gray-300 bg-white hover:border-green-300 hover:bg-green-50/50 hover:shadow-sm'
                }
                ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                active:scale-[0.98]`}
            >
              <input
                type="radio"
                value="defuser"
                checked={formData.role === 'defuser'}
                onChange={() => handleRoleChange('defuser')}
                disabled={loading}
                className="sr-only"
                aria-label="Pilih peran Defuser"
              />
              <div className="flex-1">
                <div className="flex items-center mb-1">
                  <span className="text-2xl mr-3">💣</span>
                  <span className="font-bold text-gray-900 text-lg">Defuser</span>
                  {formData.role === 'defuser' && (
                    <span className="ml-auto text-green-600 animate-[scaleIn_0.2s_ease-out]">✓</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 ml-11">
                  Anda melihat bom dan mendeskripsikannya kepada Ahli.
                </p>
              </div>
            </label>

            {/* Expert */}
            <label
              className={`group flex items-start p-4 border-2 rounded-xl cursor-pointer
                transition-all duration-200 ease-in-out transform
                ${formData.role === 'expert'
                  ? 'border-green-500 bg-green-50 shadow-md scale-[1.02]'
                  : 'border-gray-300 bg-white hover:border-green-300 hover:bg-green-50/50 hover:shadow-sm'
                }
                ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                active:scale-[0.98]`}
            >
              <input
                type="radio"
                value="expert"
                checked={formData.role === 'expert'}
                onChange={() => handleRoleChange('expert')}
                disabled={loading}
                className="sr-only"
                aria-label="Pilih peran Ahli"
              />
              <div className="flex-1">
                <div className="flex items-center mb-1">
                  <span className="text-2xl mr-3">📖</span>
                  <span className="font-bold text-gray-900 text-lg">Ahli</span>
                  {formData.role === 'expert' && (
                    <span className="ml-auto text-green-600 animate-[scaleIn_0.2s_ease-out]">✓</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 ml-11">
                  Anda memiliki manual dan membimbing Defuser.
                </p>
              </div>
            </label>
          </div>
          {errors.role && touched.role && (
            <p className="text-red-600 text-xs mt-1 animate-[fadeIn_0.2s_ease-out]">
              {errors.role}
            </p>
          )}
        </div>

        {/* Nama Panggilan */}
        <div className="space-y-2">
          <label htmlFor="nickname" className="block text-sm font-semibold text-gray-700">
            Nama Panggilan
          </label>
          <input
            type="text"
            id="nickname"
            value={formData.nickname}
            onChange={handleNicknameChange}
            onBlur={() => handleBlur('nickname')}
            placeholder="Masukkan nama Anda"
            maxLength={MAX_NICKNAME_LENGTH}
            className={`w-full px-4 py-3 border-2 rounded-xl
              transition-all duration-200 ease-in-out
              focus:outline-none focus:ring-4 focus:ring-green-500/20
              ${errors.nickname && touched.nickname
                ? 'border-red-400 bg-red-50 focus:border-red-500'
                : 'border-gray-300 bg-white focus:border-green-500 hover:border-gray-400'
              }
              disabled:opacity-50 disabled:cursor-not-allowed`}
            disabled={loading}
            required
            aria-invalid={errors.nickname && touched.nickname ? 'true' : 'false'}
            aria-describedby={errors.nickname && touched.nickname ? 'nickname-error' : undefined}
          />
          {errors.nickname && touched.nickname && (
            <p id="nickname-error" className="text-red-600 text-xs mt-1 animate-[fadeIn_0.2s_ease-out]">
              {errors.nickname}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {formData.nickname.length}/{MAX_NICKNAME_LENGTH} karakter
          </p>
        </div>

        {/* Tombol Submit */}
        <button
          type="submit"
          disabled={loading || !isFormValid}
          className={`w-full py-4 px-6 rounded-xl font-bold text-lg
            transition-all duration-200 ease-in-out transform
            focus:outline-none focus:ring-4 focus:ring-green-500/50
            ${loading || !isFormValid
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl active:scale-[0.98]'
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
              Bergabung...
            </span>
          ) : (
            'Bergabung ke Permainan'
          )}
        </button>
      </form>

      {/* CSS untuk animasi */}
      <style>{`
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
      `}</style>
    </div>
  );
}
