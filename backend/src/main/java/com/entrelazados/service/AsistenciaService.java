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
            LocalTime horaEntrada, String jornada, String observacion) {
        if (!ninoService.existePorId(idNino))
            throw new RecursoNoEncontradoException("Niño no encontrado");

        // Validación obligatoria solicitada por el usuario (excepcíon para biométricos donde el servicio puede ser de un paquete general)
        boolean esBiometrico = observacion != null && observacion.contains("Biométrico");
        if (idPlan == null || (idServicio == null && !esBiometrico)) {
            throw new ConflictoException("Debe seleccionar un estudiante, un plan asignado y un servicio para registrar la entrada.");
        }

        // Regla: Solo descontar 1 sesión por día para el niño (sin importar jornada)
        boolean yaAsistioHoy = repo.existsByIdNinoAndFecha(idNino, fecha);

        if (idPlan != null && !yaAsistioHoy) {
            NinoPlanEntity plan = planRepo.findById(idPlan)
                    .orElseThrow(() -> new RecursoNoEncontradoException("Plan no encontrado"));

            if (plan.getSesionesConsumidas() >= plan.getTotalSesiones()) {
                throw new ConflictoException("El plan ya no tiene sesiones disponibles");
            }

            plan.setSesionesConsumidas(plan.getSesionesConsumidas() + 1);
            planRepo.save(plan);
        }

        // Validación: No permitir entrada si ya está adentro (sin salida)
        if (repo.findTopByIdNinoAndFechaAndHoraSalidaIsNullOrderByIdDesc(idNino, fecha).isPresent()) {
            throw new ConflictoException("El niño ya tiene una entrada activa registrada hoy. Debe registrar su salida primero.");
        }

        // Validación: No permitir repetir la misma jornada si se especifica
        if (jornada != null && repo.existsByIdNinoAndFechaAndJornada(idNino, fecha, jornada)) {
            throw new ConflictoException("Ya existe un registro para la jornada '" + jornada + "' en esta fecha.");
        }

        AsistenciaEntity e = new AsistenciaEntity();
        e.setIdNino(idNino);
        e.setIdPlan(idPlan);
        e.setIdServicio(idServicio);
        e.setFecha(fecha);
        e.setHoraEntrada(horaEntrada);
        e.setJornada(jornada);
        e.setObservacion(observacion);
        return toDomain(repo.save(e));
    }

    @Transactional
    public Asistencia registrarSalida(Integer idNino, Integer idPlan, LocalDate fecha, LocalTime horaSalida,
            String observacion) {
        if (!ninoService.existePorId(idNino))
            throw new RecursoNoEncontradoException("Niño no encontrado");
            
        // Buscar la entrada más reciente que no tenga salida
        AsistenciaEntity e = repo.findTopByIdNinoAndFechaAndHoraSalidaIsNullOrderByIdDesc(idNino, fecha)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró una entrada activa para registrar la salida"));
                
        e.setHoraSalida(horaSalida);
        if (observacion != null)
            e.setObservacion(observacion);
        return toDomain(repo.save(e));
    }

    /**
     * Registra asistencia basada en el ID biométrico enviado por el equipo Hikvision.
     * Determina automáticamente si es entrada o salida y descuenta sesiones si es necesario.
     */
    @Transactional
    public Asistencia registrarAsistenciaBiometrica(String biometricId) {
        com.entrelazados.persistence.entity.NinoEntity nino = ninoService.buscarEntidadPorBiometricId(biometricId);
        
        Integer idNino = nino.getId();
        LocalDate hoy = LocalDate.now();
        LocalTime ahora = LocalTime.now();

        // 1. Verificar si ya tiene una entrada activa hoy
        var entradaActiva = repo.findTopByIdNinoAndFechaAndHoraSalidaIsNullOrderByIdDesc(idNino, hoy);

        if (entradaActiva.isPresent()) {
            // Ya está adentro, registrar SALIDA
            return registrarSalida(idNino, entradaActiva.get().getIdPlan(), hoy, ahora, "Marcación automática vía Biométrico (Salida)");
        } else {
            // No ha entrado hoy, registrar ENTRADA
            // Buscar el primer plan activo que tenga sesiones disponibles
            NinoPlanEntity plan = planRepo.findByIdNinoOrderByFechaInicio(idNino).stream()
                    .filter(p -> p.getSesionesConsumidas() < p.getTotalSesiones())
                    .filter(p -> p.getFechaInicio() == null || !hoy.isBefore(p.getFechaInicio()))
                    .filter(p -> p.getFechaFin() == null || !hoy.isAfter(p.getFechaFin()))
                    .findFirst()
                    .orElseThrow(() -> new com.entrelazados.web.ConflictoException("No se encontró un plan activo con sesiones disponibles para el niño " + nino.getNombre()));

            // Determinar jornada basado en la hora (Antés de mediodía es Mañana)
            String jornada = ahora.isBefore(LocalTime.of(12, 0)) ? "Mañana" : "Tarde";
            
            return registrarEntrada(idNino, plan.getId(), plan.getIdServicio(), hoy, ahora, jornada, "Marcación automática vía Biométrico (Entrada)");
        }
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

    @Transactional
    public void eliminar(Integer id) {
        AsistenciaEntity e = repo.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Asistencia no encontrada"));
        
        // Devolver la sesión si el registro descontó una
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

    private Asistencia toDomain(AsistenciaEntity e) {
        return new Asistencia(e.getId(), e.getIdNino(), e.getIdPlan(), e.getIdServicio(), e.getFecha(),
                e.getHoraEntrada(), e.getHoraSalida(), e.getJornada(), e.getObservacion());
    }
}
