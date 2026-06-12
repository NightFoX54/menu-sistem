package com.kafe.websocket;

public record SessionEvent(
        String type,       // SESSION_CLOSED
        Long sessionId
) {}
