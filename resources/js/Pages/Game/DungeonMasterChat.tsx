import { useState, useEffect, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import DmChatPanel from '@/Components/Game/DmChatPanel';
import DmToolsPanel from '@/Components/Game/DmToolsPanel';
import { PageProps } from '@/types';

interface Message {
    id: number;
    role: 'user' | 'assistant' | 'system';
    content: string;
    user?: {
        id: number;
        name: string;
    };
    tokens_used?: number;
    created_at: string;
}

interface DungeonMasterChatProps extends PageProps {
    session: {
        id: number;
        team_code: string;
        current_stage: number;
        status: string;
    };
    conversation: {
        id: number;
        status: string;
        total_tokens: number;
        estimated_cost: number;
    };
    messages: Message[];
    activeRoles: Record<string, string>;
}

export default function DungeonMasterChat({
    auth,
    session,
    conversation,
    messages: initialMessages,
    activeRoles,
}: DungeonMasterChatProps) {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingContent]);

    const handleSendMessage = async (content: string) => {
        // Add user message optimistically
        const tempUserMessage: Message = {
            id: Date.now(),
            role: 'user',
            content,
            user: {
                id: auth.user.id,
                name: auth.user.name,
            },
            created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, tempUserMessage]);
        setIsStreaming(true);
        setStreamingContent('');

        try {
            // Setup SSE connection
            const eventSource = new EventSource(
                `/game/dm/stream?session_id=${session.id}&message=${encodeURIComponent(content)}`
            );

            let fullContent = '';

            eventSource.addEventListener('message', (event) => {
                const data = JSON.parse(event.data);
                fullContent += data.content;
                setStreamingContent(fullContent);
            });

            eventSource.addEventListener('done', (event) => {
                const data = JSON.parse(event.data);

                // Add complete AI message
                const aiMessage: Message = {
                    id: data.message_id,
                    role: 'assistant',
                    content: fullContent,
                    tokens_used: data.tokens,
                    created_at: new Date().toISOString(),
                };

                setMessages((prev) => [...prev, aiMessage]);
                setStreamingContent('');
                setIsStreaming(false);
                eventSource.close();

                // Refresh conversation stats
                router.reload({ only: ['conversation'] });
            });

            eventSource.addEventListener('error', (error) => {
                console.error('SSE Error:', error);
                setIsStreaming(false);
                setStreamingContent('');
                eventSource.close();
            });
        } catch (error) {
            console.error('Failed to send message:', error);
            setIsStreaming(false);
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                            🧙‍♂️ Dungeon Master
                        </h2>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Team: {session.team_code} • Stage {session.current_stage}
                        </p>
                    </div>

                    <div className="text-right">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Total Tokens: {conversation.total_tokens.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                            Est. Cost: ${conversation.estimated_cost.toFixed(6)}
                        </p>
                    </div>
                </div>
            }
        >
            <Head title={`DM Chat - ${session.team_code}`} />

            <div className="py-6">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {/* Main Content */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                        {/* Chat Panel */}
                        <div className="lg:col-span-3">
                            <DmChatPanel
                                messages={messages}
                                streamingContent={streamingContent}
                                isStreaming={isStreaming}
                                onSendMessage={handleSendMessage}
                                currentUserId={auth.user.id}
                            />
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Tools Panel */}
                        <div className="lg:col-span-1">
                            <DmToolsPanel
                                activeRoles={activeRoles}
                                sessionId={session.id}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
