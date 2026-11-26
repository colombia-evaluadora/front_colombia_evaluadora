"use no memo"

import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { Row, Table } from "@tanstack/react-table"

/** Cuánto dura el resaltado (igual que la animación `resaltar-fila` de DataTable). */
export const RESALTADO_MS = 3500
/** Una mutación cuenta como causa del cambio si se envió hace menos de esto. */
const VENTANA_MUTACION_MS = 15_000
/** Más filas cambiadas que esto no es una edición puntual (importación, recarga): no se resalta. */
const MAX_FILAS = 10

/**
 * Campos de paginación que el backend repite en cada fila (`total_count`…): cambian en todas al crear o
 * eliminar un registro, así que no cuentan como cambio de la fila (si no, eliminar una resaltaba todas).
 */
const CAMPOS_DE_LISTADO = /^(total_?count|totalcount|total|row_?number|rn)$/i

/** Contenido de la fila para comparar, sin los campos de paginación. */
export function huella(original: unknown) {
  try {
    return JSON.stringify(original, (clave, valor) => (clave && CAMPOS_DE_LISTADO.test(clave) ? undefined : valor))
  } catch {
    return ""
  }
}

/** Total del listado si las filas lo traen (`total_count`, `totalCount`); null si no. */
function totalDe(original: unknown): number | null {
  if (!original || typeof original !== "object") return null
  const o = original as Record<string, unknown>
  const v = o.total_count ?? o.totalCount
  const n = typeof v === "string" ? Number(v) : v
  return typeof n === "number" && Number.isFinite(n) ? n : null
}

/**
 * Filas que se acaban de crear o modificar, para resaltarlas unos segundos.
 *
 * Compara cada fila (por su id) con la última versión vista en esta tabla: es nueva si el id no
 * se había visto y modificada si su contenido cambió. Solo resalta si hubo una mutación de
 * TanStack Query exitosa hace poco: así paginar, ordenar, buscar o filtrar (que también cambian
 * las filas) nunca resaltan nada. Las filas en edición (`excluir`) no se resaltan ni se
 * registran: al guardar se comparan con lo que había antes de editar.
 *
 * Una fila eliminada no se puede resaltar (ya no está); lo confirma el aviso de la pantalla. Al eliminar
 * tampoco se resaltan las demás: el total repetido en cada fila no cuenta como cambio (`huella`) y las filas
 * que suben desde la página siguiente no son nuevas.
 */
export function useFilasResaltadas(table: Table<any>, excluir?: (row: Row<any>) => boolean) {
  const queryClient = useQueryClient()
  const vistas = useRef(new Map<string, string>())
  /** Ids y total de la última versión de la página, para reconocer una eliminación. */
  const paginaAnterior = useRef(new Set<string>())
  const totalAnterior = useRef<number | null>(null)
  const [resaltadas, setResaltadas] = useState<ReadonlySet<string>>(() => new Set())
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined)
  const data = table.options.data

  useEffect(() => {
    const filas = table.getCoreRowModel().rows.filter((r) => !excluir?.(r))
    const huellas = filas.map((r) => [r.id, huella(r.original)] as const)

    const mutacionReciente = queryClient
      .getMutationCache()
      .getAll()
      .some((m) => m.state.status === "success" && Date.now() - m.state.submittedAt < VENTANA_MUTACION_MS)

    // Se eliminó algo si el total bajó o, sin total en las filas, si se fue alguna de la página anterior.
    // Entonces las filas que entran (de la página siguiente, por el corrimiento) no son nuevas: no se resaltan.
    const total = filas.length > 0 ? totalDe(filas[0].original) : 0
    const idsActuales = new Set(huellas.map(([id]) => id))
    const seFueAlguna = [...paginaAnterior.current].some((id) => !idsActuales.has(id))
    const eliminacion =
      total != null && totalAnterior.current != null ? total < totalAnterior.current : seFueAlguna

    // La primera carga solo registra: no hay contra qué comparar.
    const cambiadas =
      mutacionReciente && vistas.current.size > 0
        ? huellas
            .filter(([id, h]) => {
              const antes = vistas.current.get(id)
              if (antes === undefined) return !eliminacion
              return antes !== h
            })
            .map(([id]) => id)
        : []
    for (const [id, h] of huellas) vistas.current.set(id, h)
    paginaAnterior.current = idsActuales
    totalAnterior.current = total

    if (cambiadas.length === 0 || cambiadas.length > MAX_FILAS) return
    setResaltadas(new Set(cambiadas))
    // El temporizador vive en un ref y no en la limpieza del efecto: hay tablas que rearman `data`
    // en cada render, y la limpieza lo cancelaría dejando la fila resaltada para siempre.
    clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => setResaltadas(new Set()), RESALTADO_MS)
    // Solo cuando cambian los datos; `excluir` y `table` se leen en ese momento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  useEffect(() => () => clearTimeout(temporizador.current), [])

  return resaltadas
}
