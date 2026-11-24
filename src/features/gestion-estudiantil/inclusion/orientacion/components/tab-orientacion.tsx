"use no memo"

import { useState } from "react"
import type { SortingState } from "@tanstack/react-table"
import { useNavigate } from "@tanstack/react-router"

import { paths } from "@/config/paths"
import { evalCol } from "@/lib/eval-col-client"
import type { ExportResult } from "@/features/establishment/institution/api/types/export"

import { useAtencionesQuery, useRemisionesQuery } from "@/features/gestion-estudiantil/inclusion/orientacion/api/query/use-orientacion-query"
import { FILTROS_VACIOS, type AtencionDetalle, type OrientacionFiltros } from "@/features/gestion-estudiantil/inclusion/orientacion/api/types"
import { DialogMarcarBap, type MarcaBap } from "@/features/gestion-estudiantil/inclusion/orientacion/components/dialogs/dialog-marcar-bap"
import { DialogAnularOrientacion, type AnulacionOrientacion } from "@/features/gestion-estudiantil/inclusion/orientacion/components/dialogs/dialog-anular-orientacion"
import { SearchOrientacion } from "@/features/gestion-estudiantil/inclusion/orientacion/components/search/search-orientacion"
import { buildColumnsAtenciones, ORDEN_ATENCIONES } from "@/features/gestion-estudiantil/inclusion/orientacion/components/table/columns-atenciones"
import { buildColumnsRemisiones, ORDEN_REMISIONES } from "@/features/gestion-estudiantil/inclusion/orientacion/components/table/columns-remisiones"
import { TablaOrientacion } from "@/features/gestion-estudiantil/inclusion/orientacion/components/table/tabla-orientacion"
import { descargarFicha, descargarRemision, descargarRemisionExterna } from "@/features/gestion-estudiantil/inclusion/orientacion/api/descargas"
import { conOrdenServidor, ordenServidor } from "@/features/gestion-estudiantil/commons/utils/orden-servidor"
import { columnasGestionables } from "@/features/gestion-estudiantil/inclusion/utils/columnas-gestionables"
import { AvisoPiar } from "@/features/gestion-estudiantil/inclusion/piar/components/ui-piar"
import { mensajePiar } from "@/features/gestion-estudiantil/inclusion/piar/utils/errores-piar"

/** G.4.ORI.LIS.1-3: remisiones y atenciones. Registran orientación y rectoría (V602). */
export function TabOrientacion() {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [aviso, setAviso] = useState<string | null>(null)
  const [anular, setAnular] = useState<AnulacionOrientacion | null>(null)
  const [marcaBap, setMarcaBap] = useState<MarcaBap | null>(null)
  const [filtros, setFiltros] = useState<OrientacionFiltros>(FILTROS_VACIOS)
  const [pagR, setPagR] = useState({ i: 0, s: 10 })
  const [pagA, setPagA] = useState({ i: 0, s: 10 })

  const [ordenR, setOrdenR] = useState<SortingState>([])
  const [ordenA, setOrdenA] = useState<SortingState>([])
  const remisiones = useRemisionesQuery({ search, filtros, pageIndex: pagR.i, pageSize: pagR.s, orden: ordenServidor(ordenR, ORDEN_REMISIONES) })
  const atenciones = useAtencionesQuery({ search, filtros, pageIndex: pagA.i, pageSize: pagA.s, orden: ordenServidor(ordenA, ORDEN_ATENCIONES) })
  const hayFiltros = Boolean(search) || Object.values(filtros).some(Boolean)
  const descargar = async (p: Promise<ExportResult>) => {
    const r = await p
    setAviso(r.status === "error" ? "No pudimos generar el documento. Inténtelo de nuevo en unos minutos." : null)
  }
  // La atención puede tener varias remisiones externas: se baja el detalle y se descarga cada una (V668).
  const descargarExternas = async (atencionId: number) => {
    const d = await evalCol.getRow<{ resultado: AtencionDetalle }>(`/gestion-estudiantil/orientacion/atenciones/${atencionId}`).then((r) => r.resultado)
    if (!d.remisiones_externas.length) return setAviso("La atención no tiene remisiones externas.")
    for (const r of d.remisiones_externas) {
      const res = await descargarRemisionExterna(r.id)
      if (res.status === "error") return setAviso("No pudimos generar el documento. Inténtelo de nuevo en unos minutos.")
    }
    setAviso(null)
  }
  const reiniciar = () => {
    setPagR((p) => ({ ...p, i: 0 }))
    setPagA((p) => ({ ...p, i: 0 }))
  }

  return (
    <div className="flex flex-col gap-5">
      {aviso && <AvisoPiar tipo="error">{aviso}</AvisoPiar>}
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
        columns={conOrdenServidor(columnasGestionables(buildColumnsRemisiones({
          onAnular: (r) => setAnular({ tipo: "remision", id: r.id, estudiante: r.estudiante_nombre }),
          onDescargar: (r) => descargar(descargarRemision(r.id)),
          onRegistrar: (r) =>
            navigate({ to: paths.app.atencionNueva.getHref(), search: { matricula: r.fk_tmatricula, remision: r.id, motivo: r.fk_tlv_motivo, estudiante: r.estudiante_nombre } }),
        })), ORDEN_REMISIONES)}
        sorting={ordenR}
        setSorting={(s) => {
          setOrdenR(s)
          setPagR((p) => ({ ...p, i: 0 }))
        }}
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
        columns={conOrdenServidor(columnasGestionables(buildColumnsAtenciones({
          onAnular: (a) => setAnular({ tipo: "atencion", id: a.id, estudiante: a.estudiante_nombre }),
          onDescargar: (a) => descargar(descargarFicha(a.id)),
          onDescargarExterna: (a) => descargarExternas(a.id).catch(() => setAviso("No pudimos generar el documento. Inténtelo de nuevo en unos minutos.")),
          onMarcarBap: (a) => setMarcaBap({ atencionId: a.id, estudiante: a.estudiante_nombre }),
          onVer: (a) => navigate({ to: paths.app.atencionFicha.getHref(a.id), search: { ver: true } }),
          onModificar: (a) => navigate({ to: paths.app.atencionFicha.getHref(a.id) }),
        })), ORDEN_ATENCIONES)}
        sorting={ordenA}
        setSorting={(s) => {
          setOrdenA(s)
          setPagA((p) => ({ ...p, i: 0 }))
        }}
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
      {marcaBap && <DialogMarcarBap objetivo={marcaBap} onClose={() => setMarcaBap(null)} />}
      {anular && <DialogAnularOrientacion objetivo={anular} onClose={() => setAnular(null)} />}
    </div>
  )
}
