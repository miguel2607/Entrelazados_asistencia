package com.entrelazados.domain;

import java.time.LocalDate;
import java.time.LocalTime;

public record AsistenciaPapa(Integer id, Integer idPapa, Integer idPlan, LocalDate fecha, LocalTime horaEntrada,
        LocalTime horaSalida, String jornada, String observacion) {
}
