import { useEffect, useState, useMemo } from 'react';
import { api } from '../../shared/api/apiClient';

type Nino = { id: number; nombre: string };
type AsistenciaItem = {
  id: number;
  idNino: number;
  idPlan: number | null;
  idServicio: number | null;
  nombrePlan: string | null;
  nombreServicio?: string | null;
  fecha?: string;
  horaEntrada: string | null;
  horaSalida: string | null;
  observacion: string | null;
  nino: { nombre: string };
};
type PlanNino = { id: number; nombrePlan?: string; tipo: string; fechaInicio: string; fechaFin?: string | null; totalSesiones: number; sesionesConsumidas: number };
type ServicioPaquete = { id: number; nombre: string; precio: number };
type AsistenciaHistorialItem = { id: number; fecha: string; horaEntrada: string | null; horaSalida: string | null; observacion: string | null };

export function AsistenciaPage() {
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [ninos, setNinos] = useState<Nino[]>([]);
  const [asistencia, setAsistencia] = useState<AsistenciaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [historialNinoId, setHistorialNinoId] = useState<string>('');
  const [historialDesde, setHistorialDesde] = useState(() => new Date().toISOString().slice(0, 10));
  const [historialHasta, setHistorialHasta] = useState(() => new Date().toISOString().slice(0, 10));
  const [historialData, setHistorialData] = useState<AsistenciaHistorialItem[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [observacionPorAsistenciaId, setObservacionPorAsistenciaId] = useState<Record<number, string>>({});
  const [editandoObservacionId, setEditandoObservacionId] = useState<number | null>(null);
  
  const [nuevaAsistenciaNinoId, setNuevaAsistenciaNinoId] = useState<string>('');
  const [nuevaAsistenciaPlanId, setNuevaAsistenciaPlanId] = useState<string>('');
  const [nuevaAsistenciaServicioId, setNuevaAsistenciaServicioId] = useState<string>('');
  const [planesDelNino, setPlanesDelNino] = useState<PlanNino[]>([]);
  const [serviciosDePaquete, setServiciosDePaquete] = useState<ServicioPaquete[]>([]);
  const [sendingEntrada, setSendingEntrada] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get<Nino[]>('/ninos'),
      api.get<AsistenciaItem[]>('/asistencia/por-fecha', { fecha }),
    ])
      .then(([n, a]) => {
        setNinos(n);
        setAsistencia(a);
        if (n.length > 0 && !historialNinoId) setHistorialNinoId(String(n[0].id));
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
    if (!historialNinoId) return;
    setLoadingHistorial(true);
    setError(null);
    api
      .get<AsistenciaHistorialItem[]>('/asistencia/historial', {
        idNino: historialNinoId,
        desde: historialDesde,
        hasta: historialHasta,
      })
      .then(setHistorialData)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingHistorial(false));
  };

  const planesActivosEnFecha = useMemo(() => {
    return planesDelNino.filter((p) => {
      const vigentePorFecha = p.fechaInicio <= fecha && (!p.fechaFin || p.fechaFin >= fecha);
      const sesionesDisponibles = p.sesionesConsumidas < p.totalSesiones;
      return vigentePorFecha && sesionesDisponibles;
    });
  }, [planesDelNino, fecha]);

  useEffect(() => {
    if (!nuevaAsistenciaNinoId) {
      setPlanesDelNino([]);
      return;
    }
    api.get<PlanNino[]>(`/planes/nino/${nuevaAsistenciaNinoId}`).then(setPlanesDelNino).catch(() => setPlanesDelNino([]));
  }, [nuevaAsistenciaNinoId]);

  useEffect(() => {
    setNuevaAsistenciaServicioId('');
    setServiciosDePaquete([]);
    if (!nuevaAsistenciaPlanId) return;
    const plan = planesActivosEnFecha.find(p => String(p.id) === nuevaAsistenciaPlanId);
    if (plan && plan.tipo === 'PAQUETE') {
      api.get<{ idPaquete?: number }>(`/planes/${nuevaAsistenciaPlanId}`)
        .then(planDetail => {
          if (planDetail.idPaquete) {
            api.get<{ servicios: ServicioPaquete[] }>(`/paquetes/${planDetail.idPaquete}`)
              .then(paq => setServiciosDePaquete(paq.servicios ?? []))
              .catch(() => setServiciosDePaquete([]));
          }
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nuevaAsistenciaPlanId]);

  const buildParams = (idNino: number, idPlan: number | null, idServicio: number | null, obs: string) => {
    const p = new URLSearchParams();
    p.set('idNino', String(idNino));
    p.set('fecha', fecha);
    if (idPlan != null) p.set('idPlan', String(idPlan));
    if (idServicio != null) p.set('idServicio', String(idServicio));
    const o = obs?.trim();
    if (o) p.set('observacion', o);
    return p.toString();
  };

  const registrarEntrada = (idNino: number, idPlan: number | null, idServicio: number | null, obs: string) => {
    setSendingEntrada(true);
    return api
      .post('/asistencia/entrada?' + buildParams(idNino, idPlan, idServicio, obs))
      .then(() => {
        load();
        setNuevaAsistenciaNinoId('');
        setNuevaAsistenciaPlanId('');
        setNuevaAsistenciaServicioId('');
        setServiciosDePaquete([]);
      })
      .catch((e) => setError(e.message))
      .finally(() => setSendingEntrada(false));
  };

  const registrarSalida = (idNino: number, idPlan: number | null, idAsistencia: number) => {
    const obs = observacionPorAsistenciaId[idAsistencia] ?? '';
    return api
      .post('/asistencia/salida?' + buildParams(idNino, idPlan, null, obs))
      .then(load)
      .catch((e) => setError(e.message));
  };

  const guardarObservacion = (idAsistencia: number) => {
    const obs = observacionPorAsistenciaId[idAsistencia] ?? '';
    return api
      .patch('/asistencia/' + idAsistencia, { observacion: obs.trim() })
      .then(() => {
        load();
        setEditandoObservacionId(null);
      })
      .catch((e) => setError(e.message));
  };

  const submitNuevaAsistencia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaAsistenciaNinoId) return;
    const idPlan = nuevaAsistenciaPlanId ? Number(nuevaAsistenciaPlanId) : null;
    const idServicio = nuevaAsistenciaServicioId ? Number(nuevaAsistenciaServicioId) : null;
    registrarEntrada(Number(nuevaAsistenciaNinoId), idPlan, idServicio, '');
  };

  const isToday = fecha === new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      <header className="animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-2 w-10 bg-[#2d1b69] rounded-full" />
              <span className="text-[10px] font-extrabold text-[#2d1b69] uppercase tracking-[0.2em]">Operación Diaria</span>
            </div>
            <h2 className="text-4xl font-extrabold text-[#111827] tracking-tight">Registro de Asistencia</h2>
            <p className="mt-2 text-sm text-[#4b5563] max-w-2xl">
              Control en tiempo real de entradas y salidas. Gestiona la asistencia de los niños y mantén un historial detallado.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
             <label className="text-[10px] font-black text-[#9ca3af] uppercase tracking-widest">Fecha de Gestión</label>
             <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="rounded-2xl border-2 border-[#f1f3f4] bg-white px-5 py-3 text-sm font-bold focus:border-[#2d1b69] focus:outline-none transition-all shadow-sm"
              />
          </div>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Registration Bar */}
        <section className="lg:col-span-12">
          <div className="google-card !p-2 bg-white border-none shadow-2xl shadow-indigo-100/30">
            <form onSubmit={submitNuevaAsistencia} className="flex flex-wrap items-center gap-3 p-3">
              <div className="flex-1 min-w-[200px]">
                <select
                  value={nuevaAsistenciaNinoId}
                  onChange={(e) => setNuevaAsistenciaNinoId(e.target.value)}
                  className="w-full rounded-xl border-none bg-indigo-50/50 px-4 py-3 text-sm font-bold text-[#2d1b69] focus:ring-2 focus:ring-[#2d1b69] transition-all"
                >
                  <option value="">Seleccionar Estudiante...</option>
                  {ninos.map((n) => (
                    <option key={n.id} value={n.id}>{n.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[250px]">
                <select
                  value={nuevaAsistenciaPlanId}
                  onChange={(e) => setNuevaAsistenciaPlanId(e.target.value)}
                  className={`w-full rounded-xl border-none bg-indigo-50/50 px-4 py-3 text-sm font-bold transition-all ${nuevaAsistenciaPlanId ? 'text-[#2d1b69]' : 'text-[#9ca3af]'}`}
                >
                  <option value="">Sin plan asignado / Cortesía</option>
                  {planesActivosEnFecha.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombrePlan ?? `${p.tipo} #${p.id}`} ({p.totalSesiones - p.sesionesConsumidas} sesion(es) rest.)
                    </option>
                  ))}
                </select>
              </div>
              
              {serviciosDePaquete.length > 0 && (
                <div className="animate-scale-in">
                  <select
                    value={nuevaAsistenciaServicioId}
                    onChange={(e) => setNuevaAsistenciaServicioId(e.target.value)}
                    className="w-56 rounded-xl border-2 border-[#2d1b69]/20 bg-white px-4 py-3 text-sm font-bold text-[#2d1b69] focus:ring-2 focus:ring-[#2d1b69]"
                    required
                  >
                    <option value="">-- Elige Servicio --</option>
                    {serviciosDePaquete.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={sendingEntrada || !nuevaAsistenciaNinoId || (serviciosDePaquete.length > 0 && !nuevaAsistenciaServicioId)}
                className="google-button-primary disabled:opacity-50"
              >
                {sendingEntrada ? 'Procesando...' : 'Registrar Entrada'}
              </button>
            </form>
          </div>
        </section>

        {/* Attendance Dashboard - Live View */}
        <section className="lg:col-span-12 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-[#5f6368] uppercase tracking-[0.25em]">Niños registrados en {isToday ? 'Sala Ahora' : 'esta fecha'}</h3>
            {asistencia.length > 0 && (
              <span className="px-3 py-1 bg-[#e0f7fa] text-[#006064] text-[10px] font-black uppercase rounded-full">
                {asistencia.filter(a => !a.horaSalida).length} En Sala / {asistencia.length} Registrados
              </span>
            )}
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="google-card animate-pulse border-none h-64 bg-gray-50/50" />
              ))
            ) : asistencia.length === 0 ? (
              <div className="col-span-full py-20 text-center google-card border-dashed border-gray-200 bg-gray-50/50">
                <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4 text-gray-300">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <p className="text-sm font-bold text-[#9ca3af]">No hay niños registrados en esta fecha.</p>
                <p className="text-xs text-gray-400 mt-1">Usa la barra superior para registrar una nueva entrada.</p>
              </div>
            ) : asistencia.map((a, idx) => {
              const estaEnSala = a.horaEntrada && !a.horaSalida;
              const obs = observacionPorAsistenciaId[a.id] ?? (a.observacion ?? '');
              return (
                <div 
                  key={a.id} 
                  className={`google-card animate-scale-in stagger-${(idx % 5) + 1} relative overflow-hidden transition-all duration-500 border-none group ${
                    estaEnSala ? 'ring-2 ring-emerald-400 bg-white shadow-xl shadow-emerald-50' : 'opacity-80 bg-gray-50 border border-gray-100 grayscale-[0.3]'
                  }`}
                >
                  {/* Status Indicator */}
                  {estaEnSala && (
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                       <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">En Sala</span>
                    </div>
                  )}

                  <p className="text-[9px] font-black text-[#9ca3af] uppercase tracking-widest mb-1">{a.nombrePlan ?? 'Servicio Individual'}</p>
                  <h4 className="text-lg font-black text-[#111827] mb-4 truncate">{a.nino?.nombre}</h4>
                  
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-indigo-50/30 mb-4 border border-indigo-50/50">
                    <div>
                      <p className="text-[10px] font-bold text-[#4c1d95] uppercase tracking-widest opacity-60">Entrada</p>
                      <p className="text-lg font-black text-[#2d1b69] font-mono tracking-tighter">{a.horaEntrada ?? '--:--'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#4c1d95] uppercase tracking-widest opacity-60">Salida</p>
                      <p className={`text-lg font-black font-mono tracking-tighter ${a.horaSalida ? 'text-[#2d1b69]' : 'text-[#9ca3af]'}`}>{a.horaSalida ?? '--:--'}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Nota Section */}
                    {editandoObservacionId === a.id ? (
                      <div className="animate-fade-in space-y-2">
                         <textarea
                          value={obs}
                          onChange={(e) => setObservacionPorAsistenciaId(prev => ({ ...prev, [a.id]: e.target.value }))}
                          className="w-full rounded-xl border border-indigo-100 p-3 text-xs font-bold text-[#4b5563] focus:border-[#2d1b69] focus:outline-none bg-white"
                          rows={2}
                          placeholder="Añadir nota..."
                        />
                        <div className="flex gap-2">
                          <button onClick={() => guardarObservacion(a.id)} className="flex-1 text-[10px] bg-[#2d1b69] text-white py-2 rounded-lg font-black uppercase hover:bg-[#1a0a4a]">Guardar</button>
                          <button onClick={() => setEditandoObservacionId(null)} className="flex-1 text-[10px] text-[#5f6368] py-2 border border-gray-200 rounded-lg font-black uppercase hover:bg-gray-100">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div 
                    onClick={() => setEditandoObservacionId(a.id)}
                    className="cursor-pointer group/obs p-3 rounded-xl border border-dashed border-gray-200 hover:border-[#2d1b69] transition-all bg-white"
                  >
                         <p className="text-[10px] font-black text-[#9ca3af] uppercase mb-1">Notas</p>
                         <p className={`text-xs italic truncate ${a.observacion ? 'text-[#4b5563] font-medium' : 'text-gray-300'}`}>
                           {a.observacion || 'Pulsa para añadir nota...'}
                         </p>
                  </div>
                    )}

                    {estaEnSala && (
                      <button
                        onClick={() => registrarSalida(a.idNino, a.idPlan, a.id)}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-black text-xs uppercase tracking-widest hover:shadow-lg hover:shadow-orange-200 transition-all hover:-translate-y-0.5 active:scale-95"
                      >
                        Registrar Salida
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl">
              <p className="text-xs font-bold text-rose-600">Error: {error}</p>
            </div>
          )}
        </section>

        {/* History Section - Redesigned Viewer */}
        <section className="lg:col-span-12 mt-10">
          <div className="google-card !p-0 border-none shadow-2xl shadow-indigo-100/20 overflow-hidden">
            <div className="bg-[#111827] p-8 text-white">
              <h3 className="text-lg font-black tracking-tight mb-1">Historial Maestro de Asistencia</h3>
              <p className="text-xs text-gray-400 font-medium">Consulta el registro detallado por estudiante y rango de fechas.</p>
              
              <div className="grid gap-6 sm:grid-cols-4 mt-8">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Estudiante</label>
                  <select
                    value={historialNinoId}
                    onChange={(e) => setHistorialNinoId(e.target.value)}
                    className="w-full bg-[#1f2937] border-none rounded-xl px-4 py-3 text-sm font-bold text-white focus:ring-2 focus:ring-[#c026d3]"
                  >
                    {ninos.map((n) => (
                      <option key={n.id} value={n.id}>{n.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Desde</label>
                   <input type="date" value={historialDesde} onChange={e => setHistorialDesde(e.target.value)} className="w-full bg-[#1f2937] border-none rounded-xl px-4 py-3 text-sm font-bold text-white focus:ring-2 focus:ring-[#c026d3]" />
                </div>
                <div className="flex flex-col gap-2">
                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Hasta</label>
                   <input type="date" value={historialHasta} onChange={e => setHistorialHasta(e.target.value)} className="w-full bg-[#1f2937] border-none rounded-xl px-4 py-3 text-sm font-bold text-white focus:ring-2 focus:ring-[#c026d3]" />
                </div>
                <div className="flex items-end">
                   <button 
                    onClick={verHistorial} 
                    disabled={loadingHistorial}
                    className="w-full bg-gradient-to-r from-[#c026d3] to-[#2d1b69] hover:from-[#c026d3]/80 hover:to-[#2d1b69]/80 text-white font-black text-xs uppercase tracking-widest px-6 py-3.5 rounded-xl transition-all active:scale-95"
                   >
                     {loadingHistorial ? 'Buscando...' : 'Consultar'}
                   </button>
                </div>
              </div>
            </div>

            <div className="p-8">
              {loadingHistorial ? (
                <div className="py-20 text-center animate-pulse">
                   <div className="h-10 w-10 border-4 border-[#06b6d4] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                   <p className="text-sm font-bold text-[#4b5563]">Cargando cronograma histórico...</p>
                </div>
              ) : historialData.length > 0 ? (
                <div className="overflow-x-auto">
                   <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="pb-4 text-[10px] font-black text-[#9ca3af] uppercase tracking-widest">Fecha</th>
                        <th className="pb-4 text-[10px] font-black text-[#9ca3af] uppercase tracking-widest">Entrada</th>
                        <th className="pb-4 text-[10px] font-black text-[#9ca3af] uppercase tracking-widest">Salida</th>
                        <th className="pb-4 text-[10px] font-black text-[#9ca3af] uppercase tracking-widest">Observación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {historialData.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 text-sm font-extrabold text-[#111827]">{r.fecha}</td>
                          <td className="py-4 text-sm font-black text-[#2d1b69] font-mono">{r.horaEntrada ?? '--:--'}</td>
                          <td className="py-4 text-sm font-black text-[#2d1b69] font-mono">{r.horaSalida ?? '--:--'}</td>
                          <td className="py-4 text-xs italic text-[#4b5563] max-w-sm truncate">{r.observacion || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                   </table>
                </div>
              ) : (
                <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-3xl">
                   <p className="text-sm font-bold text-[#9ca3af]">Ingresa los parámetros y pulsa consultar para ver el historial.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
