package com.kafe.dto.order;

import com.kafe.domain.enums.OrderStatus;

import java.math.BigDecimal;

public record OrderItemResponse(
        Long id,
        Long menuItemId,
        String menuItemName,
        short quantity,
        BigDecimal unitPrice,
        String notes,
        OrderStatus status
) {}
