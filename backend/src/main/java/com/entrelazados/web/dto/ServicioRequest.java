package com.entrelazados.web.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record ServicioRequest(@NotBlank String nombre, @NotNull @DecimalMin("0") BigDecimal precio, Integer cantidadDias) {}
