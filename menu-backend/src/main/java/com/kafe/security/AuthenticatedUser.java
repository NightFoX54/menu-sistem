package com.kafe.security;

public record AuthenticatedUser(
        Long userId,
        String email,
        Long tenantId,
        String role
) {}
