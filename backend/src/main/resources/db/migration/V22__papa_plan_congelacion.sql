-- Historial de congelamientos de planes de padres (paridad con nino_plan_congelacion)
CREATE TABLE papa_plan_congelacion (
    id SERIAL PRIMARY KEY,
    id_papa_plan INTEGER NOT NULL,
    fecha DATE NOT NULL,
    dias INTEGER NOT NULL,
    motivo VARCHAR(500),
    CONSTRAINT fk_papa_plan_cong FOREIGN KEY (id_papa_plan) REFERENCES papa_plan(id) ON DELETE CASCADE
);

CREATE INDEX idx_papa_plan_cong_plan ON papa_plan_congelacion(id_papa_plan);
