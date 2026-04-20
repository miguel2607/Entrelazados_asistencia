package com.entrelazados.web;

import com.entrelazados.domain.Papa;
import com.entrelazados.domain.PapaPlan;
import com.entrelazados.persistence.entity.PapaPlanCongelacionEntity;
import com.entrelazados.service.PapaPlanService;
import com.entrelazados.service.PapaService;
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
@RequestMapping("planes-papa")
public class PapaPlanController {

    private final PapaPlanService planService;
    private final PapaService papaService;

    public PapaPlanController(PapaPlanService planService, PapaService papaService) {
        this.planService = planService;
        this.papaService = papaService;
    }

    @PostMapping("/servicio")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> asignarServicio(@RequestParam Integer idPapa, @RequestParam Integer idServicio,
            @Valid @RequestBody NinoPlanRequest request) {
        PapaPlan p = planService.asignarServicio(idPapa, idServicio, request.fechaInicio(), request.totalSesiones());
        return toResponse(p);
    }

    @PostMapping("/paquete")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> asignarPaquete(@RequestParam Integer idPapa, @RequestParam Integer idPaquete,
            @Valid @RequestBody NinoPlanRequest request) {
        PapaPlan p = planService.asignarPaquete(idPapa, idPaquete, request.fechaInicio(), request.totalSesiones(),
                request.cantidad(), request.porcentajeDescuento(), request.sesionesConsumidas());
        return toResponse(p);
    }

    @GetMapping("/papa/{idPapa}")
    public List<Map<String, Object>> porPapa(@PathVariable Integer idPapa) {
        return planService.listarPorPapa(idPapa).stream().map(p -> {
            Map<String, Object> m = toResponse(p);
            m.put("nombrePlan", planService.getNombrePlan(p.id()));
            return m;
        }).collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public Map<String, Object> obtener(@PathVariable Integer id) {
        PapaPlan p = planService.buscarPorId(id);
        Map<String, Object> m = toResponse(p);
        m.put("nombrePlan", planService.getNombrePlan(p.id()));
        return m;
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Integer id) {
        planService.eliminar(id);
    }

    @PatchMapping("/{id}/agregar-sesiones")
    public Map<String, Object> agregarSesiones(@PathVariable Integer id, @RequestParam Integer cantidad) {
        PapaPlan p = planService.agregarSesiones(id, cantidad);
        return toResponse(p);
    }

    @PatchMapping("/{id}/quitar-sesiones")
    public Map<String, Object> quitarSesiones(@PathVariable Integer id, @RequestParam Integer cantidad) {
        PapaPlan p = planService.quitarSesiones(id, cantidad);
        return toResponse(p);
    }

    @PostMapping("/{id}/congelar")
    public Map<String, Object> congelar(@PathVariable Integer id, @RequestParam Integer dias,
            @RequestBody(required = false) Map<String, String> body) {
        String motivo = body != null ? body.get("motivo") : null;
        PapaPlan p = planService.congelarPlan(id, dias, motivo);
        return toResponse(p);
    }

    @GetMapping("/{id}/congelaciones")
    public List<PapaPlanCongelacionEntity> getCongelaciones(@PathVariable Integer id) {
        return planService.findCongelaciones(id);
    }

    @GetMapping("/activos-hoy")
    public List<Map<String, Object>> activosHoy(@RequestParam(required = false) LocalDate fecha) {
        LocalDate f = fecha != null ? fecha : LocalDate.now();
        var planes = planService.findVigentesEnFecha(f);
        Set<Integer> idsPapa = planes.stream().map(p -> p.getIdPapa()).collect(Collectors.toSet());
        Map<Integer, Papa> papasPorId = idsPapa.stream()
                .collect(Collectors.toMap(id -> id, id -> papaService.buscarPorId(id)));
        return planes.stream().map(plan -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", plan.getId());
            m.put("idPapa", plan.getIdPapa());
            Papa pa = papasPorId.get(plan.getIdPapa());
            m.put("nombrePapa", pa != null ? pa.nombre() : "Sin nombre");
            m.put("tipo", plan.getTipo().name());
            m.put("nombre", planService.getNombrePlan(plan.getId()));
            m.put("sesionesRestantes", plan.getTotalSesiones() - plan.getSesionesConsumidas());
            return m;
        }).collect(Collectors.toList());
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
        m.put("precioAcordado", p.precioAcordado());
        m.put("porcentajeDescuento", p.porcentajeDescuento());
        return m;
    }
}
