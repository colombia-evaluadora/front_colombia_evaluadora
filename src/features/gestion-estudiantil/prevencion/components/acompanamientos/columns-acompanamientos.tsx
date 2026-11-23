import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { columnaOrden } from "@/features/gestion-estudiantil/commons/components/encabezado-orden"
import type { MapaOrden } from "@/features/gestion-estudiantil/commons/utils/orden-servidor"
import { abreviarPersona, formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { anchoAccionesFila } from "@/features/gestion-estudiantil/commons/utils/acciones-fila"
import type { AcompanamientoRow, ReporteConsumoRow, TipoAcompanamiento } from "@/features/gestion-estudiantil/prevencion/api/types"
import {
  ACCIONES_ACOMPANAMIENTO,
  ACCIONES_REPORTE_CONSUMO,
  type AccionAcomp,
  type AccionReporteConsumo,
} from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/acciones-acompanamiento"
import {
  MenuAccionesAcomp,
  MenuAccionesReporteConsumo,
} from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/menu-acciones-acompanamiento"
import {
  BadgeEstadoAcomp,
  BadgeEstadoMatricula,
  BadgeEstadoReporteConsumo,
} from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/badges-acompanamiento"

/** Columnas que el backend ordena (`QUERY.ORDEN`): id de columna → valor de ORDEN. */
export const ORDEN_ACOMPANAMIENTOS: MapaOrden = {
  estudiante: "estudiante",
  responsable: "responsable",
  estado: "estado",
}
export const ORDEN_REPORTES_CONSUMO: MapaOrden = {
  fecha: "fecha",
  estudiante: "estudiante",
  estado: "estado",
}

// Todas las columnas (menos Acciones) llevan accessorKey/accessorFn y `meta.label`: así «Columnas visibles» las lista.
// `columna` es la que no se ordena; las ordenables nacen de su tabla (`columnaAcomp`, `columnaReporte`).
const columna = <T,>(id: string, titulo: string) => columnaOrden<T>({}, id, titulo)
const columnaAcomp = (id: string, titulo: string) => columnaOrden<AcompanamientoRow>(ORDEN_ACOMPANAMIENTOS, id, titulo)
const columnaReporte = (id: string, titulo: string) => columnaOrden<ReporteConsumoRow>(ORDEN_REPORTES_CONSUMO, id, titulo)

type ConContexto = Pick<AcompanamientoRow, "sede_nombre" | "jornada_nombre" | "grado_grupo">

const contexto = (f: ConContexto) => [f.sede_nombre, f.jornada_nombre, f.grado_grupo].filter(Boolean).join(" · ")

function celdaContexto(f: ConContexto & { estado_matricula_nombre?: string | null }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <span>{contexto(f)}</span>
      {f.estado_matricula_nombre !== undefined && <BadgeEstadoMatricula nombre={f.estado_matricula_nombre} />}
    </div>
  )
}

const columnasContexto = <T extends ConContexto>(): ColumnDef<T>[] => [
  { ...columna("sede", "Sede"), accessorKey: "sede_nombre" },
  { ...columna("jornada", "Jornada"), accessorFn: (f) => f.jornada_nombre ?? "—" },
]

interface ColumnasAcompOpciones {
  tipo: TipoAcompanamiento
  onAccion: (fila: AcompanamientoRow, accion: AccionAcomp) => void
}

/**
 * Columnas de Embarazo (G.8.EMB.1) y Consumo (G.8.CON.1): Estudiante · Contexto · Situación (solo embarazo) ·
 * Responsable · Estado · Próxima acción. Sede y Jornada van aparte y ocultas; en consumo, Sustancia también.
 */
export function buildColumnsAcompanamientos({ tipo, onAccion }: ColumnasAcompOpciones): ColumnDef<AcompanamientoRow>[] {
  const detalle: ColumnDef<AcompanamientoRow> =
    tipo === "EMBARAZO"
      ? { ...columna("situacion", "Situación"), accessorFn: (f) => f.situacion_nombre ?? "—" }
      : { ...columna("sustancia", "Sustancia"), accessorFn: (f) => f.sustancia_nombre ?? "—" }

  return [
    {
      ...columnaAcomp("estudiante", "Estudiante"),
      accessorKey: "estudiante_nombre",
      cell: ({ row }) => (
        <Button variant="link" size="sm" onClick={() => onAccion(row.original, "ver")}>
          {row.original.estudiante_nombre}
        </Button>
      ),
    },
    {
      ...columna("contexto", "Contexto"),
      accessorFn: contexto,
      cell: ({ row }) => celdaContexto(row.original),
    },
    ...columnasContexto<AcompanamientoRow>(),
    detalle,
    {
      ...columnaAcomp("responsable", "Responsable"),
      accessorFn: (f) => abreviarPersona(f.responsable_nombre),
    },
    {
      ...columnaAcomp("estado", "Estado"),
      accessorKey: "estado_nombre",
      cell: ({ row }) => <BadgeEstadoAcomp estado={row.original.estado} nombre={row.original.estado_nombre} />,
    },
    {
      ...columna("proxima", "Próxima acción"),
      accessorFn: (f) => (f.proxima_fecha ? `${f.proxima_tipo_nombre ?? ""} ${formatFecha(f.proxima_fecha)}` : "—"),
      cell: ({ row }) => {
        const f = row.original
        if (!f.proxima_fecha) return "—"
        return (
          <div className="flex flex-col gap-1">
            <span>{f.proxima_tipo_nombre}</span>
            <span className="flex items-center gap-2 text-muted-foreground">
              {formatFecha(f.proxima_fecha)}
              {f.proxima_vencida && (
                <Badge variant="soft" color="destructive">
                  <span>Vencida</span>
                </Badge>
              )}
            </span>
          </div>
        )
      },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      size: anchoAccionesFila(ACCIONES_ACOMPANAMIENTO),
      cell: ({ row }) => <MenuAccionesAcomp fila={row.original} onAccion={(accion) => onAccion(row.original, accion)} />,
    },
  ]
}

/** Columnas de Reportes recibidos (§9.10): Fecha · Estudiante · Contexto · Quién reporta · Estado. */
export function buildColumnsReportesConsumo(
  onAccion: (fila: ReporteConsumoRow, accion: AccionReporteConsumo) => void,
): ColumnDef<ReporteConsumoRow>[] {
  return [
    {
      ...columnaReporte("fecha", "Fecha"),
      accessorKey: "fecha_conocimiento",
      cell: ({ row }) => formatFecha(row.original.fecha_conocimiento),
    },
    {
      ...columnaReporte("estudiante", "Estudiante"),
      accessorKey: "estudiante_nombre",
      cell: ({ row }) => (
        <Button variant="link" size="sm" onClick={() => onAccion(row.original, "ver")}>
          {row.original.estudiante_nombre}
        </Button>
      ),
    },
    {
      ...columna("contexto", "Contexto"),
      accessorFn: contexto,
      cell: ({ row }) => celdaContexto(row.original),
    },
    ...columnasContexto<ReporteConsumoRow>(),
    {
      ...columna("reporta", "Quién reporta"),
      accessorFn: (f) => abreviarPersona(f.reportado_por) || "—",
    },
    {
      ...columnaReporte("estado", "Estado"),
      accessorKey: "estado_nombre",
      cell: ({ row }) => <BadgeEstadoReporteConsumo estado={row.original.estado} nombre={row.original.estado_nombre} />,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      size: anchoAccionesFila(ACCIONES_REPORTE_CONSUMO),
      cell: ({ row }) => (
        <MenuAccionesReporteConsumo fila={row.original} onAccion={(accion) => onAccion(row.original, accion)} />
      ),
    },
  ]
}
