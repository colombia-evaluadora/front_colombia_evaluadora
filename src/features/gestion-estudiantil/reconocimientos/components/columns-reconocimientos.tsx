import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"

import { columnaOrden } from "@/features/gestion-estudiantil/commons/components/encabezado-orden"
import type { MapaOrden } from "@/features/gestion-estudiantil/commons/utils/orden-servidor"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { abreviarPersona } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { ReconocimientoRow } from "@/features/gestion-estudiantil/reconocimientos/api/types"
import { accionesReconocimiento } from "@/features/gestion-estudiantil/reconocimientos/api/ui-mappings"
import { anchoAccionesFila } from "@/features/gestion-estudiantil/commons/utils/acciones-fila"
import { ACCIONES_RECONOCIMIENTO, MenuAccionesReconocimiento, type AccionReconocimiento } from "@/features/gestion-estudiantil/reconocimientos/components/menu-acciones-reconocimiento"

interface ColumnasOpciones {
  onAccion: (reconocimiento: ReconocimientoRow, accion: AccionReconocimiento) => void
}

/** Columnas que el backend ordena (`QUERY.ORDEN`/`BODY.ORDEN`): id de columna → valor de ORDEN. */
export const ORDEN_RECONOCIMIENTOS: MapaOrden = {
  fecha: "fecha",
  estudiante: "estudiante",
  grado_grupo: "grupo",
  tipo: "tipo",
  otorgado_por: "otorgado",
}

const columna = (id: string, titulo: string) => columnaOrden<ReconocimientoRow>(ORDEN_RECONOCIMIENTOS, id, titulo)

/** Columnas del listado de reconocimientos (G.6.LIS.1). Sede y Jornada ocultas de entrada. */
export function buildColumnsReconocimientos({ onAccion }: ColumnasOpciones): ColumnDef<ReconocimientoRow>[] {
  return [
    {
      ...columna("fecha", "Fecha"),
      accessorKey: "fecha",
      cell: ({ row }) => formatFecha(row.original.fecha),
    },
    {
      ...columna("estudiante", "Estudiante"),
      accessorKey: "estudiante_nombre",
      cell: ({ row }) => (
        <span className="flex flex-wrap items-center gap-2">
          <span>{row.original.estudiante_nombre}</span>
          {row.original.anulado && (
            <Badge variant="soft" color="muted">
              <span>Anulado</span>
            </Badge>
          )}
        </span>
      ),
    },
    { ...columna("grado_grupo", "Grado/Grupo"), accessorKey: "grado_grupo" },
    { ...columna("tipo", "Tipo"), accessorKey: "tipo_nombre" },
    { ...columna("sede", "Sede"), accessorKey: "sede_nombre" },
    { ...columna("jornada", "Jornada"), accessorKey: "jornada_nombre" },
    { ...columna("motivo", "Motivo"), accessorKey: "motivo" },
    {
      ...columna("otorgado_por", "Otorgado por"),
      accessorKey: "otorgado_por",
      cell: ({ row }) => abreviarPersona(row.original.otorgado_por) || "—",
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      size: anchoAccionesFila(ACCIONES_RECONOCIMIENTO),
      cell: ({ row }) => (
        <MenuAccionesReconocimiento
          estudiante={row.original.estudiante_nombre}
          acciones={accionesReconocimiento(row.original)}
          onAccion={(accion) => onAccion(row.original, accion)}
        />
      ),
    },
  ]
}
