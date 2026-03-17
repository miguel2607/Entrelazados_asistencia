ALTER TABLE asistencia ADD COLUMN IF NOT EXISTS id_plan INT NULL;

CREATE INDEX IF NOT EXISTS idx_asistencia_id_nino ON asistencia(id_nino);

DROP INDEX IF EXISTS uk_asistencia_nino_fecha;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_asistencia_plan'
      AND table_name = 'asistencia'
  ) THEN
    ALTER TABLE asistencia
      ADD CONSTRAINT fk_asistencia_plan
      FOREIGN KEY (id_plan) REFERENCES nino_plan(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_asistencia_nino_fecha_plan ON asistencia(id_nino, fecha, id_plan);
