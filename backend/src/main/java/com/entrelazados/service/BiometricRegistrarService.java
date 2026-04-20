package com.entrelazados.service;

import com.entrelazados.persistence.repository.PapaJpaRepository;
import com.entrelazados.persistence.repository.NinoJpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Enruta eventos Hikvision: primero niños, luego padres (mismo dispositivo, IDs distintos).
 */
@Service
public class BiometricRegistrarService {

    private final NinoJpaRepository ninoRepo;
    private final PapaJpaRepository papaRepo;
    private final AsistenciaService asistenciaNinoService;
    private final AsistenciaPapaService asistenciaPapaService;

    public BiometricRegistrarService(NinoJpaRepository ninoRepo, PapaJpaRepository papaRepo,
            AsistenciaService asistenciaNinoService, AsistenciaPapaService asistenciaPapaService) {
        this.ninoRepo = ninoRepo;
        this.papaRepo = papaRepo;
        this.asistenciaNinoService = asistenciaNinoService;
        this.asistenciaPapaService = asistenciaPapaService;
    }

    @Transactional
    public void registrarPorBiometricId(String employeeId) {
        if (employeeId == null || employeeId.isBlank())
            return;
        if (ninoRepo.findByBiometricId(employeeId.trim()).isPresent()) {
            asistenciaNinoService.registrarAsistenciaBiometrica(employeeId.trim());
            return;
        }
        if (papaRepo.findByBiometricId(employeeId.trim()).isPresent()) {
            asistenciaPapaService.registrarAsistenciaBiometrica(employeeId.trim());
            return;
        }
        throw new com.entrelazados.web.RecursoNoEncontradoException(
                "No hay niño ni padre registrado con ID biométrico: " + employeeId);
    }
}
