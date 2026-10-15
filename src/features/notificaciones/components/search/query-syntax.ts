import { optionTerm, type QuerySyntax } from "@/components/search/query-syntax"

import { CATEGORIAS_NOTIFICACION, ESTADOS_LECTURA } from "@/features/notificaciones/api/types"
import { CATEGORIA_LABELS, ESTADO_LECTURA_LABELS } from "@/features/notificaciones/api/ui-mappings"

/** Filtros del buscador como strings (vacío = sin filtro), forma que espera `query-syntax`. */
export interface NotificacionesQueryFilters {
  texto: string
  categoria: string
  estado: string
}

export const CATEGORIA_OPTIONS = CATEGORIAS_NOTIFICACION.map((value) => ({ value, label: CATEGORIA_LABELS[value] }))
export const ESTADO_OPTIONS = ESTADOS_LECTURA.map((value) => ({ value, label: ESTADO_LECTURA_LABELS[value] }))

/**
 * `tipo:(Planeador) estado:(No leídas) texto libre`. La clave visible es
 * `tipo` (como la escribe el usuario en el PLAN §11.4) aunque filtra por la
 * categoría del catálogo. Ver `@/components/search/query-syntax`.
 */
export const notificacionesSyntax: QuerySyntax<NotificacionesQueryFilters> = {
  empty: { texto: "", categoria: "", estado: "" },
  freeText: { key: "texto", field: "texto" },
  terms: [optionTerm("tipo", "categoria", CATEGORIA_OPTIONS), optionTerm("estado", "estado", ESTADO_OPTIONS)],
}
