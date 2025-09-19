<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GrimoireEntry extends Model {
  protected $fillable = [
    'category_id','slug','title','summary','content_html','tags',
    'role_access','difficulty','is_published','version'
  ];
  protected $casts = ['tags' => 'array', 'is_published'=>'boolean'];
  public function category(): BelongsTo {
    return $this->belongsTo(GrimoireCategory::class, 'category_id');
  }
}
