import { defineConfig, loadEnv } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import mkcert from 'vite-plugin-mkcert';
import path from 'path';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    // ✅ Only require HMR host untuk development
    let hmrHost = env.VITE_HMR_HOST || '';

    // ✅ Jangan throw error jika production build
    if (!hmrHost && mode === 'development') {
        console.warn('WARNING: VITE_HMR_HOST is not defined. Using default localhost.');
        hmrHost = 'localhost';
    }

    // Membersihkan URL
    if (hmrHost) {
        hmrHost = hmrHost.replace(/^(https?:\/\/)?(\/\/)?/, '');
    }

    return {
        plugins: [
            laravel({
                input: 'resources/js/app.tsx',
                ssr: 'resources/js/ssr.tsx',
                refresh: true,
            }),
            react(),
            // ✅ Only use mkcert di development
            mode === 'development' ? mkcert() : null,
        ].filter(Boolean),

        resolve: {
            alias: {
                '@': path.resolve(__dirname, './resources/js'),
            },
        },

        build: {
            rollupOptions: {
                output: {
                    manualChunks: {
                        'react-vendor': ['react', 'react-dom'],
                        'router-vendor': ['@inertiajs/react'],
                        'pdf-vendor': ['react-pdf', 'pdfjs-dist'],
                        'motion-vendor': ['framer-motion'],
                        'ui-vendor': ['sonner'],
                    },
                },
                external: [
                    /^react-pdf\/dist\/esm\/.*\.css$/,
                ],
            },
            chunkSizeWarningLimit: 1000,
            sourcemap: mode === 'development',
            minify: mode === 'production' ? 'esbuild' : false,
        },

        optimizeDeps: {
            include: [
                'react',
                'react-dom',
                '@inertiajs/react',
                'react-pdf',
                'pdfjs-dist',
                'framer-motion',
                'sonner',
            ],
            exclude: [
                'react-pdf/dist/esm/Page/AnnotationLayer.css',
                'react-pdf/dist/esm/Page/TextLayer.css',
            ],
        },

        css: {
            postcss: './postcss.config.js',
            devSourcemap: true,
        },

        // ✅ Only configure server untuk development
        server: mode === 'development' && hmrHost ? {
            https: true,
            host: '0.0.0.0',
            port: 5173,
            strictPort: true,
            origin: `https://${hmrHost}`,
            hmr: {
                host: hmrHost,
                protocol: 'wss',
                clientPort: 443,
            },
            proxy: {
                '^/(?!resources|@vite|@react-refresh|@fs|node_modules).*': {
                    target: 'http://127.0.0.1:8000',
                    changeOrigin: true,
                    secure: false,
                    ws: true,
                    configure: (proxy, options) => {
                        proxy.on('proxyReq', (proxyReq, req, res) => {
                            if (req.headers.host) {
                                proxyReq.setHeader('Host', req.headers.host);
                            }
                            proxyReq.setHeader('X-Forwarded-Proto', 'https');
                            proxyReq.setHeader('X-Forwarded-Host', hmrHost);
                        });
                        proxy.on('error', (err, req, res) => {
                            console.error('Proxy error:', err);
                        });
                    }
                }
            },
            cors: {
                origin: `https://${hmrHost}`,
                credentials: true,
            },
            watch: {
                usePolling: true,
                interval: 100,
            },
        } : undefined,

        preview: {
            https: true,
            host: '0.0.0.0',
            port: 4173,
            strictPort: true,
            cors: true,
        },

        esbuild: {
            logOverride: {
                'this-is-undefined-in-esm': 'silent'
            },
            drop: mode === 'production' ? ['console', 'debugger'] : [],
            minifyIdentifiers: mode === 'production',
            minifySyntax: mode === 'production',
            minifyWhitespace: mode === 'production',
        },
    };
});
