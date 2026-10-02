import * as React from "react"

import { useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { ArrowRightIcon, CheckIcon, PaperclipIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { getErrorMessage } from "@/lib/api-client"

import { useAprobacionesAsistenciaMutation } from "@/features/academic-management/asistencia/api/mutations/use-aprobaciones-asistencia-mutation"
import type { SesionSolicitudes } from "@/features/academic-management/asistencia/api/query/use-aprobaciones-asistencia-query"
import { useTipoAsistenciaCatalogQuery } from "@/features/academic-management/asistencia/api/query/use-tipo-asistencia-catalog-query"
import { etiquetaBloques } from "@/features/academic-management/asistencia/api/ui-mappings"
import type {
  SolicitudAprobacionAsistencia,
  TipoAsistencia,
} from "@/features/academic-management/asistencia/api/types/asistencia"

const MOTIVO_MAX = 1000

const TEXTAREA_OUTLINED =
  "rounded-md border border-input px-3 py-2 hover:border-ring focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"

function formatFechaSesion(fecha: string | null): string {
  if (!fecha) return "Sin fecha"
  const [anio, mes, dia] = fecha.slice(0, 10).split("-").map(Number)
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })
}

/** Qué estado representa a la clase, como en Seguimiento: la tardanza manda sobre la inasistencia. */
const PRIORIDAD_TIPO: Record<TipoAsistencia, number> = { 5: 1, 6: 2, 2: 3, 3: 4, 1: 5 }

function tipoDe(valor: string | number | null | undefined): TipoAsistencia | null {
  return valor == null || valor === "" ? null : (Number(valor) as TipoAsistencia)
}

function masRelevante(tipos: (TipoAsistencia | null)[]): TipoAsistencia | null {
  return [...tipos].sort((a, b) => (a != null ? PRIORIDAD_TIPO[a] : 99) - (b != null ? PRIORIDAD_TIPO[b] : 99))[0]
}

/** El anterior y lo que queda si se aprueba (un campo ausente en la propuesta no cambia). */
function estados(s: SolicitudAprobacionAsistencia) {
  const anterior = tipoDe(s.valor_anterior?.tipoAsistencia)
  const propuesto = tipoDe(s.valor_propuesto?.tipoAsistencia) ?? anterior
  const soporteAntes = s.valor_anterior?.soporteArchivo != null
  const soporteDespues = s.valor_propuesto?.limpiarArchivo
    ? false
    : s.valor_propuesto?.soporteArchivo != null || soporteAntes
  return { anterior, propuesto, soporteAntes, soporteDespues }
}

/** Una fila por estudiante: los bloques de la misma clase se muestran una sola vez. */
interface CambioEstudiante {
  clave: string
  estudiante: string
  bloques: string | null
  anterior: TipoAsistencia | null
  propuesto: TipoAsistencia | null
  soporteAntes: boolean
  soporteDespues: boolean
  observacion: string | null
  ids: number[]
}

function agruparPorEstudiante(solicitudes: SolicitudAprobacionAsistencia[]): CambioEstudiante[] {
  const porEstudiante = new Map<string, SolicitudAprobacionAsistencia[]>()
  for (const s of solicitudes) {
    const clave = String(s.fk_tmatricula ?? s.estudiante)
    porEstudiante.set(clave, [...(porEstudiante.get(clave) ?? []), s])
  }
  return [...porEstudiante.entries()]
    .map(([clave, grupo]) => {
      const e = grupo.map(estados)
      const bloques = grupo
        .map((s) => s.bloque ?? s.valor_anterior?.bloque)
        .filter((b): b is number => b != null)
        .sort((a, b) => a - b)
      return {
        clave,
        estudiante: grupo[0].estudiante,
        bloques: grupo.length > 1 ? (etiquetaBloques(bloques) ?? `${grupo.length} bloques`) : null,
        anterior: masRelevante(e.map((x) => x.anterior)),
        propuesto: masRelevante(e.map((x) => x.propuesto)),
        soporteAntes: e.some((x) => x.soporteAntes),
        soporteDespues: e.some((x) => x.soporteDespues),
        observacion: grupo.find((s) => s.valor_propuesto?.observacion)?.valor_propuesto.observacion ?? null,
        ids: grupo.map((s) => s.pk_tsolicitud_aprobacion),
      }
    })
    .sort((a, b) => a.estudiante.localeCompare(b.estudiante))
}

function Estado({ nombre, soporte }: { nombre: string; soporte: boolean }) {
  return (
    <span className="flex flex-col">
      <span>{nombre}</span>
      {soporte && (
        <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
          <PaperclipIcon className="size-3 shrink-0" />
          Con justificación
        </span>
      )}
    </span>
  )
}

function FilaCambio({
  cambio,
  nombreTipo,
  seleccionado,
  onToggle,
}: {
  cambio: CambioEstudiante
  nombreTipo: (tipo: TipoAsistencia | null) => string
  seleccionado: boolean
  onToggle: () => void
}) {
  return (
    <li className="flex items-start gap-3 border-b px-4 py-3 last:border-b-0">
      <Checkbox
        className="mt-0.5"
        checked={seleccionado}
        onCheckedChange={onToggle}
        aria-label={`Seleccionar cambio de ${cambio.estudiante}`}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="truncate text-sm font-medium uppercase">
          {cambio.estudiante}
          {cambio.bloques && (
            <span className="ml-2 text-xs font-normal normal-case text-muted-foreground">{cambio.bloques}</span>
          )}
        </p>
        <div className="flex items-center gap-2 text-sm">
          <Estado nombre={nombreTipo(cambio.anterior)} soporte={cambio.soporteAntes} />
          <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="font-semibold">
            <Estado nombre={nombreTipo(cambio.propuesto)} soporte={cambio.soporteDespues} />
          </span>
        </div>
        {cambio.observacion && <p className="text-xs text-muted-foreground">“{cambio.observacion}”</p>}
      </div>
    </li>
  )
}

interface RevisionCambiosAsistenciaSheetProps {
  sesion: SesionSolicitudes | null
  onOpenChange: (open: boolean) => void
}

/** Regla 75: el coordinador revisa los cambios de una sesión y los aprueba o rechaza. */
export function RevisionCambiosAsistenciaSheet({ sesion, onOpenChange }: RevisionCambiosAsistenciaSheetProps) {
  const { notify } = useNotify()
  const decidir = useAprobacionesAsistenciaMutation()
  const { data: tipoOptions = [] } = useTipoAsistenciaCatalogQuery()
  const cambios = React.useMemo(() => agruparPorEstudiante(sesion?.solicitudes ?? []), [sesion])

  // Por defecto se seleccionan todos, como en la planilla de Informes.
  const [excluidos, setExcluidos] = React.useState<Set<string>>(new Set())
  const [motivo, setMotivo] = React.useState("")
  const seleccionados = cambios.filter((c) => !excluidos.has(c.clave))

  function nombreTipo(tipo: TipoAsistencia | null): string {
    if (tipo == null) return "Sin registro"
    return tipoOptions.find((o) => o.value === tipo)?.label ?? `Tipo ${tipo}`
  }

  function toggle(clave: string) {
    setExcluidos((prev) => {
      const next = new Set(prev)
      if (next.has(clave)) next.delete(clave)
      else next.add(clave)
      return next
    })
  }

  function toggleTodos() {
    setExcluidos(seleccionados.length === cambios.length ? new Set(cambios.map((c) => c.clave)) : new Set())
  }

  function cerrar() {
    setExcluidos(new Set())
    setMotivo("")
    onOpenChange(false)
  }

  async function handleDecidir(decision: "aprobar" | "rechazar") {
    try {
      // Aprobar o rechazar a un estudiante aplica a todos sus bloques.
      const { fallidas } = await decidir.mutateAsync({ decision, ids: seleccionados.flatMap((c) => c.ids), motivo })
      if (fallidas > 0) {
        notify(`${fallidas} solicitud${fallidas === 1 ? "" : "es"} no se pudo resolver. Revisa la lista.`, {
          variant: "error",
        })
        return
      }
      notify(decision === "aprobar" ? "Cambios aprobados." : "Cambios rechazados.")
      if (seleccionados.length === cambios.length) cerrar()
      else {
        setExcluidos(new Set())
        setMotivo("")
      }
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
    }
  }

  const sinMotivo = motivo.trim() === ""

  return (
    <Sheet open={sesion !== null} onOpenChange={(open) => !open && cerrar()}>
      <SheetContent className="gap-0 p-0">
        <SheetHeader className="pb-4">
          <SheetTitle>Cambios de asistencia</SheetTitle>
          {sesion && (
            <SheetDescription>
              {sesion.grupo} · {sesion.materia} · {formatFechaSesion(sesion.fecha)}
              {sesion.solicitante && ` · ${sesion.solicitante}`}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-3 overflow-auto px-8 pb-4">
          <p className="text-sm text-muted-foreground">
            El período ya no es calificable. Aprobar reemplaza la asistencia registrada; rechazar la deja como estaba.
          </p>
          {cambios.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No hay cambios pendientes en esta sesión.</p>
          ) : (
            <>
              <label className="flex items-center gap-3 px-4 text-sm font-semibold">
                <Checkbox checked={seleccionados.length === cambios.length} onCheckedChange={toggleTodos} />
                Seleccionar todos ({seleccionados.length} de {cambios.length})
              </label>
              <ul className="rounded-md border border-input">
                {cambios.map((cambio) => (
                  <FilaCambio
                    key={cambio.clave}
                    cambio={cambio}
                    nombreTipo={nombreTipo}
                    seleccionado={!excluidos.has(cambio.clave)}
                    onToggle={() => toggle(cambio.clave)}
                  />
                ))}
              </ul>
            </>
          )}

          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel>Motivo (obligatorio para rechazar)</FieldLabel>
            <Textarea
              value={motivo}
              maxLength={MOTIVO_MAX}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Por qué apruebas o rechazas"
              className={TEXTAREA_OUTLINED}
            />
          </Field>
        </div>

        <SheetFooter className="flex-row justify-end gap-2 border-t px-8 py-4">
          <Button
            variant="outline"
            color="destructive"
            size="sm"
            disabled={seleccionados.length === 0 || sinMotivo || decidir.isPending}
            onClick={() => handleDecidir("rechazar")}
          >
            <XIcon data-icon="inline-start" />
            Rechazar
          </Button>
          <Button
            color="primary"
            size="sm"
            disabled={seleccionados.length === 0 || decidir.isPending}
            onClick={() => handleDecidir("aprobar")}
          >
            {decidir.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Aprobar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
