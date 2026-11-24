"use no memo"

import { useState } from "react"
import { createPortal } from "react-dom"
import type { ColumnDef } from "@tanstack/react-table"

import { TableScreenToolbar } from "@/components/layout/table-screen"
import { DataTable, DataTableColumnHeader } from "@/components/data-table"
import { useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { SelectCampo } from "@/features/administration/conservacion-datos/components/select-campo"
import { useDataTable } from "@/hooks/use-data-table"
import { getErrorMessage } from "@/lib/api-client"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { toDigitsOnly } from "@/lib/text-input"
import { useEstablishmentsOptionsQuery } from "@/features/establishment/institution/api/query/use-establishments-options"

import { useSaveAmpliacion } from "@/features/administration/conservacion-datos/api/mutations/conservacion-mutations"
import { useAmpliacionesQuery } from "@/features/administration/conservacion-datos/api/query/use-conservacion-queries"
import {
  AMPLIACION_REPETIDA_MENSAJE,
  PLAZO_MENOR_MENSAJE,
  type Ampliacion,
} from "@/features/administration/conservacion-datos/api/types"
import {
  ACCIONES_SIZE,
  AccionesFila,
  ErrorCampo,
  SelectFila,
} from "@/features/administration/parametros-edad/components/tabla-parametros"

const anios = (n: number) => `${n} ${n === 1 ? "año" : "años"}`

/** id de la fila de alta, que aún no tiene tipo de registro. */
const NUEVA = "nueva"

/** Fila en edición: `pkPolitica` null = alta (el tipo se elige en `nuevaPolitica`). */
interface Edicion {
  pkPolitica: number | null
  nuevaPolitica: string
  valor: string
  error?: string
}

interface Fila {
  id: string
  ampliacion: Ampliacion | null
}

/**
 * S.12.AMP.1 / AMP.1a: solo las ampliaciones existentes (una por establecimiento y tipo de registro);
 * un plazo solo se alarga. «Nueva ampliación» agrega una fila editable arriba de la tabla (el md la pone al
 * final; va primera como en Relaciones alumno-grupo y Parámetros de edad), con el tipo de registro entre las
 * políticas activas no permanentes que el establecimiento aún no amplió. El selector de establecimiento es
 * solo del Superadministrador; el Administrador y el Gestor ven el suyo (lo resuelve el back).
 */
export function AmpliacionesTab({
  esSuperAdmin,
  puedeCrear,
  puedeEditar,
  toolbarSlot,
}: {
  esSuperAdmin: boolean
  puedeCrear: boolean
  puedeEditar: boolean
  /** Lugar del encabezado donde va la barra de herramientas (bajo las pestañas). */
  toolbarSlot: HTMLElement | null
}) {
  const { notify } = useNotify()
  const establecimientos = useEstablishmentsOptionsQuery(esSuperAdmin)
  const [elegido, setElegido] = useState<number | null>(null)
  const pkEstablecimiento = esSuperAdmin ? (elegido ?? establecimientos.data?.[0]?.id ?? null) : null
  const { data = [], isPending, isError, error, refetch } = useAmpliacionesQuery(
    pkEstablecimiento,
    !esSuperAdmin || pkEstablecimiento != null,
  )
  // El back devuelve todas las políticas activas no permanentes: las ampliadas se listan y las demás se
  // ofrecen al agregar.
  const existentes = data.filter((f) => f.pkAmpliacion != null)
  const libres = data.filter((f) => f.pkAmpliacion == null)

  const [edicion, setEdicion] = useState<Edicion | null>(null)
  const save = useSaveAmpliacion({
    mutationConfig: {
      onSuccess: (_r, v) => {
        setEdicion(null)
        notify(v.pkAmpliacion == null ? SUCCESS_MESSAGES.ampliacion.created : SUCCESS_MESSAGES.ampliacion.updated)
      },
      // La fila sigue abierta para corregir (409: «Ya existe una ampliación…»).
      onError: (err) => notify(getErrorMessage(err), { variant: "error" }),
    },
  })

  const conError = (mensaje: string) => edicion && setEdicion({ ...edicion, error: mensaje })

  // Submit del form que envuelve la tabla: ✓ y Enter guardan, como en Parámetros de edad.
  function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!edicion) return
    const nueva = edicion.pkPolitica == null
    const pkPolitica = nueva ? Number(edicion.nuevaPolitica) : edicion.pkPolitica
    const fila = data.find((f) => f.pkPolitica === pkPolitica)
    if (nueva && !edicion.nuevaPolitica) return conError("Seleccione el tipo de registro.")
    if (!fila) return
    if (nueva && fila.pkAmpliacion != null) return conError(AMPLIACION_REPETIDA_MENSAJE)
    const plazo = Number(edicion.valor)
    // Sin cambios no se guarda.
    if (!nueva && plazo === fila.plazoEstablecimiento) return setEdicion(null)
    if (!edicion.valor || plazo > 99) return conError("Escriba un plazo de hasta 99 años.")
    if (plazo < fila.plazoMinimo) return conError(PLAZO_MENOR_MENSAJE)
    save.mutate({ pkAmpliacion: fila.pkAmpliacion, pkPolitica: fila.pkPolitica, pkEstablecimiento, plazo })
  }

  const editandoId = edicion ? (edicion.pkPolitica == null ? NUEVA : String(edicion.pkPolitica)) : null
  const nuevaElegida = libres.find((f) => String(f.pkPolitica) === edicion?.nuevaPolitica)

  const campoPlazo = (etiqueta: string) => (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-2">
        <Input
          autoFocus={edicion?.pkPolitica != null}
          inputMode="numeric"
          variant="outlined"
          aria-label={`Plazo de ${etiqueta} en años`}
          aria-invalid={Boolean(edicion?.error)}
          className="h-10 w-16 text-center tabular-nums"
          value={edicion?.valor ?? ""}
          onChange={(e) => edicion && setEdicion({ ...edicion, valor: toDigitsOnly(e.target.value, 2), error: undefined })}
          onKeyDown={(e) => e.key === "Escape" && setEdicion(null)}
        />
        <span className="text-muted-foreground">años</span>
      </div>
      <ErrorCampo mensaje={edicion?.error ?? null} />
    </div>
  )

  const columns: ColumnDef<Fila>[] = [
    {
      id: "tipoRegistro",
      accessorFn: (r) => r.ampliacion?.tipoRegistro ?? "",
      meta: { label: "Tipo de registro" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de registro" />,
      cell: ({ row }) => {
        const a = row.original.ampliacion
        if (a) return <span className="font-medium">{a.tipoRegistro}</span>
        return (
          <SelectFila
            label="Tipo de registro"
            placeholder="Seleccione el tipo de registro"
            opciones={libres.map((f) => ({ value: String(f.pkPolitica), label: f.tipoRegistro }))}
            value={edicion?.nuevaPolitica ?? ""}
            onChange={(v) => edicion && setEdicion({ ...edicion, nuevaPolitica: v, error: undefined })}
          />
        )
      },
      enableSorting: false,
    },
    {
      id: "plazoMinimo",
      meta: { label: "Plazo mínimo" },
      header: () => <span className="block text-center">Plazo mínimo</span>,
      cell: ({ row }) => {
        const minimo = row.original.ampliacion?.plazoMinimo ?? nuevaElegida?.plazoMinimo
        return (
          <span className="block text-center tabular-nums">
            {minimo != null ? anios(minimo) : <span className="text-muted-foreground">—</span>}
          </span>
        )
      },
      enableSorting: false,
    },
    {
      id: "plazoEstablecimiento",
      meta: { label: "Plazo del establecimiento" },
      header: () => <span className="block text-center">Plazo del establecimiento</span>,
      cell: ({ row }) => {
        const a = row.original.ampliacion
        if (row.id === editandoId) return campoPlazo(a?.tipoRegistro ?? nuevaElegida?.tipoRegistro ?? "la ampliación")
        return <span className="block text-center font-medium tabular-nums">{anios(a!.plazoEstablecimiento!)}</span>
      },
      enableSorting: false,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const a = row.original.ampliacion
        if (!puedeEditar && !(puedeCrear && !a)) return null
        return (
          <AccionesFila
            editando={row.id === editandoId}
            puedeEditar={puedeEditar && !edicion}
            guardando={save.isPending}
            etiqueta={a?.tipoRegistro ?? "ampliación"}
            onModificar={() =>
              a && setEdicion({ pkPolitica: a.pkPolitica, nuevaPolitica: "", valor: String(a.plazoEstablecimiento) })
            }
            onCancelar={() => setEdicion(null)}
          />
        )
      },
      enableSorting: false,
      enableHiding: false,
      size: ACCIONES_SIZE,
    },
  ]

  const filas: Fila[] = [
    ...(edicion?.pkPolitica === null ? [{ id: NUEVA, ampliacion: null }] : []),
    ...existentes.map((a) => ({ id: String(a.pkPolitica), ampliacion: a })),
  ]

  const { table } = useDataTable({
    columns,
    data: filas,
    pageCount: 1,
    getRowId: (row) => row.id,
    pageIndex: 0,
    pageSize: Math.max(filas.length, 1),
    goToPage: () => {},
    setPageSize: () => {},
    sorting: [],
    setSorting: () => {},
  })

  const sinLibres = !isPending && libres.length === 0
  const botonNueva = (
    <Button
      color="primary"
      size="sm"
      disabled={Boolean(edicion) || sinLibres || isPending}
      onClick={() => setEdicion({ pkPolitica: null, nuevaPolitica: "", valor: "" })}
    >
      <ControlPointIcon data-icon="inline-start" />
      Nueva ampliación
    </Button>
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Línea de herramientas: establecimiento (solo Superadministrador) a la izquierda y el botón a la derecha. */}
      {/* En el encabezado, bajo las pestañas, como la barra de las demás vistas (con su línea de cierre). */}
      {toolbarSlot
        ? createPortal(
            <TableScreenToolbar>
        {esSuperAdmin ? (
          <SelectCampo
            id="ampliaciones-establecimiento"
            label="Establecimiento"
            className="w-full max-w-md"
            buscable
            value={pkEstablecimiento != null ? String(pkEstablecimiento) : ""}
            disabled={establecimientos.isPending}
            options={(establecimientos.data ?? []).map((e) => ({ value: String(e.id), label: e.name }))}
            onChange={(v) => {
              if (!v) return
              setEdicion(null)
              setElegido(Number(v))
            }}
          />
        ) : (
          <span />
        )}
        {puedeCrear ? (
          sinLibres ? (
            // Apagado con motivo: el botón deshabilitado no recibe el hover, lo recibe el span.
            <Tooltip>
              <TooltipTrigger render={<span tabIndex={0} className="inline-flex rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50" />}>
                {botonNueva}
              </TooltipTrigger>
              <TooltipContent>Todos los tipos de registro con plazo ya tienen ampliación en este establecimiento.</TooltipContent>
            </Tooltip>
          ) : (
            botonNueva
          )
        ) : null}
            </TableScreenToolbar>,
            toolbarSlot,
          )
        : null}
      <form onSubmit={guardar} aria-label="Ampliaciones" className="min-w-0">
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          errorMessage={error ? getErrorMessage(error) : undefined}
          emptyMessage={
            puedeCrear
              ? "Aún no hay ampliaciones en este establecimiento. Use Nueva ampliación para agregar la primera."
              : "Aún no hay ampliaciones en este establecimiento."
          }
          isRowActive={(row) => row.id === editandoId}
        />
      </form>
    </div>
  )
}
