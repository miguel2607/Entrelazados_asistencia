package com.entrelazados.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record NinoRequest(@NotBlank String nombre, String ti, @NotNull LocalDate fechaNacimiento) {}
