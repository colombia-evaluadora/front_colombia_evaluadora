import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { CharacterCounter } from "@/components/ui/character-counter"
import { DatePicker } from "@/components/date-picker"
import { PersonAddIcon, ProhibitIcon, SpinnerIcon } from "@/components/ui/icons"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { formatDateValue, parseDateValue } from "@/lib/date-value"
import { cn } from "@/lib/utils"

import { usePreviaReingresoQuery, useReingresarLote, type PreviaReingreso } from "@/features/coverage/matricula/api/acciones-lote"
import type { Matricula } from "@/features/coverage/matricula/api/types/matricula"
import { useMatriculaGradeLabel } from "@/features/coverage/matricula/hooks/use-matricula-grade-label"
import {
  Aviso,
  CampoSelect,
  MatriculasAfectadas,
  mensajeLote,
  nombreDe,
  plural,
  tituloAccion,
} from "@/features/coverage/matricula/components/dialogs/acciones/compartido"
import { BotonAccion } from "@/features/coverage/matricula/components/dialogs/acciones/boton-accion"

const OBSERVACION_MAX = 500
const agrupar = (ps: PreviaReingreso[]) => {
  const m = new Map<string, PreviaReingreso[]>()
  for (const p of ps) m.set(p.grupoActual, [...(m.get(p.grupoActual) ?? []), p])
  return m
}
const fechaTexto = (iso: string) => iso.split("-").reverse().join("/")

/**
 * Reingresar (C.1.LOT.2 y 3): vuelve a Cursando una matrícula Retirada. Si su
 * grupo ya no tiene cupo, se elige otro del mismo grado con cupo (las notas se
 * homologan como en un cambio de grupo). Sin cupo en la complementaria no se
 * puede: modal de bloqueo (una) o queda fuera del lote.
 */
export function DialogReingresar({
  matriculas,
  onOpenChange,
  onDone,
}: {
  matriculas: Matricula[]
  onOpenChange: (open: boolean) => void
  onDone?: () => void
}) {
  const { notify } = useNotify()
  const gradeLabel = useMatriculaGradeLabel()
  const { data: previas, isPending, isError, error: errorCarga } = usePreviaReingresoQuery(matriculas.map((m) => m.id))
  const reingresar = useReingresarLote()
  const [fecha, setFecha] = useState(formatDateValue(new Date()))
  const [observacion, setObservacion] = useState("")
  const [grupos, setGrupos] = useState<Record<string, string>>({})
  const [intentado, setIntentado] = useState(false)
  const [error, setError] = useState<{ id: number; message: string } | null>(null)

  const porId = new Map((previas ?? []).map((p) => [p.matriculaId, p]))
  const matriculaDe = new Map(matriculas.map((m) => [m.id, m]))
  const uno = matriculas.length === 1
  const bloqueadas = (previas ?? []).filter((p) => p.complementariaSinCupo)
  // En lote la complementaria que no reingresa solo se avisa por fila: la principal sí reingresa (Regla 56).
  const aplicables = uno ? (previas ?? []).filter((p) => !p.complementariaSinCupo) : (previas ?? [])
  const sinCupo = uno ? aplicables.filter((p) => p.sinCupo) : []
  // Lote: solo con el período Abierto y sin pasarse de los cupos de cada grupo.
  const cerradas = uno ? [] : aplicables.filter((p) => !p.periodoAbierto)
  const excesos = uno
    ? []
    : [...agrupar(aplicables)].flatMap(([grupo, ps]) =>
        ps.length > ps[0].cuposLibres ? [{ grupo, cupos: ps[0].cuposLibres, marcadas: ps.length }] : [],
      )
  const loteBloqueado = cerradas.length > 0 || excesos.length > 0
  const hoy = new Date()
  // La fecha va entre el último retiro y hoy.
  const desde = aplicables.map((p) => p.fechaRetiro).sort().at(-1) ?? ""
  const fechaValida = Boolean(fecha) && fecha >= desde && (parseDateValue(fecha) ?? hoy) <= hoy
  const faltanGrupos = sinCupo.filter((p) => !grupos[p.matriculaId])

  // Una sola matrícula sin cupo en su complementaria: bloqueo de un botón.
  if (uno && bloqueadas.length === 1) {
    const m = matriculas[0]
    return (
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <ProhibitIcon className="size-6 shrink-0 text-red" aria-hidden />
              <DialogTitle>{tituloAccion("Reingresar", matriculas)}</DialogTitle>
            </div>
            <DialogDescription>
              No hay cupo libre en {bloqueadas[0].complementariaSinCupo} para que {nombreDe(m)} reingrese a la matrícula
              complementaria.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="fill" color="primary" size="sm" onClick={() => onOpenChange(false)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  function confirmar() {
    setIntentado(true)
    if (!fechaValida || faltanGrupos.length || aplicables.length === 0 || loteBloqueado) return
    reingresar.mutate(
      {
        fecha,
        observacion: observacion.trim(),
        matriculas: aplicables.map((p) => ({
          matriculaId: p.matriculaId,
          grupoId: p.sinCupo ? Number(grupos[p.matriculaId]) : null,
        })),
      },
      {
        onSuccess: (resultados) => {
          const { variant, texto } = mensajeLote(resultados, (n) =>
            uno && n === 1 ? `${nombreDe(matriculas[0])} volvió a Cursando.` : `${plural(n, "matrícula volvió", "matrículas volvieron")} a Cursando.`,
          )
          notify(texto, { variant })
          onDone?.()
          onOpenChange(false)
        },
        onError: (err) => setError({ id: Date.now(), message: getErrorMessage(err) }),
      },
    )
  }

  function selectorGrupo(p: PreviaReingreso, conEtiqueta: boolean) {
    const m = matriculaDe.get(p.matriculaId)
    const invalido = intentado && !grupos[p.matriculaId]
    return (
      <CampoSelect
        id={`reingreso-grupo-${p.matriculaId}`}
        label={conEtiqueta ? "Grupo" : undefined}
        required={conEtiqueta}
        value={grupos[p.matriculaId] ?? ""}
        onChange={(v) => setGrupos((g) => ({ ...g, [p.matriculaId]: v }))}
        opciones={p.gruposConCupo.map((g) => ({ value: String(g.id), label: `${g.codigo} · ${g.ocupados} de ${g.capacidad}` }))}
        invalido={invalido}
        placeholder={conEtiqueta ? "Seleccione" : `Grupo para ${m ? nombreDe(m) : ""}`}
        descripcion={
          conEtiqueta
            ? p.gruposConCupo.length
              ? `Solo grupos de ${m ? gradeLabel(m.grade) : "su grado"} con cupo.`
              : `No hay grupos de ${m ? gradeLabel(m.grade) : "su grado"} con cupo.`
            : undefined
        }
        className={conEtiqueta ? "sm:max-w-xs" : undefined}
      />
    )
  }

  const unaPrevia = uno ? porId.get(matriculas[0].id) : undefined
  const periodosRetiro = [...new Set(aplicables.flatMap((p) => p.periodosDuranteRetiro))]
  const conCaso = aplicables.filter((p) => p.casoReintegracion)

  return (
    <Dialog open onOpenChange={(o) => !reingresar.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{tituloAccion("Reingresar", matriculas)}</DialogTitle>
          <MatriculasAfectadas
            matriculas={matriculas}
            extra={unaPrevia ? <span className="text-muted-foreground">· retirado el {fechaTexto(unaPrevia.fechaRetiro)}</span> : null}
          />
        </DialogHeader>
        <NoticeBanner notice={error} onClose={() => setError(null)} variant="error" />

        {isPending ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <SpinnerIcon className="animate-spin" /> Revisando cupos…
          </div>
        ) : isError ? (
          <p className="p-6 text-center text-sm text-red">{getErrorMessage(errorCarga)}</p>
        ) : (
          <>
            <Field variant="outlined" className="gap-1.5 sm:max-w-xs" data-invalid={(intentado && !fechaValida) || undefined}>
              <FieldLabel htmlFor="reingreso-fecha">
                Fecha de reingreso<span data-required-mark="">*</span>
              </FieldLabel>
              <DatePicker
                id="reingreso-fecha"
                mode="date"
                size="sm"
                variant="outlined"
                value={parseDateValue(fecha)}
                minDate={desde ? parseDateValue(desde) : undefined}
                maxDate={hoy}
                aria-invalid={intentado && !fechaValida}
                onChange={(d) => setFecha(formatDateValue(d))}
              />
              <FieldDescription className={cn(intentado && !fechaValida && "text-red")}>
                {desde ? `Entre el ${fechaTexto(desde)} y hoy.` : "No admite fechas futuras."}
              </FieldDescription>
            </Field>

            {excesos.map((e) => (
              <Aviso key={e.grupo} tono="advertencia">
                El grupo {e.grupo} tiene {plural(e.cupos, "cupo", "cupos")} y seleccionó {e.marcadas} estudiantes. Quite{" "}
                {e.marcadas - e.cupos} o reingréselos uno por uno.
              </Aviso>
            ))}
            {cerradas.length ? (
              <Aviso tono="advertencia" titulo="Solo se reingresa con el Período Académico Abierto.">
                Quite de la selección: {cerradas.map((p) => nombreDe(matriculaDe.get(p.matriculaId) as Matricula)).join(", ")}.
              </Aviso>
            ) : null}
            {!uno && bloqueadas.length ? (
              <Aviso tono="advertencia" titulo="La matrícula complementaria no reingresa">
                {bloqueadas
                  .map((p) => `${nombreDe(matriculaDe.get(p.matriculaId) as Matricula)} (${p.complementariaSinCupo})`)
                  .join(", ")}
                : sin cupo o con el convenio finalizado. La matrícula principal sí reingresa.
              </Aviso>
            ) : null}

            {uno && unaPrevia?.sinCupo ? (
              <>
                <Aviso tono="advertencia">
                  El grupo {unaPrevia.grupoActual} ya no tiene cupo. Elija otro grupo de {gradeLabel(matriculas[0].grade)} con
                  cupo; las notas se homologan como en un cambio de grupo.
                </Aviso>
                {selectorGrupo(unaPrevia, true)}
              </>
            ) : null}


            <Field variant="outlined" className="gap-1.5">
              <FieldLabel htmlFor="reingreso-observacion">Observación</FieldLabel>
              <div className="relative">
                <Textarea
                  id="reingreso-observacion"
                  rows={2}
                  maxLength={OBSERVACION_MAX}
                  value={observacion}
                  placeholder="Opcional"
                  className={cn(TEXTAREA_OUTLINED, "pr-16")}
                  onChange={(e) => setObservacion(e.target.value)}
                />
                <CharacterCounter value={observacion} max={OBSERVACION_MAX} className="absolute top-3 right-3" />
              </div>
            </Field>

            {periodosRetiro.length ? (
              <Aviso tono="info">
                {periodosRetiro.join(", ")} {periodosRetiro.length === 1 ? "transcurrió" : "transcurrieron"} durante el retiro:
                queda Pendiente por nivelación en cada asignatura.
              </Aviso>
            ) : null}
            {conCaso.length ? (
              <Aviso tono="info">
                {uno ? "Tiene un caso de reintegración abierto" : `${plural(conCaso.length, "estudiante tiene", "estudiantes tienen")} un caso de reintegración abierto`}{" "}
                <Badge variant="soft" color="success" className="mx-0.5 rounded-full text-xs font-medium tracking-normal">
                  {conCaso[0].casoReintegracion}
                </Badge>
                ; el reingreso quedará registrado en el caso.
              </Aviso>
            ) : null}
            <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
          </>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" color="neutral" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="fill"
            color="primary"
            size="sm"
            disabled={!previas || aplicables.length === 0 || loteBloqueado || reingresar.isPending}
            onClick={confirmar}
          >
            {reingresar.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <PersonAddIcon data-icon="inline-start" />
            )}
            Reingresar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ReingresarMatriculaDialogProps {
  matricula: Matricula
  /** "icon" (fila de la tabla) o "button" (barra de detalle/edición). */
  trigger?: "icon" | "button"
}

export function ReingresarMatriculaDialog({ matricula, trigger = "icon" }: ReingresarMatriculaDialogProps) {
  const [open, setOpen] = useState(false)
  if (matricula.status !== "Retirado") return null
  return (
    <>
      <BotonAccion
        modo={trigger}
        label="Reingresar"
        ariaLabel={`Reingresar a ${nombreDe(matricula)}`}
        Icon={PersonAddIcon}
        onClick={() => setOpen(true)}
      />
      {open ? <DialogReingresar matriculas={[matricula]} onOpenChange={setOpen} /> : null}
    </>
  )
}
