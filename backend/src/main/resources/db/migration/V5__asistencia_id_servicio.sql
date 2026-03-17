ALTER TABLE asistencia ADD COLUMN IF NOT EXISTS id_servicio INT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_asistencia_servicio'
      AND table_name = 'asistencia'
  ) THEN
    ALTER TABLE asistencia
      ADD CONSTRAINT fk_asistencia_servicio
      FOREIGN KEY (id_servicio) REFERENCES servicios(id)
      ON DELETE SET NULL;
  END IF;
END $$;
