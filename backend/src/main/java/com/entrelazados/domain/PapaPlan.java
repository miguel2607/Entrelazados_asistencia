package com.entrelazados.domain;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PapaPlan(Integer id, Integer idPapa, TipoPlan tipo, Integer idServicio, Integer idPaquete, Integer totalSesiones,
        Integer sesionesConsumidas, LocalDate fechaInicio, LocalDate fechaFin, BigDecimal precioAcordado,
        BigDecimal porcentajeDescuento) {
}
