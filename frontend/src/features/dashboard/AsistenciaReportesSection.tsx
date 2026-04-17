import { useMemo, useState } from 'react';
import { api } from '../../shared/api/apiClient';
import { fechaLocalYYYYMMDD } from '../../shared/fechaLocal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type NinoMini = { id?: number; nombre: string };

type ReportItem = {
  id?: number;
  fecha?: string; // YYYY-MM-DD (en mensual)
  horaEntrada?: string | null;
  horaSalida?: string | null;
  nombrePlan?: string | null;
  nombreServicio?: string | null;
  nino?: NinoMini;
  // Compatibilidad si un endpoint devolviera distinto nombre
  nombreNino?: string;
};

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toYYYYMMDD(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseTimeToSeconds(t?: string | null): number | null {
  if (!t) return null;
  const main = t.split('.')[0]; // ignorar fracción de segundos
  const parts = main.split(':').map((x) => Number.parseInt(x, 10));
  if (parts.length === 2) {
    const [h, m] = parts;
    if ([h, m].some(Number.isNaN)) return null;
    return h * 3600 + m * 60;
  }
  if (parts.length === 3) {
    const [h, m, s] = parts;
    if ([h, m, s].some(Number.isNaN)) return null;
    return h * 3600 + m * 60 + s;
  }
  return null;
}

function formatTimeEsCO(t?: string | null) {
  if (!t) return '--:--';
  const main = t.split('.')[0];
  const parts = main.split(':').map((x) => Number.parseInt(x, 10));
  if (parts.length < 2) return t;
  const [h, m] = parts;
  const s = parts.length >= 3 ? parts[2] : 0;
  if ([h, m, s].some(Number.isNaN)) return t;

  const d = new Date();
  d.setHours(h, m, s, 0);
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDuration(horaEntrada?: string | null, horaSalida?: string | null) {
  const entry = parseTimeToSeconds(horaEntrada);
  const exit = parseTimeToSeconds(horaSalida);
  if (entry == null || exit == null) return '--';

  let diff = exit - entry;
  if (diff < 0) diff += 24 * 3600; // por si el sistema entrega tiempos que cruzan medianoche

  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  if (hours > 0) return `${hours}h ${pad2(minutes)}m ${pad2(seconds)}s`;
  return `${minutes}m ${pad2(seconds)}s`;
}

function durationSeconds(horaEntrada?: string | null, horaSalida?: string | null): number | null {
  const entry = parseTimeToSeconds(horaEntrada);
  const exit = parseTimeToSeconds(horaSalida);
  if (entry == null || exit == null) return null;
  let diff = exit - entry;
  if (diff < 0) diff += 24 * 3600;
  return diff;
}

function formatDateEsCO(isoDate?: string | null) {
  if (!isoDate) return '--';
  // isoDate: YYYY-MM-DD
  const [y, m, d] = isoDate.split('-').map((p) => Number.parseInt(p, 10));
  if ([y, m, d].some(Number.isNaN)) return isoDate;
  const dt = new Date();
  dt.setFullYear(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  return dt.toLocaleDateString('es-CO');
}

function formatDateTimeEsCO(isoDate?: string | null, time?: string | null) {
  const f = formatDateEsCO(isoDate ?? undefined);
  const t = formatTimeEsCO(time ?? undefined);
  return `${f} ${t}`;
}

type MesGroup = {
  ninoKey: string;
  ninoNombre: string;
  planNombre: string;
  veces: number;
  primeraEntradaKey: string | null;
  ultimaEntradaKey: string | null;
  primeraEntradaFecha?: string | null;
  primeraEntradaHora?: string | null;
  ultimaEntradaFecha?: string | null;
  ultimaEntradaHora?: string | null;
  duracionTotalSegundos: number;
};

export function AsistenciaReportesSection() {
  const [loadingDia, setLoadingDia] = useState(false);
  const [loadingMes, setLoadingMes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dia, setDia] = useState<string>(() => fechaLocalYYYYMMDD());
  const [mes, setMes] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
  });

  const [diaRows, setDiaRows] = useState<ReportItem[]>([]);
  const [mesRows, setMesRows] = useState<ReportItem[]>([]);

  const diaOrdenada = useMemo(() => {
    const copy = [...diaRows];
    copy.sort((a, b) => {
      const sa = parseTimeToSeconds(a.horaEntrada);
      const sb = parseTimeToSeconds(b.horaEntrada);
      return (sa ?? Number.MAX_SAFE_INTEGER) - (sb ?? Number.MAX_SAFE_INTEGER);
    });
    return copy;
  }, [diaRows]);

  const mesAgrupado = useMemo(() => {
    const map = new Map<string, MesGroup>();

    for (const r of mesRows) {
      const ninoId = r.nino?.id != null ? String(r.nino.id) : nombreItem(r);
      const plan = planItem(r);
      const key = `${ninoId}__${plan}`;

      const fecha = r.fecha ?? '';
      const entradaSec = parseTimeToSeconds(r.horaEntrada);
      const entradaKey = entradaSec == null || !fecha ? null : `${fecha}-${entradaSec}`;

      if (!map.has(key)) {
        map.set(key, {
          ninoKey: ninoId,
          ninoNombre: nombreItem(r),
          planNombre: plan,
          veces: 0,
          primeraEntradaKey: null,
          ultimaEntradaKey: null,
          duracionTotalSegundos: 0,
        });
      }

      const g = map.get(key)!;
      g.veces += 1;

      // Duración total (solo si existe salida)
      const durSeg = durationSeconds(r.horaEntrada, r.horaSalida);
      if (durSeg != null) g.duracionTotalSegundos += durSeg;

      if (entradaKey) {
        if (!g.primeraEntradaKey || entradaKey < g.primeraEntradaKey) {
          g.primeraEntradaKey = entradaKey;
          g.primeraEntradaFecha = r.fecha ?? null;
          g.primeraEntradaHora = r.horaEntrada ?? null;
        }
        if (!g.ultimaEntradaKey || entradaKey > g.ultimaEntradaKey) {
          g.ultimaEntradaKey = entradaKey;
          g.ultimaEntradaFecha = r.fecha ?? null;
          g.ultimaEntradaHora = r.horaEntrada ?? null;
        }
      }
    }

    const groups = Array.from(map.values());
    groups.sort((a, b) => b.veces - a.veces || a.ninoNombre.localeCompare(b.ninoNombre));
    return groups;
  }, [mesRows]);

  const formatDurationSegundos = (seg: number) => {
    const hours = Math.floor(seg / 3600);
    const minutes = Math.floor((seg % 3600) / 60);
    const seconds = seg % 60;
    if (hours > 0) return `${hours}h ${pad2(minutes)}m`;
    if (minutes > 0) return `${minutes}m ${pad2(seconds)}s`;
    return `${seg}s`;
  };

  const nombreItem = (r: ReportItem) => r.nino?.nombre ?? r.nombreNino ?? '--';
  const planItem = (r: ReportItem) => r.nombrePlan ?? r.nombreServicio ?? 'Cortesía';

  async function descargarPDFDia() {
    setError(null);
    setLoadingDia(true);
    try {
      const items = await api.get<ReportItem[]>('/asistencia/por-fecha', { fecha: dia });
      setDiaRows(items);

      const head = [['Nombre', 'Plan', 'Hora entrada', 'Hora salida', 'Duración']];
      const body = items
        .slice()
        .sort((a, b) => {
          const sa = parseTimeToSeconds(a.horaEntrada);
          const sb = parseTimeToSeconds(b.horaEntrada);
          return (sa ?? Number.MAX_SAFE_INTEGER) - (sb ?? Number.MAX_SAFE_INTEGER);
        })
        .map((r) => [
          nombreItem(r),
          planItem(r),
          formatTimeEsCO(r.horaEntrada),
          formatTimeEsCO(r.horaSalida),
          formatDuration(r.horaEntrada, r.horaSalida),
        ]);

      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(45, 27, 105);
      doc.setFontSize(18);
      doc.text('Reporte de Asistencia', 40, 30);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Día: ${dia}`, 40, 48);
      doc.text(`Entradas registradas: ${items.length}`, 280, 48);
      const opened = items.filter((r) => !r.horaSalida).length;
      doc.text(`Sin salida (abiertos): ${opened}`, 440, 48);
      (doc as any).setDrawColor(45, 27, 105);
      doc.setLineWidth(1);
      doc.line(30, 55, 780, 55);

      autoTable(doc as any, {
        startY: 65,
        head,
        body,
        styles: { fontSize: 8, cellPadding: 3, textColor: 20 },
        headStyles: { fillColor: [76, 29, 149], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 243, 255] },
        theme: 'grid',
        tableLineColor: [225, 220, 255],
        columnStyles: { 0: { cellWidth: 'auto' } },
      });

      doc.save(`reporte_asistencia_dia_${dia}.pdf`);
    } catch (e: any) {
      setError(e?.message ?? 'Error generando el reporte del día.');
    } finally {
      setLoadingDia(false);
    }
  }

  async function descargarPDFMes() {
    setError(null);
    setLoadingMes(true);
    try {
      const [yearStr, monthStr] = mes.split('-');
      const year = Number.parseInt(yearStr, 10);
      const month = Number.parseInt(monthStr, 10);

      const desdeDate = new Date(year, month - 1, 1);
      const hastaDate = new Date(year, month, 0); // último día del mes
      const desde = toYYYYMMDD(desdeDate);
      const hasta = toYYYYMMDD(hastaDate);

      const items = await api.get<ReportItem[]>('/asistencia/por-rango', { desde, hasta });
      setMesRows(items);

      const totalEntradas = items.length;
      const abierto = items.filter((r) => !r.horaSalida).length;
      const ninosUnicos = new Set(items.map((r) => (r.nino?.id != null ? String(r.nino.id) : nombreItem(r)))).size;

      const planCounts = new Map<string, number>();
      for (const r of items) {
        const p = planItem(r);
        planCounts.set(p, (planCounts.get(p) ?? 0) + 1);
      }
      const topPlan = Array.from(planCounts.entries()).sort((a, b) => b[1] - a[1])[0];
      const topPlanName = topPlan?.[0] ?? '--';
      const topPlanCount = topPlan?.[1] ?? 0;

      // Agrupar por niño + plan (para cumplir "cuántas veces entró")
      const grupos: MesGroup[] = [];
      const map = new Map<string, MesGroup>();
      for (const r of items) {
        const ninoId = r.nino?.id != null ? String(r.nino.id) : nombreItem(r);
        const plan = planItem(r);
        const key = `${ninoId}__${plan}`;
        const fecha = r.fecha ?? '';
        const entradaSec = parseTimeToSeconds(r.horaEntrada);
        const entradaKey = entradaSec == null || !fecha ? null : `${fecha}-${entradaSec}`;

        if (!map.has(key)) {
          map.set(key, {
            ninoKey: ninoId,
            ninoNombre: nombreItem(r),
            planNombre: plan,
            veces: 0,
            primeraEntradaKey: null,
            ultimaEntradaKey: null,
            duracionTotalSegundos: 0,
          });
        }
        const g = map.get(key)!;
        g.veces += 1;
        const durSeg = durationSeconds(r.horaEntrada, r.horaSalida);
        if (durSeg != null) g.duracionTotalSegundos += durSeg;

        if (entradaKey) {
          if (!g.primeraEntradaKey || entradaKey < g.primeraEntradaKey) {
            g.primeraEntradaKey = entradaKey;
            g.primeraEntradaFecha = r.fecha ?? null;
            g.primeraEntradaHora = r.horaEntrada ?? null;
          }
          if (!g.ultimaEntradaKey || entradaKey > g.ultimaEntradaKey) {
            g.ultimaEntradaKey = entradaKey;
            g.ultimaEntradaFecha = r.fecha ?? null;
            g.ultimaEntradaHora = r.horaEntrada ?? null;
          }
        }
      }
      for (const v of map.values()) grupos.push(v);
      grupos.sort((a, b) => b.veces - a.veces || a.ninoNombre.localeCompare(b.ninoNombre));

      const head = [['Veces', 'Nombre', 'Plan', 'Primera entrada', 'Última entrada', 'Tiempo total']];
      const body = grupos.map((g) => [
        String(g.veces),
        g.ninoNombre,
        g.planNombre,
        formatDateTimeEsCO(g.primeraEntradaFecha, g.primeraEntradaHora),
        formatDateTimeEsCO(g.ultimaEntradaFecha, g.ultimaEntradaHora),
        formatDurationSegundos(g.duracionTotalSegundos),
      ]);

      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(45, 27, 105);
      doc.setFontSize(18);
      doc.text('Reporte de Asistencia (Mes)', 40, 30);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Mes: ${mes}`, 40, 48);
      doc.text(`Entradas registradas: ${totalEntradas}`, 280, 48);
      doc.text(`Niños únicos: ${ninosUnicos}`, 440, 48);
      doc.text(`Sin salida (abiertos): ${abierto}`, 600, 48);
      doc.setDrawColor(45, 27, 105);
      doc.setLineWidth(1);
      doc.line(30, 55, 830, 55);
      if (topPlanCount > 0) {
        doc.setFontSize(9);
        doc.text(`Plan con más entradas: ${topPlanName} (${topPlanCount})`, 40, 62);
      }

      autoTable(doc as any, {
        startY: topPlanCount > 0 ? 72 : 65,
        head,
        body,
        styles: { fontSize: 7, cellPadding: 3, textColor: 20 },
        headStyles: { fillColor: [76, 29, 149], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 243, 255] },
        theme: 'grid',
        tableLineColor: [225, 220, 255],
      });

      doc.save(`reporte_asistencia_mes_${mes}.pdf`);
    } catch (e: any) {
      setError(e?.message ?? 'Error generando el reporte mensual.');
    } finally {
      setLoadingMes(false);
    }
  }

  return (
    <section className="rounded-3xl border border-indigo-100 bg-white/60 p-6 backdrop-blur-sm shadow-sm space-y-6">
      <div className="flex items-start justify-between gap-6 flex-col sm:flex-row sm:items-center">
        <div>
          <h3 className="text-xl font-black text-[#111827]">Informes de Asistencia</h3>
          <p className="text-sm text-[#4b5563] mt-1">
            Reporte por día y mensual. Incluye nombre, plan, hora de entrada y duración.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Día */}
        <div className="google-card p-5 bg-white/80">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 justify-between">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#9ca3af] uppercase tracking-widest">
                Reporte por día
              </label>
              <input
                type="date"
                value={dia}
                onChange={(e) => setDia(e.target.value)}
                className="rounded-2xl border-2 border-[#f1f3f4] bg-white px-4 py-2 text-sm font-bold focus:border-[#2d1b69] focus:outline-none transition-all shadow-sm"
              />
            </div>
            <button
              type="button"
              disabled={loadingDia}
              onClick={descargarPDFDia}
              className="google-button-primary disabled:opacity-50"
            >
              {loadingDia ? 'Generando...' : 'Descargar PDF (Día)'}
            </button>
          </div>

          {diaRows.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-3 text-[10px] font-black text-[#9ca3af] uppercase tracking-widest">Nombre</th>
                    <th className="pb-3 text-[10px] font-black text-[#9ca3af] uppercase tracking-widest">Plan</th>
                    <th className="pb-3 text-[10px] font-black text-[#9ca3af] uppercase tracking-widest">Entrada</th>
                    <th className="pb-3 text-[10px] font-black text-[#9ca3af] uppercase tracking-widest">Salida</th>
                    <th className="pb-3 text-[10px] font-black text-[#9ca3af] uppercase tracking-widest">Duración</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {diaOrdenada.map((r) => (
                    <tr key={r.id ?? `${r.fecha ?? dia}-${r.horaEntrada ?? Math.random()}`}>
                      <td className="py-2 text-sm font-extrabold text-[#111827]">{nombreItem(r)}</td>
                      <td className="py-2 text-sm font-bold text-[#4b5563]">{planItem(r)}</td>
                      <td className="py-2 text-xs font-bold text-[#2d1b69] font-mono">{formatTimeEsCO(r.horaEntrada)}</td>
                      <td className="py-2 text-xs font-bold text-[#2d1b69] font-mono">{formatTimeEsCO(r.horaSalida)}</td>
                      <td className="py-2 text-xs font-bold text-[#2d1b69]">{formatDuration(r.horaEntrada, r.horaSalida)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Mes */}
        <div className="google-card p-5 bg-white/80">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 justify-between">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#9ca3af] uppercase tracking-widest">
                Reporte mensual
              </label>
              <input
                type="month"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="rounded-2xl border-2 border-[#f1f3f4] bg-white px-4 py-2 text-sm font-bold focus:border-[#2d1b69] focus:outline-none transition-all shadow-sm"
              />
            </div>
            <button
              type="button"
              disabled={loadingMes}
              onClick={descargarPDFMes}
              className="google-button-primary disabled:opacity-50"
            >
              {loadingMes ? 'Generando...' : 'Descargar PDF (Mes)'}
            </button>
          </div>

          {mesAgrupado.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-3 text-[10px] font-black text-[#9ca3af] uppercase tracking-widest">Veces</th>
                    <th className="pb-3 text-[10px] font-black text-[#9ca3af] uppercase tracking-widest">Nombre</th>
                    <th className="pb-3 text-[10px] font-black text-[#9ca3af] uppercase tracking-widest">Plan</th>
                    <th className="pb-3 text-[10px] font-black text-[#9ca3af] uppercase tracking-widest">Primera</th>
                    <th className="pb-3 text-[10px] font-black text-[#9ca3af] uppercase tracking-widest">Última</th>
                    <th className="pb-3 text-[10px] font-black text-[#9ca3af] uppercase tracking-widest">Tiempo total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {mesAgrupado.slice(0, 40).map((g) => (
                    <tr key={`${g.ninoKey}-${g.planNombre}`}>
                      <td className="py-2 text-xs font-bold text-[#4b5563] font-mono">{g.veces}</td>
                      <td className="py-2 text-sm font-extrabold text-[#111827]">{g.ninoNombre}</td>
                      <td className="py-2 text-sm font-bold text-[#4b5563]">{g.planNombre}</td>
                      <td className="py-2 text-xs font-bold text-[#2d1b69]">{formatDateTimeEsCO(g.primeraEntradaFecha, g.primeraEntradaHora)}</td>
                      <td className="py-2 text-xs font-bold text-[#2d1b69]">{formatDateTimeEsCO(g.ultimaEntradaFecha, g.ultimaEntradaHora)}</td>
                      <td className="py-2 text-xs font-bold text-[#2d1b69]">{formatDurationSegundos(g.duracionTotalSegundos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {mesAgrupado.length > 40 && (
                <p className="text-xs text-[#6b7280] mt-2">
                  Mostrando los primeros 40 grupos (niño + plan). El PDF incluye todos.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

