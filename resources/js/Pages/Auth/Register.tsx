import React, { FormEventHandler, useEffect, HTMLAttributes, useState } from 'react';

// --- KOMPONEN LOKAL & MOCKS UNTUK MENGATASI ERROR RESOLUSI PATH ---

// Komponen InputError didefinisikan secara lokal.
const InputError = ({ message, className = '', ...props }: HTMLAttributes<HTMLParagraphElement> & { message?: string }) => {
    return message ? (
        <p {...props} className={'text-sm text-red-500 ' + className}>
            {message}
        </p>
    ) : null;
};

// Mock untuk komponen Inertia.js untuk mengatasi masalah build environment.
const Head = ({ title }: { title: string }) => {
    useEffect(() => {
        document.title = title;
    }, [title]);
    return null;
};

const Link = ({ href, className, children }: { href: string | undefined; className?: string; children: React.ReactNode }) => {
    return <a href={href} className={className}>{children}</a>;
};

// Asumsi 'route' adalah fungsi global yang tersedia di window.
declare const route: any;

const useForm = <T extends Record<string, unknown>>(initialValues: T) => {
    const [data, setDataState] = useState<T>(initialValues);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

    const setData = <K extends keyof T>(key: K, value: T[K]) => {
        setDataState(currentData => ({ ...currentData, [key]: value }));
    };

    const post = (url: string) => {
        setProcessing(true);
        setErrors({});

        // Ini adalah simulasi. Dalam aplikasi nyata, Inertia akan menangani ini.
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = url;

        const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
        if(csrfToken) {
            const csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = '_token';
            csrfInput.value = csrfToken;
            form.appendChild(csrfInput);
        }

        for (const key in data) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = String(data[key]);
            form.appendChild(input);
        }

        document.body.appendChild(form);
        form.submit();
    };

    const reset = (...fields: (keyof T)[]) => {
        const resetData = { ...data };
        fields.forEach(field => {
            resetData[field] = initialValues[field];
        });
        setDataState(resetData);
    };

    return { data, setData, post, processing, errors, reset };
};


// --- SVG IKON ---
const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
    </svg>
);

const LockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
);

const MailIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
        <rect width="20" height="16" x="2" y="4" rx="2"></rect>
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
    </svg>
);

const GoogleIcon = () => (
    <svg className="mr-3 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
        <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 109.8 512 0 402.2 0 261.8S109.8 11.8 244 11.8c73.2 0 136.1 27.6 182.2 71.7l-69.5 69.5c-22.3-21.5-54.7-36.8-96.2-36.8-85.1 0-154.3 69.1-154.3 154.3s69.1 154.3 154.3 154.3c97.2 0 132.3-59.5 137.9-90.6H244v-86h244c2.6 13.2 4.1 27.2 4.1 42.2z"></path>
    </svg>
);

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    useEffect(() => {
        return () => {
            reset('password', 'password_confirmation');
        };
    }, []);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('register'));
    };

    return (
        <>
            {/* Menambahkan Google Font dan Keyframe Animasi */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Roboto:wght@400&display=swap');

                body {
                    font-family: 'Roboto', sans-serif;
                }

                @keyframes fadeInDown {
                    0% {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fade-in-down {
                    animation: fadeInDown 0.8s ease-out forwards;
                }
            `}</style>

            <Head title="Daftar Petualang Baru" />

            <div className="flex min-h-screen items-center justify-center bg-slate-900 bg-cover bg-center p-4" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/dark-stone-wall.png')" }}>
                <div className="w-full max-w-md animate-fade-in-down rounded-lg border-2 border-amber-900/50 bg-slate-800/80 p-8 shadow-2xl shadow-amber-900/20 backdrop-blur-sm">
                    <div className="text-center">
                        <h1 className="font-['Cinzel'] text-4xl font-bold text-amber-500 drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)]">
                            Daftar Petualang
                        </h1>
                        <p className="mt-2 text-slate-400">Buat akun untuk memulai petualangan epik Anda.</p>
                    </div>

                    <form onSubmit={submit} className="mt-8 space-y-6">
                        {/* Input Nama */}
                        <div>
                            <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-300 font-['Cinzel']">
                                Nama Panggilan
                            </label>
                            <div className="relative">
                                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <UserIcon />
                                </span>
                                <input
                                    id="name"
                                    type="text"
                                    name="name"
                                    value={data.name}
                                    className="block w-full rounded-md border-slate-600 bg-slate-900/50 py-3 pl-10 pr-3 text-slate-200 ring-1 ring-inset ring-slate-700 transition duration-300 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500"
                                    autoComplete="name"
                                    required
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="Contoh: Ksatria Baja"
                                />
                            </div>
                            <InputError message={errors.name} className="mt-2" />
                        </div>

                        {/* Input Email */}
                        <div>
                            <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-300 font-['Cinzel']">
                                Alamat Email
                            </label>
                            <div className="relative">
                                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <MailIcon />
                                </span>
                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    value={data.email}
                                    className="block w-full rounded-md border-slate-600 bg-slate-900/50 py-3 pl-10 pr-3 text-slate-200 ring-1 ring-inset ring-slate-700 transition duration-300 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500"
                                    autoComplete="username"
                                    required
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="nama@petualang.com"
                                />
                            </div>
                            <InputError message={errors.email} className="mt-2" />
                        </div>

                        {/* Input Password */}
                        <div>
                            <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-300 font-['Cinzel']">
                                Kata Sandi
                            </label>
                            <div className="relative">
                                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <LockIcon />
                                </span>
                                <input
                                    id="password"
                                    type="password"
                                    name="password"
                                    value={data.password}
                                    className="block w-full rounded-md border-slate-600 bg-slate-900/50 py-3 pl-10 pr-3 text-slate-200 ring-1 ring-inset ring-slate-700 transition duration-300 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500"
                                    autoComplete="new-password"
                                    required
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="••••••••"
                                />
                            </div>
                            <InputError message={errors.password} className="mt-2" />
                        </div>

                        {/* Input Konfirmasi Password */}
                        <div>
                            <label htmlFor="password_confirmation" className="mb-2 block text-sm font-medium text-slate-300 font-['Cinzel']">
                                Konfirmasi Kata Sandi
                            </label>
                            <div className="relative">
                                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <LockIcon />
                                </span>
                                <input
                                    id="password_confirmation"
                                    type="password"
                                    name="password_confirmation"
                                    value={data.password_confirmation}
                                    className="block w-full rounded-md border-slate-600 bg-slate-900/50 py-3 pl-10 pr-3 text-slate-200 ring-1 ring-inset ring-slate-700 transition duration-300 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500"
                                    autoComplete="new-password"
                                    required
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    placeholder="••••••••"
                                />
                            </div>
                            <InputError message={errors.password_confirmation} className="mt-2" />
                        </div>


                        {/* Tombol Daftar Utama */}
                        <button
                            type="submit"
                            className="group relative flex w-full justify-center rounded-md border border-transparent bg-amber-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-amber-900/30 transition duration-300 hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50"
                            disabled={processing}
                        >
                            {processing ? 'Memproses...' : 'DAFTAR'}
                        </button>
                    </form>

                    {/* Pemisah */}
                    <div className="my-6 flex items-center">
                        <div className="flex-grow border-t border-slate-700"></div>
                        <span className="mx-4 flex-shrink text-xs font-bold text-slate-500">ATAU</span>
                        <div className="flex-grow border-t border-slate-700"></div>
                    </div>

                    {/* Tombol Daftar dengan Google */}
                    <a
                        href={route('google.redirect')}
                        className="flex w-full items-center justify-center rounded-md border border-slate-600 bg-slate-700/50 px-4 py-3 text-sm font-medium text-slate-200 shadow-md shadow-slate-900/50 transition duration-300 hover:border-slate-400 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                    >
                        <GoogleIcon />
                        Daftar dengan Google
                    </a>

                    <p className="mt-8 text-center text-sm text-slate-400">
                        Sudah punya akun?{' '}
                        <Link href={route('login')} className="font-medium text-amber-500 transition hover:text-amber-400">
                            Masuk di sini
                        </Link>
                    </p>
                </div>
            </div>
        </>
    );
}

