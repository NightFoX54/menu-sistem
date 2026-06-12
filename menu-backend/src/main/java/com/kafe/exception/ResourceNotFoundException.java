package com.kafe.exception;

public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String resourceName, Long id) {
        super(resourceName + " bulunamadı, id: " + id);
    }

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
