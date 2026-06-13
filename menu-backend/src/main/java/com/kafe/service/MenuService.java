package com.kafe.service;

import com.kafe.domain.*;
import com.kafe.domain.enums.IngredientUnit;
import com.kafe.dto.menu.*;
import com.kafe.exception.ResourceNotFoundException;
import com.kafe.exception.TenantAccessException;
import com.kafe.repository.*;
import com.kafe.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MenuService {

    private final MenuCategoryRepository categoryRepository;
    private final MenuItemRepository itemRepository;
    private final TenantRepository tenantRepository;
    private final MenuItemIngredientRepository menuItemIngredientRepository;
    private final IngredientRepository ingredientRepository;

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

        MenuItem item = itemRepository.save(MenuItem.builder()
                .tenant(tenant)
                .category(category)
                .name(request.name())
                .description(request.description())
                .price(request.price())
                .prepTimeMins(request.prepTimeMins())
                .displayOrder(request.displayOrder())
                .isAvailable(true)
                .build());

        List<MenuItemIngredient> links = saveIngredientLinks(item, request.ingredients());
        return toItemResponse(item, links, true);
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
        itemRepository.save(item);

        // Replace ingredient links
        menuItemIngredientRepository.deleteAllByMenuItemId(id);
        List<MenuItemIngredient> links = saveIngredientLinks(item, request.ingredients());
        return toItemResponse(item, links, true);
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
        List<MenuItem> items = itemRepository.findAllByCategory_IdOrderByDisplayOrderAsc(categoryId);
        if (items.isEmpty()) return List.of();

        List<Long> ids = items.stream().map(MenuItem::getId).toList();
        Map<Long, List<MenuItemIngredient>> linkMap = groupLinksByItemId(ids);

        return items.stream()
                .map(i -> toItemResponse(i, linkMap.getOrDefault(i.getId(), List.of()), true))
                .toList();
    }

    @Transactional
    public MenuItemResponse setItemAvailability(Long id, boolean available) {
        MenuItem item = findItem(id);
        item.setAvailable(available);
        itemRepository.save(item);
        List<MenuItemIngredient> links = menuItemIngredientRepository.findAllByMenuItemIdWithIngredient(id);
        return toItemResponse(item, links, true);
    }

    // ── Public menu ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public MenuResponse getFullMenu(Long tenantId) {
        List<MenuCategory> categories =
                categoryRepository.findAllByTenant_IdAndIsActiveTrueOrderByDisplayOrderAsc(tenantId);

        Set<Long> activeCategoryIds = categories.stream()
                .map(MenuCategory::getId)
                .collect(Collectors.toSet());

        List<MenuItem> items =
                itemRepository.findAllByTenant_IdAndIsAvailableTrueOrderByDisplayOrderAsc(tenantId)
                        .stream()
                        .filter(i -> activeCategoryIds.contains(i.getCategory().getId()))
                        .toList();

        List<MenuItemResponse> itemResponses;
        if (items.isEmpty()) {
            itemResponses = List.of();
        } else {
            List<Long> ids = items.stream().map(MenuItem::getId).toList();
            Map<Long, List<MenuItemIngredient>> linkMap = groupLinksByItemId(ids);
            itemResponses = items.stream()
                    .map(i -> toItemResponse(i, linkMap.getOrDefault(i.getId(), List.of()), false))
                    .toList();
        }

        List<MenuCategoryResponse> categoryResponses = categories.stream()
                .map(this::toCategoryResponse)
                .toList();

        return new MenuResponse(categoryResponses, itemResponses);
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

    private List<MenuItemIngredient> saveIngredientLinks(MenuItem item,
                                                          List<MenuItemIngredientRequest> requests) {
        if (requests == null || requests.isEmpty()) return List.of();
        List<MenuItemIngredient> saved = new ArrayList<>();
        for (MenuItemIngredientRequest ir : requests) {
            Ingredient ingredient = ingredientRepository.findById(ir.ingredientId())
                    .orElseThrow(() -> new ResourceNotFoundException("Ingredient", ir.ingredientId()));
            if (!ingredient.getTenant().getId().equals(item.getTenant().getId())) {
                throw new TenantAccessException();
            }
            saved.add(menuItemIngredientRepository.save(MenuItemIngredient.builder()
                    .menuItem(item)
                    .ingredient(ingredient)
                    .quantity(ir.quantity())
                    .build()));
        }
        return saved;
    }

    private Map<Long, List<MenuItemIngredient>> groupLinksByItemId(List<Long> itemIds) {
        return menuItemIngredientRepository
                .findAllByMenuItemIdsWithIngredient(itemIds)
                .stream()
                .collect(Collectors.groupingBy(mii -> mii.getMenuItem().getId()));
    }

    /**
     * Malzeme miktarı için birime göre besin katkı çarpanı:
     * GRAM/ML → qty / 100  (değerler 100g veya 100ml başına)
     * KG/LITRE → qty × 10  (1kg=1000g → 1000/100=10)
     * PIECE → qty           (değerler 1 adet başına)
     */
    private BigDecimal nutritionFactor(BigDecimal qty, IngredientUnit unit) {
        return switch (unit) {
            case GRAM, ML -> qty.divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP);
            case KG, LITRE -> qty.multiply(BigDecimal.TEN);
            case PIECE -> qty;
        };
    }

    private NutritionInfo computeNutrition(List<MenuItemIngredient> links) {
        if (links.isEmpty()) return null;

        BigDecimal calories = BigDecimal.ZERO;
        BigDecimal protein  = BigDecimal.ZERO;
        BigDecimal fat      = BigDecimal.ZERO;
        BigDecimal carbs    = BigDecimal.ZERO;
        boolean hasAny = false;

        for (MenuItemIngredient mii : links) {
            Ingredient ing = mii.getIngredient();
            BigDecimal factor = nutritionFactor(mii.getQuantity(), ing.getUnit());
            if (ing.getCaloriesPer() != null) { calories = calories.add(ing.getCaloriesPer().multiply(factor)); hasAny = true; }
            if (ing.getProteinPer()  != null) { protein  = protein .add(ing.getProteinPer() .multiply(factor)); hasAny = true; }
            if (ing.getFatPer()      != null) { fat      = fat     .add(ing.getFatPer()     .multiply(factor)); hasAny = true; }
            if (ing.getCarbsPer()    != null) { carbs    = carbs   .add(ing.getCarbsPer()   .multiply(factor)); hasAny = true; }
        }

        if (!hasAny) return null;

        return new NutritionInfo(
                calories.setScale(1, RoundingMode.HALF_UP),
                protein .setScale(1, RoundingMode.HALF_UP),
                fat     .setScale(1, RoundingMode.HALF_UP),
                carbs   .setScale(1, RoundingMode.HALF_UP));
    }

    private MenuCategoryResponse toCategoryResponse(MenuCategory c) {
        return new MenuCategoryResponse(c.getId(), c.getName(), c.getDisplayOrder(), c.isActive());
    }

    private MenuItemResponse toItemResponse(MenuItem i, List<MenuItemIngredient> links,
                                             boolean includeIngredients) {
        NutritionInfo nutrition = computeNutrition(links);

        List<MenuItemIngredientInfo> ingredientInfos = null;
        if (includeIngredients) {
            ingredientInfos = links.stream()
                    .map(mii -> new MenuItemIngredientInfo(
                            mii.getIngredient().getId(),
                            mii.getIngredient().getName(),
                            mii.getIngredient().getUnit(),
                            mii.getQuantity()))
                    .toList();
        }

        return new MenuItemResponse(
                i.getId(),
                i.getCategory().getId(),
                i.getName(),
                i.getDescription(),
                i.getPrice(),
                i.getImageUrl(),
                i.isAvailable(),
                i.getPrepTimeMins(),
                nutrition,
                ingredientInfos);
    }
}
