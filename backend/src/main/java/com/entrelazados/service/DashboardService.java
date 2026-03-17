package com.entrelazados.service;

import com.entrelazados.persistence.repository.AsistenciaJpaRepository;
import com.entrelazados.persistence.repository.NinoJpaRepository;
import com.entrelazados.persistence.repository.NinoPlanJpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
public class DashboardService {

    private final NinoJpaRepository ninoRepo;
    private final AsistenciaJpaRepository asistenciaRepo;
    private final NinoPlanJpaRepository planRepo;

    public DashboardService(NinoJpaRepository ninoRepo, AsistenciaJpaRepository asistenciaRepo, NinoPlanJpaRepository planRepo) {
        this.ninoRepo = ninoRepo;
        this.asistenciaRepo = asistenciaRepo;
        this.planRepo = planRepo;
    }

    @Transactional(readOnly = true)
    public long totalNinos() {
        return ninoRepo.count();
    }

    @Transactional(readOnly = true)
    public long totalPlanesActivosHoy(LocalDate fecha) {
        return planRepo.findVigentesEnFecha(fecha).size();
    }
}
