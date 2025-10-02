import { defineConfig, loadEnv } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import mkcert from 'vite-plugin-mkcert';
import path from 'path';

export default defineConfig(({ mode }) => {
    // Muat variabel dari file .env
    const env = loadEnv(mode, process.cwd(), '');

    // Ambil host dari variabel environment
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

        // ========================================
        // RESOLVE ALIASES
        // ========================================
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './resources/js'),
            },
        },

        // ========================================
        // BUILD CONFIGURATION (Production)
        // ========================================
        build: {
            rollupOptions: {
                output: {
                    // Manual chunks untuk better caching
                    manualChunks: {
                        'react-vendor': ['react', 'react-dom'],
                        'router-vendor': ['@inertiajs/react'],
                        'pdf-vendor': ['react-pdf', 'pdfjs-dist'],
                        'motion-vendor': ['framer-motion'],
                        'ui-vendor': ['sonner'],
                    },
                },
                // ✅ FIX: External CSS imports yang bermasalah
                external: [
                    /^react-pdf\/dist\/esm\/.*\.css$/,
                ],
            },
            // Naikkan warning limit untuk chunks besar
            chunkSizeWarningLimit: 1000,
            // Source maps untuk debugging production
            sourcemap: mode === 'development',
            // Minify untuk production
            minify: mode === 'production' ? 'terser' : false,
            terserOptions: mode === 'production' ? {
                compress: {
                    drop_console: true, // Remove console.log di production
                    drop_debugger: true,
                },
            } : undefined,
        },

        // ========================================
        // OPTIMIZATION DEPENDENCIES
        // ========================================
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
            // ✅ FIX: Exclude CSS yang bermasalah dari optimization
            exclude: [
                'react-pdf/dist/esm/Page/AnnotationLayer.css',
                'react-pdf/dist/esm/Page/TextLayer.css',
            ],
        },

        // ========================================
        // CSS CONFIGURATION
        // ========================================
        css: {
            postcss: './postcss.config.js',
            devSourcemap: true,
        },

        // ========================================
        // SERVER CONFIGURATION (Development)
        // ========================================
        server: {
            https: true,
            host: '0.0.0.0',
            port: 5173,
            strictPort: true,
            origin: `https://${hmrHost}`,

            // HMR Configuration
            hmr: {
                host: hmrHost,
                protocol: 'wss',
                clientPort: 443,
            },

            // Proxy Configuration
            proxy: {
                '^/(?!resources|@vite|@react-refresh|@fs|node_modules).*': {
                    target: 'http://127.0.0.1:8000',
                    changeOrigin: true,
                    secure: false,
                    ws: true, // Enable WebSocket proxying

                    // Custom proxy configuration
                    configure: (proxy, options) => {
                        proxy.on('proxyReq', (proxyReq, req, res) => {
                            // Memaksa proxy mengirimkan header Host yang benar
                            if (req.headers.host) {
                                proxyReq.setHeader('Host', req.headers.host);
                            }

                            // Forward X-Forwarded-* headers
                            proxyReq.setHeader('X-Forwarded-Proto', 'https');
                            proxyReq.setHeader('X-Forwarded-Host', hmrHost);
                        });

                        // Log proxy errors untuk debugging
                        proxy.on('error', (err, req, res) => {
                            console.error('Proxy error:', err);
                        });

                        // Log successful proxy
                        proxy.on('proxyRes', (proxyRes, req, res) => {
                            if (mode === 'development') {
                                console.log(`Proxied: ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
                            }
                        });
                    }
                }
            },

            // CORS Configuration
            cors: {
                origin: `https://${hmrHost}`,
                credentials: true,
            },

            // Watch configuration
            watch: {
                usePolling: true,
                interval: 100,
            },
        },

        // ========================================
        // PREVIEW CONFIGURATION (Production Preview)
        // ========================================
        preview: {
            https: true,
            host: '0.0.0.0',
            port: 4173,
            strictPort: true,
            cors: true,
        },

        // ========================================
        // ESBUILD CONFIGURATION
        // ========================================
        esbuild: {
            logOverride: {
                'this-is-undefined-in-esm': 'silent'
            },
            // Drop console & debugger di production
            drop: mode === 'production' ? ['console', 'debugger'] : [],
        },

        // ========================================
        // PERFORMANCE CONFIGURATION
        // ========================================
        performance: {
            maxEntrypointSize: 512000,
            maxAssetSize: 512000,
        },
    };
});
