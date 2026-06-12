package com.kafe.websocket;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/**
 * Servis katmanından çağrılan WebSocket yayın noktası.
 * /topic/kitchen/{tenantId}  — mutfak ekranı (yeni sipariş + durum)
 * /topic/table/{sessionId}   — müşteri / garson (anlık durum)
 * /topic/menu/{tenantId}     — menü stok değişimi (isAvailable toggle)
 */
@Component
@RequiredArgsConstructor
public class OrderWebSocketController {

    private final SimpMessagingTemplate messaging;

    public void broadcastOrderUpdate(Long tenantId, Long sessionId, OrderStatusUpdate payload) {
        messaging.convertAndSend("/topic/kitchen/" + tenantId, payload);
        messaging.convertAndSend("/topic/table/" + sessionId, payload);
    }

    public void broadcastMenuAvailability(Long tenantId, MenuAvailabilityUpdate payload) {
        messaging.convertAndSend("/topic/menu/" + tenantId, payload);
    }

    /** Garson kanalı: ORDER_READY, BILL_REQUESTED */
    public void broadcastWaiterNotification(Long tenantId, WaiterNotification payload) {
        messaging.convertAndSend("/topic/waiter/" + tenantId, payload);
    }

    /** Müşteri session kanalı: SESSION_CLOSED */
    public void broadcastSessionEvent(Long sessionId, SessionEvent payload) {
        messaging.convertAndSend("/topic/session/" + sessionId, payload);
    }
}
