import type { ColumnDef } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { DataTableColumnHeader } from "@/components/data-table"
import { PencilIcon } from "@/components/ui/icons"
import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { useOnlineOnly } from "@/lib/offline/use-online-only"
import { useDeleteCriterioUnidad } from "@/features/planeador/api/mutations/delete-criterio-unidad"

import type { CriterioUnidad } from "@/features/planeador/api/types/unidad-tematica"
import { NIVELES_DESEMPENO_DEFAULT_NOMBRES } from "@/features/planeador/api/query/use-niveles-desempeno"
import { NivelTexto } from "@/features/planeador/components/table/criterio-nivel-texto"

/**
 * Columnas de la rúbrica de una unidad: el criterio y su descripción en
 * cada nivel de desempeño — TANTAS columnas de nivel como bandas tenga la
 * escala de valoración configurada, no un número fijo (antes eran siempre
 * 4: Bajo/Básico/Alto/Superior).
 *
 * `nombresNiveles` es esa lista de nombres — el caller (`Rubricas` en
 * `unidad-detalle-panel.tsx`) le pasa los nombres reales de la escala de
 * valoración de la unidad (`useUnidadValoracionesQuery`, `GET /planeador/
 * unidades/:id/valoraciones`) — MISMA query que ya usa
 * `DialogAgregarCriterio`, para que la tabla y el modal de alta no queden
 * con nombres ni cantidad de niveles distinta para lo mismo. Cae a
 * `NIVELES_DESEMPENO_DEFAULT_NOMBRES` (4 bandas fijas) solo mientras esa
 * query no resolvió todavía. Cada columna de nivel lee
 * `criterio.niveles[index]` posicionalmente: el índice `i` de
 * `nombresNiveles` es el mismo nivel (banda) en toda la unidad.
 *
 * Sin columna `select`: la tabla vive dentro del panel de detalle y no tiene
 * operaciones en lote que justifiquen los checkboxes. La columna `actions`
 * (la que `DataTable` reconoce por id para el overlay al pasar el puntero)
 * edita y elimina el criterio.
 *
 * QA 71: antes esos botones estaban cableados `disabled` y nadie, ni el
 * autor, podía editar o eliminar un criterio. Regla 27: cada docente (dueño
 * de la unidad o colega) gestiona SOLO los criterios que creó; los
 * directivos, todos. Eso lo decide el backend por fila
 * (`CriterioUnidad.puedeGestionar`); acá solo se combina con el permiso del
 * menú (`acciones.puedeEditar/puedeEliminar`).
 */
export interface UnidadCriteriosAcciones {
  unidadId: number
  puedeEditar: boolean
  puedeEliminar: boolean
  onEdit: (criterio: CriterioUnidad) => void
}

/** Motivo por el que el criterio no se gestiona, o `null` si se puede. */
function motivoBloqueo(criterio: CriterioUnidad, permitido: boolean, accion: string): string | null {
  if (!permitido) return `No tiene permiso para ${accion} criterios.`
  if (criterio.puedeGestionar === false) {
    return criterio.autor
      ? `Lo creó ${criterio.autor}: solo su autor puede ${accion}lo.`
      : `Solo el autor del criterio puede ${accion}lo.`
  }
  return null
}

function AccionesCriterio({ criterio, acciones }: { criterio: CriterioUnidad; acciones: UnidadCriteriosAcciones }) {
  const { notify } = useNotify()
  const soloEnLinea = useOnlineOnly()
  const eliminar = useDeleteCriterioUnidad()
  const bloqueoEditar = motivoBloqueo(criterio, acciones.puedeEditar, "editar")
  const bloqueoEliminar = motivoBloqueo(criterio, acciones.puedeEliminar, "eliminar")

  async function confirmarEliminar() {
    try {
      await eliminar.mutateAsync({ unidadId: acciones.unidadId, criterioId: criterio.id })
      notify(SUCCESS_MESSAGES.criterioUnidad.deleted)
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              color="neutral"
              size="icon-sm"
              disabled={Boolean(bloqueoEditar) || soloEnLinea.disabled}
              aria-label="Editar criterio"
              onClick={() => acciones.onEdit(criterio)}
            />
          }
        >
          <PencilIcon />
        </TooltipTrigger>
        <TooltipContent>{bloqueoEditar ?? soloEnLinea.tooltip ?? "Editar criterio"}</TooltipContent>
      </Tooltip>
      <Tooltip>
        {/* El trigger del tooltip envuelve un span: un botón disabled no
            dispara eventos de puntero y el motivo no se vería. */}
        <TooltipTrigger render={<span />}>
          <ConfirmRemoveButton
            label="Eliminar criterio"
            title="Eliminar criterio"
            description={<>¿Eliminar el criterio &ldquo;{criterio.nombre}&rdquo; de la rúbrica?</>}
            disabled={Boolean(bloqueoEliminar) || soloEnLinea.disabled}
            onConfirm={confirmarEliminar}
          />
        </TooltipTrigger>
        <TooltipContent>{bloqueoEliminar ?? soloEnLinea.tooltip ?? "Eliminar criterio"}</TooltipContent>
      </Tooltip>
    </div>
  )
}

export function createUnidadCriteriosColumns(
  nombresNiveles: string[],
  acciones?: UnidadCriteriosAcciones,
): ColumnDef<CriterioUnidad>[] {
  const niveles = nombresNiveles.length > 0 ? nombresNiveles : NIVELES_DESEMPENO_DEFAULT_NOMBRES
  return [
    {
      id: "nombre",
      accessorKey: "nombre",
      meta: { label: "Criterio" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Criterio" />,
      cell: ({ row }) => (
        <span className="block max-w-[12rem] font-semibold whitespace-normal">
          {row.original.nombre}
        </span>
      ),
    },
    ...niveles.map(
      (nombreNivel, index): ColumnDef<CriterioUnidad> => ({
        id: `nivel-${index}`,
        accessorFn: (row) => row.niveles[index]?.descripcion ?? "",
        meta: { label: nombreNivel },
        header: ({ column }) => <DataTableColumnHeader column={column} title={nombreNivel} />,
        cell: ({ row }) => <NivelTexto>{row.original.niveles[index]?.descripcion}</NivelTexto>,
      }),
    ),
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) =>
        acciones ? <AccionesCriterio criterio={row.original} acciones={acciones} /> : null,
      enableSorting: false,
      enableHiding: false,
      size: 96,
    },
  ]
}
