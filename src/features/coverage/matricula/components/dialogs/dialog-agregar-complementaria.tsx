import { useState } from "react"

import { Button } from "@/components/ui/button"
import { FichaDatos } from "@/components/ficha-datos"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FloppyDiskIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
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
  // Lo que eligió la persona (la sede que viene sola por defecto no cuenta).
  const hayCambios = Boolean(sedeId || periodoId || grupoId)
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
      <DialogContent showCloseButton={false} className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
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
            {/* Datos de solo lectura en la ficha (CLAUDE.md §13 «Ver detalle»). */}
            <FichaDatos
              datos={[
                {
                  etiqueta: "Matrícula principal",
                  valor: [matricula.campus, matricula.shift, grado, matricula.group].filter(Boolean).join(" · "),
                },
                { etiqueta: "Establecimiento que recibe", valor: previa.data.establecimiento },
                { etiqueta: "Grado", valor: grado },
                {
                  etiqueta: "Especialidad",
                  valor: (
                    <span>
                      {previa.data.especialidad} <span className="text-muted-foreground">(de la matrícula principal)</span>
                    </span>
                  ),
                },
              ]}
            />

            {/* Sede a todo el ancho; Período y Grupo debajo, en dos columnas (la etiqueta del período cabe en una línea). */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
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
              </div>
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
          </>
        )}

        <DialogFooter>
          <p className="text-xs text-muted-foreground sm:mr-auto">Los campos marcados con * son obligatorios</p>
          {/* Sin elegir nada: «Cerrar» y Guardar deshabilitado; al elegir, «Cancelar» (CLAUDE.md §13). */}
          <Button variant="outline" color="neutral" type="button" size="sm" onClick={() => onOpenChange(false)}>
            <XIcon data-icon="inline-start" />
            {hayCambios ? "Cancelar" : "Cerrar"}
          </Button>
          <Button
            type="button"
            variant="fill"
            color="primary"
            size="sm"
            disabled={agregar.isPending || !previa.data || !hayCambios}
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

