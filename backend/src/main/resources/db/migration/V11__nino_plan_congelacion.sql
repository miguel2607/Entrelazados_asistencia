-- V11__nino_plan_congelacion.sql
CREATE TABLE nino_plan_congelacion (
    id SERIAL PRIMARY KEY,
    id_nino_plan INTEGER NOT NULL,
    fecha DATE NOT NULL,
    dias INTEGER NOT NULL,
    CONSTRAINT fk_nino_plan FOREIGN KEY (id_nino_plan) REFERENCES nino_plan(id) ON DELETE CASCADE
);
