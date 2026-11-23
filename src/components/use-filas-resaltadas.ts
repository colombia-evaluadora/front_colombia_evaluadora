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

function huella(original: unknown) {
  try {
    return JSON.stringify(original)
  } catch {
    return ""
  }
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
 * Una fila eliminada no se puede resaltar (ya no está); lo confirma el aviso de la pantalla.
 */
export function useFilasResaltadas(table: Table<any>, excluir?: (row: Row<any>) => boolean) {
  const queryClient = useQueryClient()
  const vistas = useRef(new Map<string, string>())
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

    // La primera carga solo registra: no hay contra qué comparar.
    const cambiadas =
      mutacionReciente && vistas.current.size > 0
        ? huellas.filter(([id, h]) => vistas.current.get(id) !== h).map(([id]) => id)
        : []
    for (const [id, h] of huellas) vistas.current.set(id, h)

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
