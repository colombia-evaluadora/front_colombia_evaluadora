import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { procesosKeys } from "@/features/gestion-estudiantil/convivencia/api/query-keys"

const BASE = "/gestion-estudiantil/convivencia/procesos"
const K = procesosKeys.apertura

export interface EstudianteProceso {
  fk_tmatricula: number
  nombre: string
  documento: string
  grado_grupo: string
  sede_nombre: string
  jornada_nombre: string
}

export interface AnotacionOrigen {
  id: number
  fecha: string
  codigo: string
  codigo_descripcion: string
  tipo_situacion_nombre: string
  observacion_corta: string
}

export interface CasoOrigen {
  id: number
  numero: string
  fecha_hechos: string
  tipo_nombre: string
  estado_nombre: string
}

export interface ResponsableProceso {
  fk_tfuncionario: number
  nombre: string
  rol_nombre: string
  es_usuario_actual: boolean
}

export interface CodigoCargo {
  id: number
  codigo: string
  descripcion: string
  tipo_situacion_nombre: string
}

export interface ClasificacionFalta {
  id: number
  nombre: string
  descripcion: string | null
}

/** §2.1 `opciones/estudiantes`: el backend exige 2 a 100 caracteres. */
export function useEstudiantesProcesoQuery(search: string) {
  const texto = search.trim()
  return useQuery({
    queryKey: K("estudiantes", texto),
    queryFn: () =>
      evalCol.getRows<EstudianteProceso>(`${BASE}/opciones/estudiantes?SEARCH=${encodeURIComponent(texto)}&LIMITE=20`),
    enabled: texto.length >= 2,
    staleTime: 30_000,
  })
}

/** §2.1 `opciones/estudiantes-caso`: presuntos agresores del caso sin proceso activo. */
export function useEstudiantesCasoQuery(caso: number | null) {
  return useQuery({
    queryKey: K("estudiantes-caso", caso),
    queryFn: () =>
      evalCol.getRows<{ fk_tmatricula: number; nombre: string; grado_grupo: string }>(
        `${BASE}/opciones/estudiantes-caso?CASO=${caso}`,
      ),
    enabled: caso != null,
  })
}

/** §2.1 `opciones/origenes`: anotaciones negativas y casos del estudiante (la fila trae `{ opciones }`). */
export function useOrigenesProcesoQuery(matricula: number | null) {
  return useQuery({
    queryKey: K("origenes", matricula),
    queryFn: () =>
      evalCol
        .getRow<{ opciones: { anotaciones: AnotacionOrigen[]; casos: CasoOrigen[] } }>(
          `${BASE}/opciones/origenes?MATRICULA=${matricula}`,
        )
        .then((r) => r.opciones),
    enabled: matricula != null,
  })
}

export function useResponsablesProcesoQuery(matricula: number | null) {
  return useQuery({
    queryKey: K("responsables", matricula),
    queryFn: () => evalCol.getRows<ResponsableProceso>(`${BASE}/opciones/responsables?MATRICULA=${matricula}`),
    enabled: matricula != null,
  })
}

/** §2.1 `plazo-descargos` (la fila trae `{ plazo }`): se pide al cambiar estudiante o fecha. */
export function usePlazoDescargosQuery(matricula: number | null, fecha: string) {
  return useQuery({
    queryKey: K("plazo", matricula, fecha),
    queryFn: () =>
      evalCol
        .getRow<{ plazo: { plazo_descargos: string | null; dias_habiles: number } }>(
          `${BASE}/plazo-descargos?MATRICULA=${matricula}&FECHA=${fecha}`,
        )
        .then((r) => r.plazo),
    enabled: matricula != null && Boolean(fecha),
  })
}

export function useCodigosCargoQuery(matricula: number | null) {
  return useQuery({
    queryKey: K("codigos", matricula),
    queryFn: () => evalCol.getRows<CodigoCargo>(`${BASE}/opciones/codigos?MATRICULA=${matricula}`),
    enabled: matricula != null,
    staleTime: 60_000,
  })
}

export function useClasificacionesFaltaQuery(matricula: number | null) {
  return useQuery({
    queryKey: K("clasificaciones", matricula),
    queryFn: () => evalCol.getRows<ClasificacionFalta>(`${BASE}/opciones/clasificaciones?MATRICULA=${matricula}`),
    enabled: matricula != null,
    staleTime: 60_000,
  })
}
