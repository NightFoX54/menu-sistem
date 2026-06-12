package com.kafe.dto.order;

import com.kafe.domain.enums.OrderStatus;

import java.time.LocalDateTime;
import java.util.List;

public record OrderResponse(
        Long id,
        Long sessionId,
        String tableName,
        OrderStatus status,
        String notes,
        String takenByName,
        LocalDateTime createdAt,
        List<OrderItemResponse> items
) {}
