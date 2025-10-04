<?php

namespace App\Services\Ai;

use Gemini;
use Gemini\Client;
use Gemini\Data\Content;
use Gemini\Data\GenerationConfig;
use Gemini\Enums\Role;

class GeminiService
{
    protected Client $client;
    protected string $model;
    protected int $timeout;

    public function __construct()
    {
        // ⚠️ UPDATE: Ganti default model ke yang masih supported
        $this->model = config('services.gemini.default_model', 'gemini-2.5-flash');
        $this->timeout = config('services.gemini.timeout', 30);

        $this->client = Gemini::factory()
            ->withApiKey(config('services.gemini.api_key'))
            ->withHttpClient(new \GuzzleHttp\Client([
                'timeout' => $this->timeout,
                'connect_timeout' => 10,
            ]))
            ->make();
    }

    /**
     * Generate non-streaming response
     */
    public function generateContent(string $prompt, array $config = []): string
    {
        $response = $this->client
            ->generativeModel(model: $this->model)
            ->generateContent(
                $prompt,
                generationConfig: new GenerationConfig(
                    maxOutputTokens: $config['max_tokens'] ?? 500,
                    temperature: $config['temperature'] ?? 0.7,
                    topP: $config['top_p'] ?? 0.9,
                    topK: $config['top_k'] ?? 40,
                )
            );

        return $response->text();
    }

    /**
     * Generate streaming response untuk SSE
     */
    public function streamGenerateContent(string $prompt, array $config = [])
    {
        return $this->client
            ->generativeModel(model: $this->model)
            ->streamGenerateContent(
                $prompt,
                generationConfig: new GenerationConfig(
                    maxOutputTokens: $config['max_tokens'] ?? 500,
                    temperature: $config['temperature'] ?? 0.7,
                )
            );
    }

    /**
     * Start chat dengan system instruction dan history
     */
    public function startChat(string $systemPrompt = null, array $history = [])
    {
        $contents = [];

        // Convert history ke format Gemini Content
        foreach ($history as $message) {
            $contents[] = Content::parse(
                part: $message['content'],
                role: $message['role'] === 'user' ? Role::USER : Role::MODEL
            );
        }

        $generativeModel = $this->client->generativeModel(model: $this->model);

        if ($systemPrompt) {
            $generativeModel = $generativeModel->withSystemInstruction(
                Content::parse($systemPrompt)
            );
        }

        return $generativeModel->startChat(history: $contents);
    }

    /**
     * Count tokens untuk estimasi cost
     */
    public function countTokens(string $text): int
    {
        $response = $this->client
            ->generativeModel(model: $this->model)
            ->countTokens($text);

        return $response->totalTokens;
    }

    /**
     * Get available models - untuk cek model yang supported
     */
    public function listModels(int $pageSize = 50)
    {
        return $this->client->models()->list(pageSize: $pageSize);
    }
}
