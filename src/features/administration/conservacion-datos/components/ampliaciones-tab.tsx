"use no memo"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, DataTableColumnHeader } from "@/components/data-table"
import { useNotify } from "@/components/notice/notice-context"
import { Input } from "@/components/ui/input"
import { SelectCampo } from "@/features/administration/conservacion-datos/components/select-campo"
import { useDataTable } from "@/hooks/use-data-table"
import { getErrorMessage } from "@/lib/api-client"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { toDigitsOnly } from "@/lib/text-input"

import { useSaveAmpliacion } from "@/features/administration/conservacion-datos/api/mutations/conservacion-mutations"
import {
  useAmpliacionesQuery,
  useEstablecimientosConservacionQuery,
} from "@/features/administration/conservacion-datos/api/query/use-conservacion-queries"
import type { Ampliacion } from "@/features/administration/conservacion-datos/api/types"
import {
  ACCIONES_SIZE,
  AccionesFila,
  ErrorCampo,
} from "@/features/administration/parametros-edad/components/tabla-parametros"

const PLAZO_MENOR_MENSAJE = "El plazo del establecimiento no puede ser menor que el plazo mínimo."
const PLAZO_MAXIMO_MENSAJE = "Escriba un plazo de hasta 99 años."

/** pkPolitica de la fila de + Ampliación: ningún pk real es negativo. */
const NUEVA = -1

const anios = (n: number) => `${n} ${n === 1 ? "año" : "años"}`

interface Edicion {
  /** NUEVA = la fila agregada con + Ampliación. */
  pkPolitica: number
  /** Tipo de registro elegido en la fila nueva. */
  elegida?: number | null
  valor: string
  error?: string
}

/**
 * S.12.AMP.1: las ampliaciones del establecimiento, una por tipo de registro;
 * solo alargan el plazo. + Ampliación agrega una fila al final que se edita en
 * la fila (✓ guarda, ✕ cancela), igual que una ampliación existente. El
 * selector de establecimiento es solo del Superadministrador; el Administrador
 * y el Gestor ven el suyo (lo resuelve el back).
 */
export function AmpliacionesTab({
  esSuperAdmin,
  puedeEditar,
  nuevaAbierta,
  onCerrarNueva,
}: {
  esSuperAdmin: boolean
  puedeEditar: boolean
  /** + Ampliación del encabezado de la página. */
  nuevaAbierta: boolean
  onCerrarNueva: () => void
}) {
  const { notify } = useNotify()
  // Los establecimientos que el usuario puede elegir: todos para el
  // Superadministrador y los suyos para el resto. Con uno solo no hay selector.
  const establecimientos = useEstablecimientosConservacionQuery()
  const opcionesEe = establecimientos.data ?? []
  const conSelector = esSuperAdmin || opcionesEe.length > 1
  const [elegido, setElegido] = useState<number | null>(null)
  const pkEstablecimiento = elegido ?? opcionesEe[0]?.id ?? null
  const { data = [], isPending, isError, error, refetch } = useAmpliacionesQuery(
    pkEstablecimiento,
    pkEstablecimiento != null,
  )
  // El back lista todas las políticas activas no permanentes; la tabla muestra
  // las ampliadas y la fila nueva elige entre las que faltan.
  const ampliadas = data.filter((f) => f.pkAmpliacion != null)
  const sinAmpliar = data.filter((f) => f.pkAmpliacion == null)

  const [edicionFila, setEdicion] = useState<Edicion | null>(null)
  const edicion: Edicion | null = nuevaAbierta
    ? edicionFila?.pkPolitica === NUEVA
      ? edicionFila
      : { pkPolitica: NUEVA, elegida: null, valor: "" }
    : edicionFila?.pkPolitica === NUEVA
      ? null
      : edicionFila
  const cerrar = () => {
    setEdicion(null)
    if (nuevaAbierta) onCerrarNueva()
  }
  const elegidaNueva = sinAmpliar.find((f) => f.pkPolitica === edicion?.elegida)

  const save = useSaveAmpliacion({
    mutationConfig: {
      onSuccess: (_d, vars) => {
        cerrar()
        notify(vars.pkAmpliacion == null ? SUCCESS_MESSAGES.ampliacion.created : SUCCESS_MESSAGES.ampliacion.updated)
      },
      // 409: «Ya existe una ampliación para ese tipo de registro.»
      onError: (err) => notify(getErrorMessage(err), { variant: "error" }),
    },
  })

  // Submit del form que envuelve la tabla: ✓ y Enter guardan, como en Parámetros de edad.
  function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!edicion) return
    const plazo = Number(edicion.valor)
    if (edicion.pkPolitica === NUEVA) {
      if (!elegidaNueva) return setEdicion({ ...edicion, error: "Seleccione el tipo de registro." })
      if (!edicion.valor || plazo > 99) return setEdicion({ ...edicion, error: PLAZO_MAXIMO_MENSAJE })
      if (plazo < elegidaNueva.plazoMinimo) return setEdicion({ ...edicion, error: PLAZO_MENOR_MENSAJE })
      save.mutate({ pkAmpliacion: null, pkPolitica: elegidaNueva.pkPolitica, pkEstablecimiento, plazo })
      return
    }
    const fila = ampliadas.find((f) => f.pkPolitica === edicion.pkPolitica)
    if (!fila) return
    // Sin cambios no se guarda.
    if (plazo === fila.plazoEstablecimiento) return setEdicion(null)
    if (!edicion.valor || plazo > 99) return setEdicion({ ...edicion, error: PLAZO_MAXIMO_MENSAJE })
    if (plazo < fila.plazoMinimo) return setEdicion({ ...edicion, error: PLAZO_MENOR_MENSAJE })
    save.mutate({ pkAmpliacion: fila.pkAmpliacion, pkPolitica: fila.pkPolitica, pkEstablecimiento, plazo })
  }

  const inputPlazo = (fila: Ampliacion, etiqueta: string) => (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-2">
        <Input
          autoFocus={fila.pkPolitica !== NUEVA}
          inputMode="numeric"
          variant="outlined"
          size="sm"
          aria-label={`Plazo de ${etiqueta} en años`}
          aria-invalid={Boolean(edicion?.error)}
          className="h-8 w-14 text-center tabular-nums"
          value={edicion?.valor ?? ""}
          onChange={(e) => edicion && setEdicion({ ...edicion, valor: toDigitsOnly(e.target.value, 2), error: undefined })}
          onKeyDown={(e) => e.key === "Escape" && cerrar()}
        />
        <span className="text-muted-foreground">años</span>
      </div>
      <ErrorCampo mensaje={edicion?.error ?? null} />
    </div>
  )

  const columns: ColumnDef<Ampliacion>[] = [
    {
      id: "tipoRegistro",
      accessorKey: "tipoRegistro",
      meta: { label: "Tipo de registro" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de registro" />,
      cell: ({ row }) =>
        row.original.pkPolitica === NUEVA ? (
          <SelectCampo
            id="ampliacion-tipo"
            label="Tipo de registro"
            required
            className="w-full max-w-xs"
            value={edicion?.elegida != null ? String(edicion.elegida) : ""}
            options={sinAmpliar.map((f) => ({ value: String(f.pkPolitica), label: f.tipoRegistro }))}
            onChange={(v) =>
              edicion && setEdicion({ ...edicion, elegida: v ? Number(v) : null, error: undefined })
            }
          />
        ) : (
          <span className="font-medium">{row.original.tipoRegistro}</span>
        ),
      enableSorting: false,
    },
    {
      id: "plazoMinimo",
      accessorKey: "plazoMinimo",
      meta: { label: "Plazo mínimo" },
      header: () => <span className="block text-center">Plazo mínimo</span>,
      cell: ({ row }) => {
        const minimo = row.original.pkPolitica === NUEVA ? elegidaNueva?.plazoMinimo : row.original.plazoMinimo
        return (
          <span className="block text-center tabular-nums">{minimo != null ? anios(minimo) : "—"}</span>
        )
      },
      enableSorting: false,
      size: 140,
    },
    {
      id: "plazoEstablecimiento",
      accessorKey: "plazoEstablecimiento",
      meta: { label: "Plazo del establecimiento" },
      header: () => <span className="block text-center">Plazo del establecimiento</span>,
      cell: ({ row }) => {
        const fila = row.original
        if (fila.pkPolitica === NUEVA) return inputPlazo(fila, elegidaNueva?.tipoRegistro ?? "la ampliación")
        if (edicion?.pkPolitica === fila.pkPolitica) return inputPlazo(fila, fila.tipoRegistro)
        return (
          <span className="block text-center font-medium tabular-nums">
            {anios(fila.plazoEstablecimiento ?? fila.plazoMinimo)}
          </span>
        )
      },
      enableSorting: false,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const fila = row.original
        if (fila.pkPolitica !== NUEVA && !puedeEditar) return null
        return (
          <AccionesFila
            editando={edicion?.pkPolitica === fila.pkPolitica}
            puedeEditar={!edicion}
            guardando={save.isPending}
            etiqueta={fila.pkPolitica === NUEVA ? "la nueva ampliación" : fila.tipoRegistro}
            onModificar={() =>
              setEdicion({ pkPolitica: fila.pkPolitica, valor: String(fila.plazoEstablecimiento) })
            }
            onCancelar={cerrar}
          />
        )
      },
      enableSorting: false,
      enableHiding: false,
      size: ACCIONES_SIZE,
    },
  ]

  const filaNueva: Ampliacion = {
    pkPolitica: NUEVA,
    pkAmpliacion: null,
    tipoRegistro: "",
    plazoMinimo: 0,
    plazoEstablecimiento: null,
  }
  const filas = nuevaAbierta ? [...ampliadas, filaNueva] : ampliadas

  const { table } = useDataTable({
    columns,
    data: filas,
    pageCount: 1,
    getRowId: (row) => String(row.pkPolitica),
    pageIndex: 0,
    pageSize: Math.max(filas.length, 1),
    goToPage: () => {},
    setPageSize: () => {},
    sorting: [],
    setSorting: () => {},
  })

  return (
    <div className="flex flex-col gap-4">
      {conSelector ? (
        <SelectCampo
          id="ampliaciones-establecimiento"
          label="Establecimiento"
          className="w-full max-w-md"
          buscable
          value={pkEstablecimiento != null ? String(pkEstablecimiento) : ""}
          disabled={establecimientos.isPending}
          options={opcionesEe.map((e) => ({ value: String(e.id), label: e.name }))}
          onChange={(v) => {
            if (!v) return
            cerrar()
            setElegido(Number(v))
          }}
        />
      ) : null}
      <form onSubmit={guardar} aria-label="Ampliaciones" className="min-w-0">
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          errorMessage={error ? getErrorMessage(error) : undefined}
          emptyMessage={
            data.length === 0
              ? "No hay políticas activas con plazo. Cuando el Superadministrador las defina, podrá alargar sus plazos aquí."
              : "Este establecimiento no ha ampliado ningún plazo: rige el plazo mínimo de cada política."
          }
          isRowActive={(row) => row.original.pkPolitica === edicion?.pkPolitica}
        />
      </form>
    </div>
  )
}
