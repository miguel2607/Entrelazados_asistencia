package com.entrelazados.service;

import com.entrelazados.domain.NinoPlan;
import com.entrelazados.domain.TipoPlan;
import com.entrelazados.persistence.entity.NinoPlanEntity;
import com.entrelazados.persistence.repository.NinoPlanJpaRepository;
import com.entrelazados.persistence.repository.PaqueteJpaRepository;
import com.entrelazados.persistence.repository.ServicioJpaRepository;
import com.entrelazados.web.RecursoNoEncontradoException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class NinoPlanService {

    private final NinoPlanJpaRepository repo;
    private final ServicioJpaRepository servicioRepo;
    private final PaqueteJpaRepository paqueteRepo;
    private final com.entrelazados.service.NinoService ninoService;

    public NinoPlanService(NinoPlanJpaRepository repo, ServicioJpaRepository servicioRepo,
            PaqueteJpaRepository paqueteRepo, com.entrelazados.service.NinoService ninoService) {
        this.repo = repo;
        this.servicioRepo = servicioRepo;
        this.paqueteRepo = paqueteRepo;
        this.ninoService = ninoService;
    }

    @Transactional
    public NinoPlan asignarServicio(Integer idNino, Integer idServicio, LocalDate fechaInicio, Integer totalSesiones) {
        if (!ninoService.existePorId(idNino))
            throw new RecursoNoEncontradoException("Niño no encontrado");
        var servicio = servicioRepo.findById(idServicio)
                .orElseThrow(() -> new RecursoNoEncontradoException("Servicio no encontrado"));
        int dias = (totalSesiones != null && totalSesiones > 0) ? totalSesiones : servicio.getCantidadDias();
        NinoPlanEntity e = new NinoPlanEntity();
        e.setIdNino(idNino);
        e.setTipo(TipoPlan.SERVICIO);
        e.setIdServicio(idServicio);
        e.setIdPaquete(null);
        e.setFechaInicio(fechaInicio);
        e.setTotalSesiones(dias);
        e.setFechaFin(fechaInicio.plusDays(dias - 1));
        e.setSesionesConsumidas(0);
        return toDomain(repo.save(e));
    }

    @Transactional
    public NinoPlan asignarPaquete(Integer idNino, Integer idPaquete, LocalDate fechaInicio, Integer totalSesiones) {
        if (!ninoService.existePorId(idNino))
            throw new RecursoNoEncontradoException("Niño no encontrado");
        var paquete = paqueteRepo.findById(idPaquete)
                .orElseThrow(() -> new RecursoNoEncontradoException("Paquete no encontrado"));
        int dias = (totalSesiones != null && totalSesiones > 0) ? totalSesiones : paquete.getCantidadDias();
        NinoPlanEntity e = new NinoPlanEntity();
        e.setIdNino(idNino);
        e.setTipo(TipoPlan.PAQUETE);
        e.setIdServicio(null);
        e.setIdPaquete(idPaquete);
        e.setFechaInicio(fechaInicio);
        e.setTotalSesiones(dias);
        e.setFechaFin(fechaInicio.plusDays(dias - 1));
        e.setSesionesConsumidas(0);
        return toDomain(repo.save(e));
    }

    @Transactional(readOnly = true)
    public List<NinoPlan> listarPorNino(Integer idNino) {
        return repo.findByIdNinoOrderByFechaInicio(idNino).stream().map(this::toDomain).toList();
    }

    @Transactional(readOnly = true)
    public List<NinoPlanEntity> findVigentesEnFecha(LocalDate fecha) {
        return repo.findVigentesEnFecha(fecha);
    }

    @Transactional(readOnly = true)
    public String getNombrePlan(Integer idPlan) {
        if (idPlan == null)
            return null;
        return repo.findById(idPlan).map(plan -> {
            if (plan.getTipo() == TipoPlan.SERVICIO && plan.getIdServicio() != null)
                return servicioRepo.findById(plan.getIdServicio()).map(s -> s.getNombre()).orElse(null);
            if (plan.getTipo() == TipoPlan.PAQUETE && plan.getIdPaquete() != null)
                return paqueteRepo.findById(plan.getIdPaquete()).map(p -> p.getNombre()).orElse(null);
            return null;
        }).orElse(null);
    }

    @Transactional(readOnly = true)
    public NinoPlan buscarPorId(Integer id) {
        return repo.findById(id).map(this::toDomain)
                .orElseThrow(() -> new com.entrelazados.web.RecursoNoEncontradoException("Plan no encontrado"));
    }

    @Transactional
    public void eliminar(Integer id) {
        if (!repo.existsById(id))
            throw new RecursoNoEncontradoException("Plan no encontrado");
        repo.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<NinoPlanEntity> findConFechaFinEntre(LocalDate desde, LocalDate hasta) {
        return repo.findByFechaFinBetween(desde, hasta);
    }

    @Transactional
    public void desestimarAlerta(Integer id) {
        NinoPlanEntity e = repo.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Plan no encontrado"));
        e.setUltimaAlertaDesestimadaEn(java.time.LocalDateTime.now());
        repo.save(e);
    }

    @Transactional
    public NinoPlan agregarSesiones(Integer id, Integer cantidad) {
        NinoPlanEntity e = repo.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Plan no encontrado"));
        int nuevoTotal = e.getTotalSesiones() + cantidad;
        e.setTotalSesiones(nuevoTotal);
        if (e.getFechaInicio() != null) {
            e.setFechaFin(e.getFechaInicio().plusDays(nuevoTotal - 1));
        }
        return toDomain(repo.save(e));
    }

    private NinoPlan toDomain(NinoPlanEntity e) {
        return new NinoPlan(e.getId(), e.getIdNino(), e.getTipo(), e.getIdServicio(), e.getIdPaquete(),
                e.getTotalSesiones(), e.getSesionesConsumidas(),
                e.getFechaInicio(), e.getFechaFin());
    }
}
