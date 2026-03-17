package com.entrelazados.persistence.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;

@Entity
@Table(name = "servicios")
public class ServicioEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    @Column(nullable = false)
    private String nombre;
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal precio;
    @Column(name = "cantidad_dias", nullable = false)
    private Integer cantidadDias = 1;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public BigDecimal getPrecio() { return precio; }
    public void setPrecio(BigDecimal precio) { this.precio = precio; }
    public Integer getCantidadDias() { return cantidadDias != null ? cantidadDias : 1; }
    public void setCantidadDias(Integer cantidadDias) { this.cantidadDias = cantidadDias != null ? cantidadDias : 1; }
}
