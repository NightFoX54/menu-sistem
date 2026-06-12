package com.kafe.repository;

import com.kafe.domain.OrderItem;
import com.kafe.domain.enums.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    List<OrderItem> findAllByOrder_IdOrderByCreatedAtAsc(Long orderId);

    @Query("SELECT oi FROM OrderItem oi WHERE oi.order.tenant.id = :tenantId AND oi.order.createdAt >= :from AND oi.status <> :cancelled")
    List<OrderItem> findForRevenue(
            @Param("tenantId") Long tenantId,
            @Param("from") LocalDateTime from,
            @Param("cancelled") OrderStatus cancelled);
}
