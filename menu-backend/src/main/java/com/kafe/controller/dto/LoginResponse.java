package com.kafe.controller.dto;

public record LoginResponse(
        String token,
        String role,
        Long tenantId
) {}
