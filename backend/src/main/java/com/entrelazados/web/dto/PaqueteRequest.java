package com.entrelazados.web.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;

public record PaqueteRequest(@NotBlank String nombre, @NotNull @DecimalMin("0") BigDecimal precio,
                             @NotNull @Min(1) Integer cantidadDias, List<Integer> idServicios) {}
