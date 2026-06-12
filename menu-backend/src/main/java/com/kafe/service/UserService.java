package com.kafe.service;

import com.kafe.domain.Tenant;
import com.kafe.domain.User;
import com.kafe.domain.enums.UserRole;
import com.kafe.dto.user.CreateUserRequest;
import com.kafe.dto.user.UserResponse;
import com.kafe.exception.ResourceNotFoundException;
import com.kafe.exception.TenantAccessException;
import com.kafe.repository.TenantRepository;
import com.kafe.repository.UserRepository;
import com.kafe.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<UserResponse> getAll() {
        Long tenantId = TenantContext.getTenantId();
        if (tenantId == null) throw new TenantAccessException();
        return userRepository.findAllByTenant_IdOrderByCreatedAtDesc(tenantId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public UserResponse create(CreateUserRequest req) {
        Long tenantId = TenantContext.getTenantId();
        if (tenantId == null) throw new TenantAccessException();

        if (userRepository.existsByEmailAndTenant_Id(req.email(), tenantId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bu e-posta adresi zaten kayıtlı");
        }

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant", tenantId));

        User user = userRepository.save(User.builder()
                .tenant(tenant)
                .name(req.name())
                .email(req.email())
                .passwordHash(passwordEncoder.encode(req.password()))
                .role(UserRole.valueOf(req.role()))
                .isActive(true)
                .build());

        return toResponse(user);
    }

    @Transactional
    public UserResponse toggleActive(Long id) {
        Long tenantId = TenantContext.getTenantId();
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
        if (!user.getTenant().getId().equals(tenantId)) throw new TenantAccessException();
        user.setActive(!user.isActive());
        return toResponse(userRepository.save(user));
    }

    private UserResponse toResponse(User u) {
        return new UserResponse(u.getId(), u.getName(), u.getEmail(),
                u.getRole().name(), u.isActive(), u.getCreatedAt());
    }
}
