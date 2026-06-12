package com.kafe.dto.table;

public record TableResponse(
        Long id,
        String name,
        String qrToken,
        Short capacity,
        boolean isActive,
        Long activeSessionId
) {}
