package com.entrelazados.service;

import com.entrelazados.domain.PapaPlan;
import com.entrelazados.domain.TipoPlan;
import com.entrelazados.persistence.entity.PapaPlanEntity;
import com.entrelazados.persistence.repository.PapaPlanJpaRepository;
import com.entrelazados.persistence.repository.PaqueteJpaRepository;
import com.entrelazados.persistence.repository.ServicioJpaRepository;
import com.entrelazados.web.RecursoNoEncontradoException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Service
public class PapaPlanService {
    private static final int VIGENCIA_PAQUETE_DIAS = 30;

    private final PapaPlanJpaRepository repo;
    private final ServicioJpaRepository servicioRepo;
    private final PaqueteJpaRepository paqueteRepo;
    private final PapaService papaService;

    public PapaPlanService(PapaPlanJpaRepository repo, ServicioJpaRepository servicioRepo, PaqueteJpaRepository paqueteRepo, PapaService papaService) {
        this.repo = repo;
        this.servicioRepo = servicioRepo;
        this.paqueteRepo = paqueteRepo;
        this.papaService = papaService;
    }

    @Transactional
    public PapaPlan asignarServicio(Integer idPapa, Integer idServicio, LocalDate fechaInicio, Integer totalSesiones) {
        if (!papaService.existePorId(idPapa)) throw new RecursoNoEncontradoException("Papá no encontrado");
        var servicio = servicioRepo.findById(idServicio).orElseThrow(() -> new RecursoNoEncontradoException("Servicio no encontrado"));
        int dias = (totalSesiones != null && totalSesiones > 0) ? totalSesiones : servicio.getCantidadDias();

        PapaPlanEntity e = new PapaPlanEntity();
        e.setIdPapa(idPapa);
        e.setTipo(TipoPlan.SERVICIO);
        e.setIdServicio(idServicio);
        e.setIdPaquete(null);
        e.setTotalSesiones(dias);
        e.setSesionesConsumidas(0);
        e.setFechaInicio(fechaInicio);
        e.setFechaFin(fechaInicio.plusDays(VIGENCIA_PAQUETE_DIAS));
        e.setPrecioAcordado(servicio.getPrecio());
        e.setPorcentajeDescuento(BigDecimal.ZERO);
        return toDomain(repo.save(e));
    }

    @Transactional
    public PapaPlan asignarPaquete(Integer idPapa, Integer idPaquete, LocalDate fechaInicio,
                                   Integer totalSesiones, Integer cantidad,
                                   BigDecimal porcentajeDescuento, Integer sesionesConsumidas) {
        if (!papaService.existePorId(idPapa)) throw new RecursoNoEncontradoException("Papá no encontrado");
        var paquete = paqueteRepo.findById(idPaquete).orElseThrow(() -> new RecursoNoEncontradoException("Paquete no encontrado"));

        int cant = (cantidad != null && cantidad > 0) ? cantidad : 1;
        int sesionesBase = (totalSesiones != null && totalSesiones > 0) ? totalSesiones : paquete.getCantidadDias();
        int totalAcumulado = sesionesBase * cant;

        BigDecimal desc = (porcentajeDescuento != null) ? porcentajeDescuento : BigDecimal.ZERO;
        BigDecimal precioUnitario = paquete.getPrecio();
        BigDecimal precioSubtotal = precioUnitario.multiply(BigDecimal.valueOf(cant));
        BigDecimal factorDescuento = BigDecimal.ONE.subtract(desc.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
        BigDecimal precioFinal = precioSubtotal.multiply(factorDescuento).setScale(2, RoundingMode.HALF_UP);

        PapaPlanEntity e = new PapaPlanEntity();
        e.setIdPapa(idPapa);
        e.setTipo(TipoPlan.PAQUETE);
        e.setIdServicio(null);
        e.setIdPaquete(idPaquete);
        e.setTotalSesiones(totalAcumulado);
        e.setSesionesConsumidas(sesionesConsumidas != null ? sesionesConsumidas : 0);
        e.setFechaInicio(fechaInicio);
        e.setFechaFin(fechaInicio.plusDays(VIGENCIA_PAQUETE_DIAS));
        e.setPrecioAcordado(precioFinal);
        e.setPorcentajeDescuento(desc);
        return toDomain(repo.save(e));
    }

    @Transactional(readOnly = true)
    public List<PapaPlan> listarPorPapa(Integer idPapa) {
        return repo.findByIdPapaOrderByFechaInicio(idPapa).stream().map(this::toDomain).toList();
    }

    @Transactional(readOnly = true)
    public List<PapaPlanEntity> findVigentesEnFecha(LocalDate fecha) {
        return repo.findVigentesEnFecha(fecha);
    }

    @Transactional
    public void eliminar(Integer id) {
        if (!repo.existsById(id)) throw new RecursoNoEncontradoException("Plan no encontrado");
        repo.deleteById(id);
    }

    @Transactional
    public PapaPlan agregarSesiones(Integer id, int cantidad) {
        PapaPlanEntity e = repo.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Plan no encontrado"));
        e.setTotalSesiones(e.getTotalSesiones() + cantidad);
        return toDomain(repo.save(e));
    }

    @Transactional
    public PapaPlan quitarSesiones(Integer id, int cantidad) {
        PapaPlanEntity e = repo.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Plan no encontrado"));
        int nuevas = e.getTotalSesiones() - cantidad;
        if (nuevas < e.getSesionesConsumidas()) {
            throw new IllegalArgumentException("No se puede reducir por debajo de las sesiones ya consumidas (" + e.getSesionesConsumidas() + ")");
        }
        e.setTotalSesiones(nuevas);
        return toDomain(repo.save(e));
    }

    @Transactional(readOnly = true)
    public String getNombrePlan(Integer idPlan) {
        if (idPlan == null) return null;
        return repo.findById(idPlan).map(plan -> {
            if (plan.getTipo() == TipoPlan.SERVICIO && plan.getIdServicio() != null) {
                return servicioRepo.findById(plan.getIdServicio()).map(s -> s.getNombre()).orElse(null);
            }
            if (plan.getTipo() == TipoPlan.PAQUETE && plan.getIdPaquete() != null) {
                return paqueteRepo.findById(plan.getIdPaquete()).map(p -> p.getNombre()).orElse(null);
            }
            return null;
        }).orElse(null);
    }

    private PapaPlan toDomain(PapaPlanEntity e) {
        return new PapaPlan(
                e.getId(),
                e.getIdPapa(),
                e.getTipo(),
                e.getIdServicio(),
                e.getIdPaquete(),
                e.getTotalSesiones(),
                e.getSesionesConsumidas(),
                e.getFechaInicio(),
                e.getFechaFin()
        );
    }
}
