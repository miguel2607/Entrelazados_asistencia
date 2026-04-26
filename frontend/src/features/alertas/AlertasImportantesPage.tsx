import { useEffect, useMemo, useState } from 'react';
import { api } from '../../shared/api/apiClient';
import { Table } from '../../shared/components/Table';

type EstadoAlerta = 'NUEVA' | 'VISTA' | 'RESUELTA';

type AlertaImportante = {
  id: number;
  idNino: number;
  nombreNino: string;
  tipo: 'SIN_PLAN_ACTIVO' | 'SIN_SESIONES_DISPONIBLES';
  mensaje: string;
  estado: EstadoAlerta;
  creadaEn: string;
  actualizadaEn: string;
};

const estadoLabel: Record<EstadoAlerta, string> = {
  NUEVA: 'Nueva',
  VISTA: 'Vista',
  RESUELTA: 'Resuelta',
};

const tipoLabel: Record<AlertaImportante['tipo'], string> = {
  SIN_PLAN_ACTIVO: 'Sin plan activo',
  SIN_SESIONES_DISPONIBLES: 'Sin sesiones disponibles',
};

function estadoBadgeClass(estado: EstadoAlerta): string {
  if (estado === 'NUEVA') return 'bg-red-100 text-red-700';
  if (estado === 'VISTA') return 'bg-amber-100 text-amber-700';
  return 'bg-green-100 text-green-700';
}

export function AlertasImportantesPage() {
  const [list, setList] = useState<AlertaImportante[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<'TODAS' | EstadoAlerta>('TODAS');

  const load = () => {
    setLoading(true);
    api
      .get<AlertaImportante[]>('/alertas-importantes')
      .then(setList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.post<{ actualizadas: number }>('/alertas-importantes/marcar-vistas').finally(load);
  }, []);

  const data = useMemo(
    () => (filtroEstado === 'TODAS' ? list : list.filter((a) => a.estado === filtroEstado)),
    [filtroEstado, list]
  );
  const totalNuevas = list.filter((a) => a.estado === 'NUEVA').length;
  const totalVistas = list.filter((a) => a.estado === 'VISTA').length;
  const totalResueltas = list.filter((a) => a.estado === 'RESUELTA').length;

  const marcarVista = (id: number) =>
    api.patch<void>(`/alertas-importantes/${id}/vista`, {}).then(load).catch((e) => setError(e.message));

  const marcarResuelta = (id: number) =>
    api.patch<void>(`/alertas-importantes/${id}/resuelta`, {}).then(load).catch((e) => setError(e.message));

  let contenidoTabla: React.ReactNode;
  if (loading) {
    contenidoTabla = (
      <div className="space-y-4">
        <div className="h-10 w-full animate-pulse rounded bg-[#f1f3f4]" />
        <div className="h-56 w-full animate-pulse rounded bg-[#f1f3f4]" />
      </div>
    );
  } else if (data.length === 0) {
    contenidoTabla = (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#d7dde6] bg-[#f8faff] px-6 py-14 text-center">
        <div className="rounded-full bg-indigo-100 p-3">
          <svg className="h-6 w-6 text-[#2d1b69]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <h4 className="mt-3 text-base font-semibold text-[#202124]">No hay alertas para mostrar</h4>
        <p className="mt-1 max-w-md text-sm text-[#5f6368]">
          Cuando se detecte un niño sin plan activo o sin sesiones disponibles, aparecerá aquí automáticamente.
        </p>
      </div>
    );
  } else {
    contenidoTabla = (
      <Table<AlertaImportante>
        keyExtractor={(a) => a.id}
        data={data}
        columns={[
          {
            key: 'creadaEn',
            header: 'Fecha',
            render: (a) => new Date(a.creadaEn).toLocaleString('es-CO'),
          },
          {
            key: 'nombreNino',
            header: 'Niño',
          },
          {
            key: 'tipo',
            header: 'Tipo',
            render: (a) => (
              <span className="inline-flex rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                {tipoLabel[a.tipo]}
              </span>
            ),
          },
          {
            key: 'mensaje',
            header: 'Detalle',
          },
          {
            key: 'estado',
            header: 'Estado',
            render: (a) => (
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${estadoBadgeClass(a.estado)}`}>
                {estadoLabel[a.estado]}
              </span>
            ),
          },
          {
            key: 'id',
            header: 'Gestión',
            render: (a) => (
              <div className="flex items-center gap-3">
                {a.estado === 'NUEVA' && (
                  <button type="button" onClick={() => marcarVista(a.id)} className="text-[#1a73e8] hover:underline">
                    Marcar vista
                  </button>
                )}
                {a.estado !== 'RESUELTA' && (
                  <button
                    type="button"
                    onClick={() => marcarResuelta(a.id)}
                    className="text-[#188038] hover:underline"
                  >
                    Resolver
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />
    );
  }

  if (error) return <p className="text-[#d93025] font-medium">{error}</p>;

  return (
    <div className="max-w-7xl space-y-6">
      <section className="rounded-2xl border border-[#e2e8f0] bg-gradient-to-r from-[#2d1b69] to-[#4c1d95] px-6 py-6 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">Control operativo</p>
            <h2 className="mt-2 text-2xl font-semibold">Alertas importantes</h2>
            <p className="mt-1 text-sm text-indigo-100">
              Eventos de ingreso por cámara cuando el niño no tiene plan activo o no tiene sesiones disponibles.
            </p>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wider text-indigo-100">Total registradas</p>
            <p className="text-2xl font-bold">{list.length}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <article className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-700">Nuevas</p>
          <p className="mt-1 text-2xl font-bold text-red-800">{totalNuevas}</p>
        </article>
        <article className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Vistas</p>
          <p className="mt-1 text-2xl font-bold text-amber-800">{totalVistas}</p>
        </article>
        <article className="rounded-xl border border-green-100 bg-green-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-green-700">Resueltas</p>
          <p className="mt-1 text-2xl font-bold text-green-800">{totalResueltas}</p>
        </article>
      </section>

      <section className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h3 className="text-base font-semibold text-[#202124]">Listado de alertas</h3>
          <div className="flex items-center gap-2">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as 'TODAS' | EstadoAlerta)}
              className="rounded-md border border-[#dadce0] bg-white px-3 py-2 text-sm focus:border-[#1a73e8] focus:outline-none"
            >
              <option value="TODAS">Todas</option>
              <option value="NUEVA">Nuevas</option>
              <option value="VISTA">Vistas</option>
              <option value="RESUELTA">Resueltas</option>
            </select>
            <button type="button" onClick={load} className="google-button-secondary">
              Recargar
            </button>
          </div>
        </div>

        {contenidoTabla}
      </section>
    </div>
  );
}
