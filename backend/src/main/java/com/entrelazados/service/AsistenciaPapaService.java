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

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.Duration;
import java.util.List;
import java.util.Optional;

@Service
public class AsistenciaPapaService {

    private final AsistenciaPapaJpaRepository repo;
    private final PapaService papaService;
    private final PapaPlanService papaPlanService;
    private final PapaPlanJpaRepository papaPlanRepo;

    public AsistenciaPapaService(AsistenciaPapaJpaRepository repo, PapaService papaService, PapaPlanService papaPlanService,
                                 PapaPlanJpaRepository papaPlanRepo) {
        this.repo = repo;
        this.papaService = papaService;
        this.papaPlanService = papaPlanService;
        this.papaPlanRepo = papaPlanRepo;
    }

    @Transactional
    public AsistenciaPapa registrarEntrada(Integer idPapa, LocalDate fecha, LocalTime horaEntrada,
                                           String observacion, String jornada, Integer idPlan) {
        if (!papaService.existePorId(idPapa)) {
            throw new RecursoNoEncontradoException("Papá no encontrado");
        }

        if (repo.findTopByIdPapaAndFechaAndHoraSalidaIsNullOrderByIdDesc(idPapa, fecha).isPresent()) {
            throw new ConflictoException("El papá ya tiene una entrada activa en esta fecha.");
        }

        // Regla: No permitir una nueva entrada hasta 1 minuto después de la última salida registrada.
        Optional<AsistenciaPapaEntity> ultimaSalida = repo
                .findTopByIdPapaAndFechaAndHoraSalidaIsNotNullOrderByHoraSalidaDesc(idPapa, fecha);
        if (ultimaSalida.isPresent() && ultimaSalida.get().getHoraSalida() != null) {
            long segundosDesdeSalida = Duration.between(ultimaSalida.get().getHoraSalida(), horaEntrada).getSeconds();
            if (segundosDesdeSalida < 60) {
                throw new ConflictoException("La entrada solo se puede registrar despues de 1 minuto de la salida.");
            }
        }

        // Regla: consumir sesión una sola vez por día (si se seleccionó plan)
        boolean yaAsistioHoy = repo.existsByIdPapaAndFecha(idPapa, fecha);
        if (idPlan != null && !yaAsistioHoy) {
            PapaPlanEntity plan = papaPlanRepo.findById(idPlan)
                    .orElseThrow(() -> new RecursoNoEncontradoException("Plan de papá no encontrado"));
            if (plan.getSesionesConsumidas() >= plan.getTotalSesiones()) {
                throw new ConflictoException("El plan ya no tiene sesiones disponibles");
            }
            plan.setSesionesConsumidas(plan.getSesionesConsumidas() + 1);
            papaPlanRepo.save(plan);
        }

        String nombrePlan = papaPlanService.getNombrePlan(idPlan);

        AsistenciaPapaEntity e = new AsistenciaPapaEntity();
        e.setIdPapa(idPapa);
        e.setFecha(fecha);
        e.setHoraEntrada(horaEntrada);
        e.setObservacion(observacion);
        e.setJornada(jornada);
        e.setIdPlan(idPlan);
        e.setNombrePlan(nombrePlan);
        return toDomain(repo.save(e));
    }

    @Transactional
    public AsistenciaPapa registrarSalida(Integer idPapa, LocalDate fecha, LocalTime horaSalida, String observacion) {
        if (!papaService.existePorId(idPapa)) {
            throw new RecursoNoEncontradoException("Papá no encontrado");
        }

        AsistenciaPapaEntity e = repo.findTopByIdPapaAndFechaAndHoraSalidaIsNullOrderByIdDesc(idPapa, fecha)
                .orElseThrow(() -> new RecursoNoEncontradoException("No hay entrada activa para registrar salida."));

        // Evitar doble marcación accidental: exigir al menos 1 minuto entre entrada y salida.
        if (e.getHoraEntrada() != null) {
            long segundosDesdeEntrada = Duration.between(e.getHoraEntrada(), horaSalida).getSeconds();
            if (segundosDesdeEntrada < 60) {
                throw new ConflictoException("La salida solo se puede registrar despues de 1 minuto de la entrada.");
            }
        }

        e.setHoraSalida(horaSalida);
        if (observacion != null) e.setObservacion(observacion);
        return toDomain(repo.save(e));
    }

    @Transactional
    public AsistenciaPapa registrarAsistenciaBiometrica(String biometricId) {
        var papa = papaService.buscarEntidadPorBiometricId(biometricId);
        Integer idPapa = papa.getId();
        LocalDate hoy = LocalDate.now();
        LocalTime ahora = LocalTime.now();

        var entradaActiva = repo.findTopByIdPapaAndFechaAndHoraSalidaIsNullOrderByIdDesc(idPapa, hoy);
        if (entradaActiva.isPresent()) {
            return registrarSalida(idPapa, hoy, ahora, "Marcación automática vía Biométrico (Salida)");
        }

        Integer idPlan = papaPlanRepo.findByIdPapaOrderByFechaInicio(idPapa).stream()
                .filter(p -> p.getSesionesConsumidas() < p.getTotalSesiones())
                .filter(p -> p.getFechaInicio() == null || !hoy.isBefore(p.getFechaInicio()))
                .filter(p -> p.getFechaFin() == null || !hoy.isAfter(p.getFechaFin()))
                .map(PapaPlanEntity::getId)
                .findFirst()
                .orElse(null);

        String jornada = ahora.isBefore(LocalTime.of(12, 0)) ? "Mañana" : "Tarde";
        return registrarEntrada(idPapa, hoy, ahora, "Marcación automática vía Biométrico (Entrada)", jornada, idPlan);
    }

    @Transactional(readOnly = true)
    public List<AsistenciaPapa> listarPorFecha(LocalDate fecha) {
        return repo.findByFechaOrderByIdPapaAscIdAsc(fecha).stream().map(this::toDomain).toList();
    }

    @Transactional(readOnly = true)
    public List<AsistenciaPapa> historialPorPapaYRango(Integer idPapa, LocalDate desde, LocalDate hasta) {
        if (!papaService.existePorId(idPapa)) {
            throw new RecursoNoEncontradoException("Papá no encontrado");
        }
        return repo.findByIdPapaAndFechaBetweenOrderByFechaDesc(idPapa, desde, hasta).stream().map(this::toDomain).toList();
    }

    @Transactional
    public AsistenciaPapa actualizarObservacion(Integer id, String observacion) {
        AsistenciaPapaEntity e = repo.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Registro no encontrado"));
        e.setObservacion(observacion);
        return toDomain(repo.save(e));
    }

    @Transactional
    public void eliminar(Integer id) {
        if (!repo.existsById(id)) throw new RecursoNoEncontradoException("Registro no encontrado");
        repo.deleteById(id);
    }

    private AsistenciaPapa toDomain(AsistenciaPapaEntity e) {
        return new AsistenciaPapa(
                e.getId(),
                e.getIdPapa(),
                e.getFecha(),
                e.getHoraEntrada(),
                e.getHoraSalida(),
                e.getObservacion(),
                e.getJornada(),
                e.getIdPlan(),
                e.getNombrePlan()
        );
    }
}
