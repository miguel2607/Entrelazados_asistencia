package com.entrelazados.service;

import com.entrelazados.domain.Asistencia;
import com.entrelazados.persistence.entity.AsistenciaEntity;
import com.entrelazados.persistence.entity.NinoPlanEntity;
import com.entrelazados.persistence.repository.AsistenciaJpaRepository;
import com.entrelazados.persistence.repository.NinoPlanJpaRepository;
import com.entrelazados.web.ConflictoException;
import com.entrelazados.web.RecursoNoEncontradoException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Service
public class AsistenciaService {

    private final AsistenciaJpaRepository repo;
    private final NinoService ninoService;
    private final NinoPlanJpaRepository planRepo;

    public AsistenciaService(AsistenciaJpaRepository repo, NinoService ninoService, NinoPlanJpaRepository planRepo) {
        this.repo = repo;
        this.ninoService = ninoService;
        this.planRepo = planRepo;
    }

    @Transactional
    public Asistencia registrarEntrada(Integer idNino, Integer idPlan, Integer idServicio, LocalDate fecha,
            LocalTime horaEntrada, String observacion) {
        if (!ninoService.existePorId(idNino))
            throw new RecursoNoEncontradoException("Niño no encontrado");

        // Si hay un plan, descontar sesión
        if (idPlan != null) {
            NinoPlanEntity plan = planRepo.findById(idPlan)
                    .orElseThrow(() -> new RecursoNoEncontradoException("Plan no encontrado"));

            if (plan.getSesionesConsumidas() >= plan.getTotalSesiones()) {
                throw new ConflictoException("El plan ya no tiene sesiones disponibles");
            }

            plan.setSesionesConsumidas(plan.getSesionesConsumidas() + 1);
            planRepo.save(plan);
        }

        if (repo.existsByIdNinoAndFechaAndIdPlan(idNino, fecha, idPlan))
            throw new ConflictoException("Ya existe registro de asistencia para este niño en la fecha");

        AsistenciaEntity e = new AsistenciaEntity();
        e.setIdNino(idNino);
        e.setIdPlan(idPlan);
        e.setIdServicio(idServicio);
        e.setFecha(fecha);
        e.setHoraEntrada(horaEntrada);
        e.setObservacion(observacion);
        return toDomain(repo.save(e));
    }

    @Transactional
    public Asistencia registrarSalida(Integer idNino, Integer idPlan, LocalDate fecha, LocalTime horaSalida,
            String observacion) {
        if (!ninoService.existePorId(idNino))
            throw new RecursoNoEncontradoException("Niño no encontrado");
        AsistenciaEntity e = repo.findByIdNinoAndFechaAndIdPlan(idNino, fecha, idPlan)
                .orElseThrow(() -> new RecursoNoEncontradoException("Asistencia no encontrada"));
        if (e.getHoraSalida() != null)
            throw new ConflictoException("Ya está registrada la salida");
        e.setHoraSalida(horaSalida);
        if (observacion != null)
            e.setObservacion(observacion);
        return toDomain(repo.save(e));
    }

    @Transactional(readOnly = true)
    public List<Asistencia> listarPorFecha(LocalDate fecha) {
        return repo.findByFechaOrderByIdNinoAscIdAsc(fecha).stream().map(this::toDomain).toList();
    }

    @Transactional(readOnly = true)
    public List<Asistencia> historialPorNinoYRango(Integer idNino, LocalDate desde, LocalDate hasta) {
        if (!ninoService.existePorId(idNino))
            throw new RecursoNoEncontradoException("Niño no encontrado");
        return repo.findByIdNinoAndFechaBetweenOrderByFechaDesc(idNino, desde, hasta).stream().map(this::toDomain)
                .toList();
    }

    @Transactional(readOnly = true)
    public java.util.Optional<Asistencia> buscarPorNinoYFecha(Integer idNino, LocalDate fecha) {
        return repo.findByIdNinoAndFechaOrderByIdAsc(idNino, fecha).stream().findFirst().map(this::toDomain);
    }

    @Transactional
    public Asistencia actualizarObservacion(Integer id, String observacion) {
        AsistenciaEntity e = repo.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Asistencia no encontrada"));
        e.setObservacion(observacion != null ? observacion : "");
        return toDomain(repo.save(e));
    }

    private Asistencia toDomain(AsistenciaEntity e) {
        return new Asistencia(e.getId(), e.getIdNino(), e.getIdPlan(), e.getIdServicio(), e.getFecha(),
                e.getHoraEntrada(), e.getHoraSalida(), e.getObservacion());
    }
}
