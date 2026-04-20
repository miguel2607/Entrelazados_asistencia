package com.entrelazados.web;

import com.entrelazados.domain.AsistenciaPapa;
import com.entrelazados.domain.Papa;
import com.entrelazados.domain.TipoPlan;
import com.entrelazados.persistence.entity.PapaPlanEntity;
import com.entrelazados.persistence.repository.PapaPlanJpaRepository;
import com.entrelazados.service.AsistenciaPapaService;
import com.entrelazados.service.PapaPlanService;
import com.entrelazados.service.PapaService;
import com.entrelazados.service.PaqueteService;
import com.entrelazados.service.ServicioService;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("dashboard/padres")
public class DashboardPadresController {

    private static final long RESUMEN_CACHE_TTL_MS = 5000;

    private final PapaService papaService;
    private final AsistenciaPapaService asistenciaPapaService;
    private final PapaPlanService papaPlanService;
    private final PapaPlanJpaRepository papaPlanRepo;
    private final ServicioService servicioService;
    private final PaqueteService paqueteService;

    private LocalDate cacheFecha;
    private long cacheExpiraEnMs;
    private Map<String, Object> cacheResumen;

    public DashboardPadresController(PapaService papaService, AsistenciaPapaService asistenciaPapaService,
            PapaPlanService papaPlanService, PapaPlanJpaRepository papaPlanRepo, ServicioService servicioService,
            PaqueteService paqueteService) {
        this.papaService = papaService;
        this.asistenciaPapaService = asistenciaPapaService;
        this.papaPlanService = papaPlanService;
        this.papaPlanRepo = papaPlanRepo;
        this.servicioService = servicioService;
        this.paqueteService = paqueteService;
    }

    @GetMapping
    public synchronized Map<String, Object> resumen(@RequestParam(required = false) LocalDate fecha) {
        LocalDate f = fecha != null ? fecha : LocalDate.now();
        long ahoraMs = System.currentTimeMillis();
        if (cacheResumen != null && f.equals(cacheFecha) && ahoraMs < cacheExpiraEnMs) {
            return cacheResumen;
        }

        List<AsistenciaPapa> asis = asistenciaPapaService.listarPorFecha(f);
        List<PapaPlanEntity> planesConSesiones = papaPlanService.findVigentesEnFecha(f).stream()
                .filter(p -> p.getSesionesConsumidas() < p.getTotalSesiones())
                .toList();
        List<PapaPlanEntity> planesAlertas = papaPlanRepo.findPorAgotarse(3);

        Set<Integer> idsPapa = asis.stream().map(AsistenciaPapa::idPapa).collect(Collectors.toSet());
        idsPapa.addAll(planesConSesiones.stream().map(PapaPlanEntity::getIdPapa).toList());
        idsPapa.addAll(planesAlertas.stream().map(PapaPlanEntity::getIdPapa).toList());

        Map<Integer, Papa> papaPorId = idsPapa.stream()
                .collect(Collectors.toMap(id -> id, papaService::buscarPorId));

        Set<Integer> idsPlan = asis.stream().map(AsistenciaPapa::idPlan).filter(Objects::nonNull).collect(Collectors.toSet());
        idsPlan.addAll(planesConSesiones.stream().map(PapaPlanEntity::getId).toList());
        idsPlan.addAll(planesAlertas.stream().map(PapaPlanEntity::getId).toList());
        Map<Integer, String> nombresPlan = papaPlanService.mapearNombresPorIds(idsPlan);

        List<Map<String, Object>> asistenciaHoy = asis.stream().map(a -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", a.id());
            m.put("idPapa", a.idPapa());
            m.put("idPlan", a.idPlan());
            m.put("fecha", a.fecha().toString());
            m.put("horaEntrada", a.horaEntrada() != null ? a.horaEntrada().toString() : null);
            m.put("horaSalida", a.horaSalida() != null ? a.horaSalida().toString() : null);
            m.put("observacion", a.observacion());
            m.put("nombrePlan", nombresPlan.get(a.idPlan()));
            Papa p = papaPorId.get(a.idPapa());
            if (p != null) {
                m.put("papa", Map.of("id", p.id(), "nombre", p.nombre(), "cedula", p.cedula() != null ? p.cedula() : ""));
            }
            return m;
        }).toList();

        List<Map<String, Object>> planesActivosHoy = planesConSesiones.stream().map(plan -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", plan.getId());
            m.put("idPapa", plan.getIdPapa());
            Papa pa = papaPorId.get(plan.getIdPapa());
            m.put("nombrePapa", pa != null ? pa.nombre() : "Sin nombre");
            m.put("tipo", plan.getTipo().name());
            m.put("nombre", nombresPlan.get(plan.getId()));
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
        for (PapaPlanEntity plan : planesAlertas) {
            Map<String, Object> al = new HashMap<>();
            al.put("idPlan", plan.getId());
            al.put("idPapa", plan.getIdPapa());
            Papa pa = papaPorId.get(plan.getIdPapa());
            al.put("nombrePapa", pa != null ? pa.nombre() : "Sin nombre");
            String nombrePlan = nombresPlan.get(plan.getId());
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

        List<Map<String, Object>> alertasTiempo = new ArrayList<>();
        Map<String, Map<String, Object>> alertasTiempoIndex = new HashMap<>();
        for (AsistenciaPapa a : asis) {
            String nombrePlan = nombresPlan.get(a.idPlan());
            if (nombrePlan == null)
                continue;

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
            if (umbralHoras == null)
                continue;

            LocalTime entrada = a.horaEntrada();
            LocalTime salida = a.horaSalida() != null ? a.horaSalida() : LocalTime.now();
            Duration dur = Duration.between(entrada, salida);
            if (dur.isNegative())
                dur = dur.plusHours(24);

            long segundos = dur.getSeconds();
            if (segundos < umbralHoras * 3600L)
                continue;

            Papa p = papaPorId.get(a.idPapa());
            if (p == null)
                continue;
            String durStr;
            long horas = segundos / 3600;
            long minutos = (segundos % 3600) / 60;
            durStr = horas > 0 ? String.format("%d h %02d m", horas, minutos) : String.format("%d min", minutos);

            String key = a.idPapa() + "_" + a.idPlan();
            Map<String, Object> prev = alertasTiempoIndex.get(key);
            if (prev == null || (long) prev.getOrDefault("segundos", 0L) < segundos) {
                Map<String, Object> m = new HashMap<>();
                m.put("idPapa", a.idPapa());
                m.put("nombrePapa", p.nombre());
                m.put("idPlan", a.idPlan());
                m.put("nombrePlan", nombrePlan);
                m.put("tipoComposicion", tipoComposicion);
                m.put("umbralHoras", umbralHoras);
                m.put("duracion", durStr);
                m.put("segundos", segundos);
                m.put("mensaje",
                        String.format("Atención: %s superó el tiempo máximo de %s. Lleva %s (umbral: %dh).",
                                p.nombre(), tipoComposicion, durStr, umbralHoras));
                alertasTiempoIndex.put(key, m);
            }
        }

        alertasTiempo.addAll(alertasTiempoIndex.values());
        alertasTiempo.sort((m1, m2) -> ((Long) m2.getOrDefault("segundos", 0L))
                .compareTo((Long) m1.getOrDefault("segundos", 0L)));

        Map<String, Object> map = new HashMap<>();
        map.put("totalPapas", (int) papaService.totalRegistrados());
        map.put("totalAsistenciaHoy", asistenciaHoy.size());
        map.put("totalPlanesActivosHoy", planesActivosHoy.size());
        map.put("asistenciaHoy", enSalaAhora);
        map.put("planesActivosHoy", planesActivosHoy);
        map.put("alertasPlanes", alertasPlanes);
        map.put("alertasTiempo", alertasTiempo.stream().map(m -> {
            m.remove("segundos");
            return m;
        }).toList());
        map.put("cumpleanosHoy", List.of());

        cacheFecha = f;
        cacheExpiraEnMs = ahoraMs + RESUMEN_CACHE_TTL_MS;
        cacheResumen = map;
        return map;
    }
}
