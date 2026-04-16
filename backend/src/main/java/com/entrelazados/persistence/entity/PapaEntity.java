package com.entrelazados.persistence.entity;

import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
@Table(name = "papas")
public class PapaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String nombre;

    @Column(nullable = false, unique = true)
    private String cedula;

    @Column(name = "fecha_nacimiento", nullable = false)
    private LocalDate fechaNacimiento;

    @Column(name = "semanas_gestacion")
    private Integer semanasGestacion;

    private String telefono;

    @Column(name = "biometric_id")
    private String biometricId;

    @Column(nullable = false)
    private Boolean enabled = true;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getCedula() { return cedula; }
    public void setCedula(String cedula) { this.cedula = cedula; }
    public LocalDate getFechaNacimiento() { return fechaNacimiento; }
    public void setFechaNacimiento(LocalDate fechaNacimiento) { this.fechaNacimiento = fechaNacimiento; }
    public Integer getSemanasGestacion() { return semanasGestacion; }
    public void setSemanasGestacion(Integer semanasGestacion) { this.semanasGestacion = semanasGestacion; }
    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }
    public String getBiometricId() { return biometricId; }
    public void setBiometricId(String biometricId) { this.biometricId = biometricId; }
    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
}

