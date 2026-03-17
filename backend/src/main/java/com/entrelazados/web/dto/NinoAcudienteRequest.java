package com.entrelazados.web.dto;

import jakarta.validation.constraints.NotNull;

public record NinoAcudienteRequest(@NotNull Integer idNino, @NotNull Integer idAcudiente, String parentesco) {}
