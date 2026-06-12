package com.kafe.dto.menu;

import java.util.List;

public record MenuResponse(
        List<MenuCategoryResponse> categories,
        List<MenuItemResponse> items
) {}
