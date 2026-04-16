import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../shared/api/apiClient';
import { Table } from '../../shared/components/Table';
import { Modal } from '../../shared/components/Modal';
import { ConfirmModal } from '../../shared/components/ConfirmModal';

interface Nino {
  id: number;
  nombre: string;
  ti: string;
  fechaNacimiento: string;
  biometricId?: string;
  grupo?: string;
}

// Wizard state types
type Step1Form = { nombre: string; ti: string; fechaNacimiento: string; biometricId: string; grupo: string };
type Step2Form = { nombre: string; cc: string; telefono: string; parentesco: string };
type WizardStep = 1 | 2;

export function NinosPage() {
  const [list, setList] = useState<Nino[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buscar, setBuscar] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>(1);
  const [step1, setStep1] = useState<Step1Form>({ nombre: '', ti: '', fechaNacimiento: '', biometricId: '', grupo: '' });
  const [step2, setStep2] = useState<Step2Form>({ nombre: '', cc: '', telefono: '', parentesco: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [suggestingBiometricId, setSuggestingBiometricId] = useState(false);
  const [createdNinoId, setCreatedNinoId] = useState<number | null>(null);
  const [similarNinos, setSimilarNinos] = useState<{ id: number; nombre: string }[]>([]);
  const [similarAcudientes, setSimilarAcudientes] = useState<{ id: number; nombre: string; telefono?: string; cc?: string }[]>([]);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchSimilarNinos = (nombre: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!nombre.trim() || nombre.length < 3) {
      setSimilarNinos([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => {
      api.get<{ id: number; nombre: string }[]>('/ninos', { nombre })
        .then(setSimilarNinos);
    }, 500);
  };

  const searchSimilarAcudientes = (nombre: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!nombre.trim() || nombre.length < 3) {
      setSimilarAcudientes([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => {
      api.get<{ id: number; nombre: string; telefono?: string; cc?: string }[]>('/acudientes', { nombre })
        .then(setSimilarAcudientes);
    }, 500);
  };

  // Confirm delete modal
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    api.get<Nino[]>('/ninos', buscar ? { nombre: buscar } : undefined)
      .then(setList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [buscar]);

  const resetWizard = () => {
    setStep(1);
    setStep1({ nombre: '', ti: '', fechaNacimiento: '', biometricId: '', grupo: '' });
    setStep2({ nombre: '', cc: '', telefono: '', parentesco: '' });
    setCreatedNinoId(null);
    setSimilarNinos([]);
    setSimilarAcudientes([]);
    setError(null);
  };

  const calcularSiguienteBiometricId = (ninos: Nino[]): string => {
    const usados = new Set(
      ninos
        .map((n) => Number.parseInt((n.biometricId ?? '').trim(), 10))
        .filter((id) => Number.isInteger(id) && id > 0)
    );
    // Reservamos el ID 1 para el admin del equipo Hikvision.
    let candidato = 2;
    while (usados.has(candidato)) candidato += 1;
    return String(candidato);
  };

  const autocompletarBiometricId = async () => {
    if (editingId) return;
    setSuggestingBiometricId(true);
    try {
      const todos = await api.get<Nino[]>('/ninos');
      const sugerido = calcularSiguienteBiometricId(todos);
      setStep1((prev) => (prev.biometricId ? prev : { ...prev, biometricId: sugerido }));
    } catch {
      // Si falla la sugerencia, el usuario aún puede escribir el ID manualmente.
    } finally {
      setSuggestingBiometricId(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    resetWizard();
    setModalOpen(true);
    autocompletarBiometricId();
  };

  const openEdit = (n: Nino) => {
    setEditingId(n.id);
    setStep1({ 
      nombre: n.nombre, 
      ti: n.ti ?? '', 
      fechaNacimiento: n.fechaNacimiento?.slice(0, 10) ?? '',
      biometricId: n.biometricId ?? '',
      grupo: n.grupo ?? ''
    });
    setStep2({ nombre: '', cc: '', telefono: '', parentesco: '' });
    setStep(1);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetWizard();
    setEditingId(null);
  };

  // Paso 1: guardar niño
  const submitStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = { 
        nombre: step1.nombre, 
        ti: step1.ti || undefined, 
        fechaNacimiento: step1.fechaNacimiento,
        biometricId: step1.biometricId || undefined,
        grupo: step1.grupo || undefined
      };
      if (editingId) {
        await api.put<Nino>(`/ninos/${editingId}`, body);
        closeModal();
        load();
      } else {
        const nino = await api.post<Nino>('/ninos', body);
        setCreatedNinoId(nino.id);
        setStep(2);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Paso 2: guardar acudiente y vincular
  const submitStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdNinoId) return;
    setSaving(true);
    setError(null);
    try {
      const acudiente = await api.post<{ id: number }>('/acudientes', {
        nombre: step2.nombre,
        cc: step2.cc || undefined,
        telefono: step2.telefono || undefined,
      });
      await api.post('/ninos-acudientes', {
        idNino: createdNinoId,
        idAcudiente: acudiente.id,
        parentesco: step2.parentesco || 'Familiar',
      });
      closeModal();
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const omitirAcudiente = () => {
    closeModal();
    load();
  };

  const remove = (id: number) => {
    setIdToDelete(id);
    setConfirmDeleteOpen(true);
  };

  const confirmarEliminacion = () => {
    if (!idToDelete) return;
    api.delete(`/ninos/${idToDelete}`).then(load).catch((e) => setError(e.message));
  };

  if (error && !modalOpen) return <p className="text-[#d93025] font-medium">{error}</p>;

  return (
    <div className="max-w-6xl space-y-10">
      <div className="animate-fade-in">
        <h2 className="text-3xl font-extrabold text-[#111827] tracking-tight">Gestión de Niños</h2>
        <p className="mt-2 text-sm text-[#4b5563]">
          Administra los perfiles de los estudiantes, vincula acudientes y supervisa sus planes de estudio con facilidad.
        </p>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-2xl border border-[#e2e8f0] shadow-sm animate-scale-in stagger-1">
        <div className="relative flex-1 max-w-md group">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4b5563] group-focus-within:text-[#2d1b69] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            className="w-full rounded-full border border-[#e2e8f0] bg-[#fcfaff] py-3 pl-12 pr-6 text-sm font-medium focus:border-[#2d1b69] focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
          />
        </div>
        <button type="button" onClick={openCreate} className="google-button-primary flex items-center justify-center gap-2">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">Nuevo Registro</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center animate-pulse">
          <div className="mx-auto h-12 w-12 border-4 border-[#2d1b69] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-bold text-[#4b5563] uppercase tracking-widest">Sincronizando información...</p>
        </div>
      ) : (
        <div className="animate-scale-in stagger-2">
          <Table<Nino>
            keyExtractor={(n) => n.id}
            data={list}
            columns={[
              {
                key: 'nombre', header: 'Nombre Completo', render: (n) => (
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-[#2d1b69] font-bold text-xs">
                      {n.nombre.charAt(0)}
                    </div>
                    <span className="font-bold">{n.nombre}</span>
                  </div>
                )
              },
              { key: 'ti', header: 'Identificación (TI)' },
              {
                key: 'fechaNacimiento', header: 'Nacimiento', render: (n) => (
                  <span className="text-[#4b5563] font-medium">{n.fechaNacimiento?.slice(0, 10)}</span>
                )
              },
              { key: 'grupo', header: 'Grupo', render: (n) => n.grupo || '-' },
              {
                key: 'id', header: 'Acciones', render: (n) => (
                  <div className="flex gap-4">
                    <Link to={`/ninos/${n.id}/detalle`} className="text-[#2d1b69] font-bold text-xs uppercase tracking-widest hover:text-[#4c1d95] transition-colors hover:underline">Detalle</Link>
                    <button type="button" onClick={() => openEdit(n)} className="text-[#4b5563] font-bold text-xs uppercase tracking-widest hover:text-[#111827] transition-colors">Editar</button>
                    <button type="button" onClick={() => remove(n.id)} className="text-rose-600 font-bold text-xs uppercase tracking-widest hover:text-rose-800 transition-colors">Borrar</button>
                  </div>
                )
              },
            ]}
          />
        </div>
      )}

      {/* WIZARD MODAL */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Actualizar Información' : step === 1 ? 'Nuevo Estudiante – Paso 1 de 2' : 'Nuevo Estudiante – Paso 2 de 2'}
        alignTop
      >
        {/* Progress bar */}
        {!editingId && (
          <div className="flex gap-2 mb-6">
            <div className={`h-1.5 flex-1 rounded-full transition-all ${step >= 1 ? 'bg-[#2d1b69]' : 'bg-[#e2e8f0]'}`} />
            <div className={`h-1.5 flex-1 rounded-full transition-all ${step >= 2 ? 'bg-[#2d1b69]' : 'bg-[#e2e8f0]'}`} />
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        {/* PASO 1: Datos del Niño */}
        {step === 1 && (
          <form onSubmit={submitStep1} className="space-y-6">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">Nombre Completo</label>
              <input
                required
                value={step1.nombre}
                onChange={(e) => {
                  const val = e.target.value;
                  setStep1((f) => ({ ...f, nombre: val }));
                  searchSimilarNinos(val);
                }}
                className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm font-medium focus:border-[#2d1b69] focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                placeholder="Ej: Juan Pérez"
              />
              {similarNinos.length > 0 && (
                <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 animate-fade-in">
                  <p className="text-[10px] font-extrabold text-amber-700 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Registros con nombres similares:
                  </p>
                  <ul className="space-y-1">
                    {similarNinos.map(n => (
                      <li key={n.id} className="text-xs font-bold text-amber-900 border-l-2 border-amber-300 pl-2">
                        {n.nombre} <span className="text-[10px] font-medium text-amber-600 block">(Ya existe en el sistema)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">Documento (TI)</label>
                <input
                  value={step1.ti}
                  onChange={(e) => setStep1((f) => ({ ...f, ti: e.target.value }))}
                  className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm font-medium focus:border-[#2d1b69] focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                  placeholder="00000000"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">Nacimiento</label>
                <input
                  type="date"
                  required
                  value={step1.fechaNacimiento}
                  onChange={(e) => setStep1((f) => ({ ...f, fechaNacimiento: e.target.value }))}
                  className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm font-medium focus:border-[#2d1b69] focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="nino-grupo" className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">Grupo</label>
              <select
                id="nino-grupo"
                required
                value={step1.grupo}
                onChange={(e) => setStep1((f) => ({ ...f, grupo: e.target.value }))}
                className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm font-medium focus:border-[#2d1b69] focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all bg-white"
              >
                <option value="">Seleccionar grupo...</option>
                <option value="APRENDER JUGANDO">APRENDER JUGANDO</option>
                <option value="ESTIMULACION Y NURODESARROLLO">ESTIMULACION Y NURODESARROLLO</option>
                <option value="CLASES EXTRACURRICULARES">CLASES EXTRACURRICULARES</option>
              </select>
            </div>
            {/* Campo ID Biométrico */}
            <div className="space-y-1.5">
              <label htmlFor="nino-biometrico" className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">ID Biométrico (Equipo Hikvision)</label>
              <input
                id="nino-biometrico"
                value={step1.biometricId}
                onChange={(e) => setStep1((f) => ({ ...f, biometricId: e.target.value }))}
                className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm font-medium focus:border-[#2d1b69] focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                placeholder={suggestingBiometricId ? 'Buscando ID disponible...' : 'Ej: 105'}
              />
              <p className="text-[10px] text-[#6b7280]">
                {suggestingBiometricId
                  ? 'Calculando siguiente ID biométrico disponible...'
                  : 'Este ID se sugiere automáticamente según los ya registrados, y debe coincidir con el asignado físicamente en el equipo.'}
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-[#e2e8f0]">
              <button type="button" onClick={closeModal} className="google-button-secondary">Cancelar</button>
              <button type="submit" disabled={saving} className="google-button-primary disabled:opacity-50 min-w-[160px]">
                {saving ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Siguiente: Acudiente →'}
              </button>
            </div>
          </form>
        )}

        {/* PASO 2: Datos del Acudiente */}
        {step === 2 && (
          <form onSubmit={submitStep2} className="space-y-6">
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-purple-700 font-medium">
              ✅ Niño registrado exitosamente. Ahora puedes vincular un acudiente (opcional).
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">Nombre del Acudiente</label>
              <input
                required
                value={step2.nombre}
                onChange={(e) => {
                  const val = e.target.value;
                  setStep2((f) => ({ ...f, nombre: val }));
                  searchSimilarAcudientes(val);
                }}
                className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm font-medium focus:border-[#2d1b69] focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                placeholder="Ej: María González"
              />
              {similarAcudientes.length > 0 && (
                <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 animate-fade-in">
                  <p className="text-[10px] font-extrabold text-amber-700 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Acudientes similares:
                  </p>
                  <ul className="space-y-1">
                    {similarAcudientes.map(a => (
                      <li key={a.id} className="text-xs font-bold text-amber-900 border-l-2 border-amber-300 pl-2">
                        {a.nombre} {a.telefono && <span className="text-[9px] font-medium text-amber-600 ml-1">({a.telefono})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">Cédula (CC)</label>
                <input
                  value={step2.cc}
                  onChange={(e) => setStep2((f) => ({ ...f, cc: e.target.value }))}
                  className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm font-medium focus:border-[#2d1b69] focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                  placeholder="00000000"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">Teléfono</label>
                <input
                  value={step2.telefono}
                  onChange={(e) => setStep2((f) => ({ ...f, telefono: e.target.value }))}
                  className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm font-medium focus:border-[#2d1b69] focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                  placeholder="300 000 0000"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">Parentesco</label>
              <select
                value={step2.parentesco}
                onChange={(e) => setStep2((f) => ({ ...f, parentesco: e.target.value }))}
                className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm font-medium focus:border-[#2d1b69] focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all bg-white"
              >
                <option value="">Seleccionar parentesco...</option>
                <option value="Madre">Madre</option>
                <option value="Padre">Padre</option>
                <option value="Abuelo/a">Abuelo/a</option>
                <option value="Tío/a">Tío/a</option>
                <option value="Hermano/a">Hermano/a</option>
                <option value="Otro familiar">Otro familiar</option>
                <option value="Acudiente legal">Acudiente legal</option>
              </select>
            </div>
            <div className="flex justify-between gap-3 pt-6 border-t border-[#e2e8f0]">
              <button type="button" onClick={omitirAcudiente} className="google-button-secondary">
                Omitir acudiente
              </button>
              <button type="submit" disabled={saving || !step2.nombre} className="google-button-primary disabled:opacity-50 min-w-[180px]">
                {saving ? 'Guardando...' : 'Guardar y Vincular Acudiente'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={confirmarEliminacion}
        title="¿Eliminar Estudiante?"
        message="Esta acción no se puede deshacer. Se eliminará permanentemente el perfil del niño y su historial asociado."
        confirmLabel="Eliminar permanentemente"
      />
    </div>
  );
}

