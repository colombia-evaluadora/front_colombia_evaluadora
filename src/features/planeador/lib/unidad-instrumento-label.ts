import {
  instrumentoLabelFromReferente,
  resolveInstrumentoLabel,
  useUnidadesTabsQuery,
  type UnidadTab,
} from "@/features/planeador/api/query/use-unidades-tabs-query"
import { useUnidadReferenteQuery } from "@/features/planeador/api/query/use-unidad-referente-query"
import { articuloDefinidoRotulo } from "@/features/planeador/lib/rotulo-gramatica"

/** Mismo valor que `UNIDAD_TAB_FALLBACK` (`planeador-tabs.tsx`) — repetido
 *  acá para no hacer depender esta capa de un componente de UI. */
const ROTULO_UNIDAD_FALLBACK = "Unidad temática"

/**
 * Resolución pura del rótulo de una unidad ("Unidad temática"/"Proyecto
 * pedagógico"/…, el `instrumento` de `GET /planeador/unidades/tabs`), de lo
 * más a lo menos preciso: referente curricular real de la unidad
 * (`instrumentoLabelFromReferente`), pestaña de su grado
 * (`resolveInstrumentoLabel`), única pestaña del docente y, por último, el
 * genérico.
 *
 * La única pestaña cuenta aunque no matchee el grado: antes caía al genérico
 * "Unidad temática", y un docente solo de Preescolar leía "unidad temática"
 * en pantallas cuya pestaña decía "Proyecto pedagógico".
 */
export function resolverRotuloUnidad(
  referenteId: number | null | undefined,
  gradoId: number | undefined,
  tabs: UnidadTab[] | undefined,
): string {
  const porReferente = instrumentoLabelFromReferente(referenteId, tabs, "")
  if (porReferente) return porReferente
  const porGrado = resolveInstrumentoLabel(gradoId, tabs, "")
  if (porGrado) return porGrado
  if (tabs?.length === 1 && tabs[0].instrumento) return tabs[0].instrumento
  return ROTULO_UNIDAD_FALLBACK
}

/**
 * Rótulo de la pestaña que le corresponde a un grado — mismo criterio de
 * resolución que `planeador-unidades-page.tsx` (filtrar por `gradoIds` de la
 * fila de `GET /planeador/unidades/tabs`). Para una unidad YA GUARDADA usar
 * `useRotuloUnidad`, que además mira su referente real.
 */
export function useUnidadInstrumentoLabel(gradoId: number | undefined): string {
  const { data: tabs } = useUnidadesTabsQuery()
  return resolverRotuloUnidad(undefined, gradoId, tabs)
}

/**
 * Rótulo de una unidad YA GUARDADA. Prioriza el referente real de la unidad
 * (`GET /unidades/:id/referente`, `useUnidadReferenteQuery`) sobre el grado:
 * `UnidadTematica.gradoId` casi nunca viene del backend real (ver su
 * comentario), así que resolver solo por grado dejaba el genérico en la
 * mayoría de las unidades reales.
 *
 * `rotuloConocido`: el que ya resolvió el caller (la página de Unidades lo
 * tiene de la pestaña activa y se lo pasa a cards y panel) — gana y apaga la
 * consulta del referente, para no disparar una por card.
 */
export function useRotuloUnidad(
  unidad: { id: number; gradoId?: number } | undefined,
  rotuloConocido?: string,
): string {
  const { data: tabs } = useUnidadesTabsQuery()
  const { data: referente } = useUnidadReferenteQuery(rotuloConocido ? undefined : unidad?.id)
  return rotuloConocido || resolverRotuloUnidad(referente?.id, unidad?.gradoId, tabs)
}

/**
 * Artículo definido para anteponer al rótulo en un mensaje ("la Unidad
 * temática", "el Proyecto pedagógico"). Delegado en `generoRotulo`
 * (`rotulo-gramatica.ts`), que ya no trata como femenino todo lo que no
 * empiece por "proyecto" (un rótulo "Taller" daba "la taller").
 */
export function articuloDefinido(instrumento: string): "la" | "el" {
  return articuloDefinidoRotulo(instrumento)
}

/**
 * Mensaje de éxito al crear/editar una unidad, con el rótulo dinámico en
 * vez de "Unidad temática" fijo. El participio ("creado"/"actualizado")
 * queda invariable —es la construcción impersonal "se ha creado", no un
 * adjetivo que concuerde con el sustantivo— así que solo el artículo
 * cambia según el género de `instrumento`. El rótulo va en minúscula
 * inicial: queda a mitad de oración.
 */
export function mensajeUnidadGuardada(accion: "creado" | "actualizado", instrumento: string): string {
  const rotulo = instrumento.charAt(0).toLowerCase() + instrumento.slice(1)
  return `Se ha ${accion} con éxito ${articuloDefinido(instrumento)} ${rotulo}.`
}
