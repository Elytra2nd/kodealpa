<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;

class GrimoireEntry extends Model
{
    protected $fillable = [
        'category_id',
        'slug',
        'title',
        'summary',
        'content_html',
        'tags',
        'file_url',        // baru: lokasi file publik (mis. /files/grimoire/pdfs/aturan.pdf)
        'content_type',    // baru: MIME, ex: application/pdf
        'role_access',
        'difficulty',
        'is_published',
        'version',
    ];

    protected $casts = [
        'tags' => 'array',
        'is_published' => 'boolean',
    ];

    // Otomatis ikut di JSON agar klien tahu ini PDF
    protected $appends = ['is_pdf'];

    public function category(): BelongsTo
    {
        return $this->belongsTo(GrimoireCategory::class, 'category_id');
    }

    // Accessor: is_pdf => true jika content_type PDF atau URL berakhiran .pdf
    protected function isPdf(): Attribute
    {
        return Attribute::get(function () {
            $ct = strtolower((string) ($this->content_type ?? ''));
            $url = (string) ($this->file_url ?? '');
            return $ct === 'application/pdf' || (bool) preg_match('/\.pdf($|\?)/i', $url);
        });
    }

    /* ===== Local scopes opsional untuk merapikan controller ===== */

    public function scopePublished(Builder $q): Builder
    {
        return $q->where('is_published', true);
    }

    public function scopeForCategorySlug(Builder $q, ?string $slug): Builder
    {
        return $slug ? $q->whereHas('category', fn($x) => $x->where('slug', $slug)) : $q;
    }

    public function scopeForRole(Builder $q, ?string $role): Builder
    {
        if ($role && in_array($role, ['defuser','expert'], true)) {
            return $q->whereIn('role_access', [$role, 'all']);
        }
        return $q;
    }

    public function scopeSearchTerm(Builder $q, ?string $term): Builder
    {
        if ($term !== null && $term !== '') {
            $like = '%'.$term.'%';
            return $q->where(fn($x) => $x->where('title','like',$like)->orWhere('summary','like',$like));
        }
        return $q;
    }

    public function scopePdfOnly(Builder $q): Builder
    {
        return $q->where(function ($x) {
            $x->where('content_type', 'application/pdf')
              ->orWhere(function ($y) {
                  $y->whereNotNull('file_url')
                    ->where('file_url', 'like', '%.pdf%');
              });
        });
    }
}
