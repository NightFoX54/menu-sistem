package com.kafe.exception;

public class TenantAccessException extends RuntimeException {

    public TenantAccessException() {
        super("Bu kaynağa erişim yetkiniz yok");
    }

    public TenantAccessException(String message) {
        super(message);
    }
}
