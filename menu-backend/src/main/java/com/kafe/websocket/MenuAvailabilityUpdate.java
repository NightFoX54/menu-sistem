package com.kafe.websocket;

import java.util.List;

/**
 * /topic/menu/{tenantId} kanalına yayılan payload.
 * activated  → stok gelince yeniden aktif edilen ürün id'leri
 * deactivated → stok tükenince pasife alınan ürün id'leri
 */
public record MenuAvailabilityUpdate(
        List<Long> activated,
        List<Long> deactivated
) {}
