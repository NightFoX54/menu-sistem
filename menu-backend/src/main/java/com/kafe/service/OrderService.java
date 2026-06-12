package com.kafe.service;

import com.kafe.domain.*;
import com.kafe.domain.enums.OrderStatus;
import com.kafe.domain.enums.SessionStatus;
import com.kafe.dto.order.*;
import com.kafe.exception.ResourceNotFoundException;
import com.kafe.exception.TenantAccessException;
import com.kafe.repository.*;
import com.kafe.security.AuthenticatedUser;
import com.kafe.tenant.TenantContext;
import com.kafe.websocket.OrderItemSummary;
import com.kafe.websocket.OrderStatusUpdate;
import com.kafe.websocket.OrderWebSocketController;
import com.kafe.websocket.WaiterNotification;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final TableSessionRepository sessionRepository;
    private final MenuItemRepository menuItemRepository;
    private final UserRepository userRepository;
    private final OrderWebSocketController wsController;
    private final StockService stockService;

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest req) {
        TableSession session = sessionRepository.findById(req.sessionId())
                .orElseThrow(() -> new ResourceNotFoundException("TableSession", req.sessionId()));

        if (session.getStatus() != SessionStatus.OPEN) {
            throw new IllegalArgumentException("Bu oturum kapalı, yeni sipariş verilemez");
        }

        // Cross-tenant: JWT sahibi başka tenant'ın session'ına sipariş ekleyemesin
        Long callerTenantId = TenantContext.getTenantId();
        if (callerTenantId != null && !session.getTenant().getId().equals(callerTenantId)) {
            throw new TenantAccessException();
        }

        Tenant tenant = session.getTenant();

        // Geofencing: tenant'ın konumu varsa ve müşteri konum gönderdiyse doğrula
        if (tenant.getLatitude() != null && tenant.getLongitude() != null
                && req.latitude() != null && req.longitude() != null) {
            double dist = haversineMeters(
                    tenant.getLatitude().doubleValue(), tenant.getLongitude().doubleValue(),
                    req.latitude(), req.longitude());
            if (dist > tenant.getGeofenceRadiusMeters()) {
                throw new IllegalArgumentException(
                        "Siparişi vermek için kafenin " + tenant.getGeofenceRadiusMeters()
                        + " metre yakınında olmanız gerekiyor (şu an: " + Math.round(dist) + " m)");
            }
        }

        User takenBy = null;
        Long currentUserId = extractCurrentUserId();
        if (currentUserId != null) {
            takenBy = userRepository.findById(currentUserId).orElse(null);
        }

        Order order = orderRepository.save(Order.builder()
                .tenant(tenant)
                .session(session)
                .takenBy(takenBy)
                .status(OrderStatus.PENDING)
                .notes(req.notes())
                .build());

        List<OrderItem> savedItems = new ArrayList<>();
        for (OrderItemRequest ir : req.items()) {
            MenuItem menuItem = menuItemRepository.findById(ir.menuItemId())
                    .orElseThrow(() -> new ResourceNotFoundException("MenuItem", ir.menuItemId()));

            // MenuItem'ın bu tenant'a ait olduğunu doğrula
            if (!menuItem.getTenant().getId().equals(tenant.getId())) {
                throw new TenantAccessException();
            }

            savedItems.add(orderItemRepository.save(OrderItem.builder()
                    .order(order)
                    .menuItem(menuItem)
                    .quantity(ir.quantity())
                    .unitPrice(menuItem.getPrice())
                    .notes(ir.notes())
                    .status(OrderStatus.PENDING)
                    .build()));
        }

        OrderResponse response = toResponse(order, savedItems);

        // Yeni sipariş: mutfak ekranını ve masa kanalını haberdar et
        wsController.broadcastOrderUpdate(
                order.getTenant().getId(),
                order.getSession().getId(),
                buildStatusUpdate(order.getId(), OrderStatus.PENDING, savedItems)
        );

        return response;
    }

    @Transactional
    public OrderResponse updateOrderStatus(Long orderId, OrderStatus newStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", orderId));

        Long tenantId = TenantContext.getTenantId();
        if (tenantId != null && !order.getTenant().getId().equals(tenantId)) {
            throw new TenantAccessException();
        }

        order.setStatus(newStatus);
        order = orderRepository.save(order);

        List<OrderItem> items = orderItemRepository.findAllByOrder_IdOrderByCreatedAtAsc(orderId);
        OrderResponse response = toResponse(order, items);

        // WebSocket: mutfak + masa kanalına durum güncellemesi
        wsController.broadcastOrderUpdate(
                order.getTenant().getId(),
                order.getSession().getId(),
                buildStatusUpdate(orderId, newStatus, items)
        );

        // PREPARING → stoktan düş
        if (newStatus == OrderStatus.PREPARING) {
            stockService.deductStock(orderId);
        }

        // READY → garsona bildirim
        if (newStatus == OrderStatus.READY) {
            wsController.broadcastWaiterNotification(
                    order.getTenant().getId(),
                    new WaiterNotification("ORDER_READY", orderId,
                            order.getSession().getId(),
                            order.getSession().getTable().getName())
            );
        }

        return response;
    }

    @Transactional(readOnly = true)
    public BillResponse getSessionBill(Long sessionId) {
        TableSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("TableSession", sessionId));

        List<Order> orders = orderRepository.findAllBySession_IdOrderByCreatedAtAsc(sessionId);

        BigDecimal totalAmount = BigDecimal.ZERO;
        List<OrderResponse> orderResponses = new ArrayList<>();

        for (Order order : orders) {
            List<OrderItem> items = orderItemRepository.findAllByOrder_IdOrderByCreatedAtAsc(order.getId());
            orderResponses.add(toResponse(order, items));

            for (OrderItem item : items) {
                if (item.getStatus() != OrderStatus.CANCELLED) {
                    totalAmount = totalAmount.add(
                            item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()))
                    );
                }
            }
        }

        return new BillResponse(sessionId, session.getTable().getId(), orderResponses, totalAmount);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getOrders(List<String> statusStrings) {
        Long tenantId = TenantContext.getTenantId();
        if (tenantId == null) throw new TenantAccessException();
        List<OrderStatus> statuses = statusStrings.stream()
                .map(s -> OrderStatus.valueOf(s.trim()))
                .toList();
        return orderRepository.findByTenantIdAndStatusIn(tenantId, statuses)
                .stream()
                .map(o -> {
                    List<OrderItem> items =
                            orderItemRepository.findAllByOrder_IdOrderByCreatedAtAsc(o.getId());
                    return toResponse(o, items);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrder(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", id));
        Long tenantId = TenantContext.getTenantId();
        if (tenantId != null && !order.getTenant().getId().equals(tenantId)) {
            throw new TenantAccessException();
        }
        List<OrderItem> items = orderItemRepository.findAllByOrder_IdOrderByCreatedAtAsc(id);
        return toResponse(order, items);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private Long extractCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AuthenticatedUser ap) {
            return ap.userId();
        }
        return null;
    }

    private double haversineMeters(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6_371_000;
        double phi1 = Math.toRadians(lat1), phi2 = Math.toRadians(lat2);
        double dPhi = Math.toRadians(lat2 - lat1);
        double dLam = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dPhi / 2) * Math.sin(dPhi / 2)
                 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) * Math.sin(dLam / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private OrderStatusUpdate buildStatusUpdate(Long orderId, OrderStatus status, List<OrderItem> items) {
        List<OrderItemSummary> summaries = items.stream()
                .map(i -> new OrderItemSummary(
                        i.getId(),
                        i.getMenuItem().getName(),
                        i.getQuantity(),
                        i.getStatus()))
                .toList();
        return new OrderStatusUpdate(orderId, status, LocalDateTime.now(), summaries);
    }

    private OrderResponse toResponse(Order order, List<OrderItem> items) {
        List<OrderItemResponse> itemResponses = items.stream()
                .map(i -> new OrderItemResponse(
                        i.getId(),
                        i.getMenuItem().getId(),
                        i.getMenuItem().getName(),
                        i.getQuantity(),
                        i.getUnitPrice(),
                        i.getNotes(),
                        i.getStatus()))
                .toList();

        String takenByName = order.getTakenBy() != null ? order.getTakenBy().getName() : null;
        String tableName = order.getSession().getTable().getName();

        return new OrderResponse(
                order.getId(),
                order.getSession().getId(),
                tableName,
                order.getStatus(),
                order.getNotes(),
                takenByName,
                order.getCreatedAt(),
                itemResponses);
    }
}
