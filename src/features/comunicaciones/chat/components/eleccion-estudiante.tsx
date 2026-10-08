import { useEffect, useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

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
import {
  CalendarBlankIcon,
  ChartBarIcon,
  CheckIcon,
  ClockIcon,
  TrophyIcon,
} from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { getErrorMessage } from "@/lib/api-client"
import type { Candidato, Eleccion } from "@/features/comunicaciones/chat/api/types"
import { useVotarEleccion } from "@/features/comunicaciones/chat/api/mutations/use-crear-eleccion"
import { estadoEleccion } from "@/features/comunicaciones/chat/lib/eleccion"
import { FotoCandidato } from "@/features/comunicaciones/chat/components/crear-eleccion-dialog"

// Opción elegida: un candidato o el voto en blanco (null).
type Eleccionado = { candidato: Candidato | null }

// Vista del estudiante mientras la elección no ha cerrado: votar o ver su voto registrado.
// Al cerrar, la página muestra los resultados igual que al administrador.
export function EleccionEstudiante({
  eleccion: e,
  isPending,
}: {
  eleccion: Eleccion | null | undefined
  isPending: boolean
}) {
  if (isPending) return <Skeleton className="mb-4 h-64 w-full" />
  if (!e) return null
  if (e.fechaInicio && estadoEleccion(e) === "PROGRAMADA") {
    return (
      <p className="mb-4 rounded-xl border px-4 py-6 text-center text-sm text-muted-foreground">
        La votación abre el {format(new Date(e.fechaInicio), "d 'de' MMMM 'a las' h:mm a", { locale: es })}.
      </p>
    )
  }
  return e.yaVoto ? <VotoRegistrado eleccion={e} /> : <TarjetaCandidatos eleccion={e} />
}

function TarjetaCandidatos({ eleccion: e }: { eleccion: Eleccion }) {
  const [elegido, setElegido] = useState<Eleccionado | null>(null)
  const votar = useVotarEleccion(e.conversacionId)
  const opciones: Eleccionado[] = [...e.candidatos.map((candidato) => ({ candidato })), { candidato: null }]

  const cerrar = () => {
    if (votar.isPending) return
    setElegido(null)
    votar.reset()
  }

  return (
    <section aria-labelledby="tarjeta-candidatos" className="mb-4 rounded-xl border bg-card p-4">
      <h3 id="tarjeta-candidatos" className="font-semibold">
        Tarjeta electoral
      </h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Selecciona el candidato por el que deseas votar y confirma tu elección. Recuerda que tu voto
        es único y definitivo.
      </p>

      <ul className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3">
        {opciones.map(({ candidato: c }) => (
          <li
            key={c?.id ?? "blanco"}
            className="flex flex-col items-center gap-2 rounded-xl border px-3 pt-3 pb-4 text-center"
          >
            {c ? (
              <>
                <span className="font-bold text-muted-foreground tabular-nums">{c.numero}</span>
                <FotoCandidato url={c.fotoUrl} nombre={c.nombre} className="size-24 rounded-lg" />
                <span className="leading-tight font-semibold">{c.nombre}</span>
                {c.lema && <span className="text-sm text-muted-foreground">{c.lema}</span>}
              </>
            ) : (
              <span className="grid flex-1 place-items-center font-semibold">Voto en blanco</span>
            )}
            <Button
              type="button"
              size="sm"
              className="mt-auto"
              onClick={() => setElegido({ candidato: c })}
              aria-label={c ? `Votar por ${c.nombre}` : "Votar en blanco"}
            >
              Votar
            </Button>
          </li>
        ))}
      </ul>

      <AlertDialog open={!!elegido} onOpenChange={(o) => !o && cerrar()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {elegido?.candidato ? `¿Votar por ${elegido.candidato.nombre}?` : "¿Votar en blanco?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tu voto es único y definitivo: después de confirmarlo no podrás cambiarlo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {votar.isError && (
            <p role="alert" className="text-sm text-red">
              {getErrorMessage(votar.error)}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel variant="fill" color="neutral" disabled={votar.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={votar.isPending}
              aria-busy={votar.isPending}
              onClick={() =>
                elegido && votar.mutate(elegido.candidato?.id ?? null, { onSuccess: () => setElegido(null) })
              }
            >
              Confirmar voto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

function useAhora() {
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  return ahora
}

function VotoRegistrado({ eleccion: e }: { eleccion: Eleccion }) {
  return (
    <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <section className="rounded-xl border bg-card px-6 py-8 text-center">
          <span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-green text-white">
            <CheckIcon aria-hidden className="size-7" />
          </span>
          <h3 className="mx-auto max-w-sm text-3xl leading-tight font-bold text-balance">
            ¡Tu voto ha sido registrado con éxito!
          </h3>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Gracias por participar en {e.nombre}. Tu opinión cuenta y contribuye a una mejor
            institución.
          </p>
        </section>
        {e.fechaCierre && <TiempoRestante cierre={e.fechaCierre} />}
      </div>

      <div className="space-y-4">
        {e.fechaCierre && (
          <section className="rounded-xl border bg-card p-4">
            <h4 className="mb-3 flex items-center gap-2 font-medium">
              <CalendarBlankIcon aria-hidden className="size-5 text-primary" />
              Cierre de la elección
            </h4>
            <p className="rounded-lg bg-primary/10 px-4 py-3 text-center">
              <span className="block text-sm">
                {format(new Date(e.fechaCierre), "d 'de' MMMM 'de' yyyy", { locale: es })}
              </span>
              <span className="block text-2xl font-bold">
                {format(new Date(e.fechaCierre), "h:mm aaaa", { locale: es })}
              </span>
            </p>
          </section>
        )}
        <section className="rounded-xl border bg-card p-4">
          <h4 className="mb-2 flex items-center gap-2 font-medium">
            <TrophyIcon aria-hidden className="size-5 text-green" />
            Resultados
          </h4>
          <p className="mb-3 text-sm text-muted-foreground">
            Los resultados se mostrarán aquí automáticamente cuando cierre la elección.
          </p>
          <p className="rounded-lg bg-green-22 px-4 py-3 text-center text-sm font-medium text-green">
            <ChartBarIcon aria-hidden className="mx-auto mb-1 size-5" />
            ¡Gracias por ser parte de este proceso democrático!
          </p>
        </section>
      </div>
    </div>
  )
}

function TiempoRestante({ cierre }: { cierre: string }) {
  const ahora = useAhora()
  const total = Math.max(0, Math.floor((Date.parse(cierre) - ahora) / 1000))
  const partes = [
    ["Horas", Math.floor(total / 3600)],
    ["Minutos", Math.floor((total % 3600) / 60)],
    ["Segundos", total % 60],
  ] as const

  return (
    <section
      aria-label="Tiempo restante para el cierre de la elección"
      className="flex items-center gap-5 rounded-xl border bg-card px-5 py-4"
    >
      <span className="grid size-16 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <ClockIcon aria-hidden className="size-8" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-sm text-muted-foreground">Tiempo restante para el cierre</p>
        <div role="timer" className="flex items-start gap-3 tabular-nums">
          {partes.map(([etiqueta, valor], i) => (
            <div key={etiqueta} className="flex items-start gap-3">
              {i > 0 && (
                <span aria-hidden className="text-3xl font-bold">
                  :
                </span>
              )}
              <span className="text-center">
                <span className="block text-3xl font-bold">{String(valor).padStart(2, "0")}</span>
                <span className="block text-xs text-muted-foreground">{etiqueta}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
