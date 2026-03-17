package com.entrelazados.security;

import com.entrelazados.persistence.entity.UserEntity;
import com.entrelazados.persistence.repository.UserJpaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private final JwtUtil jwtUtil;
    private final UserJpaRepository userRepo;
    private final PasswordEncoder passwordEncoder;

    public AuthController(JwtUtil jwtUtil, UserJpaRepository userRepo, PasswordEncoder passwordEncoder) {
        this.jwtUtil = jwtUtil;
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/login")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, Object> login(@RequestBody(required = false) Map<String, String> body) {
        String username = body != null ? body.getOrDefault("username", "") : "";
        String password = body != null ? body.getOrDefault("password", "") : "";
        var opt = userRepo.findByUsername(username);
        if (opt.isEmpty()) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas");
        }
        UserEntity user = opt.get();

        if (Boolean.FALSE.equals(user.getEnabled())) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario deshabilitado");
        }
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas");
        }

        String token = jwtUtil.generateToken(user.getUsername());
        return Map.of(
                "token", token,
                "username", user.getUsername(),
                "nombre", user.getNombre(),
                "role", user.getRole()
        );
    }
}

