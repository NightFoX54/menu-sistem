package com.kafe.dto.table;

public record QrResolveResponse(
        Long tableId,
        String tableName,
        Long tenantId,
        String tenantSlug,
        String tenantName,
        Long sessionId,
        String sessionStatus
) {}
