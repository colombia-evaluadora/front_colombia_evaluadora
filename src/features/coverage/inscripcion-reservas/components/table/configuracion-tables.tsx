"use no memo"

import { useState, type ReactNode } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { format, parseISO } from "date-fns"
import { toast } from "sonner"

import { DataTable } from "@/components/data-table"
import { TableScreen, TableScreenBody, TableScreenHeader } from "@/components/layout/table-screen"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CopyIcon, GearIcon } from "@/components/ui/icons"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { paths } from "@/config/paths"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { coberturaInscritosRoute } from "@/router"

import {
  nombreGrupo,
  nombrePeriodo,
  useGruposAdmisionConfigQuery,
  usePeriodosConfigQuery,
} from "@/features/coverage/inscripcion-reservas/api/query/use-configuracion-query"
import type {
  GrupoAdmisionConfig,
  PeriodoInscripcionConfig,
} from "@/features/coverage/inscripcion-reservas/api/types/configuracion"
import { CopiarConfigPeriodoDialog } from "@/features/coverage/inscripcion-reservas/components/dialogs/dialog-copiar-config-periodo"
import { Marca } from "@/features/coverage/inscripcion-reservas/components/table/columns-inscripciones"

const fecha = (iso: string | null) => (iso ? format(parseISO(iso), "dd/MM/yyyy") : "—")
const MODO = { MANUAL: "Manual", AUTOMATICA: "Automática" } as const
const wrap = "whitespace-normal"

/** Pestaña Configuración (Sección 3.7): grupos de admisión y períodos. */
export function ConfiguracionTab({ encabezado }: { encabezado: ReactNode }) {
  const { conf = "grupos" } = coberturaInscritosRoute.useSearch()
  const navigate = coberturaInscritosRoute.useNavigate()

  return (
    <TableScreen>
      <TableScreenHeader>
        {encabezado}
        <div className="px-(--screen-spacing) pt-4">
          <Tabs
            value={conf}
            onValueChange={(value) =>
              navigate({
                search: (prev) => ({ ...prev, conf: value === "grupos" ? undefined : "periodos" }),
              })
            }
          >
            <TabsList>
              <TabsTrigger value="grupos">Grupos de admisión</TabsTrigger>
              <TabsTrigger value="periodos">Períodos académicos</TabsTrigger>
            </TabsList>
          </Tabs>
          <p className="pt-4 text-sm text-muted-foreground">
            {conf === "grupos"
              ? "Un grupo por año, modalidad y ciclo, con sus períodos en Inscripciones: se crean solos. Aquí se configura la admisión: cierre, modo, criterios y sorteo."
              : "Uno por sede y jornada: se crea solo con el período. Aquí se define cuándo se liberan las reservas y cómo se aceptan los traslados."}
          </p>
        </div>
      </TableScreenHeader>
      <TableScreenBody>{conf === "grupos" ? <GruposTable /> : <PeriodosTable />}</TableScreenBody>
    </TableScreen>
  )
}

function Acciones({
  etiqueta,
  onModificar,
  onCopiar = () => toast.info("Copiar configuración: próximamente."),
}: {
  etiqueta: string
  onModificar: () => void
  onCopiar?: () => void
}) {
  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              color="muted"
              size="icon-sm"
              aria-label={`Modificar — ${etiqueta}`}
              onClick={onModificar}
            >
              <GearIcon />
            </Button>
          }
        />
        <TooltipContent>Modificar</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              color="muted"
              size="icon-sm"
              aria-label={`Copiar configuración — ${etiqueta}`}
              onClick={onCopiar}
            >
              <CopyIcon />
            </Button>
          }
        />
        <TooltipContent>Copiar configuración</TooltipContent>
      </Tooltip>
    </>
  )
}

const ACTIONS = {
  id: "actions",
  enableHiding: false,
  enableSorting: false,
  size: 2 * 32 + 4 + 16,
} as const

function GruposTable() {
  const navigate = coberturaInscritosRoute.useNavigate()
  const { data = [], isPending, isError, error, refetch } = useGruposAdmisionConfigQuery()

  const columns: ColumnDef<GrupoAdmisionConfig>[] = [
    {
      id: "grupo",
      header: "Grupo de admisión",
      cell: ({ row }) => <span className={wrap}>{nombreGrupo(row.original)}</span>,
    },
    {
      id: "periodos",
      header: "Períodos del grupo",
      cell: ({ row }) => <span className={wrap}>{row.original.periodos.join(", ")}</span>,
    },
    {
      id: "cierre",
      header: "Fecha de cierre de inscripción",
      cell: ({ row }) =>
        row.original.fechaCierre ? (
          <Badge variant="outline" color="neutral" className="font-normal tabular-nums">
            {fecha(row.original.fechaCierre)}
          </Badge>
        ) : (
          "—"
        ),
    },
    {
      id: "limite",
      header: "Menor fecha límite de matrícula",
      cell: ({ row }) => (
        <span className="tabular-nums">{fecha(row.original.menorFechaLimiteMatricula)}</span>
      ),
    },
    { id: "modo", header: "Modo de admisión", cell: ({ row }) => MODO[row.original.modoAdmision] },
    {
      id: "estado",
      header: "Estado",
      cell: ({ row }) =>
        row.original.configurado ? (
          <Marca label="Configurado" color="success" punto />
        ) : (
          <Marca label="Por configurar" color="orange" punto />
        ),
    },
    {
      ...ACTIONS,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => (
        <Acciones
          etiqueta={nombreGrupo(row.original)}
          onModificar={() =>
            navigate({ to: paths.app.coberturaConfigGrupo.getHref(row.original.id) })
          }
        />
      ),
    },
  ]

  const pagination = useTablePagination()
  // Pocas filas (una por grupo o período): sin paginar.
  const { table } = useDataTable({
    ...pagination,
    columns,
    data,
    pageCount: 1,
    getRowId: (r) => r.id,
  })
  return (
    <DataTable
      table={table}
      isPending={isPending}
      isError={isError}
      onRetry={refetch}
      emptyMessage="Aún no hay grupos de admisión. Se crean solos al habilitar Inscripciones en un período académico."
      errorMessage={error ? getErrorMessage(error) : undefined}
    />
  )
}

function PeriodosTable() {
  const navigate = coberturaInscritosRoute.useNavigate()
  const { data = [], isPending, isError, error, refetch } = usePeriodosConfigQuery()
  const [copiarDe, setCopiarDe] = useState<PeriodoInscripcionConfig | null>(null)

  const columns: ColumnDef<PeriodoInscripcionConfig>[] = [
    {
      id: "periodo",
      header: "Período Académico",
      cell: ({ row }) => <span className={wrap}>{nombrePeriodo(row.original)}</span>,
    },
    {
      id: "grupo",
      header: "Grupo de admisión",
      cell: ({ row }) => <span className={wrap}>{row.original.grupoAdmision}</span>,
    },
    {
      id: "liberacion",
      header: "Fecha de liberación de reservas",
      cell: ({ row }) => (
        <span className="tabular-nums">{fecha(row.original.fechaLiberacionReservas)}</span>
      ),
    },
    {
      id: "traslados",
      header: "Modo de aceptación de traslados",
      cell: ({ row }) => MODO[row.original.modoTraslado],
    },
    {
      id: "plazo",
      header: "Plazo de respuesta del traslado",
      cell: ({ row }) => `${row.original.plazoRespuestaTraslado} días`,
    },
    {
      id: "confirmacion",
      header: "Requiere confirmación del acudiente",
      cell: ({ row }) => (row.original.requiereConfirmacionAcudiente ? "Sí" : "No"),
    },
    {
      ...ACTIONS,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => (
        <Acciones
          etiqueta={nombrePeriodo(row.original)}
          onModificar={() =>
            navigate({ to: paths.app.coberturaConfigPeriodo.getHref(row.original.id) })
          }
          onCopiar={() => setCopiarDe(row.original)}
        />
      ),
    },
  ]

  const pagination = useTablePagination()
  // Pocas filas (una por grupo o período): sin paginar.
  const { table } = useDataTable({
    ...pagination,
    columns,
    data,
    pageCount: 1,
    getRowId: (r) => r.id,
  })
  return (
    <>
      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        emptyMessage="Aún no hay períodos con Inscripciones habilitadas."
        errorMessage={error ? getErrorMessage(error) : undefined}
      />
      <CopiarConfigPeriodoDialog
        origen={copiarDe}
        periodos={data}
        onOpenChange={(o) => !o && setCopiarDe(null)}
      />
    </>
  )
}
