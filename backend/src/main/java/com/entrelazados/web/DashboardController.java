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
import java.time.LocalTime;
import java.time.Duration;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("dashboard")
public class DashboardController {
    private static final long RESUMEN_CACHE_TTL_MS = 5000;

    private final DashboardService dashboardService;
    private final AsistenciaService asistenciaService;
    private final NinoService ninoService;
    private final NinoPlanService ninoPlanService;
    private final ServicioService servicioService;
    private final PaqueteService paqueteService;
    private final NinoPlanJpaRepository ninoPlanRepo;
    private LocalDate cacheFecha;
    private long cacheExpiraEnMs;
    private Map<String, Object> cacheResumen;

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
    public synchronized Map<String, Object> resumen(@RequestParam(required = false) LocalDate fecha) {
        LocalDate f = fecha != null ? fecha : LocalDate.now();
        long ahoraMs = System.currentTimeMillis();
        if (cacheResumen != null && f.equals(cacheFecha) && ahoraMs < cacheExpiraEnMs) {
            return cacheResumen;
        }
        List<Asistencia> asis = asistenciaService.listarPorFecha(f);
        List<NinoPlanEntity> planesConSesiones = ninoPlanRepo.findConSesionesDisponibles();
        List<NinoPlanEntity> planesAlertas = ninoPlanRepo.findPorAgotarse(3);

        Set<Integer> idsNinos = asis.stream().map(Asistencia::idNino).collect(Collectors.toSet());
        idsNinos.addAll(planesConSesiones.stream().map(NinoPlanEntity::getIdNino).toList());
        idsNinos.addAll(planesAlertas.stream().map(NinoPlanEntity::getIdNino).toList());
        Map<Integer, Nino> ninosPorId = ninoService.mapearPorIds(idsNinos);
        Set<Integer> idsPlan = asis.stream().map(Asistencia::idPlan).filter(Objects::nonNull).collect(Collectors.toSet());
        idsPlan.addAll(planesConSesiones.stream().map(NinoPlanEntity::getId).toList());
        idsPlan.addAll(planesAlertas.stream().map(NinoPlanEntity::getId).toList());
        Map<Integer, String> nombresPlanPorId = ninoPlanService.mapearNombresPorIds(idsPlan);

        List<Map<String, Object>> asistenciaHoy = asis.stream().map(a -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", a.id());
            m.put("idNino", a.idNino());
            m.put("idPlan", a.idPlan());
            m.put("fecha", a.fecha().toString());
            m.put("horaEntrada", a.horaEntrada() != null ? a.horaEntrada().toString() : null);
            m.put("horaSalida", a.horaSalida() != null ? a.horaSalida().toString() : null);
            m.put("observacion", a.observacion());
            String nombrePlan = nombresPlanPorId.get(a.idPlan());
            m.put("nombrePlan", nombrePlan);
            Nino n = ninosPorId.get(a.idNino());
            if (n != null) {
                m.put("nino", Map.of("id", n.id(), "nombre", n.nombre(), "ti", n.ti() != null ? n.ti() : "",
                        "fechaNacimiento", n.fechaNacimiento().toString()));
            }
            return m;
        }).toList();
        List<Map<String, Object>> planesActivosHoy = planesConSesiones.stream().map(plan -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", plan.getId());
            m.put("idNino", plan.getIdNino());
            Nino n = ninosPorId.get(plan.getIdNino());
            m.put("nombreNino", n != null ? n.nombre() : "Sin nombre");
            m.put("tipo", plan.getTipo().name());
            m.put("nombre", nombresPlanPorId.get(plan.getId()));
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
        List<Map<String, Object>> alertasPlanes = new ArrayList<>();
        java.time.LocalDateTime lim = java.time.LocalDateTime.now().minusHours(24);
        for (NinoPlanEntity plan : planesAlertas) {
            if (plan.getUltimaAlertaDesestimadaEn() != null && plan.getUltimaAlertaDesestimadaEn().isAfter(lim)) {
                continue;
            }
            Map<String, Object> al = new HashMap<>();
            al.put("idPlan", plan.getId());
            al.put("idNino", plan.getIdNino());
            Nino n = ninosPorId.get(plan.getIdNino());
            al.put("nombreNino", n != null ? n.nombre() : "Sin nombre");
            String nombrePlan = nombresPlanPorId.get(plan.getId());
            al.put("nombrePlan", nombrePlan != null ? nombrePlan : "Plan");
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

        // Alertas por tiempo máximo de permanencia según "composición" del plan.
        // - Media jornada: > 5 horas
        // - Jornada extendida: > 8 horas
        List<Map<String, Object>> alertasTiempo = new ArrayList<>();
        Map<String, Map<String, Object>> alertasTiempoIndex = new HashMap<>();
        for (Asistencia a : asis) {
            String nombrePlan = nombresPlanPorId.get(a.idPlan());
            if (nombrePlan == null) continue;

            String nombrePlanLower = nombrePlan.toLowerCase();
            Integer umbralHoras = null;
            String tipoComposicion = null;
            if (nombrePlanLower.contains("media jornada")) {
                umbralHoras = 5;
                tipoComposicion = "media jornada";
            } else if (nombrePlanLower.contains("jornada extendida") || nombrePlanLower.contains("extendida")) {
                umbralHoras = 8;
                tipoComposicion = "jornada extendida";
            }
            if (umbralHoras == null) continue;

            LocalTime entrada = a.horaEntrada();
            LocalTime salida = a.horaSalida() != null ? a.horaSalida() : LocalTime.now();
            Duration dur = Duration.between(entrada, salida);
            if (dur.isNegative()) dur = dur.plusHours(24);

            long segundos = dur.getSeconds();
            if (segundos < umbralHoras * 3600L) continue;

            Nino n = ninosPorId.get(a.idNino());
            if (n == null) continue;
            String durStr;
            long horas = segundos / 3600;
            long minutos = (segundos % 3600) / 60;
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
        map.put("totalPlanesActivosHoy", planesActivosHoy.size());
        map.put("asistenciaHoy", enSalaAhora);
        map.put("planesActivosHoy", planesActivosHoy);
        map.put("alertasPlanes", alertasPlanes);
        map.put("alertasTiempo", alertasTiempo.stream().map(m -> {
            m.remove("segundos");
            return m;
        }).toList());
        map.put("cumpleanosHoy", cumpleanosHoy);
        cacheFecha = f;
        cacheExpiraEnMs = ahoraMs + RESUMEN_CACHE_TTL_MS;
        cacheResumen = map;
        return map;
    }
}
