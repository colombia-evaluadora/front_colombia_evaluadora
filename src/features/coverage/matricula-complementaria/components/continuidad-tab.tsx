"use no memo"

import { useState, type ReactNode } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, DataTableColumnHeader, DataTableViewOptions } from "@/components/data-table"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { Pagination } from "@/components/pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldLabel } from "@/components/ui/field"
import { DotsThreeVerticalIcon, EyeIcon, SpinnerIcon, UsersIcon, XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Buscador } from "@/features/coverage/matricula-complementaria/components/buscador"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { coberturaComplementariaRoute } from "@/router"

import {
  useAsignarGrupoContinuidad,
  useContinuidadQuery,
  useGruposContinuidadQuery,
} from "@/features/coverage/matricula-complementaria/api/continuidad"
import type { Continuidad, EstadoContinuidad } from "@/features/coverage/matricula-complementaria/api/types"
import {
  ESTADO_CONTINUIDAD,
  Marca,
  MOTIVO_SIN_CONTINUIDAD,
} from "@/features/coverage/matricula-complementaria/api/ui-mappings"
import { MENU_COMPLEMENTARIA } from "@/features/coverage/matricula-complementaria/components/convocatorias-tab"
import { CampoSelect } from "@/features/coverage/matricula/components/dialogs/acciones/compartido"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

const ESPECIALIDADES = ["Sistemas", "Contabilidad", "Electricidad"]
const ESTADOS = Object.entries(ESTADO_CONTINUIDAD) as [EstadoContinuidad, { label: string }][]

const columns: ColumnDef<Continuidad>[] = [
  {
    id: "estudiante",
    accessorFn: (r) => r.id,
    meta: { label: "Estudiante" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estudiante" />,
    cell: ({ row }) => (
      <div className="grid">
        <span className="font-medium">{row.original.estudiante}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{row.original.documento}</span>
      </div>
    ),
    enableHiding: false,
    enableSorting: false,
  },
  {
    id: "origen",
    accessorFn: (r) => r.id,
    meta: { label: "Establecimiento de origen" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Establecimiento de origen" />,
    cell: ({ row }) => row.original.origen,
    enableSorting: false,
  },
  {
    id: "especialidad",
    accessorFn: (r) => r.id,
    meta: { label: "Especialidad" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Especialidad" />,
    cell: ({ row }) => row.original.especialidad,
    enableSorting: false,
  },
  {
    id: "gradoSiguiente",
    accessorFn: (r) => r.id,
    meta: { label: "Grado siguiente" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Grado siguiente" />,
    cell: ({ row }) => row.original.gradoSiguiente,
    enableSorting: false,
  },
  {
    id: "estado",
    accessorFn: (r) => r.id,
    meta: { label: "Estado" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => <Marca {...ESTADO_CONTINUIDAD[row.original.estado]} />,
    enableSorting: false,
  },
  {
    id: "motivo",
    accessorFn: (r) => r.id,
    meta: { label: "Motivo" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Motivo" />,
    cell: ({ row }) => (row.original.motivo ? MOTIVO_SIN_CONTINUIDAD[row.original.motivo] : "—"),
    enableSorting: false,
  },
  {
    id: "actions",
    size: 48,
    header: () => <span className="sr-only">Acciones</span>,
    cell: ({ row }) => <AccionesContinuidad fila={row.original} />,
    enableHiding: false,
    enableSorting: false,
  },
]

function AccionesContinuidad({ fila }: { fila: Continuidad }) {
  const { puedeEditar } = useMenuPermission(MENU_COMPLEMENTARIA)
  const [abierto, setAbierto] = useState<"detalle" | "grupo" | null>(null)
  const cerrar = (open: boolean) => !open && setAbierto(null)
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button type="button" variant="ghost" color="neutral" size="icon-sm" aria-label={`Acciones de ${fila.estudiante}`} />}
        >
          <DotsThreeVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem onClick={() => setAbierto("detalle")}>
            <EyeIcon /> Ver detalle
          </DropdownMenuItem>
          {/* Solo Pendiente de grupo; el back valida Guardar en la Sede y Jornada. */}
          {puedeEditar && fila.estado === "PENDIENTE_GRUPO" ? (
            <DropdownMenuItem onClick={() => setAbierto("grupo")}>
              <UsersIcon /> Asignar grupo
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {abierto === "detalle" ? <DialogDetalleContinuidad fila={fila} onOpenChange={cerrar} /> : null}
      {abierto === "grupo" ? <DialogAsignarGrupo fila={fila} onOpenChange={cerrar} /> : null}
    </>
  )
}

function Lectura({ id, label, valor }: { id: string; label: string; valor: string }) {
  return (
    <Field variant="outlined" className="gap-1.5">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} size="sm" value={valor} disabled readOnly />
    </Field>
  )
}

const siguienteDe = (f: Continuidad) => `${f.gradoSiguiente} · ${f.especialidad} · ${f.sedeJornada}`

function DialogDetalleContinuidad({ fila: f, onOpenChange }: { fila: Continuidad; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Continuidad — {f.estudiante}
            <Marca {...ESTADO_CONTINUIDAD[f.estado]} />
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <Lectura id="continuidad-origen" label="Establecimiento de origen" valor={f.origen} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Lectura id="continuidad-actual" label="Grado de este año" valor={`${f.gradoActual} · ${f.especialidad}`} />
            <Lectura id="continuidad-siguiente" label="Grado siguiente" valor={siguienteDe(f)} />
          </div>
          {f.grupo ? <Lectura id="continuidad-grupo" label="Grupo" valor={f.grupo} /> : null}
          {f.motivo ? <Lectura id="continuidad-motivo" label="Motivo" valor={MOTIVO_SIN_CONTINUIDAD[f.motivo]} /> : null}
          {f.estado === "PREVISTA" ? (
            <p className="text-sm text-muted-foreground">
              Su cupo del grado siguiente queda reservado hasta que el cierre confirme si continúa.
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="fill" color="primary" size="sm" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Asignar grupo (Pendiente de grupo): crea su matrícula complementaria en el grado siguiente. */
function DialogAsignarGrupo({ fila: f, onOpenChange }: { fila: Continuidad; onOpenChange: (o: boolean) => void }) {
  const { notify } = useNotify()
  const { data: grupos = [], isPending } = useGruposContinuidadQuery(f.id)
  const asignar = useAsignarGrupoContinuidad()
  const [grupoId, setGrupoId] = useState("")
  const [intentado, setIntentado] = useState(false)
  const [aviso, setAviso] = useState<{ id: number; message: string } | null>(null)
  const grupo = grupos.find((g) => String(g.id) === grupoId)

  return (
    <Dialog open onOpenChange={(o) => !asignar.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Asignar grupo — {f.estudiante}</DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={aviso} onClose={() => setAviso(null)} variant="error" />
        <Lectura id="asignar-siguiente" label="Grado siguiente" valor={siguienteDe(f)} />
        <CampoSelect
          id="asignar-grupo"
          label="Grupo"
          required
          value={grupoId}
          disabled={isPending}
          onChange={setGrupoId}
          opciones={grupos.map((g) => ({ value: String(g.id), label: `${g.codigo} · ${g.libres} de ${g.cupo} libres` }))}
          descripcion={
            !isPending && grupos.length === 0
              ? `Ningún grupo que dicte ${f.especialidad} tiene cupo. El estudiante sigue con su cupo reservado.`
              : `Solo grupos que dictan ${f.especialidad} con cupo disponible.`
          }
          invalido={intentado && !grupo}
          className="sm:max-w-xs"
        />
        <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
        <DialogFooter>
          <Button type="button" variant="outline" color="neutral" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="fill"
            color="primary"
            size="sm"
            disabled={asignar.isPending}
            onClick={() => {
              setIntentado(true)
              if (!grupo) return
              asignar.mutate(
                { id: f.id, grupoId: grupo.id },
                {
                  onSuccess: () => {
                    notify(`Se creó la matrícula complementaria de ${f.estudiante} en ${grupo.codigo}.`, { variant: "success" })
                    onOpenChange(false)
                  },
                  onError: (err) => setAviso({ id: Date.now(), message: getErrorMessage(err) }),
                },
              )
            }}
          >
            {asignar.isPending ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : <UsersIcon data-icon="inline-start" />}
            Asignar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Pestaña Continuidad (Sección 2.16.2): los adscritos que pasan al grado siguiente. */
export function ContinuidadTab({ encabezado }: { encabezado: ReactNode }) {
  const search = coberturaComplementariaRoute.useSearch()
  const navigate = coberturaComplementariaRoute.useNavigate()
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { data, isPending, isError, error, refetch } = useContinuidadQuery({
    search: search.q,
    convocatoria: search.convocatoria,
    estado: search.estado,
    especialidad: search.especialidad,
    pageIndex,
    pageSize,
  })
  const { table } = useDataTable({
    columns,
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    getRowId: (row) => String(row.id),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "table-continuidad-complementaria",
  })

  const setSearch = (patch: Partial<typeof search>) => navigate({ search: (prev) => ({ ...prev, ...patch, page: 0 }), replace: true })

  const anio = data?.rows[0]?.convocatoriaAnio
  const chips = [
    search.convocatoria != null && {
      key: "convocatoria",
      label: anio ? `Convocatoria ${anio}` : "Convocatoria",
      clear: () => setSearch({ convocatoria: undefined }),
    },
    search.estado && { key: "estado", label: ESTADO_CONTINUIDAD[search.estado].label, clear: () => setSearch({ estado: undefined }) },
    search.especialidad && { key: "especialidad", label: search.especialidad, clear: () => setSearch({ especialidad: undefined }) },
  ].filter((c): c is { key: string; label: string; clear: () => Promise<void> } => Boolean(c))

  return (
    <TableScreen>
      <TableScreenHeader>
        {encabezado}
        <TableScreenToolbar>
          <Buscador
            id="continuidad-buscar"
            placeholder="Buscar por nombre o documento"
            texto={search.q ?? ""}
            onTexto={(q) => setSearch({ q: q || undefined })}
            filtros={[
              { key: "estado", label: "Estado", items: [{ value: "", label: "Todos" }, ...ESTADOS.map(([value, { label }]) => ({ value, label }))], value: search.estado ?? "" },
              { key: "especialidad", label: "Especialidad", items: [{ value: "", label: "Todas" }, ...ESPECIALIDADES.map((e) => ({ value: e, label: e }))], value: search.especialidad ?? "" },
            ]}
            onAplicar={(v) => setSearch({ estado: (v.estado || undefined) as EstadoContinuidad | undefined, especialidad: v.especialidad || undefined })}
            onLimpiar={() => setSearch({ convocatoria: undefined, estado: undefined, especialidad: undefined, q: undefined })}
          />
          {chips.length ? (
            <div className="flex w-full flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <Badge key={chip.key} variant="soft" color="info" className="text-xs font-medium tracking-normal">
                  {chip.label}
                  <button
                    type="button"
                    aria-label={`Quitar filtro ${chip.label}`}
                    className="rounded-xs hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    onClick={chip.clear}
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </Badge>
              ))}
              <Button
                type="button"
                variant="link"
                color="primary"
                size="sm"
                onClick={() => {
                  setSearch({ convocatoria: undefined, estado: undefined, especialidad: undefined, q: undefined })
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          ) : null}
        </TableScreenToolbar>
      </TableScreenHeader>
      <TableScreenBody>
        {data ? (
          <p className="mb-3 text-sm font-medium tabular-nums">
            {data.totalCount === 1 ? "1 estudiante" : `${data.totalCount} estudiantes`}
          </p>
        ) : null}
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          errorMessage={error ? getErrorMessage(error) : undefined}
          emptyMessage={
            chips.length || search.q
              ? "No hay estudiantes que coincidan con la búsqueda y los filtros."
              : "Aún no hay estudiantes que continúen. Aparecen aquí cuando una convocatoria tiene la continuidad automática activada."
          }
        />
        {data ? (
          <Pagination
            viewOptions={<DataTableViewOptions table={table} />}
            pageIndex={pageIndex}
            pageCount={data.pageCount}
            canPrev={pageIndex > 0}
            canNext={pageIndex < data.pageCount - 1}
            onPageChange={goToPage}
            totalCount={data.totalCount}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />
        ) : null}
      </TableScreenBody>
    </TableScreen>
  )
}
