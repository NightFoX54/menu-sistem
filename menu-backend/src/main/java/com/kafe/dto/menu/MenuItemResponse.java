package com.kafe.dto.menu;

import java.math.BigDecimal;

public record MenuItemResponse(
        Long id,
        Long categoryId,
        String name,
        String description,
        BigDecimal price,
        String imageUrl,
        boolean isAvailable,
        Short prepTimeMins
) {}
