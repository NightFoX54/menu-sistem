package com.kafe.controller;

import com.kafe.dto.table.CreateTableRequest;
import com.kafe.dto.table.TableResponse;
import com.kafe.service.QrService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/tables")
@RequiredArgsConstructor
public class TableController {

    private final QrService qrService;

    @GetMapping
    public ResponseEntity<List<TableResponse>> getAllTables() {
        return ResponseEntity.ok(qrService.getAllTables());
    }

    @PostMapping
    public ResponseEntity<TableResponse> createTable(@RequestBody @Valid CreateTableRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(qrService.createTable(request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> toggleTable(@PathVariable Long id) {
        qrService.toggleTable(id);
        return ResponseEntity.noContent().build();
    }
}
