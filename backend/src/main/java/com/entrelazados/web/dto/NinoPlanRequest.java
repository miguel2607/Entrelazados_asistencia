package com.entrelazados.web.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record NinoPlanRequest(
        @NotNull LocalDate fechaInicio,
        LocalDate fechaFin,
        Integer totalSesiones,
        Integer cantidad,
        java.math.BigDecimal porcentajeDescuento,
        Integer sesionesConsumidas) {
}
