import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import {
  BrainIcon,
  WarningCircleIcon,
  EyeIcon,
  GavelIcon,
  PencilIcon,
  PersonIcon,
  ProhibitIcon,
} from "@/components/ui/icons"

import { columnaOrden } from "@/features/gestion-estudiantil/commons/components/encabezado-orden"
import type { MapaOrden } from "@/features/gestion-estudiantil/commons/utils/orden-servidor"
import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import { anchoAccionesFila } from "@/features/gestion-estudiantil/commons/utils/acciones-fila"
import { colorDeTipo } from "@/features/gestion-estudiantil/observador/api/ui-mappings"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { AnotacionRow } from "@/features/gestion-estudiantil/observador/api/types"

/** Columnas que el backend ordena (`BODY.ORDEN`): id de columna → valor de ORDEN. */
export const ORDEN_ANOTACIONES: MapaOrden = {
  fecha: "fecha",
  estudiante: "estudiante",
  grupo: "grupo",
  tipo: "tipo",
  codigo: "codigo",
  responsable: "responsable",
}

/** Ver, Modificar, Anular, Reportar salud mental, Remitir y Abrir proceso disciplinario (orden de la guía de diseño). */
const ACCIONES_ANOTACION = 7

interface ColumnasOpciones {
  onVer: (row: AnotacionRow) => void
  onModificar: (row: AnotacionRow) => void
  onAnular: (row: AnotacionRow) => void
  /** Anular también exige la capacidad de la página; la fila trae su propio `puede_anular`. */
  puedeAnular: boolean
  puedeRemitir: boolean
  puedeReportarSaludMental: boolean
  onAbrirProceso: (row: AnotacionRow) => void
  onRemitir: (row: AnotacionRow) => void
  /** Sección 9.6: abre el reporte de Prevención con el estudiante de la fila. */
  onReportarSaludMental: (row: AnotacionRow) => void
  /** Reportar posible consumo (G.1.REP.4): misma población que el reporte de salud mental (docente con carga). */
  onReportarConsumo: (row: AnotacionRow) => void
}

export function buildColumnsAnotaciones({
  onVer,
  onModificar,
  onAnular,
  puedeAnular,
  puedeRemitir,
  puedeReportarSaludMental,
  onAbrirProceso,
  onRemitir,
  onReportarSaludMental,
  onReportarConsumo,
}: ColumnasOpciones): ColumnDef<AnotacionRow>[] {
  return [
    {
      ...columnaOrden<AnotacionRow>(ORDEN_ANOTACIONES, "fecha", "Fecha"),
      accessorKey: "fecha",
      cell: ({ row }) => formatFecha(row.original.fecha),
    },
    {
      ...columnaOrden<AnotacionRow>(ORDEN_ANOTACIONES, "estudiante", "Estudiante"),
      accessorKey: "estudiante_nombre",
      cell: ({ row }) => (
<span className="font-medium">{row.original.estudiante_nombre}</span>
      ),
    },
    {
      ...columnaOrden<AnotacionRow>(ORDEN_ANOTACIONES, "grupo", "Grado/Grupo"),
      accessorKey: "grado_grupo",
    },
    {
      ...columnaOrden<AnotacionRow>(ORDEN_ANOTACIONES, "tipo", "Tipo"),
      accessorKey: "tipo_nombre",
      cell: ({ row }) => (
        <Badge variant="soft" color={colorDeTipo(row.original.tipo_codigo)}>
          {row.original.tipo_nombre}
        </Badge>
      ),
    },
    {
      ...columnaOrden<AnotacionRow>(ORDEN_ANOTACIONES, "codigo", "Código y descripción"),
      accessorKey: "codigo",
      cell: ({ row }) => (
        // `min-w-64`: la columna ya no absorbe el sobrante de la tabla, y sin un mínimo cortaba
        // en la primera palabra posible. Código y descripción van en una línea; solo una descripción
        // larga pasa a la siguiente (hasta `max-w-md`). El código y el «·» no se separan.
        <span className="flex max-w-md min-w-64 flex-col gap-0.5 whitespace-normal">
          <span>
            <span className="whitespace-nowrap">
              <span className="font-semibold">{row.original.codigo}</span> ·
            </span>{" "}
            {row.original.descripcion}
          </span>
          {row.original.situacion_nombre && (
            <span className="text-xs text-muted-foreground">Situación {row.original.situacion_nombre}</span>
          )}
        </span>
      ),
    },
    {
      ...columnaOrden<AnotacionRow>(ORDEN_ANOTACIONES, "responsable", "Responsable de enseñanza"),
      accessorKey: "responsable_nombre",
    },
    {
      ...columnaOrden<AnotacionRow>(ORDEN_ANOTACIONES, "estado", "Estado"),
      accessorKey: "anulada",
      // Solo cuando aplica: una anotación vigente no lleva estado (G.1.LIS.1).
      cell: ({ row }) =>
        row.original.anulada ? (
          <Badge variant="soft" color="muted">
            Anulada
          </Badge>
        ) : null,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      size: anchoAccionesFila(ACCIONES_ANOTACION),
      cell: ({ row }) => {
        const a = row.original
        const vigente = !a.anulada
        // Las acciones se ven siempre; se deshabilitan si no aplican (cada fila trae sus `puede_*`).
        return (
          <AccionesFila
            etiqueta={`Acciones de la anotación de ${a.estudiante_nombre}`}
            acciones={[
              { id: "ver", label: "Ver detalle", icon: <EyeIcon />, onSelect: () => onVer(a) },
              {
                id: "modificar",
                label: "Modificar",
                icon: <PencilIcon />,
                disabled: !(vigente && a.puede_modificar),
                onSelect: () => onModificar(a),
              },
              { id: "anular", label: "Anular", icon: <ProhibitIcon />, disabled: !(puedeAnular && vigente && a.puede_anular), onSelect: () => onAnular(a) },
              // Salud mental abre el reporte de Prevención (§9.6; el backend decide el alcance). Proceso disciplinario:
              // solo en una anotación Negativa vigente (G.1.LIS.3); abre el formulario con el estudiante y la anotación.
              { id: "salud", label: "Reportar salud mental", icon: <BrainIcon />, disabled: !puedeReportarSaludMental, onSelect: () => onReportarSaludMental(a) },
              {
                id: "consumo",
                label: "Reportar posible consumo",
                icon: <WarningCircleIcon />,
                disabled: !puedeReportarSaludMental,
                onSelect: () => onReportarConsumo(a),
              },
              { id: "remitir", label: "Remitir a orientación", icon: <PersonIcon />, disabled: !puedeRemitir, onSelect: () => onRemitir(a) },
              {
                id: "disciplinario",
                label: a.fk_tproceso_disciplinario != null ? "Ver proceso disciplinario" : "Abrir proceso disciplinario",
                icon: <GavelIcon />,
                disabled: !(a.fk_tproceso_disciplinario != null || (vigente && a.puede_abrir_proceso)),
                onSelect: () => onAbrirProceso(a),
              },
            ]}
          />
        )
      },
    },
  ]
}
