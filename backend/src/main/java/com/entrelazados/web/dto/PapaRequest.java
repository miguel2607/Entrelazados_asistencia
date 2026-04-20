package com.entrelazados.web.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public record PapaRequest(
        @NotBlank String nombre,
        @NotBlank String cedula,
        String ti,
        LocalDate fechaNacimiento,
        Integer semanasGestacion,
        String telefono,
        String biometricId,
        String grupo) {
}
