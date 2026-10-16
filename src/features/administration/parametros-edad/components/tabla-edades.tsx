import { useState } from "react"

import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { TableCell, TableHead, TableRow } from "@/components/ui/table"
import { toDigitsOnly } from "@/lib/text-input"

import type { ListaValor } from "@/features/administration/listas-valor/api/types/lista-valor"
import {
  EDAD_MAX,
  EDAD_MIN,
  type EdadGrado,
} from "@/features/administration/parametros-edad/api/types"
import {
  AccionesFila,
  ErrorCampo,
  TablaParametros,
} from "@/features/administration/parametros-edad/components/tabla-parametros"

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
}: {
  filas: EdadGrado[]
  opciones: ListaValor[]
  puedeEditar: boolean
  guardando: boolean
  onGuardar: (grado: string, edad: number) => Promise<unknown>
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
    if (!grado) return setError("Seleccione el grado.")
    if (edicion.grado == null && filas.some((f) => f.grado === grado)) {
      return setError("El grado ya tiene una edad recomendada.")
    }
    if (!edicion.edad || edad < EDAD_MIN || edad > EDAD_MAX) {
      return setError(`La edad debe estar entre ${EDAD_MIN} y ${EDAD_MAX} años.`)
    }
    try {
      await onGuardar(grado, edad)
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
          className="h-9 w-16 text-right tabular-nums"
          value={edicion?.edad ?? ""}
          onChange={(e) => setEdicion((p) => p && { ...p, edad: toDigitsOnly(e.target.value, 2) })}
        />
        <span className="text-muted-foreground">años</span>
      </div>
      <ErrorCampo mensaje={error} />
    </div>
  )

  return (
    <TablaParametros
      titulo="Edad recomendada por grado"
      agregarLabel="Grado"
      columnas={
        <>
          <TableHead>Grado</TableHead>
          <TableHead className="text-right">Edad recomendada</TableHead>
        </>
      }
      vacio={
        filas.length === 0 && edicion?.grado !== null
          ? "Aún no hay edades recomendadas. Use + Grado para agregar la primera."
          : null
      }
      puedeAgregar={puedeEditar && libres.length > 0 && !edicion}
      onAgregar={() => setEdicion({ grado: null, nuevoGrado: "", edad: "" })}
      onSubmit={guardar}
    >
      {edicion?.grado === null && (
        <TableRow>
          <TableCell>
            <NativeSelect
              size="sm"
              autoFocus
              aria-label="Grado"
              value={edicion.nuevoGrado}
              onChange={(e) => setEdicion((p) => p && { ...p, nuevoGrado: e.target.value })}
            >
              <NativeSelectOption value="">Seleccione el grado</NativeSelectOption>
              {libres.map((o) => (
                <NativeSelectOption key={String(o.pkListaValor)} value={String(o.pkListaValor)}>
                  {o.nombre}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </TableCell>
          <TableCell>{campoEdad}</TableCell>
          <TableCell>
            <AccionesFila
              editando
              puedeEditar={puedeEditar}
              guardando={guardando}
              etiqueta="grado"
              onModificar={cancelar}
              onCancelar={cancelar}
            />
          </TableCell>
        </TableRow>
      )}
      {ordenadas.map((f) => {
        const editando = edicion?.grado === f.grado
        return (
          <TableRow key={f.grado}>
            <TableCell>{f.nombre}</TableCell>
            <TableCell className="text-right tabular-nums">
              {editando ? campoEdad : `${f.edad} años`}
            </TableCell>
            <TableCell>
              <AccionesFila
                editando={editando}
                puedeEditar={puedeEditar && !edicion}
                guardando={guardando}
                etiqueta={f.nombre}
                onModificar={() =>
                  setEdicion({ grado: f.grado, nuevoGrado: "", edad: String(f.edad) })
                }
                onCancelar={cancelar}
              />
            </TableCell>
          </TableRow>
        )
      })}
    </TablaParametros>
  )
}
