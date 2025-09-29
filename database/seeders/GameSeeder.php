<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\{Mission, Stage};

class GameSeeder extends Seeder
{
    public function run(): void
    {
        // ===============================
        // Mission 1 - Basic Training
        // ===============================
        $mission1 = Mission::updateOrCreate(
            ['code' => 'BASIC_01'],
            [
                'title' => 'Basic Training',
                'description' => 'Learn the basics of bomb defusing with simple symbol puzzles.'
            ]
        );

        Stage::updateOrCreate(
            ['mission_id' => $mission1->id, 'name' => 'Symbol Recognition Stage'],
            [
                'config' => [
                    'timeLimit' => 180,
                    'puzzles' => [
                        [
                            'key' => 'symbols_basic',
                            'symbols' => ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ'],
                            'mapping' => [
                                'α' => 'A', 'β' => 'B', 'γ' => 'C', 'δ' => 'D',
                                'ε' => 'E', 'ζ' => 'F', 'η' => 'G', 'θ' => 'H'
                            ]
                        ]
                    ]
                ]
            ]
        );

        // ===============================
        // Mission 2 - Fun Logic Challenges
        // ===============================
        $mission2 = Mission::updateOrCreate(
            ['code' => 'KIDS_01'],
            [
                'title' => 'Tantangan Logika Seru',
                'description' => 'Permainan teka-teki yang seru dan mudah dipahami untuk anak SD-SMP. Mari belajar sambil bermain!'
            ]
        );

        // Stage 2A - Pattern Recognition
        Stage::updateOrCreate(
            ['mission_id' => $mission2->id, 'name' => 'Mencari Pola Angka'],
            [
                'config' => [
                    'timeLimit' => 300,
                    'difficulty' => 'mudah',
                    'learningObjectives' => [
                        'Menemukan pola angka yang sederhana',
                        'Berpikir tentang angka selanjutnya',
                        'Bekerja sama dengan teman untuk memecahkan teka-teki'
                    ],
                    'puzzles' => [
                        [
                            'key' => 'pola_mudah',
                            'type' => 'pattern_analysis',
                            'title' => 'Angka Apa Selanjutnya?',
                            'description' => 'Lihat deret angka ini. Kamu bisa menebak angka selanjutnya?',
                            'sequences' => [
                                ['id' => 1, 'pattern' => [1, 2, 3, 4, '?'], 'rule' => 'Angka naik satu-satu', 'answer' => 5, 'category' => 'menghitung_sederhana'],
                                ['id' => 2, 'pattern' => [2, 4, 6, 8, '?'], 'rule' => 'Angka naik dua-dua', 'answer' => 10, 'category' => 'kelipatan_dua'],
                                ['id' => 3, 'pattern' => [5, 10, 15, 20, '?'], 'rule' => 'Angka naik lima-lima', 'answer' => 25, 'category' => 'kelipatan_lima'],
                                ['id' => 4, 'pattern' => [10, 20, 30, 40, '?'], 'rule' => 'Angka naik sepuluh-sepuluh', 'answer' => 50, 'category' => 'kelipatan_sepuluh'],
                            ],
                            'hints' => [
                                'Coba lihat berapa selisih antar angka',
                                'Apakah angkanya naik dengan jumlah yang sama?',
                                'Kalau kamu lanjutkan polanya, angka apa yang muncul?'
                            ]
                        ]
                    ]
                ]
            ]
        );

        // Stage 2B - Simple Logic
        Stage::updateOrCreate(
            ['mission_id' => $mission2->id, 'name' => 'Tebak Kode Rahasia'],
            [
                'config' => [
                    'timeLimit' => 240,
                    'difficulty' => 'mudah',
                    'learningObjectives' => [
                        'Memahami petunjuk sederhana',
                        'Berkomunikasi dengan jelas',
                        'Memecahkan masalah bersama-sama'
                    ],
                    'puzzles' => [
                        [
                            'key' => 'kode_rahasia',
                            'type' => 'code_analysis',
                            'title' => 'Temukan Kesalahan',
                            'description' => 'Ada yang salah dengan cara menghitung ini. Bisakah kamu membantu menemukannya?',
                            'codeSnippet' => [
                                'Aturan: Tambahkan angka dari kecil ke besar',
                                '1. Ambil angka pertama: 5',
                                '2. Ambil angka kedua: 3',
                                '3. Bandingkan: 5 lebih besar dari 3?',
                                '4. Jadi 5 harus di belakang 3',
                                '5. Hasil: 3, 5'
                            ],
                            'testInput' => [5, 3],
                            'expectedOutput' => [3, 5],
                            'bugs' => [
                                [
                                    'line' => 4,
                                    'type' => 'kesalahan_logika',
                                    'description' => 'Salah mengurutkan',
                                    'hint' => 'Kalau 5 lebih besar dari 3, mana yang harus di depan?'
                                ]
                            ],
                            'solutions' => [
                                [
                                    'line' => 4,
                                    'correct' => 'Jadi 5 harus di depan 3'
                                ]
                            ]
                        ]
                    ]
                ]
            ]
        );

        // Stage 2C - Tree Navigation
        Stage::updateOrCreate(
            ['mission_id' => $mission2->id, 'name' => 'Jelajahi Pohon Angka'],
            [
                'config' => [
                    'timeLimit' => 360,
                    'difficulty' => 'mudah',
                    'learningObjectives' => [
                        'Memahami cara kerja pohon angka',
                        'Belajar arah kiri dan kanan',
                        'Bekerja sama mencari jalan'
                    ],
                    'puzzles' => [
                        [
                            'key' => 'pohon_angka',
                            'type' => 'navigation_challenge',
                            'title' => 'Cari Jalan ke Angka',
                            'description' => 'Kamu harus mencari jalan ke angka tertentu. Teman kamu punya peta!',
                            'tree' => [
                                'root' => [
                                    'value' => 10,
                                    'left' => [
                                        'value' => 5,
                                        'left' => ['value' => 2, 'left' => null, 'right' => null],
                                        'right' => ['value' => 7, 'left' => null, 'right' => null]
                                    ],
                                    'right' => [
                                        'value' => 15,
                                        'left' => ['value' => 12, 'left' => null, 'right' => null],
                                        'right' => ['value' => 18, 'left' => null, 'right' => null]
                                    ]
                                ]
                            ],
                            'challenges' => [
                                ['task' => 'Cari jalan ke angka 7', 'answer' => ['root', 'left', 'right'], 'explanation' => 'Mulai dari 10, ke kiri jadi 5, lalu ke kanan jadi 7'],
                                ['task' => 'Cari jalan ke angka 12', 'answer' => ['root', 'right', 'left'], 'explanation' => 'Mulai dari 10, ke kanan jadi 15, lalu ke kiri jadi 12']
                            ],
                            'traversalMethods' => [
                                'urutan_kecil_ke_besar' => [2, 5, 7, 10, 12, 15, 18],
                                'urutan_dari_atas' => [10, 5, 2, 7, 15, 12, 18]
                            ]
                        ]
                    ]
                ]
            ]
        );

        // Stage 2D - Color Pattern
        Stage::updateOrCreate(
            ['mission_id' => $mission2->id, 'name' => 'Pola Warna Seru'],
            [
                'config' => [
                    'timeLimit' => 240,
                    'difficulty' => 'mudah',
                    'learningObjectives' => [
                        'Mengenali pola warna',
                        'Mengingat urutan',
                        'Komunikasi visual dengan teman'
                    ],
                    'puzzles' => [
                        [
                            'key' => 'pola_warna',
                            'type' => 'pattern_analysis',
                            'title' => 'Warna Apa Selanjutnya?',
                            'description' => 'Lihat pola warna ini. Warna apa yang hilang?',
                            'sequences' => [
                                ['id' => 1, 'pattern' => ['Merah', 'Biru', 'Merah', 'Biru', '?'], 'rule' => 'Merah dan Biru bergantian', 'answer' => 'Merah', 'category' => 'pola_bergantian'],
                                ['id' => 2, 'pattern' => ['Hijau', 'Hijau', 'Kuning', 'Hijau', 'Hijau', '?'], 'rule' => 'Dua Hijau, satu Kuning, berulang', 'answer' => 'Kuning', 'category' => 'pola_berulang']
                            ],
                            'hints' => [
                                'Lihat apakah warnanya berulang',
                                'Hitung berapa kali muncul setiap warna',
                                'Coba baca dari awal lagi'
                            ]
                        ]
                    ]
                ]
            ]
        );
    }
}
