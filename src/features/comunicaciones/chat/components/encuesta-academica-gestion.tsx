import { useState } from "react"

import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useCerrarEncuesta } from "@/features/comunicaciones/chat/api/mutations/use-crear-encuesta"
import { useRespuestasIndividualesQuery } from "@/features/comunicaciones/chat/api/query/use-encuesta-query"
import type { Encuesta } from "@/features/comunicaciones/chat/api/types"
import { estadoEleccion } from "@/features/comunicaciones/chat/lib/eleccion"

// Lo que solo tiene quien gestiona una encuesta del manual: el cierre anticipado y quién respondió qué.
export function EncuestaAcademicaGestion({ encuesta: e }: { encuesta: Encuesta }) {
  const [confirmar, setConfirmar] = useState(false)
  const [verRespuestas, setVerRespuestas] = useState(false)
  const cerrar = useCerrarEncuesta(e.conversacionId)
  const individuales = useRespuestasIndividualesQuery(e.conversacionId, verRespuestas)

  return (
    <section aria-label="Gestión de la encuesta" className="mb-4 rounded-xl border bg-card p-3 md:p-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" aria-expanded={verRespuestas} onClick={() => setVerRespuestas((v) => !v)}>
          {verRespuestas ? "Ocultar respuestas individuales" : "Ver respuestas individuales"}
        </Button>
        {estadoEleccion(e) === "ACTIVA" && (
          <Button type="button" variant="outline" color="destructive" onClick={() => setConfirmar(true)}>
            Cerrar encuesta
          </Button>
        )}
      </div>

      {verRespuestas && (
        <div className="mt-3 text-sm">
          <ErrorNoticeBanner error={individuales.isError ? individuales.error : null} />
          {individuales.isPending ? (
            <p className="text-muted-foreground">Cargando respuestas…</p>
          ) : individuales.data?.length === 0 ? (
            <p className="text-muted-foreground">Aún nadie responde.</p>
          ) : (
            <ul className="divide-y">
              {individuales.data?.map((r) => (
                <li key={r.usuarioId} className="flex flex-wrap justify-between gap-x-4 py-1.5">
                  <span className="font-medium">{r.nombre}</span>
                  <span className="text-muted-foreground">{r.opciones.join(", ")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <AlertDialog open={confirmar} onOpenChange={(o) => !o && !cerrar.isPending && setConfirmar(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar la encuesta ahora?</AlertDialogTitle>
            <AlertDialogDescription>Nadie podrá responder ni cambiar su respuesta, y no se puede reabrir.</AlertDialogDescription>
          </AlertDialogHeader>
          <ErrorNoticeBanner error={cerrar.isError ? cerrar.error : null} />
          <AlertDialogFooter>
            <AlertDialogCancel variant="fill" color="neutral" disabled={cerrar.isPending}>Volver</AlertDialogCancel>
            <AlertDialogAction
              disabled={cerrar.isPending}
              aria-busy={cerrar.isPending}
              onClick={() => cerrar.mutate(undefined, { onSuccess: () => setConfirmar(false) })}
            >
              Cerrar encuesta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
