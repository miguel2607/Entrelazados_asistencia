package com.entrelazados.domain;

import java.time.LocalDate;

public record Papa(
        Integer id,
        String nombre,
        String cedula,
        LocalDate fechaNacimiento,
        Integer semanasGestacion,
        String telefono,
        String biometricId,
        Boolean enabled
) {}

