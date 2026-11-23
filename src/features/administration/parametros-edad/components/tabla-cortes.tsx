"use no memo"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"
import { MesDiaField } from "@/components/mes-dia-field"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { InfoIcon } from "@/components/ui/icons"

import type { ListaValor } from "@/features/administration/listas-valor/api/types/lista-valor"
import {
  diasDelMes,
  formatCorte,
  type CorteCalendario,
} from "@/features/administration/parametros-edad/api/types"
import {
  ACCIONES_SIZE,
  AccionesFila,
  ErrorCampo,
  SelectFila,
  TablaParametros,
  type FilaParametro,
} from "@/features/administration/parametros-edad/components/tabla-parametros"

/** id de la fila de alta, que aún no tiene calendario. */
const NUEVO = "nuevo"

/** Fila en edición: `calendario` null = alta nueva. */
interface Edicion {
  calendario: string | null
  nuevoCalendario: string
  mes: string
  dia: string
}

export function TablaCortes({
  filas,
  opciones,
  puedeEditar,
  guardando,
  onGuardar,
}: {
  filas: CorteCalendario[]
  opciones: ListaValor[]
  puedeEditar: boolean
  guardando: boolean
  onGuardar: (calendario: string, mes: number, dia: number, nuevo: boolean) => Promise<unknown>
}) {
  const [edicion, setEdicion] = useState<Edicion | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Por defecto, el orden de la lista CALENDARIO, como en grados.
  const posicion = new Map(opciones.map((o, i) => [String(o.pkListaValor), i]))
  const ordenadas = [...filas].sort(
    (a, b) => (posicion.get(a.calendario) ?? 999) - (posicion.get(b.calendario) ?? 999),
  )
  const libres = opciones.filter(
    (o) => o.habilitado && !filas.some((f) => f.calendario === String(o.pkListaValor)),
  )

  function cancelar() {
    setEdicion(null)
    setError(null)
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!edicion) return
    const calendario = edicion.calendario ?? edicion.nuevoCalendario
    const mes = Number(edicion.mes)
    const dia = Number(edicion.dia)
    // Sin cambios no se guarda: no hay nada que confirmar.
    if (filas.some((f) => f.calendario === edicion.calendario && f.mes === mes && f.dia === dia)) {
      return cancelar()
    }
    if (!calendario) return setError("Seleccione el calendario.")
    if (edicion.calendario == null && filas.some((f) => f.calendario === calendario)) {
      return setError("El calendario ya tiene una fecha de corte.")
    }
    if (!mes || !dia) return setError("Seleccione la fecha de corte.")
    if (mes === 2 && dia === 29) return setError("La fecha de corte no puede ser el 29 de febrero.")
    if (!dia || dia > diasDelMes(mes)) {
      return setError(`El día debe estar entre 1 y ${diasDelMes(mes)}.`)
    }
    try {
      await onGuardar(calendario, mes, dia, edicion.calendario == null)
      cancelar()
    } catch {
      // El aviso lo muestra la mutación; la fila sigue abierta para corregir.
    }
  }

  // Mes y día en un solo calendario sin año, como la fecha de Festivos (no ofrece el 29 de febrero).
  const campoFecha = (
    // `pr-24`: los botones × y √ de la fila en edición flotan sobre el final de la fila y taparían la fecha.
    <div className="flex flex-col gap-1 pr-24">
      <MesDiaField
        id="corte-calendario-fecha"
        label={null}
        descripcion={null}
        className="w-48"
        mes={Number(edicion?.mes ?? 0)}
        dia={edicion?.dia ?? ""}
        onChange={(mes, dia) => {
          setError(null)
          setEdicion((p) => p && { ...p, mes: String(mes), dia: String(dia) })
        }}
      />
      <ErrorCampo mensaje={error} />
    </div>
  )

  const data: FilaParametro<CorteCalendario>[] = [
    ...(edicion?.calendario === null ? [{ id: NUEVO, fila: null }] : []),
    ...ordenadas.map((f) => ({ id: f.calendario, fila: f })),
  ]
  const editandoId = edicion ? (edicion.calendario ?? NUEVO) : null

  const columns: ColumnDef<FilaParametro<CorteCalendario>>[] = [
    {
      id: "calendario",
      accessorFn: (r) => r.fila?.nombre ?? "",
      meta: { label: "Calendario" },
      enableHiding: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Calendario" />,
      cell: ({ row }) => {
        const f = row.original.fila
        if (f) return f.nombre
        return (
          <SelectFila
            label="Calendario"
            placeholder="Seleccione el calendario"
            opciones={libres.map((o) => ({ value: String(o.pkListaValor), label: o.nombre }))}
            value={edicion?.nuevoCalendario ?? ""}
            onChange={(v) => setEdicion((p) => p && { ...p, nuevoCalendario: v })}
          />
        )
      },
    },
    {
      id: "corte",
      accessorFn: (r) => (r.fila ? r.fila.mes * 100 + r.fila.dia : 0),
      meta: { label: "Fecha de corte" },
      enableHiding: false,
      header: ({ column }) => (
        <span className="inline-flex items-center gap-1.5">
          <DataTableColumnHeader column={column} title="Fecha de corte" />
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex text-muted-foreground" />}>
              <InfoIcon className="size-3.5" />
              <span className="sr-only">Qué es la fecha de corte</span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Día del año lectivo en el que se cuentan los años cumplidos del aspirante. No admite el 29 de febrero.
            </TooltipContent>
          </Tooltip>
        </span>
      ),
      cell: ({ row }) => {
        const f = row.original.fila
        if (row.id === editandoId || !f) return campoFecha
        return formatCorte(f.mes, f.dia)
      },
    },
    {
      id: "actions",
      size: ACCIONES_SIZE,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const f = row.original.fila
        return (
          <AccionesFila
            editando={row.id === editandoId}
            puedeEditar={puedeEditar && !edicion}
            guardando={guardando}
            etiqueta={f?.nombre ?? "calendario"}
            onModificar={() =>
              f &&
              setEdicion({
                calendario: f.calendario,
                nuevoCalendario: "",
                mes: String(f.mes),
                dia: String(f.dia),
              })
            }
            onCancelar={cancelar}
          />
        )
      },
    },
  ]

  return (
    <TablaParametros
      titulo="Fecha de corte por calendario"
      enmarcada
      agregarLabel="Agregar calendario"
      agregarBloqueado={libres.length === 0 ? "Todos los calendarios ya tienen fecha de corte." : undefined}
      columns={columns}
      data={data}
      editandoId={editandoId}
      emptyMessage="Aún no hay fechas de corte. Use Agregar calendario para agregar la primera."
      puedeAgregar={puedeEditar && libres.length > 0 && !edicion}
      onAgregar={() => setEdicion({ calendario: null, nuevoCalendario: "", mes: "", dia: "" })}
      onSubmit={guardar}
      valorOrden={(f, columna) => (columna === "corte" ? f.mes * 100 + f.dia : f.nombre)}
    />
  )
}
