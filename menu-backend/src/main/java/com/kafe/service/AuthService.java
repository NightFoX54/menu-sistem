package com.kafe.service;

import com.kafe.controller.dto.LoginRequest;
import com.kafe.controller.dto.LoginResponse;
import com.kafe.controller.dto.RegisterResponse;
import com.kafe.controller.dto.RegisterTenantRequest;
import com.kafe.domain.Tenant;
import com.kafe.domain.User;
import com.kafe.domain.enums.UserRole;
import com.kafe.repository.TenantRepository;
import com.kafe.repository.UserRepository;
import com.kafe.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public LoginResponse login(LoginRequest request) {
        Tenant tenant = tenantRepository.findBySlug(request.tenantSlug())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tenant bulunamadı"));

        User user = userRepository.findByEmailAndTenant_Id(request.email(), tenant.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Geçersiz kimlik bilgileri"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Geçersiz kimlik bilgileri");
        }

        return new LoginResponse(jwtService.generateToken(user), user.getRole().name(), tenant.getId());
    }

    @Transactional
    public RegisterResponse registerTenant(RegisterTenantRequest request) {
        if (tenantRepository.findBySlug(request.slug()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bu slug zaten kullanımda");
        }

        Tenant tenant = tenantRepository.save(Tenant.builder()
                .name(request.tenantName())
                .slug(request.slug())
                .isActive(true)
                .defaultLocale("tr")
                .geofenceRadiusMeters(150)
                .build());

        userRepository.save(User.builder()
                .tenant(tenant)
                .name(request.adminName())
                .email(request.adminEmail())
                .passwordHash(passwordEncoder.encode(request.adminPassword()))
                .role(UserRole.ADMIN)
                .isActive(true)
                .build());

        return new RegisterResponse(tenant.getId(), tenant.getSlug());
    }
}
