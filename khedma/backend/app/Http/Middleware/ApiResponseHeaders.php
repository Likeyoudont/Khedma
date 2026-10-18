<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ApiResponseHeaders
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);
        if ($request->is('api/*')) {
            $response->headers->set('X-Content-Type-Options', 'nosniff');
            $response->headers->set('Referrer-Policy', 'no-referrer');
            if ($request->is('api/auth/*', 'api/bookings', 'api/bookings/*')) {
                $response->headers->set('Cache-Control', 'no-store, private');
            }
        }
        return $response;
    }
}
