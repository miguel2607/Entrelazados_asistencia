package com.entrelazados.domain;

import java.time.LocalDate;

public record Nino(Integer id, String nombre, String ti, LocalDate fechaNacimiento, String biometricId) {}
