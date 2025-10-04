import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

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

interface DmMessageBubbleProps {
    message: Message;
    isOwn: boolean;
    isStreaming?: boolean;
}

export default function DmMessageBubble({
    message,
    isOwn,
    isStreaming = false,
}: DmMessageBubbleProps) {
    const isAssistant = message.role === 'assistant';
    const isSystem = message.role === 'system';

    // Format timestamp
    const timestamp = format(new Date(message.created_at), 'HH:mm', {
        locale: localeId,
    });

    if (isSystem) {
        return (
            <div className="flex justify-center">
                <div className="rounded-lg bg-gray-700/50 px-4 py-2 text-center text-sm text-gray-400">
                    {message.content}
                </div>
            </div>
        );
    }

    return (
        <div className={`flex items-start space-x-3 ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
            {/* Avatar */}
            <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                    isAssistant
                        ? 'bg-purple-600'
                        : isOwn
                        ? 'bg-blue-600'
                        : 'bg-green-600'
                }`}
            >
                <span className="text-xl">
                    {isAssistant ? '🧙‍♂️' : message.user?.name.charAt(0).toUpperCase() || '👤'}
                </span>
            </div>

            {/* Message Content */}
            <div className={`flex max-w-[70%] flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                {/* Sender Name */}
                {!isOwn && (
                    <span className="mb-1 text-xs font-medium text-gray-400">
                        {isAssistant ? 'Dungeon Master' : message.user?.name || 'Unknown'}
                    </span>
                )}

                {/* Message Bubble */}
                <div
                    className={`relative rounded-2xl px-4 py-3 ${
                        isAssistant
                            ? 'bg-gray-700 text-white'
                            : isOwn
                            ? 'bg-blue-600 text-white'
                            : 'bg-green-600 text-white'
                    } ${isStreaming ? 'animate-pulse' : ''}`}
                >
                    {/* Content with proper formatting */}
                    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {message.content}
                    </div>

                    {/* Streaming cursor */}
                    {isStreaming && (
                        <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-white"></span>
                    )}
                </div>

                {/* Metadata */}
                <div className="mt-1 flex items-center space-x-2 text-xs text-gray-500">
                    <span>{timestamp}</span>
                    {message.tokens_used && (
                        <>
                            <span>•</span>
                            <span>{message.tokens_used} tokens</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
