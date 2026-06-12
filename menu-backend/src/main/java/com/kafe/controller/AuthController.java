package com.kafe.controller;

import com.kafe.controller.dto.LoginRequest;
import com.kafe.controller.dto.LoginResponse;
import com.kafe.controller.dto.RegisterResponse;
import com.kafe.controller.dto.RegisterTenantRequest;
import com.kafe.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody @Valid LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/register-tenant")
    public ResponseEntity<RegisterResponse> registerTenant(@RequestBody @Valid RegisterTenantRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.registerTenant(request));
    }
}
