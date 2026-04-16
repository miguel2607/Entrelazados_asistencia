package com.entrelazados.web.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record PapaPlanRequest(
        @NotNull LocalDate fechaInicio,
        Integer totalSesiones,
        Integer cantidad,
        java.math.BigDecimal porcentajeDescuento,
        Integer sesionesConsumidas) {
}
