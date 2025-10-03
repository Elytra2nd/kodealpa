<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GrimoireEntryResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'category_id' => $this->category_id,
            'category' => $this->whenLoaded('category', function () {
                return [
                    'id' => $this->category->id,
                    'name' => $this->category->name,
                    'slug' => $this->category->slug,
                    'icon' => $this->category->icon ?? null,
                ];
            }),
            'slug' => $this->slug,
            'title' => $this->title,
            'summary' => $this->summary,
            'content_html' => $this->content_html,
            'file_url' => $this->file_url,
            'file_url_web' => $this->file_url_web,
            'content_type' => $this->content_type,
            'is_pdf' => $this->is_pdf,
            'tags' => $this->tags ?? [],
            'role_access' => $this->role_access,
            'difficulty' => $this->difficulty,
            'is_published' => (bool) $this->is_published,
            'version' => $this->version,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
