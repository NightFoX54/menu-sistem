package com.kafe.controller;

import com.kafe.domain.TableSession;
import com.kafe.exception.TenantAccessException;
import com.kafe.service.SessionService;
import com.kafe.tenant.TenantContext;
import com.kafe.websocket.OrderWebSocketController;
import com.kafe.websocket.SessionEvent;
import com.kafe.websocket.WaiterNotification;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
public class SessionController {

    private final SessionService sessionService;
    private final OrderWebSocketController wsController;

    /**
     * Müşteri hesap istiyor — garson kanalına bildirim gönderilir.
     * Public endpoint: JWT yok, X-Tenant-Id header ile tenant belirlenir.
     */
    @PostMapping("/{id}/bill-request")
    public ResponseEntity<Void> requestBill(@PathVariable Long id) {
        TableSession session = sessionService.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Oturum bulunamadı"));

        Long tenantId = TenantContext.getTenantId();
        if (tenantId != null && !session.getTenant().getId().equals(tenantId)) {
            throw new TenantAccessException();
        }

        wsController.broadcastWaiterNotification(
                session.getTenant().getId(),
                new WaiterNotification("BILL_REQUESTED", null, session.getId(),
                        session.getTable().getName())
        );

        return ResponseEntity.noContent().build();
    }

    /**
     * Garson ödeme aldıktan sonra oturumu kapatır.
     * SESSION_CLOSED eventi müşteri kanalına yayınlanır.
     */
    @PostMapping("/{id}/close")
    public ResponseEntity<Void> closeSession(@PathVariable Long id) {
        Long tenantId = TenantContext.getTenantId();

        TableSession session = sessionService.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Oturum bulunamadı"));

        if (tenantId != null && !session.getTenant().getId().equals(tenantId)) {
            throw new TenantAccessException();
        }

        sessionService.closeSession(id);

        wsController.broadcastSessionEvent(
                session.getId(),
                new SessionEvent("SESSION_CLOSED", session.getId())
        );

        return ResponseEntity.noContent().build();
    }
}
