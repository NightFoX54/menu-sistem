package com.kafe.repository;

import com.kafe.domain.Order;
import com.kafe.domain.enums.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findAllBySession_IdOrderByCreatedAtAsc(Long sessionId);

    @Query("SELECT o FROM Order o WHERE o.tenant.id = :tenantId AND o.status IN :statuses ORDER BY o.createdAt DESC")
    List<Order> findByTenantIdAndStatusIn(
            @Param("tenantId") Long tenantId,
            @Param("statuses") List<OrderStatus> statuses);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.tenant.id = :tenantId AND o.createdAt >= :from")
    long countTodayOrders(@Param("tenantId") Long tenantId, @Param("from") LocalDateTime from);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.tenant.id = :tenantId AND o.status = :status")
    long countByTenantAndStatus(@Param("tenantId") Long tenantId, @Param("status") OrderStatus status);
}
