"use no memo"

import { useEffect, useState, type ReactNode } from "react"
import { format } from "date-fns"

import { paths } from "@/config/paths"
import {
  AdmitirDialog,
  AnularInscripcionDialog,
  NoAdmitirDialog,
} from "@/features/coverage/inscripcion-reservas/components/dialogs/dialog-acciones-inscripcion"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { ExportDialog } from "@/components/export-dialog"
import { Pagination } from "@/components/pagination"
import {
  TableScreen,
  TableScreenActions,
  TableScreenBody,
  TableScreenHeader,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { SearchQueryBar } from "@/components/search/search-query-bar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { CheckCircleIcon, PlusIcon, XCircleIcon, XIcon } from "@/components/ui/icons"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { coberturaInscritosRoute } from "@/router"
import {
  AmpliarInscripcionDialog,
  ElegirOpcionDialog,
  type InscripcionObjetivo,
} from "@/features/coverage/inscripcion-reservas/components/dialogs/dialog-ampliar-elegir"

import {
  formatGrupoAdmision,
  useGrupoAdmisionQuery,
  useInscripcionesQuery,
} from "@/features/coverage/inscripcion-reservas/api/query/use-inscripciones-query"
import {
  ESTADOS_OPCION,
  ESTADOS_OPCION_POR_DEFECTO,
  type EstadoOpcion,
  type OpcionInscripcion,
} from "@/features/coverage/inscripcion-reservas/api/types/inscripcion"
import {
  DESEMPATE_LABEL,
  ESTADO_OPCION_UI,
} from "@/features/coverage/inscripcion-reservas/api/ui-mappings-inscripcion"
import { GenerarListaSorteoDialog } from "@/features/coverage/inscripcion-reservas/components/dialogs/dialog-generar-lista-sorteo"
import { CampoLectura } from "@/features/coverage/inscripcion-reservas/components/reserva-ui"
import { createInscripcionesColumns } from "@/features/coverage/inscripcion-reservas/components/table/columns-inscripciones"

const TODAS = "__todas__"

function SelectSimple({
  id,
  label,
  required,
  value,
  options,
  onChange,
}: {
  id: string
  label: string
  required?: boolean
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  const items = Object.fromEntries(options.map((o) => [o.value, o.label]))
  return (
    <Field variant="outlined" className="gap-1.5">
      <FieldLabel htmlFor={id}>
        {label}
        {required && <span className="text-red">*</span>}
      </FieldLabel>
      <Select items={items} value={value} onValueChange={(v) => v != null && onChange(v)}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Seleccionar" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}

const fechaCorta = (iso: string) => iso.split("-").reverse().join("/")

/** Pestaña "Inscripciones" (Cobertura Educativa, Sección 3.3). */
export function InscripcionesTable({ encabezado }: { encabezado: ReactNode }) {
  const search = coberturaInscritosRoute.useSearch()
  const navigate = coberturaInscritosRoute.useNavigate()
  const pagination = useTablePagination()
  const { data: grupo, grupos } = useGrupoAdmisionQuery(search.inscGrupo)

  // El grado es obligatorio: sin uno en la URL se toma el primero del grupo.
  const grado = search.inscGrado ?? grupo?.grados[0] ?? ""
  const estados = search.inscEstados ?? ESTADOS_OPCION_POR_DEFECTO

  const { data, isPending, isError, error, refetch } = useInscripcionesQuery(grupo, {
    filters: { grado, jornada: search.inscJornada, q: search.inscQ, estados },
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
  })

  const setSearch = (patch: Partial<typeof search>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: 0 }), replace: true })

  // Búsqueda con debounce, igual que en Reservas de cupo.
  const [texto, setTexto] = useState(search.inscQ ?? "")
  useEffect(() => {
    if (texto === (search.inscQ ?? "")) return
    const t = setTimeout(() => setSearch({ inscQ: texto || undefined }), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setSearch cambia en cada render
  }, [texto, search.inscQ])

  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [estadosDraft, setEstadosDraft] = useState<EstadoOpcion[]>(estados)
  const estadosCambiados =
    estados.length !== ESTADOS_OPCION_POR_DEFECTO.length ||
    !ESTADOS_OPCION_POR_DEFECTO.every((e) => estados.includes(e))

  const sorteoEjecutado = grupo?.sorteoEjecutado ?? false
  const fechaSorteo = grupo ? fechaCorta(grupo.fechaCierre) : ""

  // Un modal a la vez: por fila o desde la selección.
  const [porAdmitir, setPorAdmitir] = useState<OpcionInscripcion[]>([])
  const [porNoAdmitir, setPorNoAdmitir] = useState<OpcionInscripcion[]>([])
  const [porAnular, setPorAnular] = useState<{ id: string; numeroInscripcion: string } | null>(null)
  const [desdeSeleccion, setDesdeSeleccion] = useState(false)
  const [porAmpliar, setPorAmpliar] = useState<InscripcionObjetivo | null>(null)
  const [porElegir, setPorElegir] = useState<InscripcionObjetivo | null>(null)

  const columns = createInscripcionesColumns({
    sorteoEjecutado,
    fechaSorteo,
    onAction: (accion, o) => {
      setDesdeSeleccion(false)
      switch (accion) {
        case "VER_DETALLE":
          return navigate({ to: paths.app.coberturaInscripcionDetalle.getHref(o.inscripcionId) })
        case "EDITAR":
          return navigate({ to: paths.app.coberturaInscripcionEditar.getHref(o.inscripcionId) })
        case "ADMITIR":
          return setPorAdmitir([o])
        case "NO_ADMITIR":
          return setPorNoAdmitir([o])
        case "ANULAR":
          return setPorAnular({ id: o.inscripcionId, numeroInscripcion: o.numeroInscripcion })
        case "AMPLIAR":
          return setPorAmpliar({ inscripcionId: o.inscripcionId, aspirante: o.aspirante, grado })
        case "ELEGIR_OPCION":
          return setPorElegir({ inscripcionId: o.inscripcionId, aspirante: o.aspirante, grado })
      }
    },
  })

  const { table, selectedIds, selectedRows, hasSelection, resetSelection } = useDataTable({
    columns,
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    getRowId: (row) => row.id,
    ...pagination,
    columnVisibilityStorageKey: "inscripciones-table-column-visibility",
  })

  const jornadaLabel = search.inscJornada ?? "todas las jornadas"
  const emptyMessage = `No hay opciones por admitir en ${grado} · ${jornadaLabel}. Cuando se liberen cupos, las opciones en lista de espera se pueden admitir aquí.`

  return (
    <TableScreen>
      <TableScreenHeader>
        {encabezado}

        <div className="grid gap-3 px-(--screen-spacing) pt-4">
          <Badge variant="soft" color="neutral" className="text-xs font-medium tracking-normal">
            Cupos disponibles: {data?.cuposDisponibles ?? "…"}
          </Badge>
          <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
            {grupos.length > 1 ? (
              <SelectSimple
                id="grupo-admision"
                label="Grupo de admisión"
                value={grupo?.id ?? ""}
                options={grupos.map((g) => ({ value: g.id, label: formatGrupoAdmision(g) }))}
                onChange={(v) => {
                  resetSelection()
                  // Otro grupo trae otros grados: se vuelve al primero.
                  setSearch({ inscGrupo: v, inscGrado: undefined, inscJornada: undefined })
                }}
              />
            ) : (
              <CampoLectura
                id="grupo-admision"
                label="Grupo de admisión"
                value={grupo ? formatGrupoAdmision(grupo) : ""}
              />
            )}
            <SelectSimple
              id="insc-grado"
              label="Grado"
              required
              value={grado}
              options={(grupo?.grados ?? []).map((g) => ({ value: g, label: g }))}
              onChange={(v) => {
                resetSelection()
                setSearch({ inscGrado: v })
              }}
            />
            <SelectSimple
              id="insc-jornada"
              label="Jornada"
              value={search.inscJornada ?? TODAS}
              options={[
                { value: TODAS, label: "Todas" },
                ...(grupo?.jornadas ?? []).map((j) => ({ value: j, label: j })),
              ]}
              onChange={(v) => {
                resetSelection()
                setSearch({ inscJornada: v === TODAS ? undefined : v })
              }}
            />
            {grupo?.desempate === "SORTEO" && (
              <GenerarListaSorteoDialog
                grupoId={grupo.id}
                grupoNombre={formatGrupoAdmision(grupo)}
                sorteoEjecutado={sorteoEjecutado}
                grado={grado}
                jornada={search.inscJornada}
                disabled={!sorteoEjecutado && grupo.fechaCierre > format(new Date(), "yyyy-MM-dd")}
                motivoDeshabilitado={`El sorteo se puede hacer desde el ${fechaSorteo}.`}
              />
            )}
          </div>
          {grupo && (
            <p className="text-sm text-muted-foreground">
              Orden de admisión: primero por prioridad y luego por{" "}
              {DESEMPATE_LABEL[grupo.desempate]}.
            </p>
          )}
        </div>

        <TableScreenToolbar>
          <SearchQueryBar
            id="inscripciones-search"
            placeholder="Número de inscripción, nombre o documento"
            value={texto}
            onValueChange={setTexto}
            onClearAll={() => {
              setTexto("")
              setSearch({ inscQ: undefined, inscEstados: undefined })
              setFiltrosAbiertos(false)
            }}
            onClearFilters={() => setEstadosDraft(ESTADOS_OPCION_POR_DEFECTO)}
            activeFilterCount={(search.inscQ ? 1 : 0) + (estadosCambiados ? 1 : 0)}
            badgeCount={estadosCambiados ? 1 : 0}
            open={filtrosAbiertos}
            onOpenChange={(open) => {
              if (open) setEstadosDraft(estados)
              setFiltrosAbiertos(open)
            }}
            onApply={() => {
              setSearch({ inscEstados: estadosDraft.length ? estadosDraft : undefined })
              setFiltrosAbiertos(false)
            }}
          >
            <fieldset className="grid gap-3 px-4">
              <legend className="mb-3 text-sm font-medium">Estado de la opción</legend>
              {ESTADOS_OPCION.map((e) => (
                <label key={e} className="flex items-center gap-2.5 text-sm">
                  <Checkbox
                    checked={estadosDraft.includes(e)}
                    onCheckedChange={(v) =>
                      setEstadosDraft(
                        v ? [...estadosDraft, e] : estadosDraft.filter((x) => x !== e),
                      )
                    }
                  />
                  {ESTADO_OPCION_UI[e].label}
                </label>
              ))}
            </fieldset>
          </SearchQueryBar>

          <TableScreenActions>
            {hasSelection ? (
              <>
                <span className="text-sm text-muted-foreground">
                  {selectedIds.length} seleccionadas
                </span>
                <Button variant="outline" color="neutral" onClick={resetSelection}>
                  <XIcon data-icon="inline-start" />
                  Quitar selección
                </Button>
                <Button
                  variant="outline"
                  color="destructive"
                  onClick={() => {
                    setDesdeSeleccion(true)
                    setPorNoAdmitir(selectedRows)
                  }}
                >
                  <XCircleIcon data-icon="inline-start" />
                  No admitir
                </Button>
                <Button
                  disabled={!sorteoEjecutado}
                  onClick={() => {
                    setDesdeSeleccion(true)
                    setPorAdmitir(selectedRows)
                  }}
                >
                  <CheckCircleIcon data-icon="inline-start" />
                  Admitir seleccionadas
                </Button>
              </>
            ) : (
              <>
                <ExportDialog
                  label="Exportar inscripciones"
                  description="Elige un formato para exportar las inscripciones del grado y la jornada elegidos."
                  onExport={async (format) => ({
                    status: "ok",
                    message: `Se exportaron las inscripciones en ${format === "pdf" ? "PDF" : "Excel"}.`,
                  })}
                />
                <Button
                  onClick={() => navigate({ to: paths.app.coberturaInscripcionNueva.getHref() })}
                >
                  <PlusIcon data-icon="inline-start" />
                  Nueva inscripción
                </Button>
              </>
            )}
          </TableScreenActions>
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          emptyMessage={emptyMessage}
          errorMessage={error ? getErrorMessage(error) : undefined}
        />
        {data && (
          <Pagination
            viewOptions={<DataTableViewOptions table={table} />}
            pageIndex={pagination.pageIndex}
            pageCount={data.pageCount}
            canPrev={pagination.pageIndex > 0}
            canNext={pagination.pageIndex < data.pageCount - 1}
            onPageChange={pagination.goToPage}
            totalCount={data.totalCount}
            pageSize={pagination.pageSize}
            onPageSizeChange={pagination.setPageSize}
          />
        )}
      </TableScreenBody>

      <AdmitirDialog
        opciones={porAdmitir}
        cupos={data?.cuposDisponibles ?? 0}
        onOpenChange={(o) => !o && setPorAdmitir([])}
        onDone={desdeSeleccion ? resetSelection : undefined}
      />
      <NoAdmitirDialog
        opciones={porNoAdmitir}
        onOpenChange={(o) => !o && setPorNoAdmitir([])}
        onDone={desdeSeleccion ? resetSelection : undefined}
      />
      <AnularInscripcionDialog
        inscripcion={porAnular}
        onOpenChange={(o) => !o && setPorAnular(null)}
      />
      <AmpliarInscripcionDialog
        objetivo={porAmpliar}
        onOpenChange={(o) => !o && setPorAmpliar(null)}
      />
      <ElegirOpcionDialog objetivo={porElegir} onOpenChange={(o) => !o && setPorElegir(null)} />
    </TableScreen>
  )
}
