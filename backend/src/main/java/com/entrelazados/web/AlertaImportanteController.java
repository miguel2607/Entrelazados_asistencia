package com.entrelazados.web;

import com.entrelazados.persistence.entity.AlertaImportanteEntity;
import com.entrelazados.service.AlertaImportanteService;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("alertas-importantes")
public class AlertaImportanteController {

    private final AlertaImportanteService alertaService;

    public AlertaImportanteController(AlertaImportanteService alertaService) {
        this.alertaService = alertaService;
    }

    @GetMapping
    public List<Map<String, Object>> listarRecientes() {
        return alertaService.listarRecientes().stream().map(this::toMap).toList();
    }

    @GetMapping("/resumen")
    public Map<String, Object> resumen() {
        Map<String, Object> out = new HashMap<>();
        out.put("nuevas", alertaService.contarNuevas());
        AlertaImportanteEntity ultima = alertaService.ultimaNueva();
        out.put("ultimaNueva", ultima != null ? toMap(ultima) : null);
        return out;
    }

    @PatchMapping("/{id}/vista")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void marcarVista(@PathVariable Integer id) {
        alertaService.marcarVista(id);
    }

    @PatchMapping("/{id}/resuelta")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void marcarResuelta(@PathVariable Integer id) {
        alertaService.marcarResuelta(id);
    }

    @PostMapping("/marcar-vistas")
    public Map<String, Object> marcarTodasComoVista() {
        return Map.of("actualizadas", alertaService.marcarTodasComoVista());
    }

    private Map<String, Object> toMap(AlertaImportanteEntity e) {
        Map<String, Object> out = new HashMap<>();
        out.put("id", e.getId());
        out.put("idNino", e.getIdNino());
        out.put("nombreNino", e.getNombreNino());
        out.put("tipo", e.getTipo());
        out.put("mensaje", e.getMensaje());
        out.put("estado", e.getEstado());
        out.put("creadaEn", e.getCreadaEn() != null ? e.getCreadaEn().toString() : null);
        out.put("actualizadaEn", e.getActualizadaEn() != null ? e.getActualizadaEn().toString() : null);
        return out;
    }
}
