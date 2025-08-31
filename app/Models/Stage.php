<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Stage extends Model {
    protected $fillable=['mission_id','name','config'];
    protected $casts=['config'=>'array'];
    public function mission(){ return $this->belongsTo(Mission::class); }
}
