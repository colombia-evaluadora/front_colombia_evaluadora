import { useState } from "react"

import { Input } from "@/components/ui/input"
import { TableCell, TableHead, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { InfoIcon } from "@/components/ui/icons"
import { toDigitsOnly } from "@/lib/text-input"

import type { ListaValor } from "@/features/administration/listas-valor/api/types/lista-valor"
import {
  MESES,
  diasDelMes,
  formatCorte,
  type CorteCalendario,
} from "@/features/administration/parametros-edad/api/types"
import {
  AccionesFila,
  ErrorCampo,
  SelectFila,
  TablaParametros,
} from "@/features/administration/parametros-edad/components/tabla-parametros"

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
  puedeEliminar,
  onEliminar,
}: {
  filas: CorteCalendario[]
  opciones: ListaValor[]
  puedeEditar: boolean
  guardando: boolean
  onGuardar: (calendario: string, mes: number, dia: number) => Promise<unknown>
  puedeEliminar: boolean
  onEliminar: (codigo: string) => Promise<boolean>
}) {
  const [edicion, setEdicion] = useState<Edicion | null>(null)
  const [error, setError] = useState<string | null>(null)

  const ordenadas = [...filas].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
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
    if (!mes) return setError("Seleccione el mes.")
    if (mes === 2 && dia === 29) return setError("La fecha de corte no puede ser el 29 de febrero.")
    if (!dia || dia > diasDelMes(mes)) {
      return setError(`El día debe estar entre 1 y ${diasDelMes(mes)}.`)
    }
    try {
      await onGuardar(calendario, mes, dia)
      cancelar()
    } catch {
      // El aviso lo muestra la mutación; la fila sigue abierta para corregir.
    }
  }

  const campoFecha = (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Input
          inputMode="numeric"
          autoFocus={edicion?.calendario != null}
          aria-label="Día"
          aria-invalid={Boolean(error)}
          variant="outlined"
          size="sm"
          className="h-8 w-14 text-right tabular-nums"
          value={edicion?.dia ?? ""}
          onChange={(e) => setEdicion((p) => p && { ...p, dia: toDigitsOnly(e.target.value, 2) })}
        />
        <span className="text-muted-foreground">de</span>
        <SelectFila
          label="Mes"
          placeholder="Mes"
          className="w-36"
          opciones={MESES.map((m, i) => ({ value: String(i + 1), label: m }))}
          value={edicion?.mes ?? ""}
          onChange={(v) => setEdicion((p) => p && { ...p, mes: v })}
        />
      </div>
      <ErrorCampo mensaje={error} />
    </div>
  )

  return (
    <TablaParametros
      titulo="Fecha de corte por calendario"
      agregarLabel="Calendario"
      columnas={
        <>
          <TableHead>Calendario</TableHead>
          <TableHead>
            <span className="inline-flex items-center gap-1.5">
              Fecha de corte
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex text-muted-foreground" />}>
                  <InfoIcon className="size-3.5" />
                  <span className="sr-only">Qué es la fecha de corte</span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Día del año lectivo en el que se cuentan los años cumplidos del aspirante.
                </TooltipContent>
              </Tooltip>
            </span>
          </TableHead>
        </>
      }
      vacio={
        filas.length === 0 && edicion?.calendario !== null
          ? "Aún no hay fechas de corte. Use + Calendario para agregar la primera."
          : null
      }
      puedeAgregar={puedeEditar && libres.length > 0 && !edicion}
      onAgregar={() => setEdicion({ calendario: null, nuevoCalendario: "", mes: "", dia: "" })}
      onSubmit={guardar}
    >
      {edicion?.calendario === null && (
        <TableRow>
          <TableCell>
            <SelectFila
              label="Calendario"
              placeholder="Seleccione el calendario"
              opciones={libres.map((o) => ({ value: String(o.pkListaValor), label: o.nombre }))}
              value={edicion.nuevoCalendario}
              onChange={(v) => setEdicion((p) => p && { ...p, nuevoCalendario: v })}
            />
          </TableCell>
          <TableCell>{campoFecha}</TableCell>
          <TableCell>
            <AccionesFila
              editando
              puedeEditar={puedeEditar}
              guardando={guardando}
              etiqueta="calendario"
              onModificar={cancelar}
              onCancelar={cancelar}
            />
          </TableCell>
        </TableRow>
      )}
      {ordenadas.map((f) => {
        const editando = edicion?.calendario === f.calendario
        return (
          <TableRow key={f.calendario}>
            <TableCell>{f.nombre}</TableCell>
            <TableCell>{editando ? campoFecha : formatCorte(f.mes, f.dia)}</TableCell>
            <TableCell>
              <AccionesFila
                editando={editando}
                puedeEditar={puedeEditar && !edicion}
                guardando={guardando}
                etiqueta={f.nombre}
                onModificar={() =>
                  setEdicion({
                    calendario: f.calendario,
                    nuevoCalendario: "",
                    mes: String(f.mes),
                    dia: String(f.dia),
                  })
                }
                onCancelar={cancelar}
                eliminar={{
                  puede: puedeEliminar && !edicion,
                  descripcion: `Se quitará la fecha de corte del calendario ${f.nombre} y su situación de edad quedará Sin calcular.`,
                  onConfirm: () => onEliminar(f.calendario),
                }}
              />
            </TableCell>
          </TableRow>
        )
      })}
    </TablaParametros>
  )
}
