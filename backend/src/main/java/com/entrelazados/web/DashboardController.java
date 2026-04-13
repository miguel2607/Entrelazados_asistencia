package com.entrelazados.web;

import com.entrelazados.domain.Asistencia;
import com.entrelazados.domain.Nino;
import com.entrelazados.persistence.entity.NinoPlanEntity;
import com.entrelazados.service.AsistenciaService;
import com.entrelazados.service.DashboardService;
import com.entrelazados.service.NinoPlanService;
import com.entrelazados.service.NinoService;
import com.entrelazados.service.PaqueteService;
import com.entrelazados.service.ServicioService;
import com.entrelazados.persistence.repository.NinoPlanJpaRepository;
import com.entrelazados.domain.TipoPlan;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("dashboard")
public class DashboardController {

    private final DashboardService dashboardService;
    private final AsistenciaService asistenciaService;
    private final NinoService ninoService;
    private final NinoPlanService ninoPlanService;
    private final ServicioService servicioService;
    private final PaqueteService paqueteService;
    private final NinoPlanJpaRepository ninoPlanRepo;

    public DashboardController(DashboardService dashboardService, AsistenciaService asistenciaService,
            NinoService ninoService, NinoPlanService ninoPlanService, ServicioService servicioService,
            PaqueteService paqueteService, NinoPlanJpaRepository ninoPlanRepo) {
        this.dashboardService = dashboardService;
        this.asistenciaService = asistenciaService;
        this.ninoService = ninoService;
        this.ninoPlanService = ninoPlanService;
        this.servicioService = servicioService;
        this.paqueteService = paqueteService;
        this.ninoPlanRepo = ninoPlanRepo;
    }

    @GetMapping
    public Map<String, Object> resumen(@RequestParam(required = false) LocalDate fecha) {
        LocalDate f = fecha != null ? fecha : LocalDate.now();
        List<Asistencia> asis = asistenciaService.listarPorFecha(f);
        List<Map<String, Object>> asistenciaHoy = asis.stream().map(a -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", a.id());
            m.put("idNino", a.idNino());
            m.put("idPlan", a.idPlan());
            m.put("fecha", a.fecha().toString());
            m.put("horaEntrada", a.horaEntrada() != null ? a.horaEntrada().toString() : null);
            m.put("horaSalida", a.horaSalida() != null ? a.horaSalida().toString() : null);
            m.put("observacion", a.observacion());
            m.put("nombrePlan", ninoPlanService.getNombrePlan(a.idPlan()));
            Nino n = ninoService.buscarPorId(a.idNino());
            m.put("nino", Map.of("id", n.id(), "nombre", n.nombre(), "ti", n.ti() != null ? n.ti() : "",
                    "fechaNacimiento", n.fechaNacimiento().toString()));
            return m;
        }).toList();
        List<Map<String, Object>> planesActivosHoy = ninoPlanRepo.findConSesionesDisponibles().stream().map(plan -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", plan.getId());
            m.put("idNino", plan.getIdNino());
            Nino n = ninoService.buscarPorId(plan.getIdNino());
            m.put("nombreNino", n.nombre());
            m.put("tipo", plan.getTipo().name());
            m.put("nombre", ninoPlanService.getNombrePlan(plan.getId()));
            m.put("sesionesRestantes", plan.getTotalSesiones() - plan.getSesionesConsumidas());
            if (plan.getTipo() == TipoPlan.SERVICIO && plan.getIdServicio() != null) {
                var s = servicioService.buscarPorId(plan.getIdServicio());
                m.put("servicios", List.of(Map.of("id", s.id(), "nombre", s.nombre(), "precio", s.precio())));
            } else if (plan.getTipo() == TipoPlan.PAQUETE && plan.getIdPaquete() != null) {
                var paq = paqueteService.buscarPorIdConServicios(plan.getIdPaquete());
                m.put("servicios", paq.servicios().stream()
                        .map(s -> Map.of("id", s.id(), "nombre", s.nombre(), "precio", s.precio())).toList());
            } else {
                m.put("servicios", List.of());
            }
            return m;
        }).toList();
        List<NinoPlanEntity> planesAlertas = ninoPlanRepo.findPorAgotarse(3);
        List<Map<String, Object>> alertasPlanes = new ArrayList<>();
        java.time.LocalDateTime lim = java.time.LocalDateTime.now().minusHours(24);
        for (NinoPlanEntity plan : planesAlertas) {
            if (plan.getUltimaAlertaDesestimadaEn() != null && plan.getUltimaAlertaDesestimadaEn().isAfter(lim)) {
                continue;
            }
            Map<String, Object> al = new HashMap<>();
            al.put("idPlan", plan.getId());
            al.put("idNino", plan.getIdNino());
            Nino n = ninoService.buscarPorId(plan.getIdNino());
            al.put("nombreNino", n.nombre());
            al.put("nombrePlan",
                    ninoPlanService.getNombrePlan(plan.getId()) != null ? ninoPlanService.getNombrePlan(plan.getId())
                            : "Plan");
            al.put("tipo", plan.getTipo().name());
            int restantes = plan.getTotalSesiones() - plan.getSesionesConsumidas();
            al.put("sesionesRestantes", restantes);
            al.put("vencido", restantes <= 0);
            al.put("venceHoy", restantes == 1);
            al.put("mensaje", restantes <= 0 ? "Plan agotado" : "Le quedan " + restantes + " sesiones");
            alertasPlanes.add(al);
        }
        List<Map<String, Object>> enSalaAhora = asistenciaHoy.stream()
                .filter(a -> a.get("horaSalida") == null)
                .toList();
        List<Map<String, Object>> cumpleanosHoy = ninoService.listarCumpleanosEnFecha(f).stream().map(n -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", n.id());
            m.put("nombre", n.nombre());
            m.put("fechaNacimiento", n.fechaNacimiento() != null ? n.fechaNacimiento().toString() : null);
            long edad = n.fechaNacimiento() != null ? ChronoUnit.YEARS.between(n.fechaNacimiento(), f) : 0;
            m.put("edadCumplida", (int) Math.max(edad, 0));
            m.put("mensaje", "Hoy cumple " + Math.max(edad, 0) + " años");
            return m;
        }).toList();
        Map<String, Object> map = new HashMap<>();
        map.put("totalNinos", (int) dashboardService.totalNinos());
        map.put("totalAsistenciaHoy", asistenciaHoy.size());
        map.put("totalPlanesActivosHoy", planesActivosHoy.size());
        map.put("asistenciaHoy", enSalaAhora);
        map.put("planesActivosHoy", planesActivosHoy);
        map.put("alertasPlanes", alertasPlanes);
        map.put("cumpleanosHoy", cumpleanosHoy);
        return map;
    }
}
