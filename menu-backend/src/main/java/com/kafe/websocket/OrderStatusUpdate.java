package com.kafe.websocket;

import com.kafe.domain.enums.OrderStatus;

import java.time.LocalDateTime;
import java.util.List;

public record OrderStatusUpdate(
        Long orderId,
        OrderStatus newStatus,
        LocalDateTime updatedAt,
        List<OrderItemSummary> items
) {}
