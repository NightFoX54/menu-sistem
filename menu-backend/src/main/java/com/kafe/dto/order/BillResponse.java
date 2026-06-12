package com.kafe.dto.order;

import java.math.BigDecimal;
import java.util.List;

public record BillResponse(
        Long sessionId,
        Long tableId,
        List<OrderResponse> orders,
        BigDecimal totalAmount
) {}
