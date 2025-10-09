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
            'slug' => $this->slug,
            'title' => $this->title,
            'summary' => $this->summary,
            'content_html' => $this->content_html,
            'tags' => $this->tags,
            'pdf_path' => $this->pdf_path,
            'pdf_url' => $this->pdf_url, // ✅ Dari accessor model
            'file_url_web' => $this->file_url_web, // ✅ Backward compatibility
            'is_pdf' => $this->is_pdf,
            'role_access' => $this->role_access,
            'difficulty' => $this->difficulty,
            'is_published' => $this->is_published,
            'version' => $this->version,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'category' => [
                'id' => $this->category->id,
                'name' => $this->category->title ?? $this->category->name,
                'slug' => $this->category->slug,
                'icon' => $this->category->icon,
            ],
        ];
    }
}
