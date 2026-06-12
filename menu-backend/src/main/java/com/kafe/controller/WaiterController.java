package com.kafe.controller;

import com.kafe.domain.TableSession;
import com.kafe.dto.menu.MenuResponse;
import com.kafe.dto.table.SessionOpenResponse;
import com.kafe.dto.table.TableResponse;
import com.kafe.exception.TenantAccessException;
import com.kafe.service.MenuService;
import com.kafe.service.QrService;
import com.kafe.service.SessionService;
import com.kafe.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class WaiterController {

    private final QrService qrService;
    private final SessionService sessionService;
    private final MenuService menuService;

    @GetMapping("/api/waiter/tables")
    public ResponseEntity<List<TableResponse>> getTables() {
        return ResponseEntity.ok(qrService.getAllTables());
    }

    /**
     * Garson bir masaya sipariş girmek istediğinde aktif session açar veya mevcutu döner.
     */
    @PostMapping("/api/waiter/tables/{tableId}/session")
    public ResponseEntity<SessionOpenResponse> openSession(@PathVariable Long tableId) {
        TableSession session = sessionService.openSession(tableId);
        // Tenant guard: açılan session bu tenant'a ait olmalı
        Long tenantId = TenantContext.getTenantId();
        if (tenantId != null && !session.getTenant().getId().equals(tenantId)) {
            throw new TenantAccessException();
        }
        return ResponseEntity.ok(new SessionOpenResponse(session.getId(), tableId));
    }

    /**
     * Garsonun kendi tenant menüsünü JWT üzerinden alması.
     */
    @GetMapping("/api/waiter/menu")
    public ResponseEntity<MenuResponse> getMenu() {
        Long tenantId = TenantContext.getTenantId();
        if (tenantId == null) throw new TenantAccessException();
        return ResponseEntity.ok(menuService.getFullMenu(tenantId));
    }
}
