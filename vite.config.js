import { defineConfig, loadEnv } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig(({ mode }) => {
    // Muat variabel dari file .env
    const env = loadEnv(mode, process.cwd(), '');

    // Ambil host dari variabel environment.
    let hmrHost = env.VITE_HMR_HOST;

    // Pemeriksaan penting
    if (!hmrHost) {
        throw new Error('ERROR: VITE_HMR_HOST is not defined in your .env file.');
    }

    // Membersihkan URL
    hmrHost = hmrHost.replace(/^(https?:\/\/)?(\/\/)?/, '');

    return {
        plugins: [
            laravel({
                input: 'resources/js/app.tsx',
                ssr: 'resources/js/ssr.tsx',
                refresh: true,
            }),
            react(),
            mkcert()
        ],
        server: {
            https: true,
            host: '0.0.0.0',
            origin: `https://${hmrHost}`,
            hmr: {
                host: hmrHost,
                protocol: 'wss',
            },
            proxy: {
                '^/(?!resources|@vite|@react-refresh|@fs|node_modules).*': {
                    target: 'http://127.0.0.1:8000',
                    changeOrigin: true,
                    // ==========================================================
                    // TAMBAHKAN BLOK INI
                    // Ini memaksa proxy untuk mengirimkan header Host yang benar
                    // ke Laravel, sehingga Laravel menghasilkan URL yang benar.
                    // ==========================================================
                    configure: (proxy, options) => {
                        proxy.on('proxyReq', (proxyReq, req, res) => {
                            if (req.headers.host) {
                                proxyReq.setHeader('Host', req.headers.host);
                            }
                        });
                    }
                }
            }
        },
    };
});
