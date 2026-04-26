CREATE TABLE IF NOT EXISTS alerta_importante (
    id SERIAL PRIMARY KEY,
    id_nino INTEGER NOT NULL REFERENCES ninos(id),
    nombre_nino VARCHAR(180) NOT NULL,
    tipo VARCHAR(64) NOT NULL,
    mensaje VARCHAR(500) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'NUEVA',
    creada_en TIMESTAMP NOT NULL DEFAULT NOW(),
    actualizada_en TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerta_importante_estado ON alerta_importante(estado);
CREATE INDEX IF NOT EXISTS idx_alerta_importante_creada_en ON alerta_importante(creada_en DESC);
