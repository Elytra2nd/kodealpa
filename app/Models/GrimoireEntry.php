<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class GrimoireEntry extends Model
{
    protected $fillable = [
        'category_id',
        'slug',
        'title',
        'summary',
        'content_html',
        'tags',
        'file_url',       // URL eksternal atau path relatif
        'pdf_path',       // Path file yang diupload ke storage/app/public/pdfs
        'content_type',   // MIME type, ex: application/pdf
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
    protected $appends = ['is_pdf', 'file_url_web', 'pdf_url'];

    public function category(): BelongsTo
    {
        return $this->belongsTo(GrimoireCategory::class, 'category_id');
    }

    /* ===== Accessors & Mutators ===== */

    // Accessor: true jika content_type PDF atau URL/path berakhiran .pdf
    protected function isPdf(): Attribute
    {
        return Attribute::make(
            get: function ($value, array $attributes) {
                $ct  = strtolower((string)($attributes['content_type'] ?? ''));
                $url = (string)($attributes['file_url'] ?? '');
                $path = (string)($attributes['pdf_path'] ?? '');

                return Str::startsWith($ct, 'application/pdf')
                    || (bool) preg_match('/\.pdf($|\?)/i', $url)
                    || (bool) preg_match('/\.pdf$/i', $path);
            }
        );
    }

    // Mutator untuk menormalkan penyimpanan file_url (eksternal/static URL)
    protected function fileUrl(): Attribute
    {
        return Attribute::make(
            set: function ($value) {
                $s = trim((string)($value ?? ''));
                if ($s === '') return null;
                $s = str_replace('\\', '/', $s);

                // URL absolut
                if (Str::startsWith($s, ['http://', 'https://', '//'])) {
                    return $s;
                }
                // Root-relative path
                if (Str::startsWith($s, '/')) {
                    return $s;
                }
                // Relative path dengan folder
                if (Str::contains($s, '/')) {
                    return '/' . ltrim($s, '/');
                }
                // Hanya nama file - asumsikan folder default
                return '/files/grimoire/pdfs/' . rawurlencode($s);
            }
        );
    }

    // Accessor: URL web untuk file_url yang sudah siap dipakai (prioritas pertama)
    protected function fileUrlWeb(): Attribute
    {
        return Attribute::make(
            get: function ($value, array $attributes) {
                // Prioritas 1: Gunakan pdf_path (uploaded file) jika ada
                $pdfPath = (string)($attributes['pdf_path'] ?? '');
                if ($pdfPath !== '') {
                    return Storage::disk('public')->url($pdfPath);
                }

                // Prioritas 2: Gunakan file_url (eksternal/static)
                $u = (string)($attributes['file_url'] ?? '');
                if ($u === '') return null;
                $u = str_replace('\\', '/', trim($u));

                if (Str::startsWith($u, ['http://', 'https://', '//'])) return $u;
                if (Str::startsWith($u, '/')) return $u;
                if (Str::contains($u, '/')) return '/' . ltrim($u, '/');
                return '/files/grimoire/pdfs/' . rawurlencode($u);
            }
        );
    }

    // Accessor: URL untuk PDF yang diupload (pdf_path)
    protected function pdfUrl(): Attribute
    {
        return Attribute::make(
            get: function ($value, array $attributes) {
                $path = (string)($attributes['pdf_path'] ?? '');
                if ($path === '') return null;

                return Storage::disk('public')->url($path);
            }
        );
    }

    // Auto-set content_type jika file_url atau pdf_path berakhiran .pdf
    protected function contentType(): Attribute
    {
        return Attribute::make(
            set: function ($value, array $attributes) {
                $v = (string)($value ?? '');
                if ($v !== '') return $v;

                $url = (string)($attributes['file_url'] ?? '');
                $path = (string)($attributes['pdf_path'] ?? '');

                if (preg_match('/\.pdf($|\?)/i', $url) || preg_match('/\.pdf$/i', $path)) {
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
        if ($role && in_array($role, ['defuser', 'expert'], true)) {
            return $q->whereIn('role_access', [$role, 'all']);
        }
        return $q;
    }

    public function scopeSearchTerm(Builder $q, ?string $term): Builder
    {
        if ($term !== null && $term !== '') {
            $like = '%' . $term . '%';
            return $q->where(fn($x) => $x->where('title', 'like', $like)->orWhere('summary', 'like', $like));
        }
        return $q;
    }

    // Hanya PDF: content_type mengandung application/pdf ATAU ekstensi .pdf di file_url/pdf_path
    public function scopePdfOnly(Builder $q): Builder
    {
        return $q->where(function ($x) {
            $x->where('content_type', 'like', 'application/pdf%')
              ->orWhere('file_url', 'like', '%.pdf%')
              ->orWhere('pdf_path', 'like', '%.pdf%');
        });
    }
}
