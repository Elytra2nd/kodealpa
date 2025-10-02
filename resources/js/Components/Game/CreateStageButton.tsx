import React, { useState, useCallback } from 'react';
import { gameApi } from '@/services/gameApi';

interface Props {
  onStagesCreated: () => void;
  userRole?: string;
}

// Konstanta untuk konfigurasi
const STAGE_CONFIGS = [
  {
    id: 1,
    name: 'Analisis Pola',
    color: 'blue',
    icon: '🔍',
    time: '5 menit',
    attempts: 3,
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200'
  },
  {
    id: 2,
    name: 'Analisis Kode',
    color: 'purple',
    icon: '💻',
    time: '7 menit',
    attempts: 3,
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200'
  },
  {
    id: 3,
    name: 'Tantangan Navigasi',
    color: 'green',
    icon: '🧭',
    time: '8 menit',
    attempts: 3,
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    borderColor: 'border-green-200'
  }
] as const;

export default function CreateStageButton({ onStagesCreated, userRole }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  // Hanya tampilkan untuk user yang terautentikasi
  if (!userRole) {
    return null;
  }

  const handleCreateSampleStages = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await gameApi.createSampleStages();
      console.log('✅ Tahap contoh berhasil dibuat');
      setSuccess(true);

      // Tunggu animasi sukses sebelum refresh
      setTimeout(() => {
        onStagesCreated();
      }, 1500);
    } catch (err: any) {
      console.error('❌ Gagal membuat tahap contoh:', err);
      const errorMessage = err.response?.data?.message ||
                          'Gagal membuat tahap contoh. Silakan coba lagi.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [onStagesCreated]);

  return (
    <div className="text-center py-16 px-4 animate-fade-in">
      {/* Icon Header dengan animasi */}
      <div className="relative inline-block mb-8">
        <div className="text-8xl animate-float">🎯</div>
        <div className="absolute -top-2 -right-2 bg-gradient-to-br from-yellow-400 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
          BARU
        </div>
      </div>

      {/* Judul */}
      <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent mb-4">
        Belum Ada Tahap Permainan
      </h3>

      <p className="text-gray-600 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
        Untuk memulai tantangan multi-tahap, kita perlu membuat beberapa tahap permainan terlebih dahulu.
        Klik tombol di bawah untuk membuat tahap contoh secara otomatis.
      </p>

      {/* Pesan Error */}
      {error && (
        <div className="mb-8 p-5 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-2xl max-w-md mx-auto shadow-lg animate-shake">
          <div className="flex items-center justify-center mb-2">
            <span className="text-2xl mr-2">⚠️</span>
            <span className="font-bold text-red-800">Terjadi Kesalahan</span>
          </div>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Pesan Sukses */}
      {success && (
        <div className="mb-8 p-5 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl max-w-md mx-auto shadow-lg animate-scale-in">
          <div className="flex items-center justify-center mb-2">
            <span className="text-2xl mr-2">✅</span>
            <span className="font-bold text-green-800">Berhasil!</span>
          </div>
          <p className="text-green-700">Tahap permainan berhasil dibuat!</p>
        </div>
      )}

      {/* Tombol Utama */}
      <div className="space-y-4 mb-12">
        <button
          onClick={handleCreateSampleStages}
          disabled={loading || success}
          className={`group relative px-10 py-5 rounded-2xl font-bold text-xl transition-all duration-300 shadow-2xl ${
            loading || success
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 text-white transform hover:scale-105 active:scale-95'
          }`}
        >
          {/* Efek Shine */}
          {!loading && !success && (
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-500 transform -skew-x-12"></div>
          )}

          {loading ? (
            <span className="flex items-center justify-center">
              <span className="inline-block animate-spin rounded-full h-6 w-6 border-3 border-white border-t-transparent mr-3"></span>
              Membuat Tahap...
            </span>
          ) : success ? (
            <span className="flex items-center justify-center">
              <span className="text-2xl mr-2">✨</span>
              Tahap Berhasil Dibuat!
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <span className="text-2xl mr-2">🚀</span>
              Buat Tahap Contoh
            </span>
          )}
        </button>

        <p className="text-gray-500 text-sm font-medium">
          Ini akan membuat 3 tahap tantangan progresif untuk Anda mainkan
        </p>
      </div>

      {/* Preview Tahap */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-3xl p-8 max-w-4xl mx-auto shadow-xl">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 w-1 h-6 rounded-full mr-3"></div>
          <h4 className="font-bold text-gray-800 text-xl">Tahap yang Akan Dibuat</h4>
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 w-1 h-6 rounded-full ml-3"></div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {STAGE_CONFIGS.map((stage, index) => (
            <div
              key={stage.id}
              className={`group relative bg-white rounded-2xl p-6 shadow-lg border-2 ${stage.borderColor} transform transition-all duration-300 hover:scale-105 hover:shadow-2xl animate-slide-up`}
              style={{ animationDelay: `${index * 150}ms` }}
            >
              {/* Nomor Badge */}
              <div className={`absolute -top-4 -right-4 ${stage.bgColor} rounded-full w-12 h-12 flex items-center justify-center shadow-lg border-2 ${stage.borderColor} transform group-hover:rotate-12 transition-transform duration-300`}>
                <span className={`font-bold text-lg ${stage.textColor}`}>
                  {stage.id}
                </span>
              </div>

              {/* Icon */}
              <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                {stage.icon}
              </div>

              {/* Nama Tahap */}
              <p className={`font-bold text-lg ${stage.textColor} mb-3`}>
                {stage.name}
              </p>

              {/* Info Detail */}
              <div className="space-y-2">
                <div className="flex items-center justify-center text-sm text-gray-600">
                  <span className="mr-2">⏱️</span>
                  <span className="font-medium">{stage.time}</span>
                </div>
                <div className="flex items-center justify-center text-sm text-gray-600">
                  <span className="mr-2">🎯</span>
                  <span className="font-medium">{stage.attempts} percobaan</span>
                </div>
              </div>

              {/* Progress Bar Decorative */}
              <div className="mt-4 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r from-${stage.color}-400 to-${stage.color}-600 rounded-full transform origin-left group-hover:scale-x-100 scale-x-0 transition-transform duration-1000`}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* Info Tambahan */}
        <div className="mt-8 flex items-center justify-center space-x-6 text-sm text-gray-600">
          <div className="flex items-center">
            <span className="text-xl mr-2">⚡</span>
            <span className="font-medium">Tingkat Kesulitan Bertahap</span>
          </div>
          <div className="flex items-center">
            <span className="text-xl mr-2">🏆</span>
            <span className="font-medium">Sistem Skor Terakumulasi</span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-gray-500 text-sm max-w-2xl mx-auto leading-relaxed">
        <p className="flex items-center justify-center">
          <span className="text-lg mr-2">💡</span>
          <span>Setiap tahap memiliki teka-teki unik dengan tingkat kesulitan yang meningkat</span>
        </p>
      </div>
    </div>
  );
}
