<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Mission extends Model {
    protected $fillable = ['code','title','description'];
    public function stages(){ return $this->hasMany(Stage::class); }
}
