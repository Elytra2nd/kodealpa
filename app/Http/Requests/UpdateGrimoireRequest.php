<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;

class UpdateGrimoireRequest extends FormRequest
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
        $entryId = $this->route('id');

        return [
            'category_id'  => 'sometimes|required|exists:grimoire_categories,id',
            'slug'         => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('grimoire_entries', 'slug')->ignore($entryId),
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/'
            ],
            'title'        => 'sometimes|required|string|max:255',
            'summary'      => 'nullable|string|max:1000',
            'content_html' => 'sometimes|required_without:file_url|string',
            'file_url'     => [
                'sometimes',
                'required_without:content_html',
                'string',
                'regex:/^(https?:\/\/|\/)?[^\s]+\.pdf(\?.*)?$/i'
            ],
            'content_type' => 'sometimes|nullable|string|in:html,pdf',
            'tags'         => 'sometimes|array',
            'tags.*'       => 'string|max:50',
            'role_access'  => 'sometimes|required|in:defuser,expert,all',
            'difficulty'   => 'sometimes|required|in:beginner,intermediate,advanced',
            'is_published' => 'boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'category_id.exists' => 'Kategori yang dipilih tidak valid',
            'slug.unique' => 'Slug sudah digunakan entry lain',
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
