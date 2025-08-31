<?php
namespace App\Http\Controllers;
use App\Models\Stage;

class StageController extends Controller {
    public function index(){ return Stage::with('mission')->get(); }
}
