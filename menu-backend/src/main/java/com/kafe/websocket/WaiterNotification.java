package com.kafe.websocket;

public record WaiterNotification(
        String type,       // ORDER_READY | BILL_REQUESTED
        Long orderId,
        Long sessionId,
        String tableName
) {}
