import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { invalidarPlaneadorPorAsistencia } from "@/features/planeador/api/query/invalidar-por-asistencia"
import { asistenciaKeys } from "@/features/academic-management/asistencia/api/query-keys"
import { subirSoporte } from "@/features/academic-management/asistencia/api/mutations/use-asistencia-registrar-mutation"
import type {
  DiariaRegistrarRequest,
  DiariaRegistrarResultado,
  DiariaRegistro,
} from "@/features/academic-management/asistencia/api/types/asistencia-diaria"

/** Registro con la excusa recién elegida (se sube antes con POST /asistencias/soporte). */
export type DiariaRegistroEntrada = Omit<DiariaRegistro, "fkArchivo"> & { fkArchivo?: number | File | null }

export type DiariaRegistrarInput = Omit<DiariaRegistrarRequest, "REGISTROS"> & { REGISTROS?: DiariaRegistroEntrada[] }

type RespuestaRegistrar =
  | DiariaRegistrarResultado
  | { resultado: DiariaRegistrarResultado }
  | { rows: { resultado: DiariaRegistrarResultado }[] }

/** `POST /asistencias/diaria/registrar` (sso V748): devuelve `AS resultado`, envuelto en `rows` por el back real. */
export function leerResultadoRegistrar(raw: RespuestaRegistrar): DiariaRegistrarResultado {
  const fila = "rows" in raw ? raw.rows[0]?.resultado : "resultado" in raw ? raw.resultado : raw
  return {
    registrados: Number(fila?.registrados ?? 0),
    actividades_no_asistido: Number(fila?.actividades_no_asistido ?? 0),
    solicitud: Boolean(fila?.solicitud),
    solicitudes_pendientes: fila?.solicitudes_pendientes ?? [],
  }
}

async function registrarAsistenciaDiaria({ REGISTROS, ...body }: DiariaRegistrarInput) {
  const registros = REGISTROS
    ? await Promise.all(
        REGISTROS.map(async (r) => ({
          ...r,
          fkArchivo: r.fkArchivo instanceof File ? await subirSoporte(r.fkArchivo) : (r.fkArchivo ?? null),
        })),
      )
    : undefined
  const raw = await api.post<RespuestaRegistrar>("/eval-col/asistencias/diaria/registrar", {
    ...body,
    ...(registros && { REGISTROS: registros }),
  })
  return leerResultadoRegistrar(raw)
}

export function useAsistenciaDiariaRegistrarMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: registrarAsistenciaDiaria,
    onSuccess: () => {
      // El día se reparte por clase: cambian también las vistas por clase y el planeador.
      queryClient.invalidateQueries({ queryKey: asistenciaKeys.all })
      invalidarPlaneadorPorAsistencia(queryClient)
    },
  })
}

/** Regla 109: `PATCH /asistencias/diaria/:ID/justificar`; FUENTE es obligatoria (no se quita por aquí). */
async function justificarAsistenciaDiaria({ pk, justificacion, fuente }: { pk: number; justificacion: string; fuente: number }) {
  await api.patch(`/eval-col/asistencias/diaria/${pk}/justificar`, { JUSTIFICACION: justificacion, FUENTE: fuente })
}

export function useAsistenciaDiariaJustificarMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: justificarAsistenciaDiaria,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: asistenciaKeys.all })
      invalidarPlaneadorPorAsistencia(queryClient)
    },
  })
}
