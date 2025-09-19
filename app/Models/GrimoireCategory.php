<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GrimoireCategory extends Model {
  protected $fillable = ['slug','title','icon','sort_order'];
  public function entries(): HasMany {
    return $this->hasMany(GrimoireEntry::class, 'category_id');
  }
}
