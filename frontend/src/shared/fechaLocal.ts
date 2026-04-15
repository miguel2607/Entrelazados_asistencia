/**
 * Fecha calendario en la zona horaria del navegador (YYYY-MM-DD).
 * Evita el desfase de `toISOString()` que usa UTC y puede ser otro día.
 */
export function fechaLocalYYYYMMDD(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
