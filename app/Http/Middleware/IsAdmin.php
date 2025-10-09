<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class IsAdmin
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Cek apakah user sudah login dan memiliki flag is_admin
        if (!auth()->check() || !auth()->user()->is_admin) {
            abort(403, 'Unauthorized access');
        }

        return $next($request);
    }
}
