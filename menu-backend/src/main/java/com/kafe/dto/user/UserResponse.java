package com.kafe.dto.user;

import java.time.LocalDateTime;

public record UserResponse(
        Long id,
        String name,
        String email,
        String role,
        boolean isActive,
        LocalDateTime createdAt
) {}
