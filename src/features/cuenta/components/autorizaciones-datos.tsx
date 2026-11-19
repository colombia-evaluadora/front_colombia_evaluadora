import { useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckIcon, ShieldCheckIcon, WarningIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { getErrorMessage } from "@/lib/api-client"

import {
  useAutorizacionesPendientesQuery,
  useAutorizarDatos,
} from "@/features/autorizacion-datos/api/autorizaciones"
import type { AutorizacionPendiente } from "@/features/autorizacion-datos/api/types"
import { DialogAutorizarDatos } from "@/features/autorizacion-datos/components/dialog-autorizar-datos"
import {
  clavePendiente,
  mensajeAutorizados,
  pendientesDe,
} from "@/features/autorizacion-datos/lib/autorizaciones"

const DESCRIPCION_FUNCIONARIO =
  "Marque los establecimientos que lo agregaron como funcionario y pueden consultar sus datos personales (Ley 1581 de 2012)."

/**
 * Mi cuenta › Autorizaciones: inscripciones de las que el usuario es acudiente (Regla 81)
 * y su vínculo de funcionario con otro establecimiento (Regla 116) que esperan la
 * autorización de tratamiento de datos.
 */
export function AutorizacionesDatos() {
  const { data, isPending, isError, error, refetch } = useAutorizacionesPendientesQuery()
  const autorizarMut = useAutorizarDatos()
  const [abierta, setAbierta] = useState<AutorizacionPendiente | null>(null)
  const [confirmacion, setConfirmacion] = useState<string | null>(null)

  async function autorizar(ids: number[]) {
    if (!abierta) return
    const despues = await autorizarMut.mutateAsync({ pendiente: abierta, establecimientos: ids })
    setConfirmacion(mensajeAutorizados(abierta.establecimientos, despues, ids))
    setAbierta(null)
  }

  return (
    <section className="bg-card flex flex-col gap-4 rounded-xl border p-5">
      <div>
        <h2 className="text-lg font-semibold">Autorizaciones de tratamiento de datos</h2>
        <p className="text-muted-foreground text-sm">
          Sin su autorización, los establecimientos solo ven lo no sensible (número, grado y opciones).
        </p>
      </div>

      {confirmacion && (
        <Alert variant="info" role="status">
          <CheckIcon />
          <AlertDescription>{confirmacion}</AlertDescription>
        </Alert>
      )}

      {isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : isError ? (
        <Alert variant="destructive">
          <WarningIcon />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{getErrorMessage(error)}</span>
            <Button size="sm" variant="outline" color="neutral" onClick={() => void refetch()}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : data.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center text-sm">
          <ShieldCheckIcon className="text-green size-8" aria-hidden />
          <p className="text-foreground font-medium">No tiene autorizaciones pendientes</p>
          <p>Cuando un establecimiento le pida autorización para consultar su información, aparecerá aquí.</p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border">
          {data.map((p) => (
            <li key={clavePendiente(p)} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="font-medium">
                  {p.tipo === "FUNCIONARIO"
                    ? "Sus datos como funcionario"
                    : `Inscripción ${p.numero}${p.aspirante ? ` · ${p.aspirante}` : ""}`}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {pendientesDe(p.establecimientos).map((e) => (
                    <Badge key={e.establecimientoId} variant="soft" color="warning">
                      {e.establecimiento}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                className="shrink-0"
                onClick={() => {
                  setConfirmacion(null)
                  setAbierta(p)
                }}
              >
                <ShieldCheckIcon data-icon="inline-start" />
                Autorizar ahora
              </Button>
            </li>
          ))}
        </ul>
      )}

      <DialogAutorizarDatos
        establecimientos={abierta?.establecimientos ?? null}
        onOpenChange={(open) => !open && setAbierta(null)}
        onAutorizar={autorizar}
        descripcion={abierta?.tipo === "FUNCIONARIO" ? DESCRIPCION_FUNCIONARIO : undefined}
      />
    </section>
  )
}
