"use no memo"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { format, parseISO } from "date-fns"
import { toast } from "sonner"
import { z } from "zod"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowLeftIcon, EyeIcon, LockIcon, XIcon } from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { useDataTable } from "@/hooks/use-data-table"
import { Paginas, usePaginado } from "./paginado-territorial"
import { getErrorMessage } from "@/lib/api-client"
import { useAppForm } from "@/lib/forms"
import { cn } from "@/lib/utils"

import { useLiberarUbicacion } from "@/features/coverage/inscripcion-reservas/api/mutations/territorial"
import { useUbicadosQuery } from "@/features/coverage/inscripcion-reservas/api/query/use-territorial-query"
import type {
  EstadoUbicacion,
  TipoCupo,
  UbicadoSinGrupo,
} from "@/features/coverage/inscripcion-reservas/api/types/territorial"
import {
  AccionFila as Accion,
  BotonExportar,
  Buscador,
  Cargando,
  exportarCsv,
  FIJA,
  Ficha,
  nombre,
  num,
  siNo,
  useBusquedaTerritorial,
  wrap,
} from "@/features/coverage/inscripcion-reservas/components/table/territorial-comunes"

const TIPO_CUPO: Record<TipoCupo, string> = { OFICIAL: "Oficial", CONTRATADO: "Contratado" }
const ESTADO_UBICACION: Record<EstadoUbicacion, string> = {
  RESERVADA: "Reservada",
  PENDIENTE_CONFIRMACION: "Pendiente de confirmación",
}

const coincide = (x: { numero: string; aspirante: string }, q: string) =>
  !q || x.numero.includes(q) || x.aspirante.toLowerCase().includes(q)

export function UbicadosLista({ ver }: { ver: (id: number) => void }) {
  const { data = [], isPending, isError, error, refetch } = useUbicadosQuery()
  const { texto, setTexto, q } = useBusquedaTerritorial()
  const [tipo, setTipo] = useState("")
  const [liberar, setLiberar] = useState<UbicadoSinGrupo | null>(null)
  const filas = data.filter((u) => coincide(u, q) && (!tipo || u.tipoCupo === tipo))

  const columns: ColumnDef<UbicadoSinGrupo>[] = [
    {
      id: "aspirante",
      accessorFn: () => null,
      header: "Inscripción y aspirante",
      meta: { label: "Inscripción y aspirante", className: cn(FIJA, "left-10") },
      cell: ({ row }) => <span className={wrap}>{nombre(row.original)}</span>,
    },
    {
      id: "establecimiento",
      accessorFn: () => null,
      header: "Establecimiento",
      meta: { label: "Establecimiento" },
      cell: ({ row }) => row.original.establecimiento,
    },
    {
      id: "sede",
      accessorFn: () => null,
      header: "Sede",
      meta: { label: "Sede" },
      cell: ({ row }) => row.original.sede,
    },
    {
      id: "jornada",
      accessorFn: () => null,
      header: "Jornada",
      meta: { label: "Jornada" },
      cell: ({ row }) => row.original.jornada,
    },
    {
      id: "tipo",
      accessorFn: () => null,
      header: "Tipo de cupo",
      meta: { label: "Tipo de cupo" },
      cell: ({ row }) => TIPO_CUPO[row.original.tipoCupo],
    },
    {
      id: "confirmada",
      accessorFn: () => null,
      header: () => <span className={wrap}>Confirmada por el acudiente</span>,
      meta: { label: "Confirmada por el acudiente" },
      cell: ({ row }) => siNo(row.original.confirmadaAcudiente),
    },
    {
      id: "fecha",
      accessorFn: () => null,
      header: "Fecha de la reserva",
      meta: { label: "Fecha de la reserva" },
      cell: ({ row }) => (
        <span className={num}>{format(parseISO(row.original.fechaReserva), "dd/MM/yyyy")}</span>
      ),
    },
    {
      id: "limite",
      accessorFn: () => null,
      header: () => <span className={wrap}>Días para el límite</span>,
      meta: { label: "Días para el límite" },
      cell: ({ row }) => <span className={num}>{row.original.diasParaLimite}</span>,
    },
    {
      id: "actions",
      enableHiding: false,
      size: 2 * 32 + 4 + 16,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => (
        <>
          <Accion
            etiqueta={`Ver — ${row.original.aspirante}`}
            icono={<EyeIcon />}
            onClick={() => ver(row.original.id)}
          />
          <Accion
            etiqueta={`Liberar ubicación — ${row.original.aspirante}`}
            icono={<LockIcon />}
            onClick={() => setLiberar(row.original)}
          />
        </>
      ),
    },
  ]

  const paginado = usePaginado(filas)
  const { table } = useDataTable({
    ...paginado.pagination,
    columns,
    data: paginado.pagina,
    pageCount: paginado.pageCount,
    getRowId: (r) => String(r.id),
    columnVisibilityStorageKey: "territorial-ubicados-column-visibility",
  })

  return (
    <>
      <div className="flex flex-wrap items-start gap-2 px-(--screen-spacing)">
        <div className="w-full max-w-md">
          <Buscador
            id="territorial-ubicados-search"
            texto={texto}
            onTexto={setTexto}
            filtro={tipo}
            onFiltro={setTipo}
            etiqueta="Tipo de cupo"
            opciones={[
              ["OFICIAL", "Oficial"],
              ["CONTRATADO", "Contratado"],
            ]}
          />
        </div>
        <div className="ml-auto">
          <BotonExportar
            disabled={!filas.length}
            onClick={() =>
              exportarCsv(
                "ubicados-sin-grupo.csv",
                [
                  "Inscripción",
                  "Aspirante",
                  "Establecimiento",
                  "Sede",
                  "Jornada",
                  "Tipo de cupo",
                  "Confirmada por el acudiente",
                  "Fecha de la reserva",
                  "Días para el límite",
                ],
                filas.map((u) => [
                  u.numero,
                  u.aspirante,
                  u.establecimiento,
                  u.sede,
                  u.jornada,
                  TIPO_CUPO[u.tipoCupo],
                  siNo(u.confirmadaAcudiente),
                  u.fechaReserva,
                  u.diasParaLimite,
                ]),
              )
            }
          />
        </div>
      </div>
      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        emptyMessage={
          q || tipo
            ? "Ninguna ubicación coincide con la búsqueda."
            : "No hay estudiantes ubicados sin grupo."
        }
        errorMessage={error ? getErrorMessage(error) : undefined}
      />
      <Paginas p={paginado} viewOptions={<DataTableViewOptions table={table} />} />
      <LiberarDialog
        ubicado={liberar}
        onOpenChange={(o) => !o && setLiberar(null)}
        onLiberado={() => undefined}
      />
    </>
  )
}

export function UbicadoDetalle({ id, volver }: { id: number; volver: () => void }) {
  const { data, isPending } = useUbicadosQuery()
  const [liberar, setLiberar] = useState<UbicadoSinGrupo | null>(null)
  const u = data?.find((x) => x.id === id)
  if (isPending) return <Cargando volver={volver} />
  if (!u)
    return (
      <Cargando
        volver={volver}
        error="La ubicación ya no existe: quizá se liberó o ya tiene grupo."
      />
    )
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 px-(--screen-spacing)">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Button variant="outline" color="neutral" onClick={volver}>
            <ArrowLeftIcon data-icon="inline-start" />
            Volver
          </Button>
          <span className="text-sm font-medium">
            Reserva de {u.aspirante} · Inscripción {u.numero}
          </span>
        </div>
        <Button variant="outline" color="neutral" onClick={() => setLiberar(u)}>
          <LockIcon data-icon="inline-start" />
          Liberar ubicación
        </Button>
      </div>
      <Ficha
        datos={[
          ["Número de inscripción", u.numero],
          ["Aspirante", u.aspirante],
          ["Grado y modalidad", `${u.grado} · ${u.modalidad}`],
          ["Establecimiento", u.establecimiento],
          ["Sede", u.sede],
          ["Jornada", u.jornada],
          ["Tipo de cupo", TIPO_CUPO[u.tipoCupo]],
          ["Confirmada por el acudiente", siNo(u.confirmadaAcudiente)],
          ["Fecha de la reserva", format(parseISO(u.fechaReserva), "dd/MM/yyyy")],
          ["Días para el límite", u.diasParaLimite],
          ["Estado de la reserva", ESTADO_UBICACION[u.estado]],
        ]}
      />
      <LiberarDialog
        ubicado={liberar}
        onOpenChange={(o) => !o && setLiberar(null)}
        onLiberado={volver}
      />
    </div>
  )
}

const liberarSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(10, "El motivo debe tener entre 10 y 500 caracteres.")
    .max(500, "El motivo debe tener entre 10 y 500 caracteres."),
})

/** Liberar ubicación (3.10): anula la reserva y el aspirante vuelve a En redistribución. */
function LiberarDialog({
  ubicado,
  onOpenChange,
  onLiberado,
}: {
  ubicado: UbicadoSinGrupo | null
  onOpenChange: (open: boolean) => void
  onLiberado: () => void
}) {
  const liberar = useLiberarUbicacion()
  const form = useAppForm({
    defaultValues: { motivo: "" },
    validators: { onSubmit: liberarSchema },
    onSubmit: ({ value }) =>
      liberar.mutateAsync(
        { id: ubicado?.id ?? 0, motivo: value.motivo.trim() },
        {
          onSuccess: () => {
            toast.success(
              `Se liberó la ubicación de ${ubicado?.aspirante}: vuelve a En redistribución.`,
            )
            form.reset()
            onOpenChange(false)
            onLiberado()
          },
        },
      ),
  })
  return (
    <Dialog
      open={ubicado != null}
      onOpenChange={(o) => {
        if (liberar.isPending) return
        form.reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Liberar ubicación — {ubicado?.aspirante}</DialogTitle>
          <DialogDescription className="sr-only">
            La reserva se anula y el aspirante vuelve a En redistribución.
          </DialogDescription>
        </DialogHeader>
        <form
          id="liberar-ubicacion-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <form.AppField name="motivo">
            {(f) => (
              <f.TextareaField
                label="Motivo"
                required
                maxLength={500}
                rows={3}
                placeholder="Escriba el motivo"
                description="Entre 10 y 500 caracteres."
              />
            )}
          </form.AppField>
        </form>
        <DialogFooter>
          <Button
            variant="outline"
            color="neutral"
            disabled={liberar.isPending}
            onClick={() => onOpenChange(false)}
          >
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button
            type="submit"
            form="liberar-ubicacion-form"
            color="destructive"
            disabled={liberar.isPending}
          >
            {liberar.isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <LockIcon data-icon="inline-start" />
            )}
            Liberar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
