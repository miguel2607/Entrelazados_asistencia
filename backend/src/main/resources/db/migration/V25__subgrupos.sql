CREATE TABLE IF NOT EXISTS subgrupos (
    id SERIAL PRIMARY KEY,
    id_grupo INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_subgrupos_grupo_nombre_lower
    ON subgrupos (id_grupo, LOWER(nombre));
