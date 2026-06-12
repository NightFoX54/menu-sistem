package com.kafe.service;

import com.kafe.domain.Ingredient;
import com.kafe.domain.MenuItem;
import com.kafe.domain.MenuItemIngredient;
import com.kafe.domain.OrderItem;
import com.kafe.exception.ResourceNotFoundException;
import com.kafe.repository.*;
import com.kafe.websocket.MenuAvailabilityUpdate;
import com.kafe.websocket.OrderWebSocketController;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
public class StockService {

    private final OrderItemRepository orderItemRepository;
    private final MenuItemIngredientRepository menuItemIngredientRepository;
    private final IngredientRepository ingredientRepository;
    private final MenuItemRepository menuItemRepository;
    private final OrderWebSocketController wsController;

    /**
     * Order PREPARING durumuna geçince çağrılır.
     * Her order item × recipe miktarı kadar stoktan düşürür.
     * Herhangi bir ingredient sıfıra düşerse, o ingredient'i kullanan
     * tüm menu item'ları pasife alır ve /topic/menu/{tenantId}'e broadcast eder.
     */
    @Transactional
    public void deductStock(Long orderId) {
        List<OrderItem> orderItems =
                orderItemRepository.findAllByOrder_IdOrderByCreatedAtAsc(orderId);

        // Her ingredient için toplam düşülecek miktarı hesapla (aynı ingredient birden fazla item'da olabilir)
        Map<Long, Ingredient> ingredientCache = new LinkedHashMap<>();

        for (OrderItem orderItem : orderItems) {
            List<MenuItemIngredient> recipe = menuItemIngredientRepository
                    .findAllByMenuItemIdWithIngredient(orderItem.getMenuItem().getId());

            for (MenuItemIngredient mii : recipe) {
                Ingredient ing = mii.getIngredient();
                BigDecimal usage = mii.getQuantity()
                        .multiply(BigDecimal.valueOf(orderItem.getQuantity()));
                ing.setStockQuantity(ing.getStockQuantity().subtract(usage));
                ingredientCache.put(ing.getId(), ingredientRepository.save(ing));
            }
        }

        // Stoku tükenen malzemelerin etkilediği ürünleri bul ve deaktive et
        List<Long> deactivated = new ArrayList<>();
        Long tenantId = null;

        for (Ingredient ing : ingredientCache.values()) {
            if (ing.getStockQuantity().compareTo(BigDecimal.ZERO) <= 0) {
                for (MenuItem item : menuItemRepository.findAllByIngredientId(ing.getId())) {
                    if (item.isAvailable()) {
                        item.setAvailable(false);
                        menuItemRepository.save(item);
                        deactivated.add(item.getId());
                        tenantId = item.getTenant().getId();
                    }
                }
            }
        }

        if (!deactivated.isEmpty()) {
            wsController.broadcastMenuAvailability(tenantId,
                    new MenuAvailabilityUpdate(List.of(), deactivated));
        }
    }

    /**
     * Admin stok girişi yapar.
     * Önceden tükenmiş olan bu malzeme artık > 0 olursa:
     *   - Bu malzemeyi kullanan pasif ürünlerin DİĞER malzemelerini de kontrol eder.
     *   - Tüm malzemeleri stokta olan ürünleri yeniden aktive eder.
     */
    @Transactional
    public void restoreStock(Long ingredientId, BigDecimal amount) {
        Ingredient ingredient = ingredientRepository.findById(ingredientId)
                .orElseThrow(() -> new ResourceNotFoundException("Ingredient", ingredientId));

        boolean wasExhausted = ingredient.getStockQuantity().compareTo(BigDecimal.ZERO) <= 0;
        ingredient.setStockQuantity(ingredient.getStockQuantity().add(amount));
        ingredientRepository.save(ingredient);

        // Stok yeni doluysa yeniden aktive edilebilecek ürünleri kontrol et
        if (!wasExhausted || ingredient.getStockQuantity().compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        List<Long> activated = new ArrayList<>();
        Long tenantId = null;

        for (MenuItem item : menuItemRepository.findAllByIngredientId(ingredientId)) {
            if (!item.isAvailable() && allIngredientsInStock(item.getId())) {
                item.setAvailable(true);
                menuItemRepository.save(item);
                activated.add(item.getId());
                tenantId = item.getTenant().getId();
            }
        }

        if (!activated.isEmpty()) {
            wsController.broadcastMenuAvailability(tenantId,
                    new MenuAvailabilityUpdate(activated, List.of()));
        }
    }

    /**
     * Admin fire/kayıp için manuel stok düşürme.
     * Stok sıfırın altına düşerse ilgili ürünler pasife alınır.
     */
    @Transactional
    public void deductManual(Long ingredientId, BigDecimal amount) {
        Ingredient ingredient = ingredientRepository.findById(ingredientId)
                .orElseThrow(() -> new ResourceNotFoundException("Ingredient", ingredientId));
        ingredient.setStockQuantity(ingredient.getStockQuantity().subtract(amount));
        ingredientRepository.save(ingredient);

        if (ingredient.getStockQuantity().compareTo(BigDecimal.ZERO) <= 0) {
            List<Long> deactivated = new ArrayList<>();
            Long tenantId = null;
            for (MenuItem item : menuItemRepository.findAllByIngredientId(ingredientId)) {
                if (item.isAvailable()) {
                    item.setAvailable(false);
                    menuItemRepository.save(item);
                    deactivated.add(item.getId());
                    tenantId = item.getTenant().getId();
                }
            }
            if (!deactivated.isEmpty()) {
                wsController.broadcastMenuAvailability(tenantId,
                        new MenuAvailabilityUpdate(List.of(), deactivated));
            }
        }
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private boolean allIngredientsInStock(Long menuItemId) {
        return menuItemIngredientRepository
                .findAllByMenuItemIdWithIngredient(menuItemId)
                .stream()
                .allMatch(mii -> mii.getIngredient().getStockQuantity()
                        .compareTo(BigDecimal.ZERO) > 0);
    }
}
