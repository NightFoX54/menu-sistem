package com.kafe.service;

import com.kafe.domain.MenuCategory;
import com.kafe.domain.MenuItem;
import com.kafe.domain.Tenant;
import com.kafe.dto.menu.*;
import com.kafe.exception.ResourceNotFoundException;
import com.kafe.exception.TenantAccessException;
import com.kafe.repository.MenuCategoryRepository;
import com.kafe.repository.MenuItemRepository;
import com.kafe.repository.TenantRepository;
import com.kafe.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MenuService {

    private final MenuCategoryRepository categoryRepository;
    private final MenuItemRepository itemRepository;
    private final TenantRepository tenantRepository;

    // ── Category ──────────────────────────────────────────────────────────────

    @Transactional
    public MenuCategoryResponse createCategory(MenuCategoryRequest request) {
        Tenant tenant = currentTenant();
        MenuCategory category = MenuCategory.builder()
                .tenant(tenant)
                .name(request.name())
                .displayOrder(request.displayOrder())
                .isActive(true)
                .build();
        return toCategoryResponse(categoryRepository.save(category));
    }

    @Transactional
    public MenuCategoryResponse updateCategory(Long id, MenuCategoryRequest request) {
        MenuCategory category = findCategory(id);
        category.setName(request.name());
        category.setDisplayOrder(request.displayOrder());
        return toCategoryResponse(categoryRepository.save(category));
    }

    @Transactional
    public void toggleCategory(Long id) {
        MenuCategory category = findCategory(id);
        category.setActive(!category.isActive());
        categoryRepository.save(category);
    }

    // ── MenuItem ──────────────────────────────────────────────────────────────

    @Transactional
    public MenuItemResponse createItem(MenuItemRequest request) {
        Tenant tenant = currentTenant();
        MenuCategory category = findCategory(request.categoryId());

        MenuItem item = MenuItem.builder()
                .tenant(tenant)
                .category(category)
                .name(request.name())
                .description(request.description())
                .price(request.price())
                .prepTimeMins(request.prepTimeMins())
                .displayOrder(request.displayOrder())
                .isAvailable(true)
                .build();
        return toItemResponse(itemRepository.save(item));
    }

    @Transactional
    public MenuItemResponse updateItem(Long id, MenuItemRequest request) {
        MenuItem item = findItem(id);
        MenuCategory category = findCategory(request.categoryId());

        item.setCategory(category);
        item.setName(request.name());
        item.setDescription(request.description());
        item.setPrice(request.price());
        item.setPrepTimeMins(request.prepTimeMins());
        item.setDisplayOrder(request.displayOrder());
        return toItemResponse(itemRepository.save(item));
    }

    @Transactional
    public void toggleItem(Long id) {
        MenuItem item = findItem(id);
        item.setAvailable(!item.isAvailable());
        itemRepository.save(item);
    }

    // ── Admin helpers ─────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<MenuCategoryResponse> getAdminCategories() {
        Long tenantId = TenantContext.getTenantId();
        return categoryRepository.findAllByTenant_IdOrderByDisplayOrderAsc(tenantId)
                .stream().map(this::toCategoryResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<MenuItemResponse> getItemsByCategory(Long categoryId) {
        findCategory(categoryId); // validates same tenant
        return itemRepository.findAllByCategory_IdOrderByDisplayOrderAsc(categoryId)
                .stream().map(this::toItemResponse).toList();
    }

    @Transactional
    public MenuItemResponse setItemAvailability(Long id, boolean available) {
        MenuItem item = findItem(id); // validates same tenant
        item.setAvailable(available);
        return toItemResponse(itemRepository.save(item));
    }

    // ── Public menu ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public MenuResponse getFullMenu(Long tenantId) {
        List<MenuCategory> categories =
                categoryRepository.findAllByTenant_IdAndIsActiveTrueOrderByDisplayOrderAsc(tenantId);

        Set<Long> activeCategoryIds = categories.stream()
                .map(MenuCategory::getId)
                .collect(Collectors.toSet());

        List<MenuItemResponse> items =
                itemRepository.findAllByTenant_IdAndIsAvailableTrueOrderByDisplayOrderAsc(tenantId)
                        .stream()
                        .filter(i -> activeCategoryIds.contains(i.getCategory().getId()))
                        .map(this::toItemResponse)
                        .toList();

        List<MenuCategoryResponse> categoryResponses = categories.stream()
                .map(this::toCategoryResponse)
                .toList();

        return new MenuResponse(categoryResponses, items);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private Tenant currentTenant() {
        Long tenantId = TenantContext.getTenantId();
        return tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant", tenantId));
    }

    private MenuCategory findCategory(Long id) {
        MenuCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MenuCategory", id));
        assertSameTenant(category.getTenant().getId());
        return category;
    }

    private MenuItem findItem(Long id) {
        MenuItem item = itemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MenuItem", id));
        assertSameTenant(item.getTenant().getId());
        return item;
    }

    private void assertSameTenant(Long resourceTenantId) {
        if (!resourceTenantId.equals(TenantContext.getTenantId())) {
            throw new TenantAccessException();
        }
    }

    private MenuCategoryResponse toCategoryResponse(MenuCategory c) {
        return new MenuCategoryResponse(c.getId(), c.getName(), c.getDisplayOrder(), c.isActive());
    }

    private MenuItemResponse toItemResponse(MenuItem i) {
        return new MenuItemResponse(
                i.getId(),
                i.getCategory().getId(),
                i.getName(),
                i.getDescription(),
                i.getPrice(),
                i.getImageUrl(),
                i.isAvailable(),
                i.getPrepTimeMins()
        );
    }
}
