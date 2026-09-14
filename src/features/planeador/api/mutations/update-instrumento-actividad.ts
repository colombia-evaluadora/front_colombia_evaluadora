import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { actividadDetalleQueryKey } from "@/features/planeador/api/query/use-actividad-detalle-query"
import { resolveInstrumentoEvaluacionId } from "@/features/planeador/api/query/use-instrumento-evaluacion-catalog"
import { resolveTipoEscalaId } from "@/features/planeador/api/query/use-tipo-escala-catalog"
import { resolveTipoEvidenciaOtroId } from "@/features/planeador/api/query/use-tipo-evidencia-otro-catalog"
import type {
  Actividad,
  Criterio,
  EscalaValoracion,
  ListaCotejo,
  Nivel,
  Rubrica,
} from "@/features/planeador/api/types/actividad"

/**
 * `PUT /planeador/actividades/:id/instrumento` (confirmado real, colección
 * Postman `planeador-instrumentos-tipos-completo`): define/reemplaza la
 * estructura del instrumento vigente de la actividad. `DEFINICION` viaja
 * como STRING serializado (regla de los `JSONB` del motor) y su FORMA
 * depende del instrumento — un array para RUBRICA/LISTA_COTEJO, un objeto
 * para ESCALA_VALORACION/OTRO.
 *
 * El backend exige que la actividad YA tenga `FK_TLV_INSTRUMENTO_EVALUACION`
 * fijado al mismo instrumento que se está definiendo (400/22023 si no
 * coincide) — por eso `create-actividad.ts`/`update-actividad.ts` mandan ese
 * campo ANTES de llamar acá.
 */
type NivelBody = { etiqueta: string; descripcion?: string; ponderacion: number }

function nivelABody(nivel: Nivel): NivelBody {
  return { etiqueta: nivel.nombre, descripcion: nivel.descripcion || undefined, ponderacion: nivel.ponderacion ?? 0 }
}

/**
 * "Excelente" es, en los hechos, el nivel más alto del criterio pero vive
 * como field propio (`criterio.excelente`/`excelentePonderacion`), no
 * dentro de `niveles[]` (ver el comentario de `CriterioItem` en
 * `form-editar-actividad.tsx`) — acá se reinserta como el primer nivel del
 * array que espera el backend. Se omite si no tiene contenido, igual que en
 * el form (un criterio recién creado no fuerza un nivel "Excelente" vacío).
 */
function criterioABody(criterio: Criterio) {
  const niveles: NivelBody[] = []
  if (criterio.excelente.trim() || criterio.excelentePonderacion != null) {
    niveles.push({
      etiqueta: "Excelente",
      descripcion: criterio.excelente || undefined,
      ponderacion: criterio.excelentePonderacion ?? 0,
    })
  }
  niveles.push(...criterio.niveles.map(nivelABody))
  return { nombre: criterio.nombre, niveles }
}

function rubricaVacia(rubrica: Rubrica): boolean {
  return rubrica.criterios.length === 0
}

function buildRubricaDefinicion(rubrica: Rubrica) {
  return rubrica.criterios.map(criterioABody)
}

function listaCotejoVacia(listaCotejo: ListaCotejo): boolean {
  return listaCotejo.items.length === 0
}

function buildListaCotejoDefinicion(listaCotejo: ListaCotejo) {
  return listaCotejo.items.map((item) => ({ descripcion: item.descripcion, ponderacion: item.ponderacion }))
}

function escalaVacia(escala: EscalaValoracion): boolean {
  if (escala.criteriosGenerales.trim()) return false
  return escala.tipo === "Numérica"
    ? escala.valorMinimo == null && escala.valorMaximo == null
    : escala.niveles.length === 0
}

async function buildEscalaDefinicion(escala: EscalaValoracion) {
  const tipoEscala = await resolveTipoEscalaId(escala.tipo)
  if (escala.tipo === "Numérica") {
    return {
      tipoEscala,
      criteriosGenerales: escala.criteriosGenerales,
      valorMin: escala.valorMinimo,
      valorMax: escala.valorMaximo,
      interpretacionRangos: escala.interpretacionRangos,
    }
  }
  return {
    tipoEscala,
    criteriosGenerales: escala.criteriosGenerales,
    niveles: escala.niveles.map(nivelABody),
  }
}

/** El método de valoración elegido para "Otro" reusa la MISMA sección/mismos
 *  datos (`rubrica`/`listaCotejo`/`escalaValoracion`) que si fuera el
 *  instrumento directo — ver `InstrumentoPersonalizadoSection`. */
function metodoVacio(metodo: string, actividad: Actividad): boolean {
  if (metodo === "Lista de cotejo") return listaCotejoVacia(actividad.listaCotejo)
  if (metodo === "Escala de valoración") return escalaVacia(actividad.escalaValoracion)
  return rubricaVacia(actividad.rubrica)
}

async function buildDefinicionPorMetodo(metodo: string, actividad: Actividad) {
  if (metodo === "Lista de cotejo") return buildListaCotejoDefinicion(actividad.listaCotejo)
  if (metodo === "Escala de valoración") return buildEscalaDefinicion(actividad.escalaValoracion)
  return buildRubricaDefinicion(actividad.rubrica)
}

/**
 * `true` si hay algo que guardar para el instrumento ACTUALMENTE elegido —
 * evita llamar `PUT .../instrumento` con un `DEFINICION` vacío. Fundamental
 * al editar: el detalle real de actividad (`GET .../actividades/:id`) NO
 * trae de vuelta la rúbrica/lista de cotejo/escala ya guardada (vive en
 * `GET .../instrumento`, que el form de edición todavía no precarga —
 * pendiente aparte), así que sin este chequeo cada guardado que no tocara
 * el instrumento lo pisaría con una definición en blanco.
 */
export function tieneDefinicionInstrumento(actividad: Actividad): boolean {
  if (actividad.instrumento === "Lista de cotejo") return !listaCotejoVacia(actividad.listaCotejo)
  if (actividad.instrumento === "Escala de valoración") return !escalaVacia(actividad.escalaValoracion)
  if (actividad.instrumento === "Otro") {
    const metodo = actividad.instrumentoPersonalizado.metodoValoracion
    return metodo !== "" && !metodoVacio(metodo, actividad)
  }
  return !rubricaVacia(actividad.rubrica)
}

interface UpdateInstrumentoInput {
  actividadId: number
  actividad: Actividad
}

async function updateInstrumentoActividad({ actividadId, actividad }: UpdateInstrumentoInput): Promise<void> {
  let definicion: unknown

  if (actividad.instrumento === "Lista de cotejo") {
    definicion = buildListaCotejoDefinicion(actividad.listaCotejo)
  } else if (actividad.instrumento === "Escala de valoración") {
    definicion = await buildEscalaDefinicion(actividad.escalaValoracion)
  } else if (actividad.instrumento === "Otro") {
    const { instrumentoPersonalizado } = actividad
    const metodo = instrumentoPersonalizado.metodoValoracion
    if (!metodo) throw new Error("Elegí un método de valoración para el instrumento personalizado.")
    const [tipoEvidencia, metodoValoracion, innerDefinicion] = await Promise.all([
      resolveTipoEvidenciaOtroId(instrumentoPersonalizado.tipoEvidenciaEsperada),
      // Restringido a RUBRICA|LISTA_COTEJO|ESCALA_VALORACION: el `<Select>`
      // de "Método de valoración" nunca ofrece "Otro" (ver
      // `InstrumentoPersonalizadoSection`), así que no hace falta excluirlo
      // acá aparte — el backend igual lo rechaza si llegara a pasar.
      resolveInstrumentoEvaluacionId(metodo),
      buildDefinicionPorMetodo(metodo, actividad),
    ])
    definicion = { tipoEvidencia, metodoValoracion, definicion: innerDefinicion }
  } else {
    definicion = buildRubricaDefinicion(actividad.rubrica)
  }

  await api.put(`/eval-col/planeador/actividades/${actividadId}/instrumento`, {
    DEFINICION: JSON.stringify(definicion),
  })
}

interface UseUpdateInstrumentoActividadOptions {
  mutationConfig?: MutationConfig<typeof updateInstrumentoActividad>
}

export function useUpdateInstrumentoActividad({ mutationConfig }: UseUpdateInstrumentoActividadOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: updateInstrumentoActividad,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: actividadDetalleQueryKey(variables.actividadId) })
      onSuccess?.(data, variables, ...rest)
    },
    ...restConfig,
  })
}
