package com.entrelazados.domain;

import java.time.LocalDate;

public record Papa(Integer id, String nombre, String cedula, String ti, LocalDate fechaNacimiento, Integer semanasGestacion,
        String telefono, String biometricId, String grupo, boolean enabled) {
}
