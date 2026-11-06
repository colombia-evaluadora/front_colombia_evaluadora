"use no memo"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { FilePdfIcon, PencilIcon } from "@/components/ui/icons"

import { useCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import { ComboOpciones as Combo } from "@/features/gestion-estudiantil/convivencia/components/combo-opciones"
import { formatFecha } from "@/features/gestion-estudiantil/observador/api/ui-mappings"
import { descargarRemision } from "@/features/gestion-estudiantil/inclusion/orientacion/api/descargas"
import { useMisRemisionesQuery } from "@/features/gestion-estudiantil/inclusion/orientacion/api/query/use-orientacion-query"
import type { MiRemisionRow } from "@/features/gestion-estudiantil/inclusion/orientacion/api/types"
import { DialogRemitir } from "@/features/gestion-estudiantil/inclusion/orientacion/components/dialogs/dialog-remitir"
import { MenuFila } from "@/features/gestion-estudiantil/inclusion/orientacion/components/table/menu-fila"
import { TablaOrientacion } from "@/features/gestion-estudiantil/inclusion/orientacion/components/table/tabla-orientacion"
import { AvisoPiar } from "@/features/gestion-estudiantil/inclusion/piar/components/ui-piar"
import { mensajePiar } from "@/features/gestion-estudiantil/inclusion/piar/utils/errores-piar"

const COLOR_ESTADO: Record<string, "warning" | "success"> = {
  RECIBIDA: "warning",
  ATENDIDA: "success",
}

/** G.1.REP.3: las remisiones propias, solo con su estado (Regla 1). Los reportes de salud mental llegan con la Sección 9.6. */
export function TabMisRemisiones() {
  const [tipo, setTipo] = useState("")
  const [estado, setEstado] = useState("")
  const [pag, setPag] = useState({ i: 0, s: 10 })
  const [aviso, setAviso] = useState<string | null>(null)
  const [corregir, setCorregir] = useState<number | null>(null)
  const estados = useCatalogo("ESTADO_REMISION_ORIENTACION")
  const { data, isPending, isError, error, refetch } = useMisRemisionesQuery({ estado, pageIndex: pag.i, pageSize: pag.s })

  // Hoy solo hay remisiones; los reportes de 9.6 traerán su filtro de servidor.
  const filas = data?.rows ?? []
  const tipos = [...new Set(filas.map((f) => f.tipo))].map((t) => ({ value: t, label: t }))

  const columns: ColumnDef<MiRemisionRow>[] = [
    { id: "fecha", header: "Fecha", enableSorting: false, cell: ({ row }) => formatFecha(row.original.fecha) },
    { id: "estudiante", accessorKey: "estudiante_nombre", header: "Estudiante", enableSorting: false },
    { id: "grado", accessorKey: "grado_grupo", header: "Grado/Grupo", enableSorting: false },
    { id: "tipo", accessorKey: "tipo", header: "Tipo", enableSorting: false },
    {
      id: "estado",
      header: "Estado",
      enableSorting: false,
      cell: ({ row }) => (
        <Badge variant="soft" color={COLOR_ESTADO[row.original.estado_codigo] ?? "muted"}>
          <span>{row.original.estado_nombre}</span>
        </Badge>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      header: () => null,
      cell: ({ row }) => (
        <MenuFila etiqueta={`Acciones de la remisión de ${row.original.estudiante_nombre}`}>
          <DropdownMenuItem disabled={row.original.estado_codigo !== "RECIBIDA"} onClick={() => setCorregir(row.original.id)}>
            <PencilIcon />
            Corregir
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              const r = await descargarRemision(row.original.id)
              setAviso(r.status === "error" ? "No pudimos generar el documento. Inténtelo de nuevo en unos minutos." : null)
            }}
          >
            <FilePdfIcon />
            Descargar remisión
          </DropdownMenuItem>
        </MenuFila>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      {aviso && <AvisoPiar tipo="error">{aviso}</AvisoPiar>}
      <div className="flex flex-wrap items-center gap-4">
        <Combo inline className="w-64" id="mis-tipo" label="Tipo" value={tipo} options={tipos} onChange={setTipo} />
        <Combo inline className="w-64" id="mis-estado" label="Estado" value={estado} options={estados} onChange={(v) => { setEstado(v); setPag((p) => ({ ...p, i: 0 })) }} />
      </div>
      <TablaOrientacion
        titulo="Mis remisiones"
        sinTitulo
        columns={columns}
        rows={tipo ? filas.filter((f) => f.tipo === tipo) : filas}
        rowId={(r) => String(r.id)}
        pageIndex={pag.i}
        pageSize={pag.s}
        pageCount={data?.pageCount ?? 1}
        totalCount={data?.totalCount ?? 0}
        goToPage={(i) => setPag((p) => ({ ...p, i }))}
        setPageSize={(s) => setPag({ i: 0, s })}
        isPending={isPending}
        isError={isError}
        onRetry={() => refetch()}
        errorMessage={error ? mensajePiar(error) : undefined}
        emptyMessage="No ha registrado remisiones a orientación ni reportes de salud mental o de consumo."
      />
      {corregir && <DialogRemitir remisionId={corregir} onClose={() => setCorregir(null)} onRemitida={() => setCorregir(null)} />}
    </div>
  )
}
