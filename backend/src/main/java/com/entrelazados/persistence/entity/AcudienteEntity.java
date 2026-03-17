package com.entrelazados.persistence.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "acudientes")
public class AcudienteEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    @Column(nullable = false)
    private String nombre;
    private String telefono;
    private String cc;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }
    public String getCc() { return cc; }
    public void setCc(String cc) { this.cc = cc; }
}
