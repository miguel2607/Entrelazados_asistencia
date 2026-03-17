package com.entrelazados.domain;

import java.time.LocalDate;
import java.time.LocalTime;

public record Asistencia(Integer id, Integer idNino, Integer idPlan, Integer idServicio, LocalDate fecha,
        LocalTime horaEntrada, LocalTime horaSalida, String observacion) {
}
