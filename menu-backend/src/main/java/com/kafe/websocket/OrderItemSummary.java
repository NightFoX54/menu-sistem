package com.kafe.websocket;

import com.kafe.domain.enums.OrderStatus;

public record OrderItemSummary(
        Long id,
        String name,
        short quantity,
        OrderStatus status
) {}
