package com.entrelazados.service;

import com.entrelazados.domain.PapaPlan;
import com.entrelazados.domain.TipoPlan;
import com.entrelazados.persistence.entity.PapaPlanCongelacionEntity;
import com.entrelazados.persistence.entity.PapaPlanEntity;
import com.entrelazados.persistence.repository.PapaPlanCongelacionJpaRepository;
import com.entrelazados.persistence.repository.PapaPlanJpaRepository;
import com.entrelazados.persistence.repository.PaqueteJpaRepository;
import com.entrelazados.persistence.repository.ServicioJpaRepository;
import com.entrelazados.web.ConflictoException;
import com.entrelazados.web.RecursoNoEncontradoException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class PapaPlanService {

    private static final int VIGENCIA_PAQUETE_DIAS = 30;

    private final PapaPlanJpaRepository repo;
    private final PapaPlanCongelacionJpaRepository congelacionRepo;
    private final ServicioJpaRepository servicioRepo;
    private final PaqueteJpaRepository paqueteRepo;
    private final PapaService papaService;

    public PapaPlanService(PapaPlanJpaRepository repo, PapaPlanCongelacionJpaRepository congelacionRepo,
            ServicioJpaRepository servicioRepo, PaqueteJpaRepository paqueteRepo, PapaService papaService) {
        this.repo = repo;
        this.congelacionRepo = congelacionRepo;
        this.servicioRepo = servicioRepo;
        this.paqueteRepo = paqueteRepo;
        this.papaService = papaService;
    }

    @Transactional
    public PapaPlan asignarServicio(Integer idPapa, Integer idServicio, LocalDate fechaInicio, Integer totalSesiones) {
        if (!papaService.existePorId(idPapa))
            throw new RecursoNoEncontradoException("Padre no encontrado");
        var servicio = servicioRepo.findById(idServicio)
                .orElseThrow(() -> new RecursoNoEncontradoException("Servicio no encontrado"));
        int dias = (totalSesiones != null && totalSesiones > 0) ? totalSesiones : servicio.getCantidadDias();
        PapaPlanEntity e = new PapaPlanEntity();
        e.setIdPapa(idPapa);
        e.setTipo(TipoPlan.SERVICIO);
        e.setIdServicio(idServicio);
        e.setIdPaquete(null);
        e.setFechaInicio(fechaInicio);
        e.setTotalSesiones(dias);
        e.setFechaFin(fechaInicio.plusDays(dias));
        e.setSesionesConsumidas(0);
        e.setPrecioAcordado(servicio.getPrecio());
        e.setPorcentajeDescuento(BigDecimal.ZERO);
        return toDomain(repo.save(e));
    }

    @Transactional
    public PapaPlan asignarPaquete(Integer idPapa, Integer idPaquete, LocalDate fechaInicio, Integer totalSesiones,
            Integer cantidad, BigDecimal porcentajeDescuento, Integer sesionesConsumidas) {
        if (!papaService.existePorId(idPapa))
            throw new RecursoNoEncontradoException("Padre no encontrado");
        var paquete = paqueteRepo.findById(idPaquete)
                .orElseThrow(() -> new RecursoNoEncontradoException("Paquete no encontrado"));

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
        e.setFechaInicio(fechaInicio);
        e.setTotalSesiones(totalAcumulado);
        e.setFechaFin(fechaInicio.plusDays(VIGENCIA_PAQUETE_DIAS));
        e.setSesionesConsumidas(sesionesConsumidas != null ? sesionesConsumidas : 0);
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

    @Transactional(readOnly = true)
    public PapaPlan buscarPorId(Integer id) {
        return repo.findById(id).map(this::toDomain)
                .orElseThrow(() -> new RecursoNoEncontradoException("Plan no encontrado"));
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
    public Map<Integer, String> mapearNombresPorIds(Set<Integer> idsPlan) {
        if (idsPlan == null || idsPlan.isEmpty()) {
            return Map.of();
        }
        List<PapaPlanEntity> planes = repo.findAllById(idsPlan);
        Set<Integer> idsServicio = planes.stream()
                .filter(p -> p.getTipo() == TipoPlan.SERVICIO && p.getIdServicio() != null)
                .map(PapaPlanEntity::getIdServicio)
                .collect(Collectors.toSet());
        Set<Integer> idsPaquete = planes.stream()
                .filter(p -> p.getTipo() == TipoPlan.PAQUETE && p.getIdPaquete() != null)
                .map(PapaPlanEntity::getIdPaquete)
                .collect(Collectors.toSet());

        Map<Integer, String> serviciosPorId = servicioRepo.findAllById(idsServicio).stream()
                .collect(Collectors.toMap(s -> s.getId(), s -> s.getNombre()));
        Map<Integer, String> paquetesPorId = paqueteRepo.findAllById(idsPaquete).stream()
                .collect(Collectors.toMap(p -> p.getId(), p -> p.getNombre()));

        return planes.stream().collect(Collectors.toMap(
                PapaPlanEntity::getId,
                p -> {
                    if (p.getTipo() == TipoPlan.SERVICIO) {
                        return serviciosPorId.getOrDefault(p.getIdServicio(), "Plan");
                    }
                    if (p.getTipo() == TipoPlan.PAQUETE) {
                        return paquetesPorId.getOrDefault(p.getIdPaquete(), "Plan");
                    }
                    return "Plan";
                },
                (a, b) -> a
        ));
    }

    @Transactional
    public void eliminar(Integer id) {
        if (!repo.existsById(id))
            throw new RecursoNoEncontradoException("Plan no encontrado");
        repo.deleteById(id);
    }

    @Transactional
    public PapaPlan agregarSesiones(Integer id, Integer cantidad) {
        PapaPlanEntity e = repo.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Plan no encontrado"));
        int nuevoTotal = e.getTotalSesiones() + cantidad;
        e.setTotalSesiones(nuevoTotal);
        if (e.getFechaInicio() != null) {
            e.setFechaFin(e.getFechaInicio().plusDays(nuevoTotal - 1));
        }
        return toDomain(repo.save(e));
    }

    @Transactional
    public PapaPlan quitarSesiones(Integer id, Integer cantidad) {
        if (cantidad == null || cantidad <= 0) {
            throw new ConflictoException("Cantidad inválida");
        }
        PapaPlanEntity e = repo.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Plan no encontrado"));
        int sesConsumidas = e.getSesionesConsumidas() != null ? e.getSesionesConsumidas() : 0;
        int sesTotalesActual = e.getTotalSesiones() != null ? e.getTotalSesiones() : 0;
        int nuevoTotal = sesTotalesActual - cantidad;
        if (nuevoTotal < sesConsumidas) {
            nuevoTotal = sesConsumidas;
        }
        if (nuevoTotal == sesTotalesActual) {
            return toDomain(e);
        }
        e.setTotalSesiones(nuevoTotal);
        if (e.getFechaInicio() != null) {
            e.setFechaFin(e.getFechaInicio().plusDays(nuevoTotal - 1));
        }
        return toDomain(repo.save(e));
    }

    @Transactional
    public PapaPlan congelarPlan(Integer id, Integer dias, String motivo) {
        PapaPlanEntity e = repo.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Plan no encontrado"));
        if (e.getFechaFin() != null) {
            LocalDate baseDate = e.getFechaFin().isBefore(LocalDate.now()) ? LocalDate.now() : e.getFechaFin();
            e.setFechaFin(baseDate.plusDays(dias));
        } else if (e.getFechaInicio() != null) {
            e.setFechaFin(e.getFechaInicio().plusDays(29 + dias));
        }
        repo.save(e);
        String motivoLimpio = motivo != null && !motivo.isBlank() ? motivo.trim() : null;
        PapaPlanCongelacionEntity c = new PapaPlanCongelacionEntity(id, LocalDate.now(), dias, motivoLimpio);
        congelacionRepo.save(c);
        return toDomain(e);
    }

    @Transactional(readOnly = true)
    public List<PapaPlanCongelacionEntity> findCongelaciones(Integer idPlan) {
        return congelacionRepo.findByIdPapaPlanOrderByFechaDesc(idPlan);
    }

    private PapaPlan toDomain(PapaPlanEntity e) {
        return new PapaPlan(e.getId(), e.getIdPapa(), e.getTipo(), e.getIdServicio(), e.getIdPaquete(),
                e.getTotalSesiones(), e.getSesionesConsumidas(),
                e.getFechaInicio(), e.getFechaFin(),
                e.getPrecioAcordado(), e.getPorcentajeDescuento());
    }
}
