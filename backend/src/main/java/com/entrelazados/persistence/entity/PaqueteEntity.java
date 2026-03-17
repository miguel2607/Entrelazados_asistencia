package com.entrelazados.persistence.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "paquetes")
public class PaqueteEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    @Column(nullable = false)
    private String nombre;
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal precio;
    @Column(name = "cantidad_dias", nullable = false)
    private Integer cantidadDias = 1;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "paquete_servicio",
            joinColumns = @JoinColumn(name = "id_paquete"),
            inverseJoinColumns = @JoinColumn(name = "id_servicio"))
    private List<ServicioEntity> servicios = new ArrayList<>();

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public BigDecimal getPrecio() { return precio; }
    public void setPrecio(BigDecimal precio) { this.precio = precio; }
    public Integer getCantidadDias() { return cantidadDias != null ? cantidadDias : 1; }
    public void setCantidadDias(Integer cantidadDias) { this.cantidadDias = cantidadDias != null ? cantidadDias : 1; }
    public List<ServicioEntity> getServicios() { return servicios; }
    public void setServicios(List<ServicioEntity> servicios) { this.servicios = servicios != null ? servicios : new ArrayList<>(); }
}
