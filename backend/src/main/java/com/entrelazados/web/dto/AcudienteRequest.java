package com.entrelazados.web.dto;

import jakarta.validation.constraints.NotBlank;

public record AcudienteRequest(@NotBlank String nombre, String telefono, String cc) {}
