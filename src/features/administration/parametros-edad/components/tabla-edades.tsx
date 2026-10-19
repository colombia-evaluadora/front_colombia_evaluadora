"use no memo"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { Input } from "@/components/ui/input"
import { toDigitsOnly } from "@/lib/text-input"

import type { ListaValor } from "@/features/administration/listas-valor/api/types/lista-valor"
import {
  EDAD_MAX,
  EDAD_MIN,
  type EdadGrado,
} from "@/features/administration/parametros-edad/api/types"
import {
  ACCIONES_SIZE,
  AccionesFila,
  ErrorCampo,
  SelectFila,
  TablaParametros,
  type FilaParametro,
} from "@/features/administration/parametros-edad/components/tabla-parametros"

/** id de la fila de alta, que aún no tiene grado. */
const NUEVO = "nuevo"

/** Fila en edición: `grado` null = alta nueva. */
interface Edicion {
  grado: string | null
  nuevoGrado: string
  edad: string
}

export function TablaEdades({
  filas,
  opciones,
  puedeEditar,
  guardando,
  onGuardar,
  puedeEliminar,
  onEliminar,
}: {
  filas: EdadGrado[]
  opciones: ListaValor[]
  puedeEditar: boolean
  guardando: boolean
  onGuardar: (grado: string, edad: number, nuevo: boolean) => Promise<unknown>
  puedeEliminar: boolean
  onEliminar: (codigo: string) => Promise<boolean>
}) {
  const [edicion, setEdicion] = useState<Edicion | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Se sigue el orden de la lista GRADO (Prejardín → Undécimo).
  const orden = new Map(opciones.map((o, i) => [String(o.pkListaValor), i]))
  const ordenadas = [...filas].sort(
    (a, b) => (orden.get(a.grado) ?? 999) - (orden.get(b.grado) ?? 999),
  )
  const libres = opciones.filter(
    (o) => o.habilitado && !filas.some((f) => f.grado === String(o.pkListaValor)),
  )

  function cancelar() {
    setEdicion(null)
    setError(null)
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!edicion) return
    const grado = edicion.grado ?? edicion.nuevoGrado
    const edad = Number(edicion.edad)
    // Sin cambios no se guarda: no hay nada que confirmar.
    if (filas.some((f) => f.grado === edicion.grado && f.edad === edad)) return cancelar()
    if (!grado) return setError("Seleccione el grado.")
    if (edicion.grado == null && filas.some((f) => f.grado === grado)) {
      return setError("El grado ya tiene una edad recomendada.")
    }
    if (!edicion.edad || edad < EDAD_MIN || edad > EDAD_MAX) {
      return setError(`La edad debe estar entre ${EDAD_MIN} y ${EDAD_MAX} años.`)
    }
    try {
      await onGuardar(grado, edad, edicion.grado == null)
      cancelar()
    } catch {
      // El aviso lo muestra la mutación; la fila sigue abierta para corregir.
    }
  }

  const campoEdad = (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <Input
          inputMode="numeric"
          autoFocus={edicion?.grado != null}
          aria-label="Edad recomendada"
          aria-invalid={Boolean(error)}
          variant="outlined"
          size="sm"
          className="h-8 w-16 text-right tabular-nums"
          value={edicion?.edad ?? ""}
          onChange={(e) => setEdicion((p) => p && { ...p, edad: toDigitsOnly(e.target.value, 2) })}
        />
        <span className="text-muted-foreground">años</span>
      </div>
      <ErrorCampo mensaje={error} />
    </div>
  )

  const data: FilaParametro<EdadGrado>[] = [
    ...(edicion?.grado === null ? [{ id: NUEVO, fila: null }] : []),
    ...ordenadas.map((f) => ({ id: f.grado, fila: f })),
  ]
  const editandoId = edicion ? (edicion.grado ?? NUEVO) : null

  const columns: ColumnDef<FilaParametro<EdadGrado>>[] = [
    {
      id: "grado",
      meta: { label: "Grado" },
      header: "Grado",
      cell: ({ row }) => {
        const f = row.original.fila
        if (f) return f.nombre
        return (
          <SelectFila
            label="Grado"
            placeholder="Seleccione el grado"
            opciones={libres.map((o) => ({ value: String(o.pkListaValor), label: o.nombre }))}
            value={edicion?.nuevoGrado ?? ""}
            onChange={(v) => setEdicion((p) => p && { ...p, nuevoGrado: v })}
          />
        )
      },
    },
    {
      id: "edad",
      meta: { label: "Edad recomendada" },
      header: () => <span className="block text-right">Edad recomendada</span>,
      cell: ({ row }) => {
        const f = row.original.fila
        if (row.id === editandoId || !f) return campoEdad
        return <span className="block text-right tabular-nums">{f.edad} años</span>
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
            etiqueta={f?.nombre ?? "grado"}
            onModificar={() =>
              f && setEdicion({ grado: f.grado, nuevoGrado: "", edad: String(f.edad) })
            }
            onCancelar={cancelar}
            eliminar={
              f
                ? {
                    puede: puedeEliminar && !edicion,
                    descripcion: `Se quitará la edad recomendada de ${f.nombre} y su situación de edad quedará Sin calcular.`,
                    onConfirm: () => onEliminar(f.grado),
                  }
                : undefined
            }
          />
        )
      },
    },
  ]

  return (
    <TablaParametros
      titulo="Edad recomendada por grado"
      agregarLabel="Grado"
      columns={columns}
      data={data}
      editandoId={editandoId}
      emptyMessage="Aún no hay edades recomendadas. Use + Grado para agregar la primera."
      puedeAgregar={puedeEditar && libres.length > 0 && !edicion}
      onAgregar={() => setEdicion({ grado: null, nuevoGrado: "", edad: "" })}
      onSubmit={guardar}
    />
  )
}
