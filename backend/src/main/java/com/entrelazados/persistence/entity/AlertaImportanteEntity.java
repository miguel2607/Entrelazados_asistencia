package com.entrelazados.persistence.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "alerta_importante")
public class AlertaImportanteEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "id_nino", nullable = false)
    private Integer idNino;

    @Column(name = "nombre_nino", nullable = false, length = 180)
    private String nombreNino;

    @Column(name = "tipo", nullable = false, length = 64)
    private String tipo;

    @Column(name = "mensaje", nullable = false, length = 500)
    private String mensaje;

    @Column(name = "estado", nullable = false, length = 20)
    private String estado;

    @Column(name = "creada_en", nullable = false)
    private java.time.LocalDateTime creadaEn;

    @Column(name = "actualizada_en", nullable = false)
    private java.time.LocalDateTime actualizadaEn;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Integer getIdNino() {
        return idNino;
    }

    public void setIdNino(Integer idNino) {
        this.idNino = idNino;
    }

    public String getNombreNino() {
        return nombreNino;
    }

    public void setNombreNino(String nombreNino) {
        this.nombreNino = nombreNino;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public String getMensaje() {
        return mensaje;
    }

    public void setMensaje(String mensaje) {
        this.mensaje = mensaje;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public java.time.LocalDateTime getCreadaEn() {
        return creadaEn;
    }

    public void setCreadaEn(java.time.LocalDateTime creadaEn) {
        this.creadaEn = creadaEn;
    }

    public java.time.LocalDateTime getActualizadaEn() {
        return actualizadaEn;
    }

    public void setActualizadaEn(java.time.LocalDateTime actualizadaEn) {
        this.actualizadaEn = actualizadaEn;
    }
}
