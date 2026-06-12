package com.kafe.service;

import com.kafe.domain.enums.OrderStatus;
import com.kafe.domain.enums.SessionStatus;
import com.kafe.dto.dashboard.DashboardStats;
import com.kafe.exception.TenantAccessException;
import com.kafe.repository.OrderItemRepository;
import com.kafe.repository.OrderRepository;
import com.kafe.repository.TableSessionRepository;
import com.kafe.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final TableSessionRepository sessionRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;

    @Transactional(readOnly = true)
    public DashboardStats getStats() {
        Long tenantId = TenantContext.getTenantId();
        if (tenantId == null) throw new TenantAccessException();

        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();

        long activeTables = sessionRepository.countByTenant_IdAndStatus(tenantId, SessionStatus.OPEN);
        long todayOrders  = orderRepository.countTodayOrders(tenantId, startOfDay);
        long pendingOrders = orderRepository.countByTenantAndStatus(tenantId, OrderStatus.PENDING);

        BigDecimal revenue = orderItemRepository
                .findForRevenue(tenantId, startOfDay, OrderStatus.CANCELLED)
                .stream()
                .map(oi -> oi.getUnitPrice().multiply(BigDecimal.valueOf(oi.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new DashboardStats(activeTables, todayOrders, pendingOrders, revenue);
    }
}
