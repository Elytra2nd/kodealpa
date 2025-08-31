import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';

export default function Dashboard() {
    const { props } = usePage();
    const user = props.auth?.user;

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Dashboard
                </h2>
            }
        >
            <Head title="Dashboard" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
                    {/* Welcome Section */}
                    <div className="overflow-hidden bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg sm:rounded-lg">
                        <div className="p-8 text-white">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                                <div>
                                    <h1 className="text-3xl font-bold mb-2">
                                        Welcome back, {user?.name}! 👋
                                    </h1>
                                    <p className="text-blue-100 text-lg">
                                        Ready to defuse some bombs and save the day?
                                    </p>
                                </div>
                                <div className="mt-4 md:mt-0">
                                    <div className="text-6xl">💣</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Start Game */}
                        <Link
                            href="/game"
                            className="group block p-6 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
                        >
                            <div className="flex items-start space-x-4">
                                <div className="text-4xl group-hover:animate-bounce">🎮</div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                        Start Game
                                    </h3>
                                    <p className="text-gray-600 mt-2 text-sm">
                                        Create a new bomb defusing session or join an existing game with friends
                                    </p>
                                    <div className="mt-3 text-blue-500 text-sm font-medium group-hover:text-blue-700">
                                        Play Now →
                                    </div>
                                </div>
                            </div>
                        </Link>

                        {/* How to Play */}
                        <div className="group block p-6 bg-white border border-gray-200 rounded-lg hover:border-green-300 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1">
                            <div className="flex items-start space-x-4">
                                <div className="text-4xl group-hover:animate-pulse">📖</div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                                        How to Play
                                    </h3>
                                    <p className="text-gray-600 mt-2 text-sm">
                                        Learn the rules, strategies, and communication tips for successful bomb defusing
                                    </p>
                                    <div className="mt-3 text-green-500 text-sm font-medium group-hover:text-green-700">
                                        Learn More →
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Game Statistics */}
                        <div className="group block p-6 bg-white border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1">
                            <div className="flex items-start space-x-4">
                                <div className="text-4xl group-hover:animate-spin">🏆</div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                                        Statistics
                                    </h3>
                                    <p className="text-gray-600 mt-2 text-sm">
                                        View your game history, success rate, and performance analytics
                                    </p>
                                    <div className="mt-3 text-purple-500 text-sm font-medium group-hover:text-purple-700">
                                        View Stats →
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Game Overview */}
                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* About the Game */}
                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg border border-gray-200">
                            <div className="p-6">
                                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                                    <span className="text-2xl mr-3">🎯</span>
                                    About Keep Talking & Nobody Explodes
                                </h3>
                                <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
                                    <p>
                                        This is a <strong>cooperative puzzle game</strong> where communication is absolutely critical.
                                        One player sees the bomb and must describe it, while the other has the manual and guides
                                        them through defusing it.
                                    </p>
                                    <p>
                                        Work together, stay calm under pressure, and save the day before the timer runs out!
                                    </p>
                                </div>

                                <div className="mt-4 flex space-x-4 text-xs">
                                    <div className="bg-blue-50 px-3 py-1 rounded-full">
                                        <span className="text-blue-700 font-medium">2 Players</span>
                                    </div>
                                    <div className="bg-green-50 px-3 py-1 rounded-full">
                                        <span className="text-green-700 font-medium">Cooperative</span>
                                    </div>
                                    <div className="bg-purple-50 px-3 py-1 rounded-full">
                                        <span className="text-purple-700 font-medium">Communication</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Tips */}
                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg border border-gray-200">
                            <div className="p-6">
                                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                                    <span className="text-2xl mr-3">💡</span>
                                    Quick Tips for Success
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-start space-x-3">
                                        <div className="text-green-500 font-bold text-sm mt-0.5">✓</div>
                                        <p className="text-gray-600 text-sm">
                                            <strong>Clear Communication:</strong> Describe exactly what you see, use precise language
                                        </p>
                                    </div>
                                    <div className="flex items-start space-x-3">
                                        <div className="text-green-500 font-bold text-sm mt-0.5">✓</div>
                                        <p className="text-gray-600 text-sm">
                                            <strong>Double Check:</strong> Always confirm instructions before making any input
                                        </p>
                                    </div>
                                    <div className="flex items-start space-x-3">
                                        <div className="text-green-500 font-bold text-sm mt-0.5">✓</div>
                                        <p className="text-gray-600 text-sm">
                                            <strong>Stay Calm:</strong> Pressure makes mistakes more likely, breathe and focus
                                        </p>
                                    </div>
                                    <div className="flex items-start space-x-3">
                                        <div className="text-green-500 font-bold text-sm mt-0.5">✓</div>
                                        <p className="text-gray-600 text-sm">
                                            <strong>Practice Together:</strong> The more you play, the better your teamwork becomes
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity Placeholder */}
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg border border-gray-200">
                        <div className="p-6">
                            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                                <span className="text-2xl mr-3">📊</span>
                                Recent Activity
                            </h3>
                            <div className="text-center py-8">
                                <div className="text-6xl mb-4">🎮</div>
                                <p className="text-gray-500 text-lg font-medium mb-2">No games played yet</p>
                                <p className="text-gray-400 text-sm mb-6">
                                    Start your first bomb defusing mission to see your activity here
                                </p>
                                <Link
                                    href="/game"
                                    className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                                >
                                    <span className="mr-2">🚀</span>
                                    Play Your First Game
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <div className="text-center">
                            <h4 className="text-lg font-medium text-gray-800 mb-2">
                                Need a Partner?
                            </h4>
                            <p className="text-gray-600 text-sm mb-4">
                                This game requires 2 players. Make sure you have a friend ready to play,
                                and set up voice chat for the best experience!
                            </p>
                            <div className="flex justify-center space-x-6 text-sm text-gray-500">
                                <div className="flex items-center">
                                    <span className="mr-2">🎧</span>
                                    Voice chat recommended
                                </div>
                                <div className="flex items-center">
                                    <span className="mr-2">⏱️</span>
                                    Games last 3-5 minutes
                                </div>
                                <div className="flex items-center">
                                    <span className="mr-2">🧠</span>
                                    Teamwork required
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
