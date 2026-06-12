package com.kafe.controller;

import com.kafe.dto.order.*;
import com.kafe.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @GetMapping("/api/orders")
    public ResponseEntity<List<OrderResponse>> getOrders(
            @RequestParam(defaultValue = "PENDING,CONFIRMED,PREPARING,READY") String statuses) {
        return ResponseEntity.ok(orderService.getOrders(Arrays.asList(statuses.split(","))));
    }

    @GetMapping("/api/orders/{id}")
    public ResponseEntity<OrderResponse> getOrder(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.getOrder(id));
    }

    /**
     * QR müşterisi veya garson sipariş oluşturur.
     * JWT varsa → taken_by = garson; yoksa → taken_by = null (QR müşteri).
     */
    @PostMapping("/api/orders")
    public ResponseEntity<OrderResponse> createOrder(@RequestBody @Valid CreateOrderRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(orderService.createOrder(request));
    }

    /**
     * Garson veya mutfak ekranı sipariş durumunu günceller.
     */
    @PatchMapping("/api/orders/{id}/status")
    public ResponseEntity<OrderResponse> updateStatus(@PathVariable Long id,
                                                       @RequestBody @Valid UpdateOrderStatusRequest request) {
        return ResponseEntity.ok(orderService.updateOrderStatus(id, request.status()));
    }

    /**
     * Oturum hesabı — müşteri ve garson görebilir, auth gerekmez.
     */
    @GetMapping("/api/sessions/{id}/bill")
    public ResponseEntity<BillResponse> getSessionBill(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.getSessionBill(id));
    }
}
