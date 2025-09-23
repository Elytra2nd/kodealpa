
# 🏰 CodeAlpha Dungeon — Laravel + Inertia + DM AI (Sprint 1)

Proyek **monolit Laravel + Inertia (React)** dengan fitur utama:

- 🎮 Game Lobby / Sessions  
- 🏆 Tournament  
- 🎙️ Voice (planned Sprint 2)  
- 📜 Grimoire (Knowledge Base)  
- 🗒️ Explorer Journal  
- 🏅 Achievements (Locked/Unlocked)  
- 🤖 Dungeon Master (DM) AI berbasis teks — streaming via **SSE** (Sprint 1)  
- 🚀 Siap ditingkatkan ke **Voice Realtime** pada Sprint 2  

---

## ⚡ 1) Prasyarat
Pastikan sudah terpasang:

- PHP `8.2+`  
- Composer  
- Node.js `18+`  
- Package manager: `pnpm` / `npm` / `yarn`  
- Database: **MySQL** / **PostgreSQL**  
- Redis *(opsional, untuk queue & broadcast)*  
- OpenAI API Key *(untuk DM AI berbasis teks)*  

📚 Referensi:  
- [Laravel Install][web:1117]  
- [OpenAI PHP Laravel][web:1039][web:1037]  

---

## 🛠️ 2) Instalasi Proyek

Clone repo & masuk ke folder:
```bash
git clone <repo-url> codealpha-dungeon
cd codealpha-dungeon
````

Install dependensi PHP:

```bash
composer install
```

Install dependensi JS:

```bash
npm install   # atau: npm install / yarn install
```

Salin file `.env` & generate key:

```bash
cp .env.example .env
php artisan key:generate
```

---

## ⚙️ 3) Konfigurasi Inertia (Laravel + React)

Pasang adapter Inertia untuk Laravel:

```bash
composer require inertiajs/inertia-laravel
php artisan inertia:middleware
```

Tambahkan middleware `HandleInertiaRequests` ke **web middleware stack**
(Laravel 11/12: edit `bootstrap/app.php`).

📚 Referensi: [Inertia Server-side setup][web:1112]

---

## 🗄️ 4) Konfigurasi Database & Migrasi

Edit konfigurasi `.env`:

```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=codealpha_dungeon
DB_USERNAME=root
DB_PASSWORD=secret
```

Jalankan migrasi:

```bash
php artisan migrate
```

---

## 🌱 5) Seeding Data Inti

Pastikan `DatabaseSeeder` memanggil seeder terkait, contoh:

```php
// database/seeders/DatabaseSeeder.php
public function run(): void {
    $this->call([
        GameSeeder::class,
        ExplorerJournalSeeder::class,
        AchievementsSeeder::class, // Master achievements
    ]);

    \App\Models\User::factory()->create([
        'name'  => 'Test User',
        'email' => 'test@example.com',
    ]);
}
```

Jalankan seeder:

```bash
php artisan db:seed
```

---

## 🚀 6) Menjalankan Aplikasi

Jalankan build frontend (development):

```bash
pnpm run dev   # atau: npm run dev / yarn dev
```

Jalankan server Laravel:

```bash
php artisan serve
```

---

## 📌 Catatan

* Gunakan Redis jika butuh **queue** atau **broadcast event**.
* OpenAI API diperlukan agar **DM AI** berfungsi.

---

[web:1117]: https://laravel.com/docs/11.x/installation
[web:1112]: https://inertiajs.com/server-side-setup
[web:1039]: https://github.com/openai-php/laravel
[web:1037]: https://openai.com/api

