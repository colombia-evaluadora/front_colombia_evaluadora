import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

import { actividadesQueryKey } from "@/features/planeador/api/query/use-actividades-query"
import { unidadesQueryKey } from "@/features/planeador/api/query/use-unidades-query"
import type {
  ActividadExportada,
  ImportarActividadesDestino,
  InformeImportacion,
} from "@/features/planeador/api/types/actividad-intercambio"

const IMPORTAR_URL = "/eval-col/planeador/actividades/importar"

/** Mismo criterio de tolerancia que `exportar-actividades-json.ts`: el
 *  informe puede llegar suelto, en `{resultado:{...}}` o envuelto en
 *  `{rows:[{resultado:{...}}]}`. */
function resolveInforme(body: unknown): InformeImportacion {
  if (body && typeof body === "object" && "modo" in body) {
    return body as InformeImportacion
  }
  const asObject = body as
    | { resultado?: InformeImportacion; rows?: { resultado?: InformeImportacion }[] }
    | null
    | undefined
  if (asObject?.resultado) return asObject.resultado
  const fromRows = asObject?.rows?.[0]?.resultado
  if (fromRows) return fromRows
  throw new Error("La respuesta de importar no trajo el informe.")
}

export interface ImportarActividadesInput {
  actividades: ActividadExportada[]
  /** Solo hace falta para un archivo AJENO (sin `_identificadores` en sus
   *  filas) — un archivo propio ya trae de dónde sacar el destino. */
  destino?: ImportarActividadesDestino
  /** `true` (paso 1, previsualizar) o `false` (paso 2, aplicar — todo o
   *  nada). El backend real ya asume `true` si se omite; acá se manda
   *  siempre explícito para que quede claro en qué paso está cada llamada. */
  soloValidar: boolean
}

function buildImportarBody(input: ImportarActividadesInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    ACTIVIDADES: input.actividades,
    SOLO_VALIDAR: input.soloValidar,
  }
  const destino = input.destino
  if (destino?.asignaturaId != null) body.FK_TASIGNATURA = destino.asignaturaId
  if (destino?.grupoId != null) body.FK_TGRUPO = destino.grupoId
  if (destino?.gradoId != null) body.FK_TGRADO = destino.gradoId
  if (destino?.funcionarioId != null) body.FK_TFUNCIONARIO = destino.funcionarioId
  if (destino?.calculoDefinitivaId != null) body.FK_TLV_CALCULO_DEFINITIVA = destino.calculoDefinitivaId
  if (destino?.referenteCurricularId != null) {
    body.FK_REFERENTE_CURRICULAR = destino.referenteCurricularId
  }
  return body
}

/**
 * `POST /planeador/actividades/importar` (confirmado real, colección
 * Postman `planeador-actividades-exportar-importar`). Dos pasos, no uno:
 * `SOLO_VALIDAR: true` (por defecto en el backend, siempre explícito acá)
 * no escribe nada y solo devuelve el informe fila por fila; `false` aplica,
 * y es todo o nada — si alguna fila tiene error no se crea ninguna.
 */
async function importarActividades(
  input: ImportarActividadesInput,
): Promise<InformeImportacion> {
  const body = await api.post(IMPORTAR_URL, buildImportarBody(input))
  return resolveInforme(body)
}

interface UseImportarActividadesJsonOptions {
  mutationConfig?: MutationConfig<typeof importarActividades>
}

export function useImportarActividadesJson({
  mutationConfig,
}: UseImportarActividadesJsonOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: importarActividades,
    onSuccess: (data, variables, ...rest) => {
      // Solo invalida cuando de verdad escribió — el paso de validación
      // (`soloValidar: true`) nunca toca la base, así que no hay nada que
      // refrescar todavía.
      if (!variables.soloValidar && data.aplicadas > 0) {
        queryClient.invalidateQueries({ queryKey: actividadesQueryKey() })
        // El importar puede haber creado unidades nuevas (`unidadesCreadas`)
        // para alojar las actividades importadas.
        queryClient.invalidateQueries({ queryKey: unidadesQueryKey() })
      }
      onSuccess?.(data, variables, ...rest)
    },
    ...restConfig,
  })
}
