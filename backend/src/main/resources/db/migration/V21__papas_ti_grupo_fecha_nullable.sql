-- Permite registrar padres con semanas de gestación sin fecha de nacimiento obligatoria.
ALTER TABLE papas ALTER COLUMN fecha_nacimiento DROP NOT NULL;
ALTER TABLE papas ADD COLUMN IF NOT EXISTS ti VARCHAR(50);
ALTER TABLE papas ADD COLUMN IF NOT EXISTS grupo VARCHAR(100);
