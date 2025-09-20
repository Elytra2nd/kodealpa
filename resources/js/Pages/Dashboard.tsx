import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';

export default function Dashboard() {
  const { props } = usePage();
  const user = props.auth?.user;

  return (
    <AuthenticatedLayout
      header={
        <h2 className="text-xl font-semibold leading-tight text-amber-300">
          Ruang Komando Dungeon
        </h2>
      }
    >
      <Head title="Ruang Komando - CodeAlpha Dungeon" />

      {/* Custom Styles for Animations */}
      <style>{`
        @keyframes flicker { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        @keyframes glow { 0%, 100% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.5); } 50% { box-shadow: 0 0 30px rgba(251, 191, 36, 0.8), 0 0 40px rgba(251, 191, 36, 0.3); } }
        @keyframes torchFlame { 0%, 100% { transform: scale(1) rotate(-2deg); } 25% { transform: scale(1.1) rotate(1deg); } 50% { transform: scale(0.9) rotate(-1deg); } 75% { transform: scale(1.05) rotate(2deg); } }
        @keyframes dungeonPulse { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.05); opacity: 1; } }
        @keyframes mysticalFloat { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-10px) rotate(5deg); } }
        @keyframes shadowDance { 0%, 100% { box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8); } 50% { box-shadow: 0 20px 40px rgba(0, 0, 0, 0.9), 0 0 20px rgba(139, 69, 19, 0.3); } }
        .flicker { animation: flicker 3s ease-in-out infinite; }
        .glow { animation: glow 2s ease-in-out infinite; }
        .torch-flame { animation: torchFlame 1.5s ease-in-out infinite; }
        .dungeon-pulse { animation: dungeonPulse 3s ease-in-out infinite; }
        .mystical-float { animation: mysticalFloat 4s ease-in-out infinite; }
        .shadow-dance { animation: shadowDance 2.5s ease-in-out infinite; }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-amber-900 py-12">
        {/* Dungeon Background Pattern */}
        <div
          className="absolute inset-0 opacity-10 bg-repeat"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d97706' fill-opacity='0.4'%3E%3Cpath d='M30 0L60 30 30 60 0 30z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        ></div>

        <div className="relative mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-8">
          {/* Mystical Welcome Section */}
          <Card className="overflow-hidden border-4 border-amber-700 shadow-dance bg-gradient-to-br from-stone-800 via-amber-900 to-stone-900">
            <div className="relative p-8 text-amber-100">
              {/* Animated Torches */}
              <div className="absolute top-4 left-4 torch-flame text-4xl">🔥</div>
              <div className="absolute top-4 right-4 torch-flame text-4xl">🔥</div>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="space-y-4">
                  <h1 className="text-4xl font-bold tracking-tight text-amber-300 flicker">
                    Selamat Datang, Penjelajah {user?.name}! ⚔️
                  </h1>
                  <p className="text-amber-200 text-lg font-medium leading-relaxed">
                    Masuklah ke dunia CodeAlpha dan hadapi tantangan di kedalaman dungeon yang penuh misteri!
                  </p>
                  <div className="flex items-center space-x-3 pt-2">
                    <Badge className="bg-amber-700 text-amber-100 border-amber-600 glow">
                      🏰 Dungeon Master
                    </Badge>
                    <Badge className="bg-stone-700 text-stone-100 border-stone-600">
                      ⚡ CodeAlpha Academy
                    </Badge>
                    <Badge className="bg-red-900 text-red-100 border-red-700">
                      🔥 Level Heroik
                    </Badge>
                  </div>
                </div>
                <div className="mt-6 md:mt-0 mystical-float">
                  <div className="text-8xl">🗿</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Mystical Quest Cards */}
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Quest 1: Mulai Petualangan */}
            <Card className="group transition-all duration-500 hover:shadow-2xl hover:-translate-y-3 border-3 border-amber-600 bg-gradient-to-b from-stone-800 to-stone-900 shadow-dance hover:border-amber-400">
              <CardHeader className="pb-3 relative">
                <div className="absolute -top-2 -right-2 text-2xl mystical-float">✨</div>
                <div className="flex items-center space-x-4">
                  <div className="text-6xl group-hover:torch-flame transition-transform dungeon-pulse">⚔️</div>
                  <div className="space-y-2">
                    <CardTitle className="text-xl text-amber-300 group-hover:text-amber-200 transition-colors">
                      Mulai Petualangan
                    </CardTitle>
                    <CardDescription className="text-stone-300">
                      Masuki dungeon bersama rekan seperjuangan
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-stone-200">
                <p className="mb-4 leading-relaxed">
                  Bergabunglah dengan guild dan hadapi tantangan teka-teki berbahaya di kedalaman dungeon CodeAlpha
                </p>
                <Link href="/game">
                  <Button className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-900 font-bold border border-amber-500 glow">
                    🚪 Masuki Dungeon →
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Quest 2: Grimoire Pedoman */}
            <Card className="group transition-all duration-500 hover:shadow-2xl hover:-translate-y-3 border-3 border-emerald-600 bg-gradient-to-b from-stone-800 to-emerald-950 shadow-dance hover:border-emerald-400">
              <CardHeader className="pb-3 relative">
                <div className="absolute -top-2 -right-2 text-2xl mystical-float">🌟</div>
                <div className="flex items-center space-x-4">
                  <div className="text-6xl group-hover:dungeon-pulse transition-transform">📜</div>
                  <div className="space-y-2">
                    <CardTitle className="text-xl text-emerald-300 group-hover:text-emerald-200 transition-colors">
                      Grimoire Pedoman
                    </CardTitle>
                    <CardDescription className="text-stone-300">
                      Pelajari mantra dan strategi kuno
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-stone-200">
                <p className="mb-4 leading-relaxed">
                  Buka rahasia komunikasi magis dan strategi bertahan hidup di dungeon yang berbahaya
                </p>
                <Link href="/grimoire">
                  <Button
                    variant="outline"
                    className="w-full border-2 border-emerald-500 text-emerald-300 hover:bg-emerald-900 bg-emerald-950"
                  >
                    📖 Baca Grimoire →
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Quest 3: Buku Catatan Penjelajah */}
            <Card className="group transition-all duration-500 hover:shadow-2xl hover:-translate-y-3 border-3 border-purple-600 bg-gradient-to-b from-stone-800 to-purple-950 shadow-dance hover:border-purple-400">
              <CardHeader className="pb-3 relative">
                <div className="absolute -top-2 -right-2 text-2xl mystical-float">🔮</div>
                <div className="flex items-center space-x-4">
                  <div className="text-6xl group-hover:torch-flame transition-transform">📊</div>
                  <div className="space-y-2">
                    <CardTitle className="text-xl text-purple-300 group-hover:text-purple-200 transition-colors">
                      Catatan Penjelajah
                    </CardTitle>
                    <CardDescription className="text-stone-300">
                      Lihat jejak perjalanan dan pencapaian
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-stone-200">
                <p className="mb-4 leading-relaxed">
                  Telusuri riwayat ekspedisi, tingkat survival, dan analisis kemampuan dungeon crawling Anda
                </p>
                {/* ✅ Ubah tombol jadi Link ke halaman riwayat */}
                <Link href="/game/journal">
                  <Button
                    variant="outline"
                    className="w-full border-2 border-purple-500 text-purple-300 hover:bg-purple-900 bg-purple-950"
                  >
                    🗒️ Buka Catatan →
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Dungeon Lore Section */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* About CodeAlpha Dungeon */}
            <Card className="border-3 border-stone-600 bg-gradient-to-br from-stone-900 to-amber-950 shadow-2xl">
              <CardHeader className="relative">
                <div className="absolute top-2 right-2 text-3xl flicker">🕯️</div>
                <CardTitle className="flex items-center text-2xl text-amber-300">
                  <span className="text-4xl mr-4 dungeon-pulse">🏰</span>
                  Legenda CodeAlpha Dungeon
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-stone-200">
                <p className="leading-relaxed">
                  <strong className="text-amber-300">CodeAlpha Dungeon</strong> adalah sebuah <strong className="text-red-300">kuil pembelajaran kuno</strong>
                  dimana para penjelajah berani menguji kemampuan komunikasi dan pemecahan masalah mereka.
                </p>
                <p className="leading-relaxed">
                  Satu penjelajah mengamati simbol-simbol misterius di dinding dungeon, sementara yang lain membaca gulungan kuno
                  berisi petunjuk untuk memecahkan teka-teki berbahaya.
                </p>
                <p className="leading-relaxed font-medium text-amber-200">
                  Bekerjasama, pertahankan ketenangan di tengah ancaman, dan selamatkan dunia dari kehancuran sebelum kutukan menguat!
                </p>

                <div className="flex flex-wrap gap-3 pt-4">
                  <Badge className="bg-stone-700 text-stone-200 border-stone-500">
                    ⚔️ 2 Penjelajah
                  </Badge>
                  <Badge className="bg-amber-800 text-amber-100 border-amber-600">
                    🤝 Guild Cooperation
                  </Badge>
                  <Badge className="bg-red-900 text-red-100 border-red-700">
                    🗣️ Mantra Komunikasi
                  </Badge>
                  <Badge className="bg-purple-900 text-purple-100 border-purple-700">
                    🧙‍♂️ Akademi Sihir
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Mystical Survival Tips */}
            <Card className="border-3 border-stone-600 bg-gradient-to-br from-stone-900 to-emerald-950 shadow-2xl">
              <CardHeader className="relative">
                <div className="absolute top-2 right-2 text-3xl torch-flame">🔥</div>
                <CardTitle className="flex items-center text-2xl text-emerald-300">
                  <span className="text-4xl mr-4 mystical-float">🧙‍♂️</span>
                  Mantra Survival Kuno
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-amber-900 to-stone-800 rounded-xl border-2 border-amber-700 glow">
                    <div className="text-amber-400 font-bold text-2xl dungeon-pulse">⚡</div>
                    <div>
                      <p className="font-semibold text-amber-300">Mantra Komunikasi Jernih</p>
                      <p className="text-amber-200 text-sm">Ucapkan dengan tepat apa yang mata lihat, jangan biarkan keraguan menguasai</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-blue-900 to-stone-800 rounded-xl border-2 border-blue-700">
                    <div className="text-blue-400 font-bold text-2xl mystical-float">🛡️</div>
                    <div>
                      <p className="font-semibold text-blue-300">Ritual Konfirmasi Ganda</p>
                      <p className="text-blue-200 text-sm">Pastikan setiap instruksi dikonfirmasi sebelum mengaktivasi mekanisme kuno</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-green-900 to-stone-800 rounded-xl border-2 border-green-700">
                    <div className="text-green-400 font-bold text-2xl flicker">🧘‍♂️</div>
                    <div>
                      <p className="font-semibold text-green-300">Meditasi Ketenangan</p>
                      <p className="text-green-200 text-sm">Panik adalah musuh terbesar, bernapas dalam dan fokuskan pikiran</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-purple-900 to-stone-800 rounded-xl border-2 border-purple-700">
                    <div className="text-purple-400 font-bold text-2xl torch-flame">👥</div>
                    <div>
                      <p className="font-semibold text-purple-300">Ritual Persatuan Guild</p>
                      <p className="text-purple-200 text-sm">Semakin sering berlatih bersama, semakin kuat ikatan spiritual tim</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chronicle of Adventures */}
          <Card className="border-4 border-stone-600 bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 shadow-2xl">
            <CardHeader className="relative">
              <div className="absolute top-4 left-4 text-3xl flicker">🕯️</div>
              <div className="absolute top-4 right-4 text-3xl flicker">🕯️</div>
              <CardTitle className="text-center text-3xl text-amber-300">
                <span className="text-4xl mr-4 dungeon-pulse">📚</span>
                Kronik Petualangan Terbaru
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-16">
                <div className="text-9xl mb-8 mystical-float">🗿</div>
                <h3 className="text-3xl font-bold text-stone-300 mb-4">Ruang Kronik Masih Kosong</h3>
                <p className="text-stone-400 text-lg mb-4">
                  Mulai ekspedisi pertama Anda di CodeAlpha Dungeon
                </p>
                <p className="text-stone-500 mb-10 max-w-2xl mx-auto leading-relaxed">
                  Jejak petualangan heroik Anda akan terukir dalam batu kuno ini setelah menyelesaikan quest pertama
                </p>
                <Link href="/game">
                  <Button size="lg" className="bg-gradient-to-r from-amber-600 via-amber-700 to-red-600 hover:from-amber-500 hover:via-amber-600 hover:to-red-500 text-stone-900 font-bold px-10 py-4 text-lg shadow-2xl glow">
                    <span className="mr-3 text-2xl torch-flame">⚔️</span>
                    Mulai Ekspedisi Pertama
                    <span className="ml-3 text-2xl mystical-float">✨</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Guild Assembly Hall */}
          <Card className="bg-gradient-to-br from-stone-800 via-amber-900 to-stone-900 border-4 border-amber-600 shadow-2xl">
            <CardContent className="p-10">
              <div className="text-center space-y-6">
                <h4 className="text-3xl font-bold text-amber-300 flicker">
                  🏛️ Aula Perkumpulan Guild
                </h4>
                <p className="text-stone-300 max-w-3xl mx-auto text-lg leading-relaxed">
                  CodeAlpha Dungeon memerlukan tim yang solid dan komunikasi yang kuat.
                  Pastikan Anda memiliki seorang rekan seperjuangan yang siap bertarung,
                  dan siapkan kristal komunikasi untuk pengalaman terbaik!
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
                  <div className="flex flex-col items-center p-6 bg-gradient-to-b from-stone-700 to-stone-800 rounded-2xl shadow-xl border-2 border-stone-600 dungeon-pulse">
                    <span className="text-5xl mb-4 torch-flame">🎧</span>
                    <span className="font-bold text-amber-300 text-lg">Kristal Suara</span>
                    <span className="text-sm text-stone-400">Sangat Direkomendasikan</span>
                  </div>
                  <div className="flex flex-col items-center p-6 bg-gradient-to-b from-stone-700 to-stone-800 rounded-2xl shadow-xl border-2 border-stone-600 mystical-float">
                    <span className="text-5xl mb-4 flicker">⏳</span>
                    <span className="font-bold text-amber-300 text-lg">Durasi Quest</span>
                    <span className="text-sm text-stone-400">3-5 menit per ekspedisi</span>
                  </div>
                  <div className="flex flex-col items-center p-6 bg-gradient-to-b from-stone-700 to-stone-800 rounded-2xl shadow-xl border-2 border-stone-600 glow">
                    <span className="text-5xl mb-4 dungeon-pulse">⚔️</span>
                    <span className="font-bold text-amber-300 text-lg">Persatuan Guild</span>
                    <span className="text-sm text-stone-400">Wajib Untuk Survival</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
