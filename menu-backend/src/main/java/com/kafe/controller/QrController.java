package com.kafe.controller;

import com.kafe.dto.table.QrResolveResponse;
import com.kafe.service.QrService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/qr")
@RequiredArgsConstructor
public class QrController {

    private final QrService qrService;

    /**
     * Müşteri QR tarar: masa + tenant bilgisi döner, session yoksa otomatik açılır.
     */
    @GetMapping("/{token}")
    public ResponseEntity<QrResolveResponse> resolveQr(@PathVariable String token) {
        return ResponseEntity.ok(qrService.resolveQr(token));
    }
}
