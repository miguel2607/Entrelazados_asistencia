package com.entrelazados.persistence.entity;

import java.io.Serializable;
import java.util.Objects;

public class NinoAcudientePk implements Serializable {

    private Integer idNino;
    private Integer idAcudiente;

    public Integer getIdNino() { return idNino; }
    public void setIdNino(Integer idNino) { this.idNino = idNino; }
    public Integer getIdAcudiente() { return idAcudiente; }
    public void setIdAcudiente(Integer idAcudiente) { this.idAcudiente = idAcudiente; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        NinoAcudientePk that = (NinoAcudientePk) o;
        return Objects.equals(idNino, that.idNino) && Objects.equals(idAcudiente, that.idAcudiente);
    }

    @Override
    public int hashCode() {
        return Objects.hash(idNino, idAcudiente);
    }
}
