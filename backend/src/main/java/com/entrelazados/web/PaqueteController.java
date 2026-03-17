package com.entrelazados.web;

import com.entrelazados.domain.Paquete;
import com.entrelazados.service.PaqueteService;
import com.entrelazados.web.dto.PaqueteRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("paquetes")
public class PaqueteController {

    private final PaqueteService service;

    public PaqueteController(PaqueteService service) {
        this.service = service;
    }

    @GetMapping
    public List<Paquete> listar() {
        return service.listar();
    }

    @GetMapping("/{id}")
    public Paquete obtener(@PathVariable Integer id) {
        return service.buscarPorIdConServicios(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Paquete crear(@Valid @RequestBody PaqueteRequest request) {
        int dias = request.cantidadDias() != null && request.cantidadDias() > 0 ? request.cantidadDias() : 1;
        return service.crear(request.nombre(), request.precio(), dias, request.idServicios() != null ? request.idServicios() : List.of());
    }

    @PutMapping("/{id}")
    public Paquete actualizar(@PathVariable Integer id, @Valid @RequestBody PaqueteRequest request) {
        int dias = request.cantidadDias() != null && request.cantidadDias() > 0 ? request.cantidadDias() : 1;
        return service.actualizar(id, request.nombre(), request.precio(), dias, request.idServicios() != null ? request.idServicios() : List.of());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Integer id) {
        service.eliminar(id);
    }
}
