import { useState, useRef, useEffect } from 'react';
import DmMessageBubble from './DmMessageBubble';
import DmInputBox from './DmInputBox';

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

interface DmChatPanelProps {
    messages: Message[];
    streamingContent: string;
    isStreaming: boolean;
    onSendMessage: (content: string) => void;
    currentUserId: number;
}

export default function DmChatPanel({
    messages,
    streamingContent,
    isStreaming,
    onSendMessage,
    currentUserId,
}: DmChatPanelProps) {
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll saat ada message baru
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, streamingContent]);

    return (
        <div className="flex h-[calc(100vh-12rem)] flex-col overflow-hidden rounded-lg border border-gray-700 bg-gray-800 shadow-xl">
            {/* Chat Messages Area */}
            <div
                ref={chatContainerRef}
                className="flex-1 space-y-4 overflow-y-auto p-6 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600"
            >
                {messages.length === 0 && (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                            <div className="mb-4 text-6xl">🧙‍♂️</div>
                            <h3 className="mb-2 text-xl font-semibold text-white">
                                Selamat datang di Dungeon Master
                            </h3>
                            <p className="text-gray-400">
                                Tanyakan apa saja untuk memulai petualangan peer learning!
                            </p>
                        </div>
                    </div>
                )}

                {messages.map((message) => (
                    <DmMessageBubble
                        key={message.id}
                        message={message}
                        isOwn={message.user?.id === currentUserId}
                    />
                ))}

                {/* Streaming Message */}
                {isStreaming && streamingContent && (
                    <DmMessageBubble
                        message={{
                            id: 0,
                            role: 'assistant',
                            content: streamingContent,
                            created_at: new Date().toISOString(),
                        }}
                        isOwn={false}
                        isStreaming={true}
                    />
                )}

                {/* Loading indicator */}
                {isStreaming && !streamingContent && (
                    <div className="flex items-start space-x-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-purple-600">
                            <span className="text-xl">🧙‍♂️</span>
                        </div>
                        <div className="flex items-center space-x-2 rounded-2xl bg-gray-700 px-4 py-3">
                            <div className="flex space-x-1">
                                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]"></div>
                                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]"></div>
                                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Box */}
            <DmInputBox onSend={onSendMessage} disabled={isStreaming} />
        </div>
    );
}
