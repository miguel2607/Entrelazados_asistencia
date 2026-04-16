package com.entrelazados.web;

import com.entrelazados.domain.Papa;
import com.entrelazados.domain.PapaPlan;
import com.entrelazados.domain.Servicio;
import com.entrelazados.service.PapaPlanService;
import com.entrelazados.service.PapaService;
import com.entrelazados.service.PaqueteService;
import com.entrelazados.service.ServicioService;
import com.entrelazados.web.dto.PapaPlanRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("planes-papas")
public class PapaPlanController {
    private static final String KEY_NOMBRE = "nombre";
    private static final String KEY_SERVICIOS = "servicios";

    private final PapaPlanService planService;
    private final PapaService papaService;
    private final ServicioService servicioService;
    private final PaqueteService paqueteService;

    public PapaPlanController(PapaPlanService planService, PapaService papaService, ServicioService servicioService, PaqueteService paqueteService) {
        this.planService = planService;
        this.papaService = papaService;
        this.servicioService = servicioService;
        this.paqueteService = paqueteService;
    }

    @PostMapping("/servicio")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> asignarServicio(@RequestParam Integer idPapa, @RequestParam Integer idServicio, @Valid @RequestBody PapaPlanRequest request) {
        PapaPlan p = planService.asignarServicio(idPapa, idServicio, request.fechaInicio(), request.totalSesiones());
        return toResponse(p);
    }

    @PostMapping("/paquete")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> asignarPaquete(@RequestParam Integer idPapa, @RequestParam Integer idPaquete, @Valid @RequestBody PapaPlanRequest request) {
        PapaPlan p = planService.asignarPaquete(idPapa, idPaquete, request.fechaInicio(), request.totalSesiones(),
                request.cantidad(), request.porcentajeDescuento(), request.sesionesConsumidas());
        return toResponse(p);
    }

    @GetMapping("/activos-hoy")
    public List<Map<String, Object>> activosHoy(@RequestParam(required = false) LocalDate fecha) {
        LocalDate f = fecha != null ? fecha : LocalDate.now();
        return planService.findVigentesEnFecha(f).stream().map(plan -> {
            Map<String, Object> m = new HashMap<>();
            m.put("idPapa", plan.getIdPapa());
            Papa p = papaService.buscarPorId(plan.getIdPapa());
            m.put("nombrePapa", p.nombre());
            m.put("tipo", plan.getTipo().name());
            m.put(KEY_NOMBRE, planService.getNombrePlan(plan.getId()));
            if (plan.getTipo() == com.entrelazados.domain.TipoPlan.SERVICIO && plan.getIdServicio() != null) {
                Servicio s = servicioService.buscarPorId(plan.getIdServicio());
                m.put(KEY_SERVICIOS, List.of(Map.of("id", s.id(), KEY_NOMBRE, s.nombre(), "precio", s.precio())));
            } else if (plan.getTipo() == com.entrelazados.domain.TipoPlan.PAQUETE && plan.getIdPaquete() != null) {
                var paq = paqueteService.buscarPorIdConServicios(plan.getIdPaquete());
                m.put(KEY_SERVICIOS, paq.servicios().stream()
                        .map(s -> Map.of("id", s.id(), KEY_NOMBRE, s.nombre(), "precio", s.precio())).toList());
            } else {
                m.put(KEY_SERVICIOS, List.of());
            }
            return m;
        }).collect(Collectors.toList());
    }

    @GetMapping("/papa/{idPapa}")
    public List<Map<String, Object>> porPapa(@PathVariable Integer idPapa) {
        return planService.listarPorPapa(idPapa).stream().map(p -> {
            Map<String, Object> m = toResponse(p);
            m.put("nombrePlan", planService.getNombrePlan(p.id()));
            return m;
        }).collect(Collectors.toList());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Integer id) {
        planService.eliminar(id);
    }

    @PatchMapping("/{id}/agregar-sesiones")
    public Map<String, Object> agregarSesiones(@PathVariable Integer id, @RequestParam int cantidad) {
        PapaPlan p = planService.agregarSesiones(id, cantidad);
        return toResponse(p);
    }

    @PatchMapping("/{id}/quitar-sesiones")
    public Map<String, Object> quitarSesiones(@PathVariable Integer id, @RequestParam int cantidad) {
        PapaPlan p = planService.quitarSesiones(id, cantidad);
        return toResponse(p);
    }

    private Map<String, Object> toResponse(PapaPlan p) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", p.id());
        m.put("idPapa", p.idPapa());
        m.put("tipo", p.tipo().name());
        m.put("idServicio", p.idServicio());
        m.put("idPaquete", p.idPaquete());
        m.put("totalSesiones", p.totalSesiones());
        m.put("sesionesConsumidas", p.sesionesConsumidas());
        m.put("fechaInicio", p.fechaInicio().toString());
        m.put("fechaFin", p.fechaFin() != null ? p.fechaFin().toString() : null);
        return m;
    }
}

