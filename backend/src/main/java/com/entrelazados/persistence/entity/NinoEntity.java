package com.entrelazados.persistence.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "ninos")
public class NinoEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    @Column(nullable = false)
    private String nombre;
    private String ti;
    @Column(name = "fecha_nacimiento", nullable = false)
    private LocalDate fechaNacimiento;
    @Column(name = "biometric_id")
    private String biometricId;
    private String grupo;
    private String subgrupo;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getTi() { return ti; }
    public void setTi(String ti) { this.ti = ti; }
    public LocalDate getFechaNacimiento() { return fechaNacimiento; }
    public void setFechaNacimiento(LocalDate f) { this.fechaNacimiento = f; }
    public String getBiometricId() { return biometricId; }
    public void setBiometricId(String biometricId) { this.biometricId = biometricId; }
    public String getGrupo() { return grupo; }
    public void setGrupo(String grupo) { this.grupo = grupo; }
    public String getSubgrupo() { return subgrupo; }
    public void setSubgrupo(String subgrupo) { this.subgrupo = subgrupo; }
}
