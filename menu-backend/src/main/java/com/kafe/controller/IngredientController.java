package com.kafe.controller;

import com.kafe.dto.ingredient.IngredientRequest;
import com.kafe.dto.ingredient.IngredientResponse;
import com.kafe.dto.ingredient.RestoreStockRequest;
import com.kafe.dto.menu.MenuItemResponse;
import com.kafe.service.IngredientService;
import com.kafe.service.StockService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/ingredients")
@RequiredArgsConstructor
public class IngredientController {

    private final IngredientService ingredientService;
    private final StockService stockService;

    @GetMapping
    public ResponseEntity<List<IngredientResponse>> getAll() {
        return ResponseEntity.ok(ingredientService.getAll());
    }

    @PostMapping
    public ResponseEntity<IngredientResponse> create(@RequestBody @Valid IngredientRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ingredientService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<IngredientResponse> update(@PathVariable Long id,
                                                      @RequestBody @Valid IngredientRequest request) {
        return ResponseEntity.ok(ingredientService.update(id, request));
    }

    @PatchMapping("/{id}/stock")
    public ResponseEntity<Void> restoreStock(@PathVariable Long id,
                                              @RequestBody @Valid RestoreStockRequest request) {
        stockService.restoreStock(id, request.amount());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/deduct")
    public ResponseEntity<Void> deductStock(@PathVariable Long id,
                                             @RequestBody @Valid RestoreStockRequest request) {
        stockService.deductManual(id, request.amount());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/items")
    public ResponseEntity<List<MenuItemResponse>> getItemsUsingIngredient(@PathVariable Long id) {
        return ResponseEntity.ok(ingredientService.getItemsUsingIngredient(id));
    }
}
