"use no memo"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import { z } from "zod"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { SearchQueryBar } from "@/components/search/search-query-bar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FloppyDiskIcon, PencilIcon, XIcon } from "@/components/ui/icons"
import { SelectItemsDialog } from "@/components/select-items-dialog"
import { Spinner } from "@/components/ui/spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useDataTable } from "@/hooks/use-data-table"
import { Paginas, usePaginadoServidor } from "./paginado-territorial"
import { useBusquedaTerritorial } from "@/features/coverage/inscripcion-reservas/components/table/territorial-comunes"
import { getErrorMessage } from "@/lib/api-client"
import { useAppForm } from "@/lib/forms"
import { coberturaInscritosRoute } from "@/router"

import { MatriculaSelectField } from "@/features/coverage/matricula/components/forms/form-create-matricula"
import {
  useGuardarCupoContratado,
  useGuardarOferentes,
} from "@/features/coverage/inscripcion-reservas/api/mutations/territorial"
import {
  useContextoTerritorialQuery,
  useCuposContratadosQuery,
} from "@/features/coverage/inscripcion-reservas/api/query/use-territorial-query"
import type { CupoContratadoGrupo } from "@/features/coverage/inscripcion-reservas/api/types/territorial"

const num = "tabular-nums text-center block"
const wrap = "whitespace-normal"

/** Cupos contratados (3.10): por grupo, cuánto del cupo paga la entidad territorial y cuánto queda libre. */
export function CuposContratadosSeccion() {
  const search = coberturaInscritosRoute.useSearch()
  const { data: contexto } = useContextoTerritorialQuery()
  // Solo el Administrador territorial modifica el cupo contratado; el Supervisor lo consulta (3.10).
  const puedeModificar = contexto?.puedeGestionarCalendario ?? false
  const oferentes = (contexto?.establecimientos ?? []).filter((e) => e.oferente)
  const [elegirOferentes, setElegirOferentes] = useState(false)
  const { texto, setTexto, q } = useBusquedaTerritorial()
  const [abierto, setAbierto] = useState(false)
  const [establecimiento, setEstablecimiento] = useState("")
  const [borrador, setBorrador] = useState("")
  const [editar, setEditar] = useState<CupoContratadoGrupo | null>(null)

  // La búsqueda, el filtro y la página van al back: solo llega la página.
  const paginado = usePaginadoServidor(0)
  const { data, isPending, isError, error, refetch } = useCuposContratadosQuery({
    q,
    establecimientoId: establecimiento ? Number(establecimiento) : undefined,
    pageIndex: paginado.pagination.pageIndex,
    pageSize: paginado.pagination.pageSize,
  })
  const filas = data?.filas ?? []
  const total = data?.total ?? 0

  const cifra = (id: keyof CupoContratadoGrupo, label: string): ColumnDef<CupoContratadoGrupo> => ({
    id,
    header: () => <span className={`${wrap} block text-center`}>{label}</span>,
    meta: { label },
    cell: ({ row }) => <span className={num}>{row.original[id]}</span>,
  })

  const todas: ColumnDef<CupoContratadoGrupo>[] = [
    {
      id: "establecimiento",
      accessorFn: () => null,
      header: "Establecimiento",
      meta: { label: "Establecimiento" },
      cell: ({ row }) => <span className={wrap}>{row.original.establecimiento}</span>,
    },
    {
      id: "sede",
      accessorFn: () => null,
      header: "Sede",
      meta: { label: "Sede" },
      cell: ({ row }) => <span className={wrap}>{row.original.sede}</span>,
    },
    {
      id: "jornada",
      accessorFn: () => null,
      header: "Jornada",
      meta: { label: "Jornada" },
      cell: ({ row }) => row.original.jornada,
    },
    cifra("grado", "Grado"),
    cifra("grupo", "Grupo"),
    cifra("cupo", "Cupo"),
    cifra("cupoContratado", "Cupo contratado"),
    cifra("ocupadosContratados", "Ocupados contratados"),
    cifra("retenidos", "Retenidos"),
    cifra("libresContratados", "Libres contratados"),
    {
      id: "actions",
      enableHiding: false,
      size: 32 + 16,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                color="muted"
                size="icon-sm"
                aria-label={`Modificar cupo contratado de ${row.original.establecimiento} · ${row.original.grupo}`}
                onClick={() => setEditar(row.original)}
              >
                <PencilIcon />
              </Button>
            }
          />
          <TooltipContent>Modificar cupo contratado</TooltipContent>
        </Tooltip>
      ),
    },
  ]
  const columns = puedeModificar ? todas : todas.filter((c) => c.id !== "actions")

  const pageCount = Math.max(1, Math.ceil(total / paginado.pagination.pageSize))
  const { table } = useDataTable({
    ...paginado.pagination,
    columns,
    data: filas,
    pageCount,
    getRowId: (r) => String(r.id),
    columnVisibilityStorageKey: "territorial-cupos-contratados-column-visibility",
  })

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      <div className="flex items-start gap-2 px-(--screen-spacing)">
        <div className="w-full max-w-md">
          <SearchQueryBar
            id="territorial-cupos-search"
            placeholder="Establecimiento o grupo"
            value={texto}
            onValueChange={setTexto}
            onClearAll={() => {
              setTexto("")
              setEstablecimiento("")
              setAbierto(false)
            }}
            onClearFilters={() => setBorrador("")}
            activeFilterCount={(establecimiento ? 1 : 0) + (search.terrQ ? 1 : 0)}
            badgeCount={establecimiento ? 1 : 0}
            open={abierto}
            onOpenChange={(o) => {
              if (o) setBorrador(establecimiento)
              setAbierto(o)
            }}
            onApply={() => {
              setEstablecimiento(borrador)
              paginado.pagination.goToPage(0)
              setAbierto(false)
            }}
          >
            <div className="px-4">
              <MatriculaSelectField
                id="filtro-cupos-establecimiento"
                label="Establecimiento"
                placeholder="Todos"
                value={borrador}
                options={oferentes.map((e) => String(e.id))}
                labelFor={(v) => oferentes.find((e) => String(e.id) === v)?.nombre ?? v}
                onChange={setBorrador}
              />
            </div>
          </SearchQueryBar>
        </div>
        <Button
          variant="outline"
          color="neutral"
          className="ml-auto"
          onClick={() => setElegirOferentes(true)}
        >
          <PencilIcon data-icon="inline-start" />
          Oferentes
        </Button>
      </div>
      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        emptyMessage={
          q || establecimiento
            ? "Ningún grupo coincide con la búsqueda."
            : "Aún no hay establecimientos oferentes con grupos."
        }
        errorMessage={error ? getErrorMessage(error) : undefined}
      />
      <Paginas
        p={{ ...paginado, pageCount, total }}
        viewOptions={<DataTableViewOptions table={table} />}
      />
      <CupoContratadoDialog grupo={editar} onOpenChange={(o) => !o && setEditar(null)} />
      {elegirOferentes && (
        <OferentesDialog
          establecimientos={contexto?.establecimientos ?? []}
          onOpenChange={setElegirOferentes}
        />
      )}
    </div>
  )
}

/** Modificar el cupo contratado: no baja de lo ya asignado ni pasa de lo que el grupo puede dar. */
function CupoContratadoDialog({
  grupo,
  onOpenChange,
}: {
  grupo: CupoContratadoGrupo | null
  onOpenChange: (open: boolean) => void
}) {
  if (!grupo) return null
  return <CupoContratadoForm key={grupo.id} grupo={grupo} onOpenChange={onOpenChange} />
}

function CupoContratadoForm({
  grupo,
  onOpenChange,
}: {
  grupo: CupoContratadoGrupo
  onOpenChange: (open: boolean) => void
}) {
  const guardar = useGuardarCupoContratado()
  const minimo = grupo.ocupadosContratados + grupo.retenidos
  // Lo que el grupo puede dar: su cupo menos las reservas y matrículas propias del establecimiento.
  const propias = grupo.propias ?? 0
  const maximo = Math.max(grupo.cupo - propias, 0)
  const schema = z.object({
    cupoContratado: z
      .number({ error: "El cupo contratado es obligatorio." })
      .int("El cupo contratado es un número entero.")
      .min(
        minimo,
        `El cupo contratado no puede ser menor que los ${minimo} ya asignados (ocupados y retenidos).`,
      )
      .max(
        maximo,
        `El cupo contratado no puede superar ${maximo}: el grupo tiene ${grupo.cupo} cupos y ${propias} reservas o matrículas propias.`,
      ),
  })
  const form = useAppForm({
    defaultValues: { cupoContratado: grupo.cupoContratado },
    validators: { onSubmit: schema },
    onSubmit: ({ value }) =>
      guardar.mutateAsync(
        { grupoId: grupo.id, cupoContratado: value.cupoContratado },
        {
          onSuccess: () => {
            toast.success(
              `Se guardó el cupo contratado de ${grupo.establecimiento} · ${grupo.grupo}.`,
            )
            onOpenChange(false)
          },
        },
      ),
  })
  const ayuda = `Cupo del grupo: ${grupo.cupo}. Reservas o matrículas propias: ${propias}. Ocupados contratados: ${grupo.ocupadosContratados}.${
    grupo.retenidos ? ` Retenidos: ${grupo.retenidos}.` : ""
  }`

  return (
    <Dialog open onOpenChange={(o) => !guardar.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Cupo contratado — {grupo.establecimiento} · {grupo.grupo}
          </DialogTitle>
          <DialogDescription className="sr-only">{ayuda}</DialogDescription>
        </DialogHeader>
        <form
          id="cupo-contratado-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <form.AppField name="cupoContratado">
            {(f) => (
              <f.NumberField
                label="Cupo contratado"
                required
                valueAs="number"
                maxDigits={3}
                description={ayuda}
              />
            )}
          </form.AppField>
        </form>
        <DialogFooter>
          <Button
            variant="outline"
            color="neutral"
            disabled={guardar.isPending}
            onClick={() => onOpenChange(false)}
          >
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button type="submit" form="cupo-contratado-form" disabled={guardar.isPending}>
            {guardar.isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <FloppyDiskIcon data-icon="inline-start" />
            )}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Oferentes de cupo contratado (Regla 76): solo establecimientos del sector No oficial. Quitar a uno
 * con cupo contratado definido lo rechaza el back.
 */
function OferentesDialog({
  establecimientos,
  onOpenChange,
}: {
  establecimientos: { id: number; nombre: string; oferente?: boolean; noOficial?: boolean }[]
  onOpenChange: (open: boolean) => void
}) {
  const guardar = useGuardarOferentes()
  const candidatos = establecimientos.filter((e) => e.noOficial || e.oferente)
  const [elegidos, setElegidos] = useState(() =>
    candidatos.filter((e) => e.oferente).map((e) => e.id),
  )
  return (
    <Dialog open onOpenChange={(o) => !guardar.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Oferentes de cupo contratado</DialogTitle>
          <DialogDescription>
            Solo los establecimientos del sector No oficial pueden ser oferentes.
          </DialogDescription>
        </DialogHeader>
        <SelectItemsDialog
          id="oferentes-establecimientos"
          items={candidatos.map((e) => ({ id: e.id, label: e.nombre }))}
          value={elegidos}
          onChange={setElegidos}
          placeholder="Establecimientos oferentes"
          dialogTitle="Seleccionar establecimientos oferentes"
          searchPlaceholder="Buscar establecimiento..."
          emptyMessage="No hay establecimientos del sector No oficial en su alcance."
          selectedCountLabel={(n) =>
            n === 1 ? "1 establecimiento oferente" : `${n} establecimientos oferentes`
          }
        />
        <DialogFooter>
          <Button
            variant="outline"
            color="neutral"
            disabled={guardar.isPending}
            onClick={() => onOpenChange(false)}
          >
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button
            disabled={guardar.isPending}
            onClick={() =>
              guardar.mutate(elegidos, {
                onSuccess: () => {
                  toast.success("Se guardaron los establecimientos oferentes.")
                  onOpenChange(false)
                },
              })
            }
          >
            {guardar.isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <FloppyDiskIcon data-icon="inline-start" />
            )}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
