package com.entrelazados.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;

@Component
public class AsistenciaAutoSalidaScheduler {

    private static final Logger log = LoggerFactory.getLogger(AsistenciaAutoSalidaScheduler.class);
    private static final LocalTime HORA_SALIDA_AUTOMATICA = LocalTime.of(19, 0);

    private final AsistenciaService asistenciaService;

    @Value("${app.attendance.autoCheckout.enabled:true}")
    private boolean autoCheckoutEnabled;

    public AsistenciaAutoSalidaScheduler(AsistenciaService asistenciaService) {
        this.asistenciaService = asistenciaService;
    }

    @Scheduled(cron = "${app.attendance.autoCheckout.cron:0 0 19 * * *}", zone = "${app.attendance.autoCheckout.zone:America/Bogota}")
    public void cerrarSalidasPendientesDelDia() {
        if (!autoCheckoutEnabled) {
            return;
        }

        int totalActualizados = asistenciaService.registrarSalidasAutomaticas(
                LocalDate.now(),
                HORA_SALIDA_AUTOMATICA,
                "Salida automatica a las 19:00 por cierre de jornada"
        );

        if (totalActualizados > 0) {
            log.info("Se registraron {} salidas automaticas de asistencia.", totalActualizados);
        }
    }
}
