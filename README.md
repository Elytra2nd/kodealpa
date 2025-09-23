# CodeAlpha Dungeon — Laravel + Inertia + DM AI (Sprint 1)

Monolit Laravel + Inertia (React) dengan fitur:
- Game lobby/sessions, Tournament, Voice, Grimoire (knowledge), Explorer Journal, Achievements (locked/unlocked).
- Dungeon Master (DM) fasilitator berbasis teks (Sprint 1), streaming via SSE.
- Siap ditingkatkan ke Voice Realtime (Sprint 2).

## 1) Prasyarat
- PHP 8.2+, Composer, Node 18+, pnpm/npm/yarn (pilih salah satu). [Laravel Install] [web:1117]
- Database MySQL/PGSQL, Redis (opsional untuk queue/broadcast).
- OpenAI API Key (untuk DM AI teks). [OpenAI PHP Laravel] [web:1039][web:1037]

## 2) Instalasi Proyek
Clone & masuk folder
git clone <repo-url> codealpha-dungeon
cd codealpha-dungeon

Install PHP deps
composer install

Install JS deps
pnpm install # atau npm install / yarn

Copy env dan generate key
cp .env.example .env
php artisan key:generate

text
[web:1117]

## 3) Konfigurasi Inertia (Laravel adapter + React)
- Pastikan adapter Inertia Laravel terpasang dan middleware diaktifkan. [Inertia Server-side setup] [web:1112]
composer require inertiajs/inertia-laravel
php artisan inertia:middleware

text
- Tambahkan middleware HandleInertiaRequests ke web middleware stack (Laravel 11/12 via bootstrap/app.php). [web:1112]

## 4) Konfigurasi Database & Migrasi
Edit .env: DB_CONNECTION, DB_HOST, DB_DATABASE, DB_USERNAME, DB_PASSWORD
Migrasi
php artisan migrate

text
[web:1117]

## 5) Seeding Data Inti (Stages, Journal, Game, Achievements)
- Pastikan DatabaseSeeder memanggil seeder terkait:
// database/seeders/DatabaseSeeder.php (contoh)
public function run(): void {
$this->call([
GameSeeder::class,
ExplorerJournalSeeder::class,
AchievementsSeeder::class, // master achievements
]);

\App\Models\User::factory()->create([
'name' => 'Test User',
'email' => 'test@example.com',
]);
}

text
- Jalankan:
php artisan db:seed

text
[web:1117]

## 6) Menjalankan Aplikasi
Build frontend dev
pnpm run dev # atau npm run dev / yarn dev

Jalankan server
php artisan serve
