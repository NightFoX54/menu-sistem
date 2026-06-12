package com.kafe.service;

import com.kafe.domain.Ingredient;
import com.kafe.domain.Tenant;
import com.kafe.dto.ingredient.IngredientRequest;
import com.kafe.dto.ingredient.IngredientResponse;
import com.kafe.dto.menu.MenuItemResponse;
import com.kafe.exception.ResourceNotFoundException;
import com.kafe.exception.TenantAccessException;
import com.kafe.repository.IngredientRepository;
import com.kafe.repository.MenuItemRepository;
import com.kafe.repository.TenantRepository;
import com.kafe.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class IngredientService {

    private final IngredientRepository ingredientRepository;
    private final MenuItemRepository menuItemRepository;
    private final TenantRepository tenantRepository;

    @Transactional(readOnly = true)
    public List<IngredientResponse> getAll() {
        return ingredientRepository
                .findAllByTenant_IdOrderByNameAsc(TenantContext.getTenantId())
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public IngredientResponse create(IngredientRequest request) {
        Long tenantId = TenantContext.getTenantId();
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant", tenantId));

        return toResponse(ingredientRepository.save(Ingredient.builder()
                .tenant(tenant)
                .name(request.name())
                .unit(request.unit())
                .stockQuantity(request.stockQuantity())
                .lowStockThreshold(request.lowStockThreshold())
                .build()));
    }

    @Transactional
    public IngredientResponse update(Long id, IngredientRequest request) {
        Ingredient ingredient = findOwned(id);
        ingredient.setName(request.name());
        ingredient.setUnit(request.unit());
        ingredient.setLowStockThreshold(request.lowStockThreshold());
        // stockQuantity sadece restoreStock ile değiştirilir, burada dokunulmaz
        return toResponse(ingredientRepository.save(ingredient));
    }

    @Transactional(readOnly = true)
    public List<MenuItemResponse> getItemsUsingIngredient(Long id) {
        findOwned(id); // tenant guard
        return menuItemRepository.findAllByIngredientId(id)
                .stream()
                .map(i -> new MenuItemResponse(
                        i.getId(), i.getCategory().getId(), i.getName(),
                        i.getDescription(), i.getPrice(), i.getImageUrl(),
                        i.isAvailable(), i.getPrepTimeMins()))
                .toList();
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private Ingredient findOwned(Long id) {
        Ingredient ingredient = ingredientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ingredient", id));
        if (!ingredient.getTenant().getId().equals(TenantContext.getTenantId())) {
            throw new TenantAccessException();
        }
        return ingredient;
    }

    private IngredientResponse toResponse(Ingredient i) {
        return new IngredientResponse(
                i.getId(), i.getName(), i.getUnit(),
                i.getStockQuantity(), i.getLowStockThreshold());
    }
}
