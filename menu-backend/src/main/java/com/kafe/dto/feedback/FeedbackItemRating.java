package com.kafe.dto.feedback;

import jakarta.validation.constraints.NotNull;

public record FeedbackItemRating(
        @NotNull Long menuItemId,
        boolean liked
) {}
