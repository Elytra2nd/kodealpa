<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class StoreGrimoireRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('tags') && is_string($this->tags)) {
            $this->merge([
                'tags' => json_decode($this->tags, true) ?? []
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'category_id'  => 'required|exists:grimoire_categories,id',
            'slug'         => 'required|string|max:255|unique:grimoire_entries,slug|regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
            'title'        => 'required|string|max:255',
            'summary'      => 'nullable|string|max:1000',
            'content_html' => 'required_without:file_url|string',
            'file_url'     => [
                'required_without:content_html',
                'string',
                'regex:/^(https?:\/\/|\/)?[^\s]+\.pdf(\?.*)?$/i'
            ],
            'content_type' => 'nullable|string|in:html,pdf',
            'tags'         => 'nullable|array',
            'tags.*'       => 'string|max:50',
            'role_access'  => 'required|in:defuser,expert,all',
            'difficulty'   => 'required|in:beginner,intermediate,advanced',
            'is_published' => 'boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'category_id.required' => 'Kategori grimoire wajib dipilih',
            'category_id.exists' => 'Kategori yang dipilih tidak valid',
            'slug.required' => 'Slug wajib diisi',
            'slug.unique' => 'Slug sudah digunakan entry lain',
            'title.required' => 'Judul grimoire wajib diisi',
        ];
    }

    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'data' => null,
                'errors' => $validator->errors()
            ], 422)
        );
    }
}
