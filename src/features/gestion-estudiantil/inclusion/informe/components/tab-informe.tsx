"use no memo"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable } from "@/components/data-table"
import { Skeleton } from "@/components/ui/skeleton"
import { useDataTable } from "@/hooks/use-data-table"

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

/** G.4.ORI.INF.1: solo cifras (rector, coordinador y territoriales). */
export function TabInforme() {
  const [sede, setSede] = useState("")
  const [anio, setAnio] = useState("")
  const sedes = useSedesInformeQuery()
  const anios = useAniosInformeQuery(sede ? Number(sede) : null)
  const establecimiento = sedes.data?.find((s) => String(s.id) === sede)?.establecimientoId ?? sedes.data?.[0]?.establecimientoId
  const { data, isPending, error } = useInformeQuery({ establecimiento, sede, anio })
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
      <div className="grid max-w-xl gap-3 sm:grid-cols-2">
        <Combo id="inf-sede" label="Sede" value={sede} options={(sedes.data ?? []).map((s) => ({ value: String(s.id), label: s.nombre }))} onChange={(v) => { setSede(v); setAnio("") }} />
        <Combo id="inf-anio" label="Año" value={anio} disabled={!sede} placeholder={sede ? "Todos" : "Elegí Sede primero"} options={(anios.data ?? []).map((a) => ({ value: String(a.anio), label: String(a.anio) }))} onChange={setAnio} />
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
