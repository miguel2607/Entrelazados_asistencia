package com.entrelazados.web;

import com.entrelazados.domain.Asistencia;
import com.entrelazados.domain.Nino;
import com.entrelazados.domain.Papa;
import com.entrelazados.persistence.entity.NinoPlanEntity;
import com.entrelazados.service.AsistenciaService;
import com.entrelazados.service.AsistenciaPapaService;
import com.entrelazados.service.DashboardService;
import com.entrelazados.service.NinoPlanService;
import com.entrelazados.service.NinoService;
import com.entrelazados.service.PapaService;
import com.entrelazados.service.PaqueteService;
import com.entrelazados.service.ServicioService;
import com.entrelazados.persistence.repository.NinoPlanJpaRepository;
import com.entrelazados.domain.TipoPlan;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.Duration;
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
    private final AsistenciaPapaService asistenciaPapaService;
    private final NinoService ninoService;
    private final PapaService papaService;
    private final NinoPlanService ninoPlanService;
    private final ServicioService servicioService;
    private final PaqueteService paqueteService;
    private final NinoPlanJpaRepository ninoPlanRepo;

    public DashboardController(DashboardService dashboardService, AsistenciaService asistenciaService,
            AsistenciaPapaService asistenciaPapaService, NinoService ninoService, PapaService papaService, NinoPlanService ninoPlanService, ServicioService servicioService,
            PaqueteService paqueteService, NinoPlanJpaRepository ninoPlanRepo) {
        this.dashboardService = dashboardService;
        this.asistenciaService = asistenciaService;
        this.asistenciaPapaService = asistenciaPapaService;
        this.ninoService = ninoService;
        this.papaService = papaService;
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
        List<Map<String, Object>> asistenciaPapasHoy = asistenciaPapaService.listarPorFecha(f).stream().map(a -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", a.id());
            m.put("idPapa", a.idPapa());
            m.put("idPlan", a.idPlan());
            m.put("fecha", a.fecha().toString());
            m.put("horaEntrada", a.horaEntrada() != null ? a.horaEntrada().toString() : null);
            m.put("horaSalida", a.horaSalida() != null ? a.horaSalida().toString() : null);
            m.put("observacion", a.observacion());
            m.put("nombrePlan", a.nombrePlan());
            Papa p = papaService.buscarPorId(a.idPapa());
            m.put("papa", Map.of(
                    "id", p.id(),
                    "nombre", p.nombre(),
                    "cedula", p.cedula()
            ));
            return m;
        }).filter(a -> a.get("horaSalida") == null).toList();

        // Alertas por tiempo máximo de permanencia según "composición" del plan.
        // - Media jornada: > 5 horas
        // - Jornada extendida: > 7 horas
        List<Map<String, Object>> alertasTiempo = new ArrayList<>();
        Map<String, Map<String, Object>> alertasTiempoIndex = new HashMap<>();
        for (Asistencia a : asis) {
            String nombrePlan = ninoPlanService.getNombrePlan(a.idPlan());
            if (nombrePlan == null) continue;

            String nombrePlanLower = nombrePlan.toLowerCase();
            Integer umbralHoras = null;
            String tipoComposicion = null;
            if (nombrePlanLower.contains("media jornada")) {
                umbralHoras = 5;
                tipoComposicion = "media jornada";
            } else if (nombrePlanLower.contains("jornada extendida") || nombrePlanLower.contains("extendida")) {
                umbralHoras = 7;
                tipoComposicion = "jornada extendida";
            }
            if (umbralHoras == null) continue;

            LocalTime entrada = a.horaEntrada();
            LocalTime salida = a.horaSalida() != null ? a.horaSalida() : LocalTime.now();
            Duration dur = Duration.between(entrada, salida);
            if (dur.isNegative()) dur = dur.plusHours(24);

            long segundos = dur.getSeconds();
            if (segundos < umbralHoras * 3600L) continue;

            Nino n = ninoService.buscarPorId(a.idNino());
            double durHoras = segundos / 3600.0;
            String durStr;
            long horas = segundos / 3600;
            long minutos = (segundos % 3600) / 60;
            long secs = segundos % 60;
            durStr = horas > 0 ? String.format("%d h %02d m", horas, minutos) : String.format("%d min", minutos);

            String key = a.idNino() + "_" + a.idPlan();
            Map<String, Object> prev = alertasTiempoIndex.get(key);
            if (prev == null || (long) prev.getOrDefault("segundos", 0L) < segundos) {
                Map<String, Object> m = new HashMap<>();
                m.put("idNino", a.idNino());
                m.put("nombreNino", n.nombre());
                m.put("idPlan", a.idPlan());
                m.put("nombrePlan", nombrePlan);
                m.put("tipoComposicion", tipoComposicion);
                m.put("umbralHoras", umbralHoras);
                m.put("duracion", durStr);
                m.put("segundos", segundos);
                m.put("mensaje",
                        String.format("Atención: %s superó el tiempo máximo de %s. Lleva %s (umbral: %dh).",
                                n.nombre(), tipoComposicion, durStr, umbralHoras));
                alertasTiempoIndex.put(key, m);
            }
        }

        alertasTiempo.addAll(alertasTiempoIndex.values());
        alertasTiempo.sort((m1, m2) -> ((Long) m2.getOrDefault("segundos", 0L)).compareTo((Long) m1.getOrDefault("segundos", 0L)));
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
        map.put("totalPapas", (int) papaService.listar(null).size());
        map.put("totalAsistenciaPapasHoy", asistenciaPapasHoy.size());
        map.put("totalPlanesActivosHoy", planesActivosHoy.size());
        map.put("asistenciaHoy", enSalaAhora);
        map.put("asistenciaPapasHoy", asistenciaPapasHoy);
        map.put("planesActivosHoy", planesActivosHoy);
        map.put("alertasPlanes", alertasPlanes);
        map.put("alertasTiempo", alertasTiempo.stream().map(m -> {
            m.remove("segundos");
            return m;
        }).toList());
        map.put("cumpleanosHoy", cumpleanosHoy);
        return map;
    }
}
