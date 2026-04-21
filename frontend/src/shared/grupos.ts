import { api } from './api/apiClient';

export interface GrupoOption {
  id: number;
  nombre: string;
  color: string;
}

export interface CrearGrupoPayload {
  nombre: string;
  color: string;
}

export interface SubgrupoOption {
  id: number;
  idGrupo: number;
  nombre: string;
}

export function listarGrupos(): Promise<GrupoOption[]> {
  return api.get<GrupoOption[]>('/grupos');
}

export function crearGrupo(payload: CrearGrupoPayload): Promise<GrupoOption> {
  return api.post<GrupoOption>('/grupos', payload);
}

export function actualizarGrupo(id: number, payload: CrearGrupoPayload): Promise<GrupoOption> {
  return api.put<GrupoOption>(`/grupos/${id}`, payload);
}

export function eliminarGrupo(id: number): Promise<void> {
  return api.delete(`/grupos/${id}`);
}

export function listarSubgrupos(idGrupo: number): Promise<SubgrupoOption[]> {
  return api.get<SubgrupoOption[]>(`/grupos/${idGrupo}/subgrupos`);
}

export function crearSubgrupo(idGrupo: number, nombre: string): Promise<SubgrupoOption> {
  return api.post<SubgrupoOption>(`/grupos/${idGrupo}/subgrupos`, { nombre });
}
