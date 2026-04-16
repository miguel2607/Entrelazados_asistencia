package com.entrelazados.domain;

import java.time.LocalDate;
import java.time.LocalTime;

public record AsistenciaPapa(
        Integer id,
        Integer idPapa,
        LocalDate fecha,
        LocalTime horaEntrada,
        LocalTime horaSalida,
        String observacion,
        String jornada,
        Integer idPlan,
        String nombrePlan
) {}
