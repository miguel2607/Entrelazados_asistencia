import { useEffect, useMemo, useState } from 'react';
import { api } from '../../shared/api/apiClient';
import { fechaLocalYYYYMMDD } from '../../shared/fechaLocal';

type Papa = { id: number; nombre: string };
type AsistenciaItem = {
  id: number;
  idPapa: number;
  idPlan: number | null;
  fecha?: string;
  horaEntrada: string | null;
  horaSalida: string | null;
  jornada: string | null;
  observacion: string | null;
  nombrePlan?: string | null;
  papa: { nombre: string };
};
type PlanPapa = {
  id: number;
  nombrePlan?: string;
  tipo: string;
  fechaInicio: string;
  fechaFin?: string | null;
  totalSesiones: number;
  sesionesConsumidas: number;
};
type AsistenciaHistorialItem = {
  id: number;
  fecha: string;
  horaEntrada: string | null;
  horaSalida: string | null;
  jornada: string | null;
  observacion: string | null;
};

export function AsistenciaPadresPage() {
  const [fecha, setFecha] = useState(() => fechaLocalYYYYMMDD());
  const [papas, setPapas] = useState<Papa[]>([]);
  const [asistencia, setAsistencia] = useState<AsistenciaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [historialPapaId, setHistorialPapaId] = useState<string>('');
  const [historialDesde, setHistorialDesde] = useState(() => fechaLocalYYYYMMDD());
  const [historialHasta, setHistorialHasta] = useState(() => fechaLocalYYYYMMDD());
  const [historialData, setHistorialData] = useState<AsistenciaHistorialItem[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [observacionPorAsistenciaId, setObservacionPorAsistenciaId] = useState<Record<number, string>>({});
  const [editandoObservacionId, setEditandoObservacionId] = useState<number | null>(null);

  const [nuevaAsistenciaPapaId, setNuevaAsistenciaPapaId] = useState<string>('');
  const [nuevaAsistenciaPlanId, setNuevaAsistenciaPlanId] = useState<string>('');
  const [nuevaAsistenciaHoraEntrada, setNuevaAsistenciaHoraEntrada] = useState<string>('');
  const [nuevaAsistenciaJornada, setNuevaAsistenciaJornada] = useState<string>(() => {
    const hour = new Date().getHours();
    return hour < 13 ? 'MAÑANA' : 'TARDE';
  });
  const [planesDelPapa, setPlanesDelPapa] = useState<PlanPapa[]>([]);
  const [sendingEntrada, setSendingEntrada] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get<Papa[]>('/papas'),
      api.get<AsistenciaItem[]>('/asistencia-papa/por-fecha', { fecha }),
    ])
      .then(([p, a]) => {
        setPapas(p);
        setAsistencia(a);
        if (p.length > 0 && !historialPapaId) setHistorialPapaId(String(p[0].id));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setEditandoObservacionId(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha]);

  const verHistorial = () => {
    if (!historialPapaId) return;
    setLoadingHistorial(true);
    setError(null);
    api
      .get<AsistenciaHistorialItem[]>('/asistencia-papa/historial', {
        idPapa: historialPapaId,
        desde: historialDesde,
        hasta: historialHasta,
      })
      .then(setHistorialData)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingHistorial(false));
  };

  const planesActivosEnFecha = useMemo(() => {
    return planesDelPapa.filter((p) => {
      const vigentePorFecha = p.fechaInicio <= fecha && (!p.fechaFin || p.fechaFin >= fecha);
      const sesionesDisponibles = p.sesionesConsumidas < p.totalSesiones;
      return vigentePorFecha && sesionesDisponibles;
    });
  }, [planesDelPapa, fecha]);

  useEffect(() => {
    if (!nuevaAsistenciaPapaId) {
      setPlanesDelPapa([]);
      return;
    }
    api
      .get<PlanPapa[]>(`/planes-papa/papa/${nuevaAsistenciaPapaId}`)
      .then(setPlanesDelPapa)
      .catch(() => setPlanesDelPapa([]));
  }, [nuevaAsistenciaPapaId]);

  const buildParamsEntrada = (
    idPapa: number,
    idPlan: number | null,
    jornadaVal: string,
    obs: string,
    horaEntradaOpt?: string
  ) => {
    const p = new URLSearchParams();
    p.set('idPapa', String(idPapa));
    p.set('fecha', fecha);
    if (idPlan != null) p.set('idPlan', String(idPlan));
    if (jornadaVal) p.set('jornada', jornadaVal);
    if (horaEntradaOpt && horaEntradaOpt.trim()) p.set('horaEntrada', horaEntradaOpt.trim());
    const o = obs?.trim();
    if (o) p.set('observacion', o);
    return p.toString();
  };

  const buildParamsSalida = (idPapa: number, idPlan: number | null, obs: string) => {
    const p = new URLSearchParams();
    p.set('idPapa', String(idPapa));
    p.set('fecha', fecha);
    if (idPlan != null) p.set('idPlan', String(idPlan));
    const o = obs?.trim();
    if (o) p.set('observacion', o);
    return p.toString();
  };

  const registrarEntrada = (
    idPapa: number,
    idPlan: number | null,
    jornadaVal: string,
    obs: string,
    horaEntradaOpt?: string
  ) => {
    setSendingEntrada(true);
    return api
      .post('/asistencia-papa/entrada?' + buildParamsEntrada(idPapa, idPlan, jornadaVal, obs, horaEntradaOpt))
      .then(() => {
        load();
        setNuevaAsistenciaPapaId('');
        setNuevaAsistenciaPlanId('');
        setNuevaAsistenciaHoraEntrada('');
      })
      .catch((e) => setError(e.message))
      .finally(() => setSendingEntrada(false));
  };

  const registrarSalida = (idPapa: number, idPlan: number | null, idAsistencia: number) => {
    const obs = observacionPorAsistenciaId[idAsistencia] ?? '';
    return api
      .post('/asistencia-papa/salida?' + buildParamsSalida(idPapa, idPlan, obs))
      .then(load)
      .catch((e) => setError(e.message));
  };

  const guardarObservacion = (idAsistencia: number) => {
    const obs = observacionPorAsistenciaId[idAsistencia] ?? '';
    return api
      .patch('/asistencia-papa/' + idAsistencia, { observacion: obs.trim() })
      .then(() => {
        load();
        setEditandoObservacionId(null);
      })
      .catch((e) => setError(e.message));
  };

  const eliminarAsistencia = (idAsistencia: number) => {
    if (
      !window.confirm(
        '¿Estás seguro de que deseas eliminar este registro de asistencia? Se devolverá la sesión al plan si corresponde.'
      )
    )
      return;
    api
      .delete('/asistencia-papa/' + idAsistencia)
      .then(() => {
        load();
        if (historialData.length > 0) verHistorial();
      })
      .catch((e) => setError(e.message));
  };

  const submitNuevaAsistencia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaAsistenciaPapaId || !nuevaAsistenciaPlanId) {
      setError('Debe seleccionar un padre y un plan.');
      return;
    }
    setError(null);
    registrarEntrada(
      Number(nuevaAsistenciaPapaId),
      Number(nuevaAsistenciaPlanId),
      nuevaAsistenciaJornada,
      '',
      nuevaAsistenciaHoraEntrada || undefined
    );
  };

  const isToday = fecha === fechaLocalYYYYMMDD();

  return (
    <div className="mx-auto max-w-7xl space-y-10 pb-20">
      <header className="animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="h-2 w-10 rounded-full bg-[#2d1b69]" />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#2d1b69]">
                Operación Diaria
              </span>
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight text-[#111827]">Registro de Asistencia</h2>
            <p className="mt-2 max-w-2xl text-sm text-[#4b5563]">
              Control en tiempo real de entradas y salidas. Gestiona la asistencia de los padres y mantén un historial
              detallado.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#9ca3af]">Fecha de Gestión</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="rounded-2xl border-2 border-[#f1f3f4] bg-white px-5 py-3 text-sm font-bold shadow-sm transition-all focus:border-[#2d1b69] focus:outline-none"
            />
          </div>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-12">
        <section className="lg:col-span-12">
          <div className="google-card !border-none !bg-white !p-2 shadow-2xl shadow-indigo-100/30">
            <form onSubmit={submitNuevaAsistencia} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-[200px] flex-1">
                <select
                  value={nuevaAsistenciaPapaId}
                  onChange={(e) => setNuevaAsistenciaPapaId(e.target.value)}
                  className="w-full rounded-xl border-none bg-indigo-50/50 px-4 py-3 text-sm font-bold text-[#2d1b69] transition-all focus:ring-2 focus:ring-[#2d1b69]"
                >
                  <option value="">Seleccionar Padre...</option>
                  {papas.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[200px] flex-1">
                <select
                  value={nuevaAsistenciaPlanId}
                  onChange={(e) => setNuevaAsistenciaPlanId(e.target.value)}
                  className={`w-full rounded-xl border-none bg-indigo-50/50 px-4 py-3 text-sm font-bold transition-all ${
                    nuevaAsistenciaPlanId ? 'text-[#2d1b69]' : 'text-[#9ca3af]'
                  }`}
                >
                  <option value="">Sin plan asignado / Cortesía</option>
                  {planesActivosEnFecha.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombrePlan ?? `${p.tipo} #${p.id}`} ({p.totalSesiones - p.sesionesConsumidas} sesion(es)
                      rest.)
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-[150px] flex-1">
                <select
                  value={nuevaAsistenciaJornada}
                  onChange={(e) => setNuevaAsistenciaJornada(e.target.value)}
                  className="w-full rounded-xl border-none bg-indigo-50/50 px-4 py-3 text-sm font-bold text-[#2d1b69] focus:ring-2 focus:ring-[#2d1b69]"
                >
                  <option value="MAÑANA">☀️ MAÑANA</option>
                  <option value="TARDE">🌙 TARDE</option>
                </select>
              </div>

              <div className="min-w-[170px] flex-1">
                <input
                  type="time"
                  value={nuevaAsistenciaHoraEntrada}
                  onChange={(e) => setNuevaAsistenciaHoraEntrada(e.target.value)}
                  className="w-full rounded-xl border-2 border-[#f1f3f4] bg-white px-4 py-3 text-sm font-bold text-[#2d1b69] shadow-sm transition-all focus:border-[#2d1b69] focus:outline-none"
                  step={1}
                />
                <p className="mt-2 text-left text-[10px] font-black uppercase tracking-widest text-[#9ca3af]">
                  Hora entrada (opcional)
                </p>
              </div>

              <button
                type="submit"
                disabled={sendingEntrada || !nuevaAsistenciaPapaId || !nuevaAsistenciaPlanId}
                className="google-button-primary disabled:opacity-50"
              >
                {sendingEntrada ? 'Procesando...' : 'Registrar Entrada'}
              </button>
            </form>
          </div>
        </section>

        <section className="space-y-6 lg:col-span-12">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-[0.25em] text-[#5f6368]">
              Padres registrados en {isToday ? 'Sala Ahora' : 'esta fecha'}
            </h3>
            {asistencia.length > 0 && (
              <span className="rounded-full bg-[#e0f7fa] px-3 py-1 text-[10px] font-black uppercase text-[#006064]">
                {asistencia.filter((a) => !a.horaSalida).length} En Sala / {asistencia.length} Registrados
              </span>
            )}
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="google-card h-64 animate-pulse border-none bg-gray-50/50" />
              ))
            ) : asistencia.length === 0 ? (
              <div className="google-card col-span-full border-2 border-dashed border-gray-200 bg-gray-50/50 py-20 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-300">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-[#9ca3af]">No hay padres registrados en esta fecha.</p>
                <p className="mt-1 text-xs text-gray-400">Usa la barra superior para registrar una nueva entrada.</p>
              </div>
            ) : (
              asistencia.map((a, idx) => {
                const estaEnSala = a.horaEntrada && !a.horaSalida;
                const obs = observacionPorAsistenciaId[a.id] ?? (a.observacion ?? '');
                return (
                  <div
                    key={a.id}
                    className={`google-card group relative overflow-hidden border-none transition-all duration-500 animate-scale-in stagger-${(idx % 5) + 1} ${
                      estaEnSala
                        ? 'bg-white shadow-xl shadow-emerald-50 ring-2 ring-emerald-400'
                        : 'border border-gray-100 bg-gray-50 opacity-80 grayscale-[0.3]'
                    }`}
                  >
                    <div className="absolute right-4 top-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          eliminarAsistencia(a.id);
                        }}
                        className="mr-2 p-1.5 text-gray-400 opacity-0 transition-colors hover:text-rose-500 group-hover:opacity-100"
                        title="Eliminar registro"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                      {estaEnSala ? (
                        <>
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                            En Sala
                          </span>
                        </>
                      ) : (
                        <span className="text-[9px] font-black uppercase italic tracking-widest text-gray-400">
                          Finalizado
                        </span>
                      )}
                    </div>

                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[#9ca3af]">
                        {a.nombrePlan ?? 'Servicio Individual'}
                      </p>
                      {a.jornada && (
                        <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter text-[#2d1b69]">
                          {a.jornada === 'MAÑANA' ? '☀️ Mañana' : '🌙 Tarde'}
                        </span>
                      )}
                    </div>
                    <h4 className="mb-4 truncate text-lg font-black text-[#111827]">{a.papa?.nombre}</h4>

                    <div className="mb-4 grid grid-cols-2 gap-4 rounded-2xl border border-indigo-50/50 bg-indigo-50/30 p-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#4c1d95] opacity-60">
                          Entrada
                        </p>
                        <p className="font-mono text-lg font-black tracking-tighter text-[#2d1b69]">
                          {a.horaEntrada ?? '--:--'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#4c1d95] opacity-60">
                          Salida
                        </p>
                        <p
                          className={`font-mono text-lg font-black tracking-tighter ${a.horaSalida ? 'text-[#2d1b69]' : 'text-[#9ca3af]'}`}
                        >
                          {a.horaSalida ?? '--:--'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {editandoObservacionId === a.id ? (
                        <div className="animate-fade-in space-y-2">
                          <textarea
                            value={obs}
                            onChange={(e) =>
                              setObservacionPorAsistenciaId((prev) => ({ ...prev, [a.id]: e.target.value }))
                            }
                            className="w-full rounded-xl border border-indigo-100 bg-white p-3 text-xs font-bold text-[#4b5563] focus:border-[#2d1b69] focus:outline-none"
                            rows={2}
                            placeholder="Añadir nota..."
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => guardarObservacion(a.id)}
                              className="flex-1 rounded-lg bg-[#2d1b69] py-2 text-[10px] font-black uppercase text-white hover:bg-[#1a0a4a]"
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditandoObservacionId(null)}
                              className="flex-1 rounded-lg border border-gray-200 py-2 text-[10px] font-black uppercase text-[#5f6368] hover:bg-gray-100"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setEditandoObservacionId(a.id)}
                          onKeyDown={(ev) => {
                            if (ev.key === 'Enter' || ev.key === ' ') setEditandoObservacionId(a.id);
                          }}
                          className="group/obs cursor-pointer rounded-xl border border-dashed border-gray-200 bg-white p-3 transition-all hover:border-[#2d1b69]"
                        >
                          <p className="mb-1 text-[10px] font-black uppercase text-[#9ca3af]">Notas</p>
                          <p
                            className={`truncate text-xs italic ${a.observacion ? 'font-medium text-[#4b5563]' : 'text-gray-300'}`}
                          >
                            {a.observacion || 'Pulsa para añadir nota...'}
                          </p>
                        </div>
                      )}

                      {estaEnSala && (
                        <>
                          <button
                            type="button"
                            onClick={() => registrarSalida(a.idPapa, a.idPlan, a.id)}
                            className="w-full rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 py-4 text-xs font-black uppercase tracking-widest text-white transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-200 active:scale-95"
                          >
                            Registrar Salida
                          </button>
                          <button
                            type="button"
                            onClick={() => eliminarAsistencia(a.id)}
                            className="w-full rounded-2xl border-2 border-amber-200 bg-white py-3 text-[11px] font-black uppercase tracking-widest text-amber-700 transition-all hover:bg-amber-50 active:scale-95"
                            title="Anular entrada y devolver 1 sesión (si aplica)"
                          >
                            Anular entrada (devolver sesión)
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {error && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
              <p className="text-xs font-bold text-rose-600">Error: {error}</p>
            </div>
          )}
        </section>

        <section className="mt-10 lg:col-span-12">
          <div className="google-card !border-none !p-0 overflow-hidden shadow-2xl shadow-indigo-100/20">
            <div className="bg-[#111827] p-8 text-white">
              <h3 className="mb-1 text-lg font-black tracking-tight">Historial Maestro de Asistencia</h3>
              <p className="text-xs font-medium text-gray-400">
                Consulta el registro detallado por padre y rango de fechas.
              </p>

              <div className="mt-8 grid gap-6 sm:grid-cols-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Padre</label>
                  <select
                    value={historialPapaId}
                    onChange={(e) => setHistorialPapaId(e.target.value)}
                    className="w-full rounded-xl border-none bg-[#1f2937] px-4 py-3 text-sm font-bold text-white focus:ring-2 focus:ring-[#c026d3]"
                  >
                    {papas.length === 0 ? (
                      <option value="">—</option>
                    ) : (
                      papas.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.nombre}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Desde</label>
                  <input
                    type="date"
                    value={historialDesde}
                    onChange={(e) => setHistorialDesde(e.target.value)}
                    className="w-full rounded-xl border-none bg-[#1f2937] px-4 py-3 text-sm font-bold text-white focus:ring-2 focus:ring-[#c026d3]"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Hasta</label>
                  <input
                    type="date"
                    value={historialHasta}
                    onChange={(e) => setHistorialHasta(e.target.value)}
                    className="w-full rounded-xl border-none bg-[#1f2937] px-4 py-3 text-sm font-bold text-white focus:ring-2 focus:ring-[#c026d3]"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={verHistorial}
                    disabled={loadingHistorial || !historialPapaId}
                    className="w-full rounded-xl bg-gradient-to-r from-[#c026d3] to-[#2d1b69] px-6 py-3.5 text-xs font-black uppercase tracking-widest text-white transition-all hover:from-[#c026d3]/80 hover:to-[#2d1b69]/80 active:scale-95 disabled:opacity-50"
                  >
                    {loadingHistorial ? 'Buscando...' : 'Consultar'}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-8">
              {loadingHistorial ? (
                <div className="animate-pulse py-20 text-center">
                  <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#06b6d4] border-t-transparent" />
                  <p className="text-sm font-bold text-[#4b5563]">Cargando cronograma histórico...</p>
                </div>
              ) : historialData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-[#9ca3af]">Fecha</th>
                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-[#9ca3af]">
                          Jornada
                        </th>
                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-[#9ca3af]">
                          Entrada
                        </th>
                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-[#9ca3af]">Salida</th>
                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-[#9ca3af]">
                          Observación
                        </th>
                        <th className="pb-4 text-right text-[10px] font-black uppercase tracking-widest text-[#9ca3af]">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {historialData.map((r) => (
                        <tr key={r.id} className="transition-colors hover:bg-gray-50/50">
                          <td className="py-4 text-sm font-extrabold text-[#111827]">{r.fecha}</td>
                          <td className="py-4 text-[10px] font-bold text-[#4b5563]">
                            {r.jornada ? (r.jornada === 'MAÑANA' ? '☀️ Mañana' : '🌙 Tarde') : '—'}
                          </td>
                          <td className="py-4 font-mono text-sm font-black text-[#2d1b69]">{r.horaEntrada ?? '--:--'}</td>
                          <td className="py-4 font-mono text-sm font-black text-[#2d1b69]">{r.horaSalida ?? '--:--'}</td>
                          <td className="max-w-sm truncate py-4 text-xs italic text-[#4b5563]">{r.observacion || '—'}</td>
                          <td className="py-4 text-right">
                            <button
                              type="button"
                              onClick={() => eliminarAsistencia(r.id)}
                              className="p-2 text-gray-400 transition-colors hover:text-rose-500"
                              title="Eliminar registro"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-3xl border-2 border-dashed border-gray-100 py-20 text-center">
                  <p className="text-sm font-bold text-[#9ca3af]">
                    Ingresa los parámetros y pulsa consultar para ver el historial.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
