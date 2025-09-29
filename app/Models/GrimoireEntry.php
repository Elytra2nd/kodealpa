<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Support\Str;

class GrimoireEntry extends Model
{
    protected $fillable = [
        'category_id',
        'slug',
        'title',
        'summary',
        'content_html',
        'tags',
        'file_url',       // URL atau path yang akan dinormalisasi
        'content_type',   // MIME, ex: application/pdf
        'role_access',
        'difficulty',
        'is_published',
        'version',
    ];

    // Laravel 12+ merekomendasikan casts() method
    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'is_published' => 'boolean',
        ];
    }

    // Tambah atribut terhitung agar selalu ikut di JSON
    protected $appends = ['is_pdf', 'file_url_web'];

    public function category(): BelongsTo
    {
        return $this->belongsTo(GrimoireCategory::class, 'category_id');
    }

    // Accessor: true jika content_type PDF atau URL berakhiran .pdf
    protected function isPdf(): Attribute
    {
        return Attribute::make(
            get: function ($value, array $attributes) {
                $ct  = strtolower((string)($attributes['content_type'] ?? ''));
                $url = (string)($attributes['file_url'] ?? '');
                return Str::startsWith($ct, 'application/pdf')
                    || (bool) preg_match('/\.pdf($|\?)/i', $url);
            }
        );
    }

    // Mutator untuk menormalkan penyimpanan file_url
    // - backslash → slash
    // - absolut (http/https//) dibiarkan apa adanya
    // - root-relative ('/files/...') dibiarkan
    // - relative ('files/...') dipaksa jadi root-relative
    // - hanya nama file ('aturan.pdf') dipetakan ke folder default
    protected function fileUrl(): Attribute
    {
        return Attribute::make(
            set: function ($value) {
                $s = trim((string)($value ?? ''));
                if ($s === '') return null;
                $s = str_replace('\\', '/', $s);

                if (Str::startsWith($s, ['http://','https://','//'])) {
                    return $s;
                }
                if (Str::startsWith($s, '/')) {
                    return $s;
                }
                if (Str::contains($s, '/')) {
                    return '/'.ltrim($s, '/');
                }
                // hanya nama file
                return '/files/grimoire/pdfs/'.rawurlencode($s);
            }
        );
    }

    // Accessor: URL web yang sudah siap dipakai iframe (root-relative atau absolut)
    protected function fileUrlWeb(): Attribute
    {
        return Attribute::make(
            get: function ($value, array $attributes) {
                $u = (string)($attributes['file_url'] ?? '');
                if ($u === '') return null;
                $u = str_replace('\\', '/', trim($u));

                if (Str::startsWith($u, ['http://','https://','//'])) return $u; // absolut
                if (Str::startsWith($u, '/')) return $u;                         // root-relative
                if (Str::contains($u, '/')) return '/'.ltrim($u, '/');           // relative path
                return '/files/grimoire/pdfs/'.rawurlencode($u);                 // nama file
            }
        );
    }

    // Opsional: set content_type otomatis bila file_url berakhiran .pdf
    protected function contentType(): Attribute
    {
        return Attribute::make(
            set: function ($value, array $attributes) {
                $v = (string)($value ?? '');
                if ($v !== '') return $v;
                $url = (string)($attributes['file_url'] ?? '');
                if (preg_match('/\.pdf($|\?)/i', $url)) {
                    return 'application/pdf';
                }
                return null;
            }
        );
    }

    /* ===== Local scopes ===== */

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

    // Hanya PDF: content_type mengandung application/pdf ATAU ekstensi .pdf
    public function scopePdfOnly(Builder $q): Builder
    {
        return $q->where(function ($x) {
            $x->where('content_type', 'like', 'application/pdf%')
              ->orWhere('file_url', 'like', '%.pdf%');
        });
    }
}
