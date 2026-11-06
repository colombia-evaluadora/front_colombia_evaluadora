"use no memo"

import { useEffect, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable } from "@/components/data-table"
import { Skeleton } from "@/components/ui/skeleton"
import { useDataTable } from "@/hooks/use-data-table"

import { useAuth } from "@/features/auth/hooks/use-auth"
import { useAniosInformeQuery, useSedesInformeQuery } from "@/features/academic-management/reports/api/query/use-cascada-query"
import { ComboOpciones as Combo } from "@/features/gestion-estudiantil/convivencia/components/combo-opciones"
import { useInformeQuery, type InformeInclusion } from "@/features/gestion-estudiantil/inclusion/informe/api/use-informe-query"
import { porAsignatura } from "@/features/gestion-estudiantil/inclusion/informe/utils/informe"
import { AvisoPiar } from "@/features/gestion-estudiantil/inclusion/piar/components/ui-piar"
import { mensajePiar } from "@/features/gestion-estudiantil/inclusion/piar/utils/errores-piar"

type Fila = InformeInclusion["cobertura"][number]

const numero = (k: "con_ajustes" | "sin_ajustes" | "pendiente_revision") => ({ row }: { row: { original: Fila } }) => (
  <span className="block text-right tabular-nums">{row.original[k]}</span>
)
const COLUMNAS: ColumnDef<Fila>[] = [
  { id: "asignatura", header: "Cobertura por Asignatura", enableSorting: false, cell: ({ row }) => <strong className="font-medium">{row.original.asignatura_nombre}</strong> },
  { id: "con", header: "Con ajustes", enableSorting: false, cell: numero("con_ajustes") },
  { id: "sin", header: "Sin ajustes adicionales", enableSorting: false, cell: numero("sin_ajustes") },
  { id: "pend", header: "Pendiente", enableSorting: false, cell: numero("pendiente_revision") },
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
    <section className="grid gap-2 text-sm">
      <h2 className="text-base font-medium">{titulo}</h2>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full">
          <thead className="bg-muted/60">
            <tr>{columnas.map((c, i) => <th key={c} className={`px-3 py-2 font-medium ${i ? "text-right" : "text-left"}`}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={String(f[0])} className="border-t border-border">{f.map((v, i) => <td key={i} className={`px-3 py-2 ${i ? "text-right tabular-nums" : ""}`}>{v}</td>)}</tr>
            ))}
            {!filas.length && <tr><td colSpan={columnas.length} className="px-3 py-3 text-muted-foreground">Sin datos.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/** G.4.ORI.INF.1: solo cifras (rector, coordinador y territoriales). */
export function TabInforme() {
  const [sede, setSede] = useState("")
  const [anio, setAnio] = useState("")
  const [grado, setGrado] = useState("")
  const [grados, setGrados] = useState<{ value: string; label: string }[]>([])
  const sedes = useSedesInformeQuery()
  const { user } = useAuth()
  const roles = user?.roles ?? []
  // fn_piar_gate_informe: un rol de sede consulta su sede; sin ella responde 403.
  const deSede = roles.includes("CEVAL-COORDINADOR") && !roles.includes("CEVAL-RECTOR")
  const sedeInicial = sedes.data?.[0]?.id
  useEffect(() => {
    if (deSede && !sede && sedeInicial) setSede(String(sedeInicial))
  }, [deSede, sede, sedeInicial])
  const anios = useAniosInformeQuery(sede ? Number(sede) : null)
  const establecimiento = sedes.data?.find((s) => String(s.id) === sede)?.establecimientoId ?? sedes.data?.[0]?.establecimientoId
  const { data, isPending, error } = useInformeQuery({ establecimiento: deSede && !sede ? null : establecimiento, sede, anio, grado })
  useEffect(() => {
    if (!data || grado) return
    setGrados(data.por_grado.map((g) => ({ value: String(g.fk_tgrado), label: g.grado_nombre })))
  }, [data, grado])
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
      <div className="grid max-w-3xl gap-3 sm:grid-cols-3">
        <Combo id="inf-sede" label="Sede" todos={deSede ? false : "Todos"} value={sede} options={(sedes.data ?? []).map((s) => ({ value: String(s.id), label: s.nombre }))} onChange={(v) => { setSede(v); setAnio("") }} />
        <Combo id="inf-anio" label="Año" value={anio} disabled={!sede} placeholder={sede ? "Todos" : "Elegí Sede primero"} options={(anios.data ?? []).map((a) => ({ value: String(a.anio), label: String(a.anio) }))} onChange={setAnio} />
        <Combo id="inf-grado" label="Grado" value={grado} options={grados} onChange={setGrado} />
      </div>
      {isPending || !data ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Cifra titulo="PIAR vigentes" valor={vigentes} />
            <Cifra titulo="Con ajustes" valor={data.vigentes_con_ajustes} de={vigentes} />
            <Cifra titulo="Pendiente de revisión" valor={pendientes} />
          </div>
          <DataTable table={table} isPending={false} isError={false} onRetry={() => {}} growColumnId="asignatura" emptyMessage="Aún no hay cobertura registrada." />
          <div className="grid gap-4 lg:grid-cols-2">
            <TablaCifras titulo="Ajustes y seguimiento global" columnas={["Asignatura", "Con seguimiento", "Sin seguimiento"]} filas={data.seguimiento.map((s) => [s.asignatura_nombre, s.con_seguimiento, s.sin_seguimiento])} />
            <TablaCifras titulo="PIAR por grado" columnas={["Grado", "Vigentes", "Borradores", "Concluidos", "Cerrados"]} filas={data.por_grado.map((g) => [g.grado_nombre, g.vigentes, g.borradores, g.revision_concluida, g.cerrados])} />
          </div>
          {data.barreras.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Tipos de barrera más frecuentes:{" "}
              {data.barreras.slice(0, 3).map((b, i) => (
                <span key={b.nombre}>{i > 0 && " · "}<strong className="font-medium text-foreground">{b.nombre}</strong> {b.ajustes}</span>
              ))}
            </p>
          )}
        </>
      )}
    </div>
  )
}
