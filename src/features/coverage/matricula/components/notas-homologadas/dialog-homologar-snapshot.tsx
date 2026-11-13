import { useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckIcon, InfoIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { getErrorMessage } from "@/lib/api-client"
import { toSelectItemsMap } from "@/lib/catalog-options"
import { cn } from "@/lib/utils"

import {
  useHomologarSnapshot,
  type HomologarSnapshotResult,
} from "@/features/coverage/matricula/api/mutations/homologar-snapshot"
import type { SnapshotPendiente } from "@/features/coverage/matricula/api/types/notas-homologadas"
import { formatFecha } from "@/features/coverage/matricula/components/notas-homologadas/nota-format"

// Base UI no admite null como valor de un ítem que se elige: «sin equivalente» va con un centinela.
const PENDIENTE = "__pendiente__"

interface Props {
  matriculaId: string | number
  snapshot: SnapshotPendiente
  /** «Miguel Ángel Castro Vargas (Quinto · 5°B · IE Central · Mañana)» */
  estudiante: string
  onOpenChange: (open: boolean) => void
  onHomologated: (result: HomologarSnapshotResult) => void
}

/** «P1», «P1 y P2», «P1, P2 y P3». */
const enumerar = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`

/**
 * Homologar desde snapshot (Sección 4.5): el sistema propone cómo pasan los
 * períodos y las asignaturas del establecimiento de origen y quien homologa lo
 * revisa, lo ajusta y lo confirma. Exige la autorización de datos del acudiente.
 */
export function DialogHomologarSnapshot({ matriculaId, snapshot, estudiante, onOpenChange, onHomologated }: Props) {
  const [autorizado, setAutorizado] = useState(false)
  const [periodos, setPeriodos] = useState(snapshot.periodos)
  const [asignaturas, setAsignaturas] = useState(snapshot.asignaturas)
  const [intentado, setIntentado] = useState(false)
  const [error, setError] = useState<{ id: number; message: string } | null>(null)
  const homologar = useHomologarSnapshot()

  const periodosItems = snapshot.periodosDestino.map((p) => ({ value: String(p.id), label: p.nombre }))
  const asignaturasItems = [
    ...snapshot.asignaturasDestino.map((a) => ({ value: String(a.id), label: a.nombre })),
    { value: PENDIENTE, label: "Pendiente por nivelación" },
  ]
  const nombrePeriodo = (id: number | null) => snapshot.periodosDestino.find((p) => p.id === id)?.nombre ?? ""

  const destinosPeriodo = periodos.map((p) => p.destino).filter((d) => d != null)
  const periodoRepetido = new Set(destinosPeriodo).size !== destinosPeriodo.length
  const destinosAsignatura = asignaturas.map((a) => a.destino).filter((d) => d != null)
  const asignaturaRepetida = new Set(destinosAsignatura).size !== destinosAsignatura.length
  const faltaPeriodo = periodos.some((p) => p.destino == null)

  // Las del plan que nadie recibe quedan pendientes en los períodos homologados (Regla 45).
  const sinEquivalente = snapshot.asignaturasDestino.filter((a) => !destinosAsignatura.includes(a.id))
  const periodosHomologados = enumerar(periodos.map((p) => nombrePeriodo(p.destino)).filter(Boolean))
  const resumen =
    `${periodosHomologados} homologados en ${new Set(destinosAsignatura).size} asignaturas` +
    (sinEquivalente.length > 0
      ? ` · ${enumerar(sinEquivalente.map((a) => a.nombre))} ${sinEquivalente.length === 1 ? "sigue pendiente" : "siguen pendientes"} por nivelación en ${periodosHomologados}.`
      : ".")

  function confirmar() {
    setIntentado(true)
    if (!autorizado || faltaPeriodo) return
    if (periodoRepetido) {
      setError({ id: Date.now(), message: "Dos períodos de origen no pueden ir al mismo período de destino." })
      return
    }
    if (asignaturaRepetida) {
      setError({ id: Date.now(), message: "Dos asignaturas de origen no pueden ir a la misma asignatura de destino." })
      return
    }
    homologar.mutate(
      { matriculaId, snapshotId: snapshot.id, periodos, asignaturas },
      { onSuccess: onHomologated, onError: (err) => setError({ id: Date.now(), message: getErrorMessage(err) }) },
    )
  }

  const fila = (origen: string, control: ReactNode) => (
    <div key={origen} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="flex flex-col rounded-md bg-muted/50 px-3 py-1.5">
        <span className="text-xs text-muted-foreground">Origen</span>
        <span className="text-sm">{origen}</span>
      </div>
      {control}
    </div>
  )

  const selectDestino = (
    label: string,
    items: { value: string; label: string }[],
    value: string | null,
    onChange: (value: string | null) => void,
    invalido: boolean,
  ) => (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">
        Destino <span className="text-red">*</span>
      </span>
      <Select items={toSelectItemsMap(items)} value={value} onValueChange={(v) => onChange((v as string) ?? null)}>
        <SelectTrigger variant="outlined" aria-label={label} aria-invalid={invalido} className="w-full">
          <SelectValue placeholder="Seleccione" />
        </SelectTrigger>
        <SelectContent>
          {items.map((i) => (
            <SelectItem key={i.value} value={i.value}>
              {i.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <Dialog open onOpenChange={(next) => !homologar.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Homologar desde snapshot — {estudiante}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Snapshot: {snapshot.motivo} · {snapshot.grupoOrigen} · {formatFecha(snapshot.fecha)}
            {snapshot.periodosPendientes.length > 0 &&
              ` · Pendientes hoy: ${enumerar(snapshot.periodosPendientes)} en ${snapshot.asignaturasPlan} asignaturas`}
          </p>
        </DialogHeader>
        <NoticeBanner notice={error} onClose={() => setError(null)} variant="error" />

        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            checked={autorizado}
            aria-invalid={intentado && !autorizado}
            onCheckedChange={(checked) => setAutorizado(checked === true)}
            className="mt-0.5"
          />
          <span className={cn(intentado && !autorizado && "text-red")}>
            El acudiente autorizó el tratamiento de los datos del establecimiento de origen (Ley 1581 de 2012){" "}
            <span className="text-red">*</span>
          </span>
        </label>

        <p className="text-sm">
          Emparejamiento de notas <span className="text-muted-foreground">· revise y ajuste la propuesta</span>
        </p>

        <section aria-labelledby="homologar-periodos" className="flex flex-col gap-3">
          <h3 id="homologar-periodos" className="text-sm font-medium">
            Períodos de evaluación
          </h3>
          {periodos.map((p, i) =>
            fila(
              p.origen,
              selectDestino(
                `Período de destino de ${p.origen}`,
                periodosItems,
                p.destino == null ? null : String(p.destino),
                (v) => setPeriodos((prev) => prev.map((x, j) => (j === i ? { ...x, destino: v ? Number(v) : null } : x))),
                intentado && p.destino == null,
              ),
            ),
          )}
        </section>

        <section aria-labelledby="homologar-asignaturas" className="flex flex-col gap-3">
          <h3 id="homologar-asignaturas" className="text-sm font-medium">
            Asignaturas
          </h3>
          {asignaturas.map((a, i) =>
            fila(
              a.origen,
              selectDestino(
                `Asignatura de destino de ${a.origen}`,
                asignaturasItems,
                a.destino == null ? PENDIENTE : String(a.destino),
                (v) =>
                  setAsignaturas((prev) =>
                    prev.map((x, j) => (j === i ? { ...x, destino: !v || v === PENDIENTE ? null : Number(v) } : x)),
                  ),
                false,
              ),
            ),
          )}
        </section>

        <p className="text-sm text-muted-foreground">Resumen: {resumen}</p>

        {snapshot.escalaDistinta && (
          <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary-22 px-3 py-2 text-xs">
            <InfoIcon className="size-4 shrink-0 text-primary" aria-hidden />
            Escala distinta: cada definitiva se convierte con la nota equivalente de la escala del origen.
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" color="neutral" size="sm" onClick={() => onOpenChange(false)}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button type="button" variant="fill" color="primary" size="sm" disabled={homologar.isPending} onClick={confirmar}>
            {homologar.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
