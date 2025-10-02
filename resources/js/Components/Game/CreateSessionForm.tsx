// resources/js/Components/Game/CreateSessionForm.tsx
import React, { useState, useCallback, useMemo } from 'react';

// Konstanta
const DEFAULT_TIME_LIMIT = 300;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_DIFFICULTY = 'intermediate';

// Tipe data
interface FlexibleStage {
  id: number;
  name: string;
  mission_id?: number;
  order?: number;
  config: {
    title?: string;
    timeLimit?: number;
    maxAttempts?: number;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    learningObjectives?: string[];
    puzzles?: Array<any>;
  };
  mission?: {
    id: number;
    title: string;
    description: string;
    code: string;
  };
  is_active: boolean;
}

interface Props {
  stages: FlexibleStage[];
  onCreateSession: (stageId: number) => Promise<void>;
  isCreating: boolean;
}

// Helper untuk mendapatkan label kesulitan
const getDifficultyLabel = (difficulty: string): { text: string; color: string; icon: string } => {
  const difficultyMap = {
    beginner: { text: 'Pemula', color: 'text-green-600 bg-green-50', icon: '🌱' },
    intermediate: { text: 'Menengah', color: 'text-yellow-600 bg-yellow-50', icon: '⚡' },
    advanced: { text: 'Lanjutan', color: 'text-red-600 bg-red-50', icon: '🔥' }
  };
  return difficultyMap[difficulty as keyof typeof difficultyMap] || difficultyMap.intermediate;
};

// Helper untuk format waktu
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes} menit ${secs > 0 ? `${secs} detik` : ''}`.trim();
};

export default function CreateSessionForm({ stages, onCreateSession, isCreating }: Props) {
  const [selectedStage, setSelectedStage] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [touched, setTouched] = useState(false);

  // Filter stage yang aktif
  const activeStages = useMemo(() =>
    stages.filter(stage => stage.is_active),
    [stages]
  );

  // Dapatkan data stage yang dipilih
  const selectedStageData = useMemo(() =>
    activeStages.find(s => s.id === selectedStage),
    [activeStages, selectedStage]
  );

  // Handle perubahan stage
  const handleStageChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number(e.target.value);
    setSelectedStage(value);
    setError('');
    setTouched(true);
  }, []);

  // Handle submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (!selectedStage) {
      setError('Silakan pilih tahap permainan');
      return;
    }

    if (isCreating) return;

    setError('');

    try {
      await onCreateSession(selectedStage);
    } catch (err: any) {
      console.error('Error creating session:', err);
      const errorMessage = err.response?.data?.message || 'Gagal membuat sesi. Silakan coba lagi.';
      setError(errorMessage);
    }
  };

  // Cek apakah form valid
  const isFormValid = selectedStage > 0;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Buat Sesi Baru
        </h3>
        <p className="text-sm text-gray-600">
          Pilih tahap permainan dan mulai sebagai host
        </p>
      </div>

      {/* Error umum */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg animate-[slideIn_0.3s_ease-out]">
          <div className="flex items-start">
            <span className="text-red-500 text-xl mr-3">⚠️</span>
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Pilihan Stage */}
        <div className="space-y-2">
          <label htmlFor="stage" className="block text-sm font-semibold text-gray-700">
            Pilih Tahap Permainan
          </label>
          <div className="relative">
            <select
              id="stage"
              value={selectedStage || ''}
              onChange={handleStageChange}
              className={`w-full px-4 py-3 pr-10 border-2 rounded-xl appearance-none
                transition-all duration-200 ease-in-out cursor-pointer
                focus:outline-none focus:ring-4 focus:ring-blue-500/20
                ${!selectedStage && touched
                  ? 'border-red-400 bg-red-50 focus:border-red-500'
                  : 'border-gray-300 bg-white focus:border-blue-500 hover:border-gray-400'
                }
                disabled:opacity-50 disabled:cursor-not-allowed`}
              required
              disabled={isCreating || activeStages.length === 0}
              aria-invalid={!selectedStage && touched ? 'true' : 'false'}
            >
              <option value="">Pilih tahap...</option>
              {activeStages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name} {stage.mission && `- ${stage.mission.title}`}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg
                className={`w-5 h-5 transition-colors ${!selectedStage && touched ? 'text-red-500' : 'text-gray-400'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {!selectedStage && touched && (
            <p className="text-red-600 text-xs mt-1 animate-[fadeIn_0.2s_ease-out]">
              Silakan pilih tahap permainan
            </p>
          )}
          {activeStages.length === 0 && (
            <p className="text-amber-600 text-xs mt-1 flex items-center">
              <span className="mr-1">⚠️</span>
              Tidak ada tahap yang tersedia saat ini
            </p>
          )}
        </div>

        {/* Preview Informasi Stage */}
        {selectedStageData && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border-2 border-blue-200 shadow-sm animate-[slideIn_0.3s_ease-out]">
            <h4 className="font-bold text-gray-900 mb-4 flex items-center text-lg">
              <span className="mr-2">ℹ️</span>
              Informasi Tahap
            </h4>

            <div className="space-y-3">
              {/* Difficulty Badge */}
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-600 w-32">Tingkat:</span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                  getDifficultyLabel(selectedStageData.config?.difficulty || DEFAULT_DIFFICULTY).color
                }`}>
                  <span className="mr-1">
                    {getDifficultyLabel(selectedStageData.config?.difficulty || DEFAULT_DIFFICULTY).icon}
                  </span>
                  {getDifficultyLabel(selectedStageData.config?.difficulty || DEFAULT_DIFFICULTY).text}
                </span>
              </div>

              {/* Time Limit */}
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-600 w-32">Batas Waktu:</span>
                <span className="text-sm text-gray-900 font-semibold flex items-center">
                  <span className="mr-2">⏱️</span>
                  {formatTime(selectedStageData.config?.timeLimit || DEFAULT_TIME_LIMIT)}
                </span>
              </div>

              {/* Max Attempts */}
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-600 w-32">Maks. Percobaan:</span>
                <span className="text-sm text-gray-900 font-semibold flex items-center">
                  <span className="mr-2">🎯</span>
                  {selectedStageData.config?.maxAttempts || DEFAULT_MAX_ATTEMPTS} kali
                </span>
              </div>

              {/* Mission Info */}
              {selectedStageData.mission && (
                <>
                  <div className="border-t border-blue-200 pt-3 mt-3">
                    <div className="flex items-start mb-2">
                      <span className="text-sm font-medium text-gray-600 w-32 flex-shrink-0">Misi:</span>
                      <span className="text-sm text-gray-900 font-semibold">
                        {selectedStageData.mission.title}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-sm font-medium text-gray-600 w-32 flex-shrink-0">Deskripsi:</span>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {selectedStageData.mission.description}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Learning Objectives */}
              {selectedStageData.config?.learningObjectives &&
               selectedStageData.config.learningObjectives.length > 0 && (
                <div className="border-t border-blue-200 pt-3 mt-3">
                  <span className="text-sm font-medium text-gray-600 mb-2 block">
                    📚 Tujuan Pembelajaran:
                  </span>
                  <ul className="space-y-1 ml-4">
                    {selectedStageData.config.learningObjectives.map((objective, index) => (
                      <li key={index} className="text-sm text-gray-700 flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        <span>{objective}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tombol Submit */}
        <button
          type="submit"
          disabled={isCreating || !isFormValid || activeStages.length === 0}
          className={`w-full py-4 px-6 rounded-xl font-bold text-lg
            transition-all duration-200 ease-in-out transform
            focus:outline-none focus:ring-4 focus:ring-blue-500/50
            ${isCreating || !isFormValid || activeStages.length === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl active:scale-[0.98]'
            }`}
          aria-busy={isCreating}
        >
          {isCreating ? (
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
              Membuat Sesi...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <span className="mr-2">👑</span>
              Buat Sesi sebagai Host
            </span>
          )}
        </button>

        {/* Info tambahan */}
        {!isCreating && isFormValid && (
          <p className="text-xs text-center text-gray-500 animate-[fadeIn_0.3s_ease-out]">
            Setelah membuat sesi, Anda akan mendapat kode tim untuk dibagikan
          </p>
        )}
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

        /* Custom select arrow animation */
        select:focus + div svg {
          transform: rotate(180deg);
        }
      `}</style>
    </div>
  );
}
