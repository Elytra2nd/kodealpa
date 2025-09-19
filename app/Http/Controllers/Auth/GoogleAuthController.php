<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Exception;

class GoogleAuthController extends Controller
{
    /**
     * Mengarahkan pengguna ke halaman otentikasi Google.
     *
     * @return \Illuminate\Http\RedirectResponse
     */
    public function redirect(): RedirectResponse
    {
        // Fungsi ini akan mengarahkan pengguna ke halaman login Google
        return Socialite::driver('google')->redirect();
    }

    /**
     * Mendapatkan informasi pengguna dari Google dan menanganinya.
     *
     * @return \Illuminate\Http\RedirectResponse
     */
    public function callback(): RedirectResponse
    {
        try {
            // Ambil data pengguna dari Google
            $googleUser = Socialite::driver('google')->user();

            // Cari pengguna di database berdasarkan google_id.
            // Jika tidak ada, buat pengguna baru. Jika ada, perbarui datanya.
            $user = User::updateOrCreate(
                [
                    'google_id' => $googleUser->getId(),
                ],
                [
                    'name' => $googleUser->getName(),
                    'email' => $googleUser->getEmail(),
                    // Kita set password acak karena pengguna Google tidak punya password di sistem kita.
                    // Kolom password tidak boleh kosong.
                    'password' => Hash::make(Str::random(24))
                ]
            );

            // Login-kan pengguna ke dalam aplikasi
            Auth::login($user, true); // Parameter 'true' untuk "remember me"

            // Arahkan ke halaman dashboard setelah berhasil login
            return redirect('/dashboard');

        } catch (Exception $e) {
            // Jika terjadi error (misalnya, pengguna membatalkan login),
            // kembalikan ke halaman login dengan pesan error.
            // Anda bisa mencatat error $e->getMessage() untuk debugging.
            return redirect('/login')->with('error', 'Gagal masuk dengan Google. Silakan coba lagi.');
        }
    }
}
