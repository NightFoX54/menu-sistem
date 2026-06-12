package com.kafe.controller;

import com.kafe.dto.menu.*;
import com.kafe.exception.ResourceNotFoundException;
import com.kafe.repository.TenantRepository;
import com.kafe.service.MenuService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class MenuController {

    private final MenuService menuService;
    private final TenantRepository tenantRepository;

    // ── Public: müşteri QR menüsü ─────────────────────────────────────────────

    @GetMapping("/api/menu/{tenantSlug}")
    public ResponseEntity<MenuResponse> getFullMenu(@PathVariable String tenantSlug) {
        Long tenantId = tenantRepository.findBySlug(tenantSlug)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant slug ile bulunamadı: " + tenantSlug))
                .getId();
        return ResponseEntity.ok(menuService.getFullMenu(tenantId));
    }

    // ── Admin: kategori yönetimi ───────────────────────────────────────────────

    @GetMapping("/api/admin/categories")
    public ResponseEntity<List<MenuCategoryResponse>> getAdminCategories() {
        return ResponseEntity.ok(menuService.getAdminCategories());
    }

    @PostMapping("/api/admin/categories")
    public ResponseEntity<MenuCategoryResponse> createCategory(@RequestBody @Valid MenuCategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(menuService.createCategory(request));
    }

    @PutMapping("/api/admin/categories/{id}")
    public ResponseEntity<MenuCategoryResponse> updateCategory(@PathVariable Long id,
                                                               @RequestBody @Valid MenuCategoryRequest request) {
        return ResponseEntity.ok(menuService.updateCategory(id, request));
    }

    @DeleteMapping("/api/admin/categories/{id}")
    public ResponseEntity<Void> toggleCategory(@PathVariable Long id) {
        menuService.toggleCategory(id);
        return ResponseEntity.noContent().build();
    }

    // ── Admin: ürün yönetimi ──────────────────────────────────────────────────

    @GetMapping("/api/admin/categories/{id}/items")
    public ResponseEntity<List<MenuItemResponse>> getItemsByCategory(@PathVariable Long id) {
        return ResponseEntity.ok(menuService.getItemsByCategory(id));
    }

    @PatchMapping("/api/admin/items/{id}/availability")
    public ResponseEntity<MenuItemResponse> setAvailability(@PathVariable Long id,
                                                             @RequestBody @Valid AvailabilityRequest request) {
        return ResponseEntity.ok(menuService.setItemAvailability(id, request.isAvailable()));
    }

    @PostMapping("/api/admin/items")
    public ResponseEntity<MenuItemResponse> createItem(@RequestBody @Valid MenuItemRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(menuService.createItem(request));
    }

    @PutMapping("/api/admin/items/{id}")
    public ResponseEntity<MenuItemResponse> updateItem(@PathVariable Long id,
                                                       @RequestBody @Valid MenuItemRequest request) {
        return ResponseEntity.ok(menuService.updateItem(id, request));
    }

    @DeleteMapping("/api/admin/items/{id}")
    public ResponseEntity<Void> toggleItem(@PathVariable Long id) {
        menuService.toggleItem(id);
        return ResponseEntity.noContent().build();
    }
}
