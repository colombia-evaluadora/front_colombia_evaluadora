"use no memo"

import { usePiarAccess } from "@/features/gestion-estudiantil/inclusion/piar/api/use-piar-access"
import { getErrorMessage } from "@/lib/api-client"
import { useNotify } from "@/components/notice/notice-context"
import { FileDownloadOutlinedIcon } from "@/components/ui/icons"
import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"
import { useExportarInformeInclusion } from "@/features/gestion-estudiantil/inclusion/informe/api/exportar-informe"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable } from "@/components/data-table"
import { Skeleton } from "@/components/ui/skeleton"
import { useDataTable } from "@/hooks/use-data-table"

import { useAniosGeQuery, useSedesGeQuery } from "@/features/gestion-estudiantil/commons/api/use-opciones-ge"
import { ComboOpciones as Combo } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { TablaDatos } from "@/features/gestion-estudiantil/inclusion/piar/components/tabla-datos"
import { useInformeQuery, type InformeInclusion } from "@/features/gestion-estudiantil/inclusion/informe/api/use-informe-query"
import { porAsignatura } from "@/features/gestion-estudiantil/inclusion/informe/utils/informe"
import { AvisoPiar } from "@/features/gestion-estudiantil/inclusion/piar/components/ui-piar"
import { mensajePiar } from "@/features/gestion-estudiantil/inclusion/piar/utils/errores-piar"

type Fila = InformeInclusion["cobertura"][number]

const numero = (k: "con_ajustes" | "sin_ajustes" | "pendiente_revision") => ({ row }: { row: { original: Fila } }) => (
  <span className="block text-center tabular-nums">{row.original[k]}</span>
)
const COLUMNAS: ColumnDef<Fila>[] = [
  { id: "asignatura", header: "Cobertura por asignatura", enableSorting: false, cell: ({ row }) => <strong className="font-medium">{row.original.asignatura_nombre}</strong> },
  { id: "con", header: () => <span className="block text-center">Con ajustes</span>, enableSorting: false, cell: numero("con_ajustes") },
  { id: "sin", header: () => <span className="block text-center">Sin ajustes adicionales</span>, enableSorting: false, cell: numero("sin_ajustes") },
  { id: "pend", header: () => <span className="block text-center">Pendiente</span>, enableSorting: false, cell: numero("pendiente_revision") },
]

function Cifra({ titulo, valor, de }: { titulo: string; valor: number; de?: number }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-sm text-muted-foreground">{titulo}</p>
      <p className="text-2xl font-medium tabular-nums">
        {valor}
        {de != null && <span className="ml-1 text-sm font-normal text-muted-foreground">de {de}</span>}
      </p>
    </div>
  )
}

function TablaCifras({ titulo, columnas, filas }: { titulo: string; columnas: string[]; filas: (string | number)[][] }) {
  return (
    <section className="grid min-w-0 content-start gap-2 overflow-x-auto text-sm">
      <h2 className="text-lg font-semibold">{titulo}</h2>
      <TablaDatos
        id={`informe-${columnas[0]}`}
        rows={filas}
        rowId={(f) => String(f[0])}
        emptyMessage="Sin datos."
        growColumnId="c0"
        columns={columnas.map((c, i) => ({
          id: `c${i}`,
          header: () => <span className={i ? "block text-center" : ""}>{c}</span>,
          cell: ({ row }: { row: { original: (string | number)[] } }) => <span className={i ? "block text-center tabular-nums" : ""}>{row.original[i]}</span>,
        }))}
      />
    </section>
  )
}

/** G.4.ORI.INF.1: solo cifras (rector, coordinador y territoriales). */
export function TabInforme() {
  const [sede, setSede] = useState("")
  const [anio, setAnio] = useState("")
  const [grado, setGrado] = useState("")
  const [grados, setGrados] = useState<{ value: string; label: string }[]>([])
  const sedes = useSedesGeQuery()
  // `informe_requiere_sede` (fn_inclusion_acceso): un rol de sede consulta y exporta con su sede; sin ella responde 403.
  const deSede = usePiarAccess().informeRequiereSede
  const sedeInicial = sedes.data?.[0]?.id
  useEffect(() => {
    if (deSede && !sede && sedeInicial) setSede(String(sedeInicial))
  }, [deSede, sede, sedeInicial])
  const anios = useAniosGeQuery(sede ? Number(sede) : (sedeInicial ?? null))
  // El prototipo abre con el año vigente (el más reciente de la sede) elegido.
  const [anioAuto, setAnioAuto] = useState(false)
  useEffect(() => {
    if (anioAuto || !anios.data?.length) return
    setAnioAuto(true)
    setAnio(String(Math.max(...anios.data.map((x) => x.anio))))
  }, [anios.data, anioAuto])
  const establecimiento = sedes.data?.find((s) => String(s.id) === sede)?.establecimientoId ?? sedes.data?.[0]?.establecimientoId
  const { data, isPending, error } = useInformeQuery({ establecimiento: deSede && !sede ? null : establecimiento, sede, anio, grado })
  useEffect(() => {
    if (!data || grado) return
    setGrados(data.por_grado.map((g) => ({ value: String(g.fk_tgrado), label: g.grado_nombre })))
  }, [data, grado])
  const { notify } = useNotify()
  const exportar = useExportarInformeInclusion()
  const onExportar = () => {
    if (establecimiento == null) return
    exportar.mutate(
      { FK_ESTABLECIMIENTO: establecimiento, ...(sede && { FK_SEDE: Number(sede) }), ...(anio && { ANIO: Number(anio) }), ...(grado && { FK_GRADO: Number(grado) }) },
      { onSuccess: (r) => notify(r.message, { variant: r.status === "error" ? "error" : "success" }), onError: (e) => notify(getErrorMessage(e), { variant: "error" }) },
    )
  }
  const filas = porAsignatura(data?.cobertura ?? [])
  const { table } = useDataTable({
    columns: COLUMNAS,
    data: filas,
    pageCount: 1,
    getRowId: (f) => String(f.fk_tasignatura),
    pageIndex: 0,
    pageSize: Math.max(filas.length, 1),
    goToPage: () => {},
    setPageSize: () => {},
    sorting: [],
    setSorting: () => {},
    columnVisibilityStorageKey: "informe-inclusion-column-visibility",
  })
  if (error || sedes.error) return <AvisoPiar tipo="error">{mensajePiar(error ?? sedes.error)}</AvisoPiar>
  const pendientes = filas.reduce((s, c) => s + c.pendiente_revision, 0)
  const vigentes = data?.vigentes_total ?? 0
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Combo id="inf-sede" label="Sede" todos={deSede ? false : "Todos"} value={sede} options={(sedes.data ?? []).map((s) => ({ value: String(s.id), label: s.nombre }))} onChange={(v) => { setSede(v); setAnio("") }} />
        <Combo id="inf-anio" label="Año" value={anio} options={(anios.data ?? []).map((a) => ({ value: String(a.anio), label: String(a.anio) }))} onChange={setAnio} />
        <Combo id="inf-grado" label="Grado" value={grado} options={grados} onChange={setGrado} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(anio || grado || (sede && !deSede)) && (
          <Button size="sm" variant="outline" color="neutral" onClick={() => { setSede(""); setAnio(""); setGrado("") }}>Limpiar filtros</Button>
        )}
        <Button size="sm" variant="outline" color="neutral" disabled={establecimiento == null || (deSede && !sede) || exportar.isPending} onClick={onExportar}>
          <IconoCarga cargando={exportar.isPending}>
            <FileDownloadOutlinedIcon data-icon="inline-start" />
          </IconoCarga>
          Exportar
        </Button>
      </div>
      {isPending || !data ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Cifra titulo="PIAR vigentes" valor={vigentes} />
            <Cifra titulo="PIAR vigentes con ajustes" valor={data.vigentes_con_ajustes} de={vigentes} />
            <Cifra titulo="Pendiente de revisión" valor={pendientes} />
          </div>
          <DataTable table={table} isPending={false} isError={false} onRetry={() => {}} growColumnId="asignatura" emptyMessage="Aún no hay cobertura registrada." />
          <div className="grid gap-4 2xl:grid-cols-2">
            <TablaCifras titulo="Ajustes y seguimiento global" columnas={["Asignatura", "Con seguimiento", "Sin seguimiento"]} filas={data.seguimiento.map((s) => [s.asignatura_nombre, s.con_seguimiento, s.sin_seguimiento])} />
            <TablaCifras titulo="PIAR por grado" columnas={["Grado", "Vigentes", "Borradores", "Concluidos", "Cerrados"]} filas={data.por_grado.map((g) => [g.grado_nombre, g.vigentes, g.borradores, g.revision_concluida, g.cerrados])} />
          </div>
          <p className="text-sm text-muted-foreground">
            Tipos de barrera más frecuentes:{" "}
            {data.barreras.length === 0
              ? "—"
              : data.barreras.slice(0, 3).map((b, i) => (
                  <span key={b.nombre}>{i > 0 && " · "}<strong className="font-medium text-foreground">{b.nombre}</strong> {b.ajustes}</span>
                ))}
          </p>
        </>
      )}
    </div>
  )
}
