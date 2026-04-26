package com.entrelazados.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class AlertaImportanteCleanupScheduler {

    private static final Logger log = LoggerFactory.getLogger(AlertaImportanteCleanupScheduler.class);
    private static final long HORAS_RETENCION_RESUELTAS = 24;

    private final AlertaImportanteService alertaImportanteService;

    public AlertaImportanteCleanupScheduler(AlertaImportanteService alertaImportanteService) {
        this.alertaImportanteService = alertaImportanteService;
    }

    @Scheduled(cron = "0 0 * * * *", zone = "America/Bogota")
    public void limpiarAlertasResueltasAntiguas() {
        LocalDateTime fechaCorte = LocalDateTime.now().minusHours(HORAS_RETENCION_RESUELTAS);
        long eliminadas = alertaImportanteService.eliminarResueltasAnterioresA(fechaCorte);
        if (eliminadas > 0) {
            log.info("Se eliminaron {} alertas resueltas con más de {} horas.", eliminadas, HORAS_RETENCION_RESUELTAS);
        }
    }
}
