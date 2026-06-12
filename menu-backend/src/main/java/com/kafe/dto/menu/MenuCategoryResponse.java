package com.kafe.dto.menu;

public record MenuCategoryResponse(
        Long id,
        String name,
        short displayOrder,
        boolean isActive
) {}
