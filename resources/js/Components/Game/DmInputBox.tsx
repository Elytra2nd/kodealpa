import { useState, useRef, KeyboardEvent } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';

interface DmInputBoxProps {
    onSend: (content: string) => void;
    disabled?: boolean;
}

export default function DmInputBox({ onSend, disabled = false }: DmInputBoxProps) {
    const [message, setMessage] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSubmit = () => {
        if (!message.trim() || disabled) return;

        onSend(message.trim());
        setMessage('');

        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    // Auto-resize textarea
    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMessage(e.target.value);

        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    };

    return (
        <div className="border-t border-gray-700 bg-gray-800/50 p-4">
            <div className="flex items-end space-x-3">
                {/* Input Textarea */}
                <div className="flex-1">
                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        placeholder="Tanyakan sesuatu kepada DM..."
                        disabled={disabled}
                        rows={1}
                        className="w-full resize-none rounded-lg border-gray-600 bg-gray-700 px-4 py-3 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ maxHeight: '150px' }}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Tekan Enter untuk kirim, Shift+Enter untuk baris baru
                    </p>
                </div>

                {/* Send Button */}
                <button
                    onClick={handleSubmit}
                    disabled={!message.trim() || disabled}
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-purple-600 text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <PaperAirplaneIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}
