package com.entrelazados.web;

import com.entrelazados.domain.Servicio;
import com.entrelazados.service.ServicioService;
import com.entrelazados.web.dto.ServicioRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("servicios")
public class ServicioController {

    private final ServicioService service;

    public ServicioController(ServicioService service) {
        this.service = service;
    }

    @GetMapping
    public List<Servicio> listar() {
        return service.listar();
    }

    @GetMapping("/{id}")
    public Servicio obtener(@PathVariable Integer id) {
        return service.buscarPorId(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Servicio crear(@Valid @RequestBody ServicioRequest request) {
        return service.crear(request.nombre(), request.precio(), request.cantidadDias());
    }

    @PutMapping("/{id}")
    public Servicio actualizar(@PathVariable Integer id, @Valid @RequestBody ServicioRequest request) {
        return service.actualizar(id, request.nombre(), request.precio(), request.cantidadDias());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Integer id) {
        service.eliminar(id);
    }
}
