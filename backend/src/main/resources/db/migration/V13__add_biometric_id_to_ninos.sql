-- V13__add_biometric_id_to_ninos.sql
-- Agrega la columna biometric_id para sincronizar con equipos Hikvision
ALTER TABLE ninos ADD COLUMN biometric_id VARCHAR(50);
-- Crear un índice para búsquedas rápidas por ID biométrico
CREATE INDEX idx_nino_biometric_id ON ninos(biometric_id);
