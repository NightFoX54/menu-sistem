package com.kafe.controller.dto;

public record RegisterResponse(
        Long tenantId,
        String slug
) {}
