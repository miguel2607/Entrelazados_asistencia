package com.entrelazados.persistence.entity;

import jakarta.persistence.*;

import com.entrelazados.persistence.entity.NinoAcudientePk;

@Entity
@Table(name = "nino_acudiente")
@IdClass(NinoAcudientePk.class)
public class NinoAcudienteEntity {

    @Id
    @Column(name = "id_nino")
    private Integer idNino;
    @Id
    @Column(name = "id_acudiente")
    private Integer idAcudiente;
    @Column(nullable = false)
    private String parentesco = "acudiente";

    public Integer getIdNino() { return idNino; }
    public void setIdNino(Integer idNino) { this.idNino = idNino; }
    public Integer getIdAcudiente() { return idAcudiente; }
    public void setIdAcudiente(Integer idAcudiente) { this.idAcudiente = idAcudiente; }
    public String getParentesco() { return parentesco; }
    public void setParentesco(String parentesco) { this.parentesco = parentesco; }
}
