"use no memo"

import { useCallback, useMemo, useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { TableScreenBody } from "@/components/layout/table-screen"
import { Pagination } from "@/components/pagination"
import { useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"
import { selectCategoryQueryOptions } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import { useDataTable } from "@/hooks/use-data-table"
import { getErrorMessage } from "@/lib/api-client"

import { useCambiarEstadoProceso, type Catalogo } from "@/features/gestion-estudiantil/configuracion/api/mutations/proceso"
import {
  useClasificacionesQuery,
  useEfectosSancionQuery,
  useSancionesQuery,
} from "@/features/gestion-estudiantil/configuracion/api/query/use-proceso-query"
import {
  SANCION_FILTROS_VACIOS,
  type AccesoConfiguracion,
  type ClasificacionRow,
  type SancionFiltros,
  type SancionRow,
} from "@/features/gestion-estudiantil/configuracion/api/types"
import { EncabezadoConfiguracion } from "@/features/gestion-estudiantil/configuracion/components/encabezado-configuracion"
import { BloquePlazos } from "@/features/gestion-estudiantil/configuracion/components/proceso-disciplinario/bloque-plazos"
import {
  buildColumnsClasificaciones,
  buildColumnsSanciones,
} from "@/features/gestion-estudiantil/configuracion/components/proceso-disciplinario/columns-proceso"
import { DialogClasificacion } from "@/features/gestion-estudiantil/configuracion/components/proceso-disciplinario/dialog-clasificacion"
import { DialogEliminarProceso } from "@/features/gestion-estudiantil/configuracion/components/proceso-disciplinario/dialog-eliminar-proceso"
import { DialogSancion } from "@/features/gestion-estudiantil/configuracion/components/proceso-disciplinario/dialog-sancion"
import { SearchSanciones } from "@/features/gestion-estudiantil/configuracion/components/proceso-disciplinario/search-sanciones"

interface Props {
  tabs: ReactNode
  establecimiento: number | null
  acceso: AccesoConfiguracion
}

type Modal =
  | { tipo: "clasificacion"; fila: ClasificacionRow | null }
  | { tipo: "sancion"; fila: SancionRow | null }
  | { tipo: "eliminar"; catalogo: Catalogo; id: number; nombre: string }
  | null

/** La clasificación de faltas trae todo en una página: sin paginación ni orden del servidor. */
const SIN_PAGINAR = { pageIndex: 0, pageSize: 200, goToPage: () => {}, setPageSize: () => {}, sorting: [], setSorting: () => {} }

/** Proceso disciplinario (G.10.PRD.CLA.1–3, SAN.1–3): plazos, clasificación de faltas y catálogo de sanciones. */
export function ProcesoTab({ tabs, establecimiento, acceso }: Props) {
  const { notify } = useNotify()
  const [modal, setModal] = useState<Modal>(null)
  const [search, setSearch] = useState("")
  const [filtros, setFiltros] = useState<SancionFiltros>(SANCION_FILTROS_VACIOS)

  const instanciasQ = useQuery(selectCategoryQueryOptions("INSTANCIA_DISCIPLINARIA"))
  const instancias = useMemo(
    () => (instanciasQ.data ?? []).map((r) => ({ value: String(r.pk_lista_valor), label: r.nombre })),
    [instanciasQ.data],
  )
  const efectosQ = useEfectosSancionQuery(establecimiento)
  const clasificacionesQ = useClasificacionesQuery(establecimiento)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const sancionesQ = useSancionesQuery(establecimiento, search, filtros, pageIndex, pageSize)
  const cambiarEstado = useCambiarEstadoProceso()

  const alternar = useCallback(
    (catalogo: Catalogo, fila: { id: number; habilitado: boolean }) =>
      cambiarEstado.mutate(
        { catalogo, id: fila.id, habilitado: !fila.habilitado },
        {
          onSuccess: () => {
            const que = catalogo === "clasificaciones" ? "Clasificación" : "Sanción"
            notify(`${que} ${fila.habilitado ? "inactivada" : "activada"}.`, { variant: "success" })
          },
          onError: (e) => notify(getErrorMessage(e), { variant: "error" }),
        },
      ),
    [cambiarEstado, notify],
  )

  const permisos = { puedeEditar: acceso.puede_editar, puedeEliminar: acceso.puede_eliminar }
  const columnasClasificaciones = buildColumnsClasificaciones({
    ...permisos,
    onModificar: (fila) => setModal({ tipo: "clasificacion", fila }),
    onCambiarEstado: (fila) => alternar("clasificaciones", fila),
    onEliminar: (fila) => setModal({ tipo: "eliminar", catalogo: "clasificaciones", id: fila.id, nombre: fila.nombre }),
  })
  const columnasSanciones = buildColumnsSanciones({
    ...permisos,
    onModificar: (fila) => setModal({ tipo: "sancion", fila }),
    onCambiarEstado: (fila) => alternar("sanciones", fila),
    onEliminar: (fila) => setModal({ tipo: "eliminar", catalogo: "sanciones", id: fila.id, nombre: fila.nombre }),
  })

  const { table: tablaClasificaciones } = useDataTable({
    ...SIN_PAGINAR,
    columns: columnasClasificaciones,
    data: clasificacionesQ.data ?? [],
    pageCount: 1,
    getRowId: (r) => String(r.id),
    columnVisibilityStorageKey: "configuracion-clasificaciones-column-visibility",
  })
  const { table: tablaSanciones } = useDataTable({
    columns: columnasSanciones,
    data: sancionesQ.data?.rows ?? [],
    pageCount: sancionesQ.data?.pageCount ?? 1,
    pageIndex,
    pageSize,
    goToPage: setPageIndex,
    setPageSize: (n) => {
      setPageSize(n)
      setPageIndex(0)
    },
    sorting: [],
    setSorting: () => {},
    getRowId: (r) => String(r.id),
    columnVisibilityStorageKey: "configuracion-sanciones-column-visibility",
  })

  const hayFiltros = Boolean(search) || Object.values(filtros).some(Boolean)
  const sinEstablecimiento = establecimiento == null

  return (
    <>
      {/* Los botones de crear van con su bloque (CLAUDE.md §13), no en el título: la pestaña tiene dos catálogos. */}
      <EncabezadoConfiguracion tabs={tabs} />
      <TableScreenBody>
        <div className="flex flex-col gap-6 pt-2 pb-6">
          <BloquePlazos establecimiento={establecimiento} puedeEditar={acceso.puede_editar} />

          {/* Mismo recuadro que «Plazos del proceso» (bloque-plazos.tsx): los tres bloques de la pestaña se ven iguales. */}
          <section className="flex flex-col gap-4 rounded-lg border border-border p-4" aria-labelledby="clasificaciones-titulo">
            {/* Sin paginación ni buscador: «Nueva clasificación» va junto al título. Sin «Columnas visibles»: son
                tres columnas y su lugar en las demás tablas es la paginación, que esta no tiene. */}
            <div className="flex items-center justify-between gap-2">
              <h2 id="clasificaciones-titulo" className="text-sm font-semibold">
                Clasificación de faltas
              </h2>
              <Button
                size="sm"
                disabled={sinEstablecimiento || !acceso.puede_crear}
                onClick={() => setModal({ tipo: "clasificacion", fila: null })}
              >
                <ControlPointIcon data-icon="inline-start" />
                Nueva clasificación
              </Button>
            </div>
            <DataTable
              table={tablaClasificaciones}
              isPending={sinEstablecimiento || clasificacionesQ.isPending}
              isError={clasificacionesQ.isError}
              onRetry={clasificacionesQ.refetch}
              isRowMuted={(row) => !row.original.habilitado}
              emptyMessage="Aún no hay clasificaciones de faltas."
              errorMessage={clasificacionesQ.error ? getErrorMessage(clasificacionesQ.error) : undefined}
            />
          </section>

          <section className="flex flex-col gap-4 rounded-lg border border-border p-4" aria-labelledby="sanciones-titulo">
            <h2 id="sanciones-titulo" className="text-sm font-semibold">
              Catálogo de sanciones
            </h2>
            {/* `items-end`: el label flotante del buscador desalinea con `items-center`. */}
            <div className="flex flex-wrap items-end justify-between gap-2">
              <SearchSanciones
                search={search}
                onSearchChange={(v) => {
                  setSearch(v)
                  setPageIndex(0)
                }}
                filters={filtros}
                applyFilters={(next) => {
                  setFiltros(next)
                  setPageIndex(0)
                }}
                onClearAll={() => {
                  setSearch("")
                  setFiltros(SANCION_FILTROS_VACIOS)
                  setPageIndex(0)
                }}
                instancias={instancias}
              />
              <Button size="sm" disabled={sinEstablecimiento || !acceso.puede_crear} onClick={() => setModal({ tipo: "sancion", fila: null })}>
                <ControlPointIcon data-icon="inline-start" />
                Nueva sanción
              </Button>
            </div>
            <DataTable
              table={tablaSanciones}
              isPending={sinEstablecimiento || sancionesQ.isPending}
              isError={sancionesQ.isError}
              onRetry={sancionesQ.refetch}
              isRowMuted={(row) => !row.original.habilitado}
              emptyMessage={
                hayFiltros ? "No hay sanciones para los filtros aplicados." : "Aún no hay sanciones. Cargue las del manual de convivencia."
              }
              errorMessage={sancionesQ.error ? getErrorMessage(sancionesQ.error) : undefined}
            />
            <Pagination
              pageIndex={pageIndex}
              pageCount={sancionesQ.data?.pageCount ?? 1}
              canPrev={pageIndex > 0}
              canNext={pageIndex < (sancionesQ.data?.pageCount ?? 1) - 1}
              onPageChange={setPageIndex}
              totalCount={sancionesQ.data?.totalCount ?? 0}
              pageSize={pageSize}
              onPageSizeChange={(n) => {
                setPageSize(n)
                setPageIndex(0)
              }}
              viewOptions={<DataTableViewOptions table={tablaSanciones} />}
            />
          </section>
        </div>
      </TableScreenBody>

      {modal?.tipo === "clasificacion" && establecimiento != null && (
        <DialogClasificacion establecimiento={establecimiento} clasificacion={modal.fila} onClose={() => setModal(null)} />
      )}
      {modal?.tipo === "sancion" && establecimiento != null && (
        <DialogSancion
          establecimiento={establecimiento}
          sancion={modal.fila}
          instancias={instancias}
          efectos={efectosQ.data ?? []}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.tipo === "eliminar" && (
        <DialogEliminarProceso catalogo={modal.catalogo} id={modal.id} nombre={modal.nombre} onClose={() => setModal(null)} />
      )}
    </>
  )
}
