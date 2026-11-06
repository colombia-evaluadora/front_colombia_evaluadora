"use no memo"

import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import { paths } from "@/config/paths"

import { useAtencionesQuery, useRemisionesQuery } from "@/features/gestion-estudiantil/inclusion/orientacion/api/query/use-orientacion-query"
import { FILTROS_VACIOS, type OrientacionFiltros } from "@/features/gestion-estudiantil/inclusion/orientacion/api/types"
import { SearchOrientacion } from "@/features/gestion-estudiantil/inclusion/orientacion/components/search/search-orientacion"
import { buildColumnsAtenciones } from "@/features/gestion-estudiantil/inclusion/orientacion/components/table/columns-atenciones"
import { buildColumnsRemisiones } from "@/features/gestion-estudiantil/inclusion/orientacion/components/table/columns-remisiones"
import { TablaOrientacion } from "@/features/gestion-estudiantil/inclusion/orientacion/components/table/tabla-orientacion"
import { mensajePiar } from "@/features/gestion-estudiantil/inclusion/piar/utils/errores-piar"

/** G.4.ORI.LIS.1-3: remisiones y atenciones. Registran orientación y rectoría (V602). */
export function TabOrientacion({ puedeRegistrar }: { puedeRegistrar: boolean }) {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [filtros, setFiltros] = useState<OrientacionFiltros>(FILTROS_VACIOS)
  const [pagR, setPagR] = useState({ i: 0, s: 10 })
  const [pagA, setPagA] = useState({ i: 0, s: 10 })

  const remisiones = useRemisionesQuery({ search, filtros, pageIndex: pagR.i, pageSize: pagR.s })
  const atenciones = useAtencionesQuery({ search, filtros, pageIndex: pagA.i, pageSize: pagA.s })
  const hayFiltros = Boolean(search) || Object.values(filtros).some(Boolean)
  const reiniciar = () => {
    setPagR((p) => ({ ...p, i: 0 }))
    setPagA((p) => ({ ...p, i: 0 }))
  }

  return (
    <div className="flex flex-col gap-5">
      <SearchOrientacion
        search={search}
        filtros={filtros}
        onSearch={(v) => {
          setSearch(v)
          reiniciar()
        }}
        onFiltros={(f) => {
          setFiltros(f)
          reiniciar()
        }}
      />
      <TablaOrientacion
        titulo="Remisiones"
        columns={buildColumnsRemisiones({
          puedeRegistrar,
          onRegistrar: (r) =>
            navigate({ to: paths.app.atencionNueva.getHref(), search: { matricula: r.fk_tmatricula, remision: r.id, motivo: r.fk_tlv_motivo, estudiante: r.estudiante_nombre } }),
        })}
        rows={remisiones.data?.rows ?? []}
        rowId={(r) => String(r.id)}
        pageIndex={pagR.i}
        pageSize={pagR.s}
        pageCount={remisiones.data?.pageCount ?? 1}
        totalCount={remisiones.data?.totalCount ?? 0}
        goToPage={(i) => setPagR((p) => ({ ...p, i }))}
        setPageSize={(s) => setPagR({ i: 0, s })}
        isPending={remisiones.isPending}
        isError={remisiones.isError}
        onRetry={() => remisiones.refetch()}
        errorMessage={remisiones.error ? mensajePiar(remisiones.error) : undefined}
        emptyMessage={hayFiltros ? "No hay remisiones para los filtros aplicados." : "Aún no hay remisiones."}
      />
      <TablaOrientacion
        titulo="Atenciones"
        columns={buildColumnsAtenciones({
          puedeRegistrar,
          onVer: (a) => navigate({ to: paths.app.atencionFicha.getHref(a.id), search: { ver: true } }),
          onModificar: (a) => navigate({ to: paths.app.atencionFicha.getHref(a.id) }),
        })}
        rows={atenciones.data?.rows ?? []}
        rowId={(a) => String(a.id)}
        pageIndex={pagA.i}
        pageSize={pagA.s}
        pageCount={atenciones.data?.pageCount ?? 1}
        totalCount={atenciones.data?.totalCount ?? 0}
        goToPage={(i) => setPagA((p) => ({ ...p, i }))}
        setPageSize={(s) => setPagA({ i: 0, s })}
        isPending={atenciones.isPending}
        isError={atenciones.isError}
        onRetry={() => atenciones.refetch()}
        errorMessage={atenciones.error ? mensajePiar(atenciones.error) : undefined}
        emptyMessage={hayFiltros ? "No hay atenciones para los filtros aplicados." : "Aún no hay atenciones."}
      />
    </div>
  )
}
