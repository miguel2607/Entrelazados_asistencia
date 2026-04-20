package com.entrelazados.service;

import com.entrelazados.domain.AsistenciaPapa;
import com.entrelazados.persistence.entity.AsistenciaPapaEntity;
import com.entrelazados.persistence.entity.PapaPlanEntity;
import com.entrelazados.persistence.repository.AsistenciaPapaJpaRepository;
import com.entrelazados.persistence.repository.PapaPlanJpaRepository;
import com.entrelazados.web.ConflictoException;
import com.entrelazados.web.RecursoNoEncontradoException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

@Service
public class AsistenciaPapaService {

    private final AsistenciaPapaJpaRepository repo;
    private final PapaService papaService;
    private final PapaPlanJpaRepository planRepo;
    private final PapaPlanService papaPlanService;

    public AsistenciaPapaService(AsistenciaPapaJpaRepository repo, PapaService papaService,
            PapaPlanJpaRepository planRepo, PapaPlanService papaPlanService) {
        this.repo = repo;
        this.papaService = papaService;
        this.planRepo = planRepo;
        this.papaPlanService = papaPlanService;
    }

    @Transactional
    public AsistenciaPapa registrarEntrada(Integer idPapa, Integer idPlan, LocalDate fecha, LocalTime horaEntrada,
            String jornada, String observacion) {
        if (!papaService.existePorId(idPapa))
            throw new RecursoNoEncontradoException("Padre no encontrado");

        boolean esBiometrico = observacion != null && observacion.contains("Biométrico");
        if (idPlan == null && !esBiometrico) {
            throw new ConflictoException("Debe seleccionar un plan asignado para registrar la entrada.");
        }

        LocalDate f = fecha != null ? fecha : LocalDate.now();
        LocalTime h = horaEntrada != null ? horaEntrada : LocalTime.now();

        boolean yaAsistioHoy = repo.existsByIdPapaAndFecha(idPapa, f);

        if (idPlan != null && !yaAsistioHoy) {
            PapaPlanEntity plan = planRepo.findById(idPlan)
                    .orElseThrow(() -> new RecursoNoEncontradoException("Plan no encontrado"));

            if (plan.getSesionesConsumidas() >= plan.getTotalSesiones()) {
                throw new ConflictoException("El plan ya no tiene sesiones disponibles");
            }

            plan.setSesionesConsumidas(plan.getSesionesConsumidas() + 1);
            planRepo.save(plan);
        }

        if (repo.findTopByIdPapaAndFechaAndHoraSalidaIsNullOrderByIdDesc(idPapa, f).isPresent()) {
            throw new ConflictoException("El padre ya tiene una entrada activa registrada hoy. Debe registrar su salida primero.");
        }

        Optional<AsistenciaPapaEntity> ultimaSalida = repo
                .findTopByIdPapaAndFechaAndHoraSalidaIsNotNullOrderByHoraSalidaDesc(idPapa, f);
        if (ultimaSalida.isPresent() && ultimaSalida.get().getHoraSalida() != null) {
            long segundosDesdeSalida = Duration.between(ultimaSalida.get().getHoraSalida(), h).getSeconds();
            if (segundosDesdeSalida < 60) {
                throw new ConflictoException("La entrada solo se puede registrar despues de 1 minuto de la salida.");
            }
        }

        if (jornada != null && repo.existsByIdPapaAndFechaAndJornada(idPapa, f, jornada)) {
            throw new ConflictoException("Ya existe un registro para la jornada '" + jornada + "' en esta fecha.");
        }

        AsistenciaPapaEntity e = new AsistenciaPapaEntity();
        e.setIdPapa(idPapa);
        e.setIdPlan(idPlan);
        e.setFecha(f);
        e.setHoraEntrada(h);
        e.setJornada(jornada);
        e.setObservacion(observacion);
        if (idPlan != null) {
            e.setNombrePlan(papaPlanService.getNombrePlan(idPlan));
        }
        return toDomain(repo.save(e));
    }

    @Transactional
    public AsistenciaPapa registrarSalida(Integer idPapa, Integer idPlan, LocalDate fecha, LocalTime horaSalida,
            String observacion) {
        if (!papaService.existePorId(idPapa))
            throw new RecursoNoEncontradoException("Padre no encontrado");
        LocalDate f = fecha != null ? fecha : LocalDate.now();
        LocalTime h = horaSalida != null ? horaSalida : LocalTime.now();

        AsistenciaPapaEntity e = repo.findTopByIdPapaAndFechaAndHoraSalidaIsNullOrderByIdDesc(idPapa, f)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró una entrada activa para registrar la salida"));

        if (e.getHoraEntrada() != null) {
            long segundosDesdeEntrada = Duration.between(e.getHoraEntrada(), h).getSeconds();
            if (segundosDesdeEntrada < 60) {
                throw new ConflictoException("La salida solo se puede registrar despues de 1 minuto de la entrada.");
            }
        }

        e.setHoraSalida(h);
        if (observacion != null)
            e.setObservacion(observacion);
        return toDomain(repo.save(e));
    }

    /**
     * Marcación automática por biométrico (mismo flujo que niños).
     */
    @Transactional
    public AsistenciaPapa registrarAsistenciaBiometrica(String biometricId) {
        var papa = papaService.buscarEntidadPorBiometricId(biometricId);
        Integer idPapa = papa.getId();
        LocalDate hoy = LocalDate.now();
        LocalTime ahora = LocalTime.now();

        var entradaActiva = repo.findTopByIdPapaAndFechaAndHoraSalidaIsNullOrderByIdDesc(idPapa, hoy);

        if (entradaActiva.isPresent()) {
            return registrarSalida(idPapa, entradaActiva.get().getIdPlan(), hoy, ahora,
                    "Marcación automática vía Biométrico (Salida)");
        }

        PapaPlanEntity plan = planRepo.findByIdPapaOrderByFechaInicio(idPapa).stream()
                .filter(p -> p.getSesionesConsumidas() < p.getTotalSesiones())
                .filter(p -> p.getFechaInicio() == null || !hoy.isBefore(p.getFechaInicio()))
                .filter(p -> p.getFechaFin() == null || !hoy.isAfter(p.getFechaFin()))
                .findFirst()
                .orElseThrow(() -> new ConflictoException(
                        "No se encontró un plan activo con sesiones disponibles para el padre " + papa.getNombre()));

        String jornada = ahora.isBefore(LocalTime.of(12, 0)) ? "Mañana" : "Tarde";

        return registrarEntrada(idPapa, plan.getId(), hoy, ahora, jornada,
                "Marcación automática vía Biométrico (Entrada)");
    }

    @Transactional(readOnly = true)
    public List<AsistenciaPapa> listarPorFecha(LocalDate fecha) {
        return repo.findByFechaOrderByIdPapaAscIdAsc(fecha).stream().map(this::toDomain).toList();
    }

    @Transactional(readOnly = true)
    public List<AsistenciaPapa> listarPorRango(LocalDate desde, LocalDate hasta) {
        return repo.findByFechaBetweenOrderByFechaAscIdAsc(desde, hasta).stream().map(this::toDomain).toList();
    }

    @Transactional(readOnly = true)
    public List<AsistenciaPapa> historialPorPapaYRango(Integer idPapa, LocalDate desde, LocalDate hasta) {
        if (!papaService.existePorId(idPapa))
            throw new RecursoNoEncontradoException("Padre no encontrado");
        return repo.findByIdPapaAndFechaBetweenOrderByFechaDesc(idPapa, desde, hasta).stream().map(this::toDomain)
                .toList();
    }

    @Transactional
    public AsistenciaPapa actualizarObservacion(Integer id, String observacion) {
        AsistenciaPapaEntity e = repo.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Asistencia no encontrada"));
        e.setObservacion(observacion != null ? observacion : "");
        return toDomain(repo.save(e));
    }

    @Transactional
    public void eliminar(Integer id) {
        AsistenciaPapaEntity e = repo.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Asistencia no encontrada"));
        if (e.getIdPlan() != null) {
            planRepo.findById(e.getIdPlan()).ifPresent(plan -> {
                if (plan.getSesionesConsumidas() > 0) {
                    plan.setSesionesConsumidas(plan.getSesionesConsumidas() - 1);
                    planRepo.save(plan);
                }
            });
        }
        repo.delete(e);
    }

    private AsistenciaPapa toDomain(AsistenciaPapaEntity e) {
        return new AsistenciaPapa(e.getId(), e.getIdPapa(), e.getIdPlan(), e.getFecha(), e.getHoraEntrada(),
                e.getHoraSalida(), e.getJornada(), e.getObservacion());
    }
}
