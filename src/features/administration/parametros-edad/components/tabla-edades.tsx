"use no memo"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"

import type { ListaValor } from "@/features/administration/listas-valor/api/types/lista-valor"
import {
  CORTES,
  type Cortes,
  type CortesGrado,
  type EdadGrado,
} from "@/features/administration/parametros-edad/api/types"
import { DialogEdadGrado } from "@/features/administration/parametros-edad/components/dialog-edad-grado"
import { EscalaSituacion } from "@/features/administration/parametros-edad/components/escala-situacion"
import {
  ACCIONES_SIZE,
  AccionesFila,
  TablaParametros,
  type FilaParametro,
} from "@/features/administration/parametros-edad/components/tabla-parametros"

/** Diálogo abierto: `fila` null = alta. */
interface Dialogo {
  fila: EdadGrado | null
}

const sinEnvio = (e: React.FormEvent) => e.preventDefault()

export function TablaEdades({
  filas,
  opciones,
  defecto,
  puedeEditar,
  guardando,
  onGuardar,
}: {
  filas: EdadGrado[]
  opciones: ListaValor[]
  /** Cortes por defecto: rigen donde el grado no tiene uno propio. */
  defecto: Cortes
  puedeEditar: boolean
  guardando: boolean
  onGuardar: (grado: string, edad: number, cortes: CortesGrado, nuevo: boolean) => Promise<unknown>
}) {
  // La edición va en un diálogo: son cinco campos y la regla tiene que verse mientras se escribe.
  const [dialogo, setDialogo] = useState<Dialogo | null>(null)

  // Se sigue el orden de la lista GRADO (Prejardín → Undécimo).
  const orden = new Map(opciones.map((o, i) => [String(o.pkListaValor), i]))
  const ordenadas = [...filas].sort(
    (a, b) => (orden.get(a.grado) ?? 999) - (orden.get(b.grado) ?? 999),
  )
  const libres = opciones.filter(
    (o) => o.habilitado && !filas.some((f) => f.grado === String(o.pkListaValor)),
  )

  // Cortes que rigen para el grado: los propios o, si faltan, los por defecto.
  const vigentes = (f: CortesGrado): Cortes => ({
    bajaEdadHasta: f.bajaEdadHasta ?? defecto.bajaEdadHasta,
    preextraedadDesde: f.preextraedadDesde ?? defecto.preextraedadDesde,
    extraedadDesde: f.extraedadDesde ?? defecto.extraedadDesde,
  })
  const tienePropios = (f: CortesGrado) => CORTES.some((c) => f[c.campo] != null)

  const columns: ColumnDef<FilaParametro<EdadGrado>>[] = [
    {
      id: "grado",
      accessorFn: (r) => r.fila?.nombre ?? "",
      meta: { label: "Grado" },
      enableHiding: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Grado" />,
      cell: ({ row }) => {
        const f = row.original.fila!
        return (
          <span className="inline-flex items-center gap-2">
            {f.nombre}
            {tienePropios(f) && (
              <Badge variant="outline" color="warning">
                Cortes propios
              </Badge>
            )}
          </span>
        )
      },
    },
    {
      id: "edad",
      accessorFn: (r) => r.fila?.edad ?? 0,
      meta: { label: "Edad recomendada" },
      enableHiding: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Edad recomendada" className="justify-end" />
      ),
      cell: ({ row }) => (
        <span className="block text-right tabular-nums">{row.original.fila!.edad} años</span>
      ),
    },
    {
      id: "situacion",
      meta: { label: "Edad cumplida por situación" },
      enableHiding: false,
      enableSorting: false,
      header: () => "Edad cumplida por situación",
      cell: ({ row }) => {
        const f = row.original.fila!
        return <EscalaSituacion cortes={vigentes(f)} edad={f.edad} className="min-w-72" />
      },
    },
    {
      id: "actions",
      size: ACCIONES_SIZE,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const f = row.original.fila!
        return (
          <AccionesFila
            editando={false}
            puedeEditar={puedeEditar}
            guardando={guardando}
            etiqueta={f.nombre}
            onModificar={() => setDialogo({ fila: f })}
            onCancelar={() => {}}
          />
        )
      },
    },
  ]

  return (
    <>
      <TablaParametros
        titulo="Edad recomendada por grado"
        agregarLabel="Grado"
        columns={columns}
        data={ordenadas.map((f) => ({ id: f.grado, fila: f }))}
        editandoId={null}
        emptyMessage="Aún no hay edades recomendadas. Use + Grado para agregar la primera."
        puedeAgregar={puedeEditar && libres.length > 0}
        onAgregar={() => setDialogo({ fila: null })}
        onSubmit={sinEnvio}
        valorOrden={(f, columna) => (columna === "edad" ? f.edad : (orden.get(f.grado) ?? 999))}
      />
      {dialogo && (
        <DialogEdadGrado
          key={dialogo.fila?.grado ?? "nuevo"}
          open
          fila={dialogo.fila}
          opciones={libres}
          defecto={defecto}
          guardando={guardando}
          onOpenChange={(abierto) => !abierto && setDialogo(null)}
          onGuardar={onGuardar}
        />
      )}
    </>
  )
}
