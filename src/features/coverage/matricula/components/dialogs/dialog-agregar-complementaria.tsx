import { useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FloppyDiskIcon, SpinnerIcon } from "@/components/ui/icons"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

import { useAgregarComplementaria, usePreviaComplementariaQuery } from "@/features/coverage/matricula/api/complementaria"
import type { Matricula } from "@/features/coverage/matricula/api/types/matricula"
import { Aviso, CampoSelect, nombreDe } from "@/features/coverage/matricula/components/dialogs/acciones/compartido"
import { useMatriculaGradeLabel } from "@/features/coverage/matricula/hooks/use-matricula-grade-label"

/**
 * Agregar matrícula complementaria del estudiante propio (Sección 2.16, C.1.COM.1):
 * segunda matrícula Cursando en la jornada contraria, en el mismo grado y con la
 * especialidad de la principal. Sin postulación y con prioridad sobre los adscritos.
 * El mismo modal servirá por adscripción desde la postulación Registrado (C.2.POS.5).
 */
export function DialogAgregarComplementaria({
  matricula,
  onOpenChange,
}: {
  matricula: Matricula
  onOpenChange: (open: boolean) => void
}) {
  const { notify } = useNotify()
  const gradeLabel = useMatriculaGradeLabel()
  const previa = usePreviaComplementariaQuery(matricula.id)
  const agregar = useAgregarComplementaria()
  const [sedeId, setSedeId] = useState("")
  const [periodoId, setPeriodoId] = useState("")
  const [grupoId, setGrupoId] = useState("")
  const [intentado, setIntentado] = useState(false)
  const [error, setError] = useState<{ id: number; message: string } | null>(null)

  const sedes = previa.data?.sedes ?? []
  // Una sola sede ofrece la especialidad: se elige sola.
  const sedeElegida = sedeId || (sedes.length === 1 ? String(sedes[0].id) : "")
  const sede = sedes.find((s) => String(s.id) === sedeElegida)
  const periodo = sede?.periodos.find((p) => String(p.id) === periodoId)
  const grupo = periodo?.grupos.find((g) => String(g.id) === grupoId)
  const grado = gradeLabel(matricula.grade)

  function guardar() {
    setIntentado(true)
    if (!sede || !periodo || !grupo) return
    agregar.mutate(
      { matriculaId: matricula.id, sedeId: sede.id, periodoId: periodo.id, grupoId: grupo.id },
      {
        onSuccess: () => {
          notify(`Se agregó la matrícula complementaria de ${nombreDe(matricula)} en ${grupo.codigo}.`, { variant: "success" })
          onOpenChange(false)
        },
        onError: (err) => setError({ id: Date.now(), message: getErrorMessage(err) }),
      },
    )
  }

  return (
    <Dialog open onOpenChange={(o) => !agregar.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Agregar matrícula complementaria — {nombreDe(matricula)}</DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={error} onClose={() => setError(null)} variant="error" />

        {previa.isPending ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <SpinnerIcon className="animate-spin" aria-hidden />
            Cargando…
          </div>
        ) : previa.isError ? (
          <Aviso tono="advertencia" titulo="No se puede agregar la matrícula complementaria.">
            {getErrorMessage(previa.error)}
          </Aviso>
        ) : (
          <>
            <dl className="grid overflow-hidden rounded-md border border-border text-sm sm:grid-cols-[auto_1fr_auto_1fr] [&>:last-child]:border-b-0 sm:[&>:nth-last-child(-n+4)]:border-b-0">
              <Dato termino="Matrícula principal">
                {[matricula.campus, matricula.shift, grado, matricula.group].filter(Boolean).join(" · ")}
              </Dato>
              <Dato termino="Establecimiento que recibe">{previa.data.establecimiento}</Dato>
              <Dato termino="Grado">{grado}</Dato>
              <Dato termino="Especialidad">
                {previa.data.especialidad} <span className="text-muted-foreground">(de la matrícula principal)</span>
              </Dato>
            </dl>

            <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr_1.4fr]">
              <CampoSelect
                id="complementaria-sede"
                label="Sede"
                required
                value={sedeElegida}
                onChange={(v) => {
                  setSedeId(v)
                  setPeriodoId("")
                  setGrupoId("")
                }}
                opciones={sedes.map((s) => ({ value: String(s.id), label: s.nombre }))}
                invalido={intentado && !sede}
              />
              <CampoSelect
                id="complementaria-periodo"
                label="Período (jornada, modalidad y ciclo)"
                required
                value={periodoId}
                disabled={!sede}
                onChange={(v) => {
                  setPeriodoId(v)
                  setGrupoId("")
                }}
                opciones={(sede?.periodos ?? []).map((p) => ({ value: String(p.id), label: p.label }))}
                descripcion={`Solo jornadas distintas de ${matricula.shift}, en estado Abierto.`}
                invalido={intentado && !periodo}
              />
              <CampoSelect
                id="complementaria-grupo"
                label="Grupo"
                required
                value={grupoId}
                disabled={!periodo}
                onChange={setGrupoId}
                opciones={(periodo?.grupos ?? []).map((g) => ({
                  value: String(g.id),
                  label: `${g.codigo} · ${g.libres} de ${g.cupo} libres`,
                }))}
                descripcion={
                  periodo && periodo.grupos.length === 0
                    ? `Ningún grupo de ${grado} que dicte ${previa.data.especialidad} tiene cupo en este período.`
                    : `Puestos libres sin contar los comprometidos con la convocatoria${periodo ? ` (${periodo.comprometidos})` : ""}.`
                }
                invalido={intentado && !grupo}
              />
            </div>

            <Aviso tono="info" titulo="Estudiante propio: no se postula y tiene prioridad sobre los adscritos.">
              Las asignaturas de la especialidad se gestionan después de guardar; en el boletín de la principal se titulan
              «Áreas de la matrícula complementaria».
            </Aviso>
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
            disabled={agregar.isPending || !previa.data}
            onClick={guardar}
          >
            {agregar.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <FloppyDiskIcon data-icon="inline-start" />
            )}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Dato({ termino, children }: { termino: string; children: ReactNode }) {
  return (
    <>
      <dt className="border-b border-border px-4 py-3 text-muted-foreground sm:max-w-40">{termino}</dt>
      <dd className="border-b border-border px-4 py-3 font-medium">{children}</dd>
    </>
  )
}
