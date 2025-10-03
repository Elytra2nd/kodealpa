<?php

namespace App\Traits;

use Illuminate\Http\JsonResponse;

trait ApiResponse
{
    /**
     * Return success JSON response
     */
    protected function successResponse(
        mixed $data = null,
        string $message = '',
        int $statusCode = 200
    ): JsonResponse {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'errors' => null
        ], $statusCode);
    }

    /**
     * Return error JSON response
     */
    protected function errorResponse(
        string $message = 'An error occurred',
        int $statusCode = 400,
        array $errors = []
    ): JsonResponse {
        return response()->json([
            'success' => false,
            'message' => $message,
            'data' => null,
            'errors' => empty($errors) ? null : $errors
        ], $statusCode);
    }

    /**
     * Return validation error response
     */
    protected function validationErrorResponse(array $errors): JsonResponse
    {
        return $this->errorResponse(
            'Validation failed',
            422,
            $errors
        );
    }
}
