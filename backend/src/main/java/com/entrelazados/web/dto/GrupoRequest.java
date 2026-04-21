package com.entrelazados.web.dto;

import jakarta.validation.constraints.NotBlank;

public record GrupoRequest(@NotBlank String nombre, @NotBlank String color) {}
