package com.kafe.dto.feedback;

public record FeedbackItemResponse(Long menuItemId, String menuItemName, boolean liked) {}
