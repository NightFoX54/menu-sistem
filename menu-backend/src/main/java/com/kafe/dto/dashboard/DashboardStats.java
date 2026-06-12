package com.kafe.dto.dashboard;

import java.math.BigDecimal;

public record DashboardStats(
        long activeTables,
        long todayOrders,
        long pendingOrders,
        BigDecimal todayRevenue
) {}
