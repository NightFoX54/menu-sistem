package com.kafe.dto.menu;

import jakarta.validation.constraints.NotNull;

public record AvailabilityRequest(@NotNull Boolean isAvailable) {}
