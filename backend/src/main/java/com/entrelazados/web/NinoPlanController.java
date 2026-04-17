package com.entrelazados.web;

import com.entrelazados.domain.Nino;
import com.entrelazados.domain.NinoPlan;
import com.entrelazados.domain.Servicio;
import com.entrelazados.persistence.entity.NinoPlanCongelacionEntity;
import com.entrelazados.service.NinoPlanService;
import com.entrelazados.service.NinoService;
import com.entrelazados.service.PaqueteService;
import com.entrelazados.service.ServicioService;
import com.entrelazados.web.dto.NinoPlanRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("planes")
public class NinoPlanController {

    private final NinoPlanService planService;
    private final NinoService ninoService;
    private final ServicioService servicioService;
    private final PaqueteService paqueteService;

    public NinoPlanController(NinoPlanService planService, NinoService ninoService, ServicioService servicioService,
            PaqueteService paqueteService) {
        this.planService = planService;
        this.ninoService = ninoService;
        this.servicioService = servicioService;
        this.paqueteService = paqueteService;
    }

    @PostMapping("/servicio")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> asignarServicio(@RequestParam Integer idNino, @RequestParam Integer idServicio,
            @Valid @RequestBody NinoPlanRequest request) {
        NinoPlan p = planService.asignarServicio(idNino, idServicio, request.fechaInicio(), request.totalSesiones());
        return toResponse(p);
    }

    @PostMapping("/paquete")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> asignarPaquete(@RequestParam Integer idNino, @RequestParam Integer idPaquete,
            @Valid @RequestBody NinoPlanRequest request) {
        NinoPlan p = planService.asignarPaquete(idNino, idPaquete, request.fechaInicio(), request.totalSesiones(),
                request.cantidad(), request.porcentajeDescuento(), request.sesionesConsumidas());
        return toResponse(p);
    }

    @GetMapping("/activos-hoy")
    public List<Map<String, Object>> activosHoy(@RequestParam(required = false) LocalDate fecha) {
        LocalDate f = fecha != null ? fecha : LocalDate.now();
        var planes = planService.findVigentesEnFecha(f);
        Set<Integer> idsNino = planes.stream().map(p -> p.getIdNino()).collect(Collectors.toSet());
        Set<Integer> idsPlan = planes.stream().map(p -> p.getId()).collect(Collectors.toSet());
        Map<Integer, Nino> ninosPorId = ninoService.mapearPorIds(idsNino);
        Map<Integer, String> nombresPlanPorId = planService.mapearNombresPorIds(idsPlan);

        return planes.stream().map(plan -> {
            Map<String, Object> m = new HashMap<>();
            m.put("idNino", plan.getIdNino());
            Nino n = ninosPorId.get(plan.getIdNino());
            m.put("nombreNino", n != null ? n.nombre() : "Sin nombre");
            m.put("tipo", plan.getTipo().name());
            m.put("nombre", nombresPlanPorId.get(plan.getId()));
            m.put("servicios", List.of());
            return m;
        }).collect(Collectors.toList());
    }

    @GetMapping("/nino/{idNino}")
    public List<Map<String, Object>> porNino(@PathVariable Integer idNino) {
        return planService.listarPorNino(idNino).stream().map(p -> {
            Map<String, Object> m = toResponse(p);
            m.put("nombrePlan", planService.getNombrePlan(p.id()));
            return m;
        }).collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public Map<String, Object> obtener(@PathVariable Integer id) {
        NinoPlan p = planService.buscarPorId(id);
        return toResponse(p);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Integer id) {
        planService.eliminar(id);
    }

    @PostMapping("/{id}/desestimar-alerta")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void desestimarAlerta(@PathVariable Integer id) {
        planService.desestimarAlerta(id);
    }

    @PatchMapping("/{id}/agregar-sesiones")
    public Map<String, Object> agregarSesiones(@PathVariable Integer id, @RequestParam Integer cantidad) {
        NinoPlan p = planService.agregarSesiones(id, cantidad);
        return toResponse(p);
    }

    @PatchMapping("/{id}/quitar-sesiones")
    public Map<String, Object> quitarSesiones(@PathVariable Integer id, @RequestParam Integer cantidad) {
        NinoPlan p = planService.quitarSesiones(id, cantidad);
        return toResponse(p);
    }

    @PostMapping("/{id}/congelar")
    public Map<String, Object> congelar(@PathVariable Integer id, @RequestParam Integer dias,
            @RequestBody(required = false) Map<String, String> body) {
        String motivo = body != null ? body.get("motivo") : null;
        NinoPlan p = planService.congelarPlan(id, dias, motivo);
        return toResponse(p);
    }

    @GetMapping("/{id}/congelaciones")
    public List<NinoPlanCongelacionEntity> getCongelaciones(@PathVariable Integer id) {
        return planService.findCongelaciones(id);
    }

    private Map<String, Object> toResponse(NinoPlan p) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", p.id());
        m.put("idNino", p.idNino());
        m.put("tipo", p.tipo().name());
        m.put("idServicio", p.idServicio());
        m.put("idPaquete", p.idPaquete());
        m.put("totalSesiones", p.totalSesiones());
        m.put("sesionesConsumidas", p.sesionesConsumidas());
        m.put("fechaInicio", p.fechaInicio().toString());
        m.put("fechaFin", p.fechaFin() != null ? p.fechaFin().toString() : null);
        m.put("precioAcordado", p.precioAcordado());
        m.put("porcentajeDescuento", p.porcentajeDescuento());
        return m;
    }
}
