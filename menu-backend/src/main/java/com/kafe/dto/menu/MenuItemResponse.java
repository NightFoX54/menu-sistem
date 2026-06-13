package com.kafe.dto.menu;

import java.math.BigDecimal;
import java.util.List;

public record MenuItemResponse(
        Long id,
        Long categoryId,
        String name,
        String description,
        BigDecimal price,
        String imageUrl,
        boolean isAvailable,
        Short prepTimeMins,
        NutritionInfo nutrition,
        List<MenuItemIngredientInfo> ingredients   // null on public menu, present for admin
) {}
