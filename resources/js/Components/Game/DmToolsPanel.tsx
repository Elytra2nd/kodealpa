import { useState } from 'react';
import { UserGroupIcon, ClockIcon, BookOpenIcon } from '@heroicons/react/24/outline';

interface DmToolsPanelProps {
    activeRoles: Record<string, string>;
    sessionId: number;
}

export default function DmToolsPanel({ activeRoles, sessionId }: DmToolsPanelProps) {
    const [showRoleInfo, setShowRoleInfo] = useState(false);

    return (
        <div className="space-y-4">
            {/* Active Roles Card */}
            <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-lg">
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center text-lg font-semibold text-white">
                        <UserGroupIcon className="mr-2 h-5 w-5 text-purple-400" />
                        Peran Aktif
                    </h3>
                    <button
                        onClick={() => setShowRoleInfo(!showRoleInfo)}
                        className="text-xs text-purple-400 hover:text-purple-300"
                    >
                        {showRoleInfo ? 'Tutup' : 'Info'}
                    </button>
                </div>

                <div className="space-y-2">
                    {Object.entries(activeRoles).length > 0 ? (
                        Object.entries(activeRoles).map(([role, player]) => (
                            <div
                                key={role}
                                className="flex items-center justify-between rounded-lg bg-gray-700 p-3"
                            >
                                <div>
                                    <p className="text-sm font-medium text-white">{role}</p>
                                    <p className="text-xs text-gray-400">{player}</p>
                                </div>
                                <div className="h-2 w-2 rounded-full bg-green-400"></div>
                            </div>
                        ))
                    ) : (
                        <div className="rounded-lg bg-gray-700 p-4 text-center">
                            <p className="text-sm text-gray-400">
                                Belum ada peran yang diassign
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                                Tanyakan DM untuk assign peran
                            </p>
                        </div>
                    )}
                </div>

                {/* Role Info */}
                {showRoleInfo && (
                    <div className="mt-4 space-y-2 rounded-lg bg-gray-700/50 p-3 text-xs text-gray-300">
                        <p className="font-semibold text-purple-400">Tentang Peran:</p>
                        <ul className="space-y-1 pl-4">
                            <li>• <strong>Pengamat Simbol:</strong> Analisis visual & pattern</li>
                            <li>• <strong>Pembaca Mantra:</strong> Pahami teks & instruksi</li>
                            <li>• <strong>Penjaga Waktu:</strong> Kelola diskusi & summary</li>
                        </ul>
                    </div>
                )}
            </div>

            {/* Quick Actions Card */}
            <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-lg">
                <h3 className="mb-3 flex items-center text-lg font-semibold text-white">
                    <ClockIcon className="mr-2 h-5 w-5 text-blue-400" />
                    Aksi Cepat
                </h3>

                <div className="space-y-2">
                    <button className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                        Minta Rotasi Peran
                    </button>
                    <button className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700">
                        Simpan Ringkasan Ronde
                    </button>
                    <button className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700">
                        Saran Pair Learning
                    </button>
                </div>
            </div>

            {/* Learning Tips Card */}
            <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-lg">
                <h3 className="mb-3 flex items-center text-lg font-semibold text-white">
                    <BookOpenIcon className="mr-2 h-5 w-5 text-yellow-400" />
                    Tips Peer Learning
                </h3>

                <ul className="space-y-2 text-xs text-gray-300">
                    <li className="flex items-start">
                        <span className="mr-2 text-yellow-400">💡</span>
                        <span>Diskusikan minimal 2 hipotesis sebelum implementasi</span>
                    </li>
                    <li className="flex items-start">
                        <span className="mr-2 text-yellow-400">🎯</span>
                        <span>Pastikan semua anggota berkontribusi dalam diskusi</span>
                    </li>
                    <li className="flex items-start">
                        <span className="mr-2 text-yellow-400">🔄</span>
                        <span>Rotasi peran setiap ronde untuk meratakan pembelajaran</span>
                    </li>
                    <li className="flex items-start">
                        <span className="mr-2 text-yellow-400">📝</span>
                        <span>Dokumentasikan keputusan dan alasannya</span>
                    </li>
                </ul>
            </div>
        </div>
    );
}
