import { useEffect, useState, useMemo } from 'react';
import { api } from '../../shared/api/apiClient';

interface PlanActivo {
  id: number;
  idNino?: number;
  nombreNino?: string;
  tipo: string;
  nombre: string;
  servicios: { nombre: string }[];
}
interface Nino { id: number; nombre: string; }
interface Servicio { id: number; nombre: string; precio: number; cantidadDias: number; }
interface Paquete { id: number; nombre: string; precio: number; cantidadDias: number; }

export function PlanesPage() {
  const VIGENCIA_PAQUETE_DIAS = 30;
  const [activos, setActivos] = useState<PlanActivo[]>([]);
  const [ninos, setNinos] = useState<Nino[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Wizard State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState({
    tipo: 'SERVICIO' as 'SERVICIO' | 'PAQUETE',
    idNino: 0,
    idServicio: 0,
    idPaquete: 0,
    fechaInicio: new Date().toISOString().split('T')[0],
    totalSesiones: 1,
    cantidad: 1,
    porcentajeDescuento: 0,
    sesionesConsumidas: 0
  });
  
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaPlan, setBusquedaPlan] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get<PlanActivo[]>('/planes/activos-hoy'),
      api.get<Nino[]>('/ninos'),
      api.get<Servicio[]>('/servicios'),
      api.get<Paquete[]>('/paquetes'),
    ]).then(([a, n, s, p]) => { 
      setActivos(a); 
      setNinos(n); 
      setServicios(s); 
      setPaquetes(p); 
    }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.idNino || (!form.idServicio && form.tipo === 'SERVICIO') || (!form.idPaquete && form.tipo === 'PAQUETE') || !form.fechaInicio || !form.totalSesiones) return;
    setSending(true);
    setError(null);
    setSuccessMessage(null);
    const body = { 
      fechaInicio: form.fechaInicio, 
      totalSesiones: form.totalSesiones,
      cantidad: form.cantidad,
      porcentajeDescuento: form.porcentajeDescuento,
      sesionesConsumidas: form.sesionesConsumidas
    };
    const q = form.tipo === 'SERVICIO' ? `idNino=${form.idNino}&idServicio=${form.idServicio}` : `idNino=${form.idNino}&idPaquete=${form.idPaquete}`;
    const nombreNino = ninos.find((n) => n.id === form.idNino)?.nombre ?? 'el niño';
    const promise = form.tipo === 'SERVICIO' ? api.post('/planes/servicio?' + q, body) : api.post('/planes/paquete?' + q, body);
    promise
      .then(() => {
        load();
        setForm((f) => ({ ...f, idServicio: 0, idPaquete: 0, totalSesiones: 1 }));
        setStep(1);
        setSuccessMessage(`¡Plan asignado con éxito a ${nombreNino}!`);
        setTimeout(() => setSuccessMessage(null), 5000);
      })
      .catch((e) => setError(e.message))
      .finally(() => setSending(false));
  };

  const selectedNino = useMemo(() => ninos.find(n => n.id === form.idNino), [ninos, form.idNino]);
  const selectedServicio = servicios.find((s) => s.id === form.idServicio) || null;
  const selectedPaquete = paquetes.find((p) => p.id === form.idPaquete) || null;
  
  const currentItem = form.tipo === 'SERVICIO' ? selectedServicio : selectedPaquete;
  const precioUnitario = currentItem?.precio || 0;
  const subtotal = precioUnitario * (form.tipo === 'PAQUETE' ? form.cantidad : 1);
  const totalSesionesCalculadas = (currentItem?.cantidadDias || 1) * (form.tipo === 'PAQUETE' ? form.cantidad : 1);
  const precioTotal = subtotal * (1 - form.porcentajeDescuento / 100);
  const tarifaPorJornadaCalculada = totalSesionesCalculadas > 0 ? precioTotal / totalSesionesCalculadas : precioTotal;

  const fechaFinCalculada = useMemo(() => {
    if (!form.fechaInicio) return null;
    const inicio = new Date(form.fechaInicio + 'T00:00:00');
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + (form.tipo === 'PAQUETE' ? VIGENCIA_PAQUETE_DIAS : totalSesionesCalculadas));
    return fin;
  }, [form.fechaInicio, form.tipo, totalSesionesCalculadas]);

  const formatFecha = (date: Date | null) => {
    if (!date) return '—';
    return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const filteredNinos = ninos.filter(n => n.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const filteredItemsPlan = (form.tipo === 'SERVICIO' ? servicios : paquetes)
    .filter((item) => item.nombre.toLowerCase().includes(busquedaPlan.toLowerCase()));

  if (error && !loading) return <div className="p-8 text-center"><p className="text-[#d93025] font-bold bg-rose-50 p-4 rounded-2xl inline-block border border-rose-100">{error}</p></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      <header className="animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-2 w-10 bg-[#2d1b69] rounded-full" />
          <span className="text-[10px] font-extrabold text-[#2d1b69] uppercase tracking-[0.2em]">Gestión Comercial</span>
        </div>
        <h2 className="text-4xl font-extrabold text-[#111827] tracking-tight">Asignación de Planes</h2>
        <p className="mt-2 text-sm text-[#4b5563] max-w-2xl">
          Configura suscripciones personalizadas. Selecciona un estudiante, elige su plan de estudio y establece la fecha de inicio.
        </p>
      </header>

      {successMessage && (
        <div className="animate-scale-in fixed top-8 right-8 z-50 rounded-2xl border border-emerald-100 bg-white p-5 shadow-2xl shadow-emerald-100/50 flex items-center gap-4 border-l-4 border-l-emerald-500">
          <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <div>
            <p className="text-sm font-extrabold text-[#111827]">{successMessage}</p>
            <p className="text-[10px] text-[#4b5563] uppercase tracking-widest font-bold">Registro actualizado correctamente</p>
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Main Wizard Area */}
        <section className="lg:col-span-8 space-y-8">
          <div className="google-card !p-0 overflow-hidden relative border-none shadow-2xl shadow-indigo-100/20">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#f8f7ff]">
              <div 
                className="h-full bg-gradient-to-r from-[#2d1b69] via-[#c026d3] to-[#06b6d4] transition-all duration-700 ease-out"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
            
            <div className="p-8 sm:p-10">
              <div className="flex items-center gap-8 mb-10 overflow-x-auto pb-2 scrollbar-none">
                {[
                  { num: 1, label: 'Estudiante', active: step >= 1 },
                  { num: 2, label: 'Plan de Estudio', active: step >= 2 },
                  { num: 3, label: 'Programación', active: step >= 3 },
                ].map((s) => (
                  <div key={s.num} className={`flex items-center gap-3 shrink-0 transition-opacity ${step === s.num ? 'opacity-100' : 'opacity-40'}`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${s.active ? 'bg-[#2d1b69] text-white ring-4 ring-indigo-50' : 'bg-[#f1f3f4] text-[#4b5563]'}`}>
                      {s.num}
                    </div>
                    <span className={`text-xs font-extrabold uppercase tracking-widest ${s.active ? 'text-[#111827]' : 'text-[#4b5563]'}`}>{s.label}</span>
                  </div>
                ))}
              </div>

              {/* Step 1: Nino Selection */}
              {step === 1 && (
                <div className="animate-fade-in space-y-6">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar estudiante por nombre..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className="w-full rounded-2xl border-2 border-[#f1f3f4] bg-[#f8f9fa] px-6 py-4 text-sm font-bold focus:border-[#2d1b69] focus:bg-white focus:outline-none transition-all pr-12"
                    />
                    <svg className="absolute right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  
                  <div className="grid gap-3 sm:grid-cols-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                    {filteredNinos.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => { setForm(f => ({ ...f, idNino: n.id })); setStep(2); }}
                        className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${form.idNino === n.id ? 'border-[#2d1b69] bg-indigo-50 shadow-lg shadow-indigo-100/50' : 'border-transparent bg-[#f8f9fa] hover:border-indigo-100 hover:bg-white'}`}
                      >
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ${form.idNino === n.id ? 'bg-[#2d1b69] text-white' : 'bg-white text-[#2d1b69] border border-indigo-50'}`}>
                          {n.nombre.charAt(0)}
                        </div>
                        <span className="text-sm font-extrabold text-[#111827]">{n.nombre}</span>
                      </button>
                    ))}
                    {filteredNinos.length === 0 && <p className="col-span-full py-10 text-center text-sm text-[#9ca3af] italic">No se encontraron estudiantes con ese nombre.</p>}
                  </div>
                </div>
              )}

              {/* Step 2: Plan Selection */}
              {step === 2 && (
                <div className="animate-fade-in space-y-8">
                  <div className="flex p-1.5 rounded-2xl bg-[#f8f9fa] border-2 border-[#f1f3f4] max-w-md">
                    <button
                      onClick={() => {
                        setForm(f => ({ ...f, tipo: 'SERVICIO', idPaquete: 0 }));
                        setBusquedaPlan('');
                      }}
                      className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all ${form.tipo === 'SERVICIO' ? 'bg-white text-[#2d1b69] shadow-md ring-1 ring-black/5' : 'text-[#4b5563] hover:text-[#111827]'}`}
                    >
                      Servicio Individual
                    </button>
                    <button
                      onClick={() => {
                        setForm(f => ({ ...f, tipo: 'PAQUETE', idServicio: 0 }));
                        setBusquedaPlan('');
                      }}
                      className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all ${form.tipo === 'PAQUETE' ? 'bg-white text-[#2d1b69] shadow-md ring-1 ring-black/5' : 'text-[#4b5563] hover:text-[#111827]'}`}
                    >
                      Paquete Mensual
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder={form.tipo === 'SERVICIO' ? 'Buscar servicio...' : 'Buscar paquete...'}
                      value={busquedaPlan}
                      onChange={(e) => setBusquedaPlan(e.target.value)}
                      className="w-full rounded-2xl border-2 border-[#f1f3f4] bg-[#f8f9fa] px-6 py-4 text-sm font-bold focus:border-[#2d1b69] focus:bg-white focus:outline-none transition-all pr-12"
                    />
                    <svg className="absolute right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {filteredItemsPlan.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setForm(f => ({ 
                            ...f, 
                            [form.tipo === 'SERVICIO' ? 'idServicio' : 'idPaquete']: item.id,
                            totalSesiones: item.cantidadDias || 1
                          }));
                        }}
                        className={`group p-5 rounded-2xl border-2 transition-all text-left relative overflow-hidden ${
                          (form.tipo === 'SERVICIO' ? form.idServicio : form.idPaquete) === item.id 
                            ? 'border-[#2d1b69] bg-indigo-50 shadow-xl shadow-indigo-100/50' 
                            : 'border-transparent bg-[#f8f9fa] hover:border-indigo-100 hover:bg-white'
                        }`}
                      >
                        <p className={`text-[9px] font-extrabold uppercase tracking-widest mb-3 ${ (form.tipo === 'SERVICIO' ? form.idServicio : form.idPaquete) === item.id ? 'text-[#2d1b69]' : 'text-[#9ca3af]'}`}>
                          {item.cantidadDias || 1} SESIONES
                        </p>
                        <h4 className="text-sm font-extrabold text-[#111827] mb-1">{item.nombre}</h4>
                        <p className="text-lg font-black text-[#2d1b69]">${item.precio.toLocaleString('es-CO')}</p>
                        
                        {(form.tipo === 'SERVICIO' ? form.idServicio : form.idPaquete) === item.id && (
                          <div className="absolute -right-2 -bottom-2 h-12 w-12 bg-[#2d1b69] rounded-full flex items-center justify-center text-white scale-75">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          </div>
                        )}
                      </button>
                    ))}
                    {filteredItemsPlan.length === 0 && (
                      <p className="col-span-full py-10 text-center text-sm text-[#9ca3af] italic">
                        No se encontraron {form.tipo === 'SERVICIO' ? 'servicios' : 'paquetes'} con ese nombre.
                      </p>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-8 border-t border-[#f1f3f4]">
                    <button onClick={() => setStep(1)} className="text-xs font-extrabold text-[#4b5563] hover:text-[#111827] uppercase tracking-widest flex items-center gap-2">
                       <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                       Anterior
                    </button>
                    <button 
                      disabled={form.tipo === 'SERVICIO' ? !form.idServicio : !form.idPaquete}
                      onClick={() => setStep(3)} 
                      className="google-button-primary disabled:opacity-50"
                    >
                      Siguiente: Programar
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Programming */}
              {step === 3 && (
                <div className="animate-fade-in space-y-8">
                  <div className="grid gap-8 sm:grid-cols-2">
                    <div className="space-y-4">
                      <label className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-[0.2em]">Fecha de Inicio</label>
                      <input
                        type="date"
                        required
                        value={form.fechaInicio}
                        onChange={(e) => setForm((f) => ({ ...f, fechaInicio: e.target.value }))}
                        className="w-full rounded-2xl border-2 border-[#f1f3f4] bg-[#f8f9fa] px-6 py-4 text-sm font-bold focus:border-[#2d1b69] focus:bg-white focus:outline-none transition-all shadow-sm"
                      />
                    </div>
                    {form.tipo === 'PAQUETE' && (
                      <div className="space-y-4">
                        <label className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-[0.2em]">Cantidad de Paquetes</label>
                        <div className="flex items-center gap-4 bg-[#f8f9fa] p-4 rounded-2xl border-2 border-[#f1f3f4]">
                          <button 
                            onClick={(e) => { e.preventDefault(); setForm(f => ({ ...f, cantidad: Math.max(1, f.cantidad - 1) }))}}
                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-[#e2e8f0] text-[#2d1b69] hover:bg-indigo-50"
                          >
                            -
                          </button>
                          <span className="flex-1 text-center text-lg font-black text-[#111827]">{form.cantidad}</span>
                          <button 
                            onClick={(e) => { e.preventDefault(); setForm(f => ({ ...f, cantidad: f.cantidad + 1 }))}}
                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-[#e2e8f0] text-[#2d1b69] hover:bg-indigo-50"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="space-y-4">
                      <label className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-[0.2em]">Descuento (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={form.porcentajeDescuento}
                        onChange={(e) => setForm(f => ({ ...f, porcentajeDescuento: Math.min(100, Math.max(0, Number(e.target.value))) }))}
                        className="w-full rounded-2xl border-2 border-[#f1f3f4] bg-[#f8f9fa] px-6 py-4 text-sm font-bold focus:border-[#2d1b69] focus:bg-white focus:outline-none transition-all shadow-sm"
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-[0.2em]">Sesiones Ya Consumidas</label>
                      <input
                        type="number"
                        min="0"
                        value={form.sesionesConsumidas}
                        onChange={(e) => setForm(f => ({ ...f, sesionesConsumidas: Math.max(0, Number(e.target.value)) }))}
                        className="w-full rounded-2xl border-2 border-[#f1f3f4] bg-[#f8f9fa] px-6 py-4 text-sm font-bold focus:border-[#2d1b69] focus:bg-white focus:outline-none transition-all shadow-sm"
                        placeholder="Ej: 5 si el niño ya asistió antes"
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-[0.2em]">Sesiones Totales</label>
                      <div className="bg-[#f8f9fa] p-4 rounded-2xl border-2 border-[#f1f3f4] flex items-center justify-center">
                        <span className="text-lg font-black text-[#111827]">{totalSesionesCalculadas}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-indigo-50/50 border-2 border-indigo-100 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-[#2d1b69] shadow-sm">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold text-[#4b5563] uppercase tracking-widest">Plazo de Consumo</p>
                      <p className="text-sm font-bold text-[#111827]">Vigente hasta el <span className="text-[#2d1b69]">{formatFecha(fechaFinCalculada)}</span></p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-8 border-t border-[#f1f3f4]">
                    <button onClick={() => setStep(2)} className="text-xs font-extrabold text-[#4b5563] hover:text-[#111827] uppercase tracking-widest flex items-center gap-2">
                       <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                       Anterior
                    </button>
                    <button 
                      onClick={submit}
                      disabled={sending} 
                      className="google-button-primary"
                    >
                      {sending ? 'Asignando...' : 'Confirmar y Asignar Plan'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Real-time Cotizacion Sticky Sidebar */}
        <section className="lg:col-span-4 space-y-6">
          <div className="google-card sticky top-8 !p-8 border-none overflow-hidden shadow-2xl shadow-indigo-100/30">
            <div className="absolute top-0 right-0 h-32 w-32 translate-x-16 -translate-y-16 rounded-full bg-indigo-50/50" />
            <h3 className="text-xs font-black text-[#5f6368] uppercase tracking-[0.25em] mb-8 relative z-10">Cotización</h3>
            
            <div className="space-y-6 relative z-10">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-extrabold text-[#9ca3af] uppercase tracking-wider">Estudiante</span>
                <span className={`text-sm font-bold transition-all ${selectedNino ? 'text-[#111827]' : 'text-rose-300 italic'}`}>
                  {selectedNino ? selectedNino.nombre : 'Sin seleccionar'}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-extrabold text-[#9ca3af] uppercase tracking-wider">Plan Elegido</span>
                <span className={`text-sm font-bold transition-all ${currentItem ? 'text-[#111827]' : 'text-rose-300 italic'}`}>
                  {currentItem ? currentItem.nombre : 'Sin seleccionar'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-[#f1f3f4]">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-extrabold text-[#9ca3af] uppercase tracking-wider">Sesiones Totales</span>
                  <span className="text-lg font-black text-[#111827]">{totalSesionesCalculadas}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-extrabold text-[#9ca3af] uppercase tracking-wider">Por Jornada</span>
                  <span className="text-lg font-black text-[#2d1b69]">
                    ${tarifaPorJornadaCalculada.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              <div className="pt-8 mt-4 border-t-2 border-dashed border-[#e2e8f0]">
                <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-[#2d1b69] uppercase tracking-widest">Inversión Final</span>
                    {form.porcentajeDescuento > 0 && (
                      <p className="text-[10px] text-emerald-600 font-bold leading-none mt-1">Desc. {form.porcentajeDescuento}% aplicado</p>
                    )}
                  </div>
                  <span className="text-3xl font-black text-[#1a73e8] tracking-tighter">
                    ${precioTotal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Quick List of Active Plans */}
          <div className="google-card !p-8 animate-fade-in stagger-2 border-none">
            <h3 className="text-xs font-black text-[#5f6368] uppercase tracking-[0.25em] mb-6">Asignaciones Recientes</h3>
            <div className="space-y-4">
              {activos.slice(0, 5).map((p, i) => (
                <div key={i} className="flex items-center gap-4 group">
                  <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#2d1b69] text-[10px] font-black">
                    {p.nombreNino?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-extrabold text-[#111827] truncate">{p.nombreNino}</p>
                    <p className="text-[10px] text-[#1a73e8] font-bold uppercase tracking-tighter">{p.nombre}</p>
                  </div>
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                </div>
              ))}
              {activos.length === 0 && <p className="text-xs text-[#9ca3af] italic">No hay actividad reciente.</p>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
