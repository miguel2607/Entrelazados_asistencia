package com.entrelazados.domain;

import java.time.LocalDate;

public record NinoPlan(Integer id, Integer idNino, TipoPlan tipo, Integer idServicio, Integer idPaquete,
        Integer totalSesiones, Integer sesionesConsumidas,
        LocalDate fechaInicio, LocalDate fechaFin) {

    public boolean estaVigenteEn(LocalDate fecha) {
        if (fecha == null) return false;
        boolean inicioOk = fechaInicio == null || !fecha.isBefore(fechaInicio);
        boolean finOk = fechaFin == null || !fecha.isAfter(fechaFin);
        return inicioOk && finOk;
    }
}
