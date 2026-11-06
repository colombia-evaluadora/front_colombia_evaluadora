import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SpinnerIcon } from "@/components/ui/icons"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { useAppForm } from "@/lib/forms"

import { useCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import { SeccionPlegable } from "@/features/gestion-estudiantil/convivencia/components/seccion-plegable"
import { useActividadMatriculasGrupoQuery } from "@/features/planeador/api/query/use-actividad-matriculas-grupo-query"
import { ComboOpciones } from "@/features/gestion-estudiantil/observador/components/combo-opciones"
import { useOpcionesConvivencia } from "@/features/gestion-estudiantil/convivencia/api/use-opciones-convivencia"
import { useRemisionQuery } from "@/features/gestion-estudiantil/inclusion/orientacion/api/query/use-orientacion-query"
import { useCorregirRemision, useCrearRemision } from "@/features/gestion-estudiantil/inclusion/orientacion/api/mutations/atenciones"
import { REMISION_VACIA, SECCIONES_REMISION, esquemaRemision, remisionAlBackend, remisionDesdeDetalle } from "@/features/gestion-estudiantil/inclusion/orientacion/utils/remision-form"
import { AvisoPiar } from "@/features/gestion-estudiantil/inclusion/piar/components/ui-piar"
import { mensajePiar } from "@/features/gestion-estudiantil/inclusion/piar/utils/errores-piar"

interface Props {
  /** Desde una anotación ya se sabe el estudiante; sin él se elige de la carga (5.2). */
  matricula?: number
  estudiante?: string
  /** Corregir una remisión aún Recibida. */
  remisionId?: number
  onClose: () => void
  onRemitida: () => void
}

/** G.1.REP.2: remite desde el estudiante; queda Recibida y el backend avisa a orientación. */
export function DialogRemitir({ matricula, estudiante, remisionId, onClose, onRemitida }: Props) {
  const motivos = useCatalogo("MOTIVO_ORIENTACION")
  const crear = useCrearRemision()
  const corregir = useCorregirRemision()
  const { data: detalle } = useRemisionQuery(remisionId)
  const [sede, setSede] = useState("")
  const [jornada, setJornada] = useState("")
  const [grupo, setGrupo] = useState("")
  const [elegida, setElegida] = useState("")
  const opciones = useOpcionesConvivencia(sede, jornada)
  const roster = useActividadMatriculasGrupoQuery(grupo ? Number(grupo) : undefined)
  const elige = matricula == null && remisionId == null
  const [notice, setNotice] = useState<{ id: number; message: string } | null>(null)
  const form = useAppForm({
    defaultValues: REMISION_VACIA,
    validators: { onSubmit: esquemaRemision },
    onSubmit: async ({ value }) => {
      try {
        const destino = matricula ?? Number(elegida)
        if (remisionId) await corregir.mutateAsync({ id: remisionId, body: remisionAlBackend(value, 0) })
        else if (!destino) return setNotice({ id: Date.now(), message: "Elija el estudiante." })
        else await crear.mutateAsync(remisionAlBackend(value, destino))
        onRemitida()
      } catch (e) {
        setNotice({ id: Date.now(), message: mensajePiar(e) })
      }
    },
  })
  useEffect(() => {
    if (detalle?.motivo) form.reset(remisionDesdeDetalle(detalle))
    // Solo al cargar la remisión.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detalle?.id])

  return (
    <Dialog open onOpenChange={(o) => !o && !crear.isPending && !corregir.isPending && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{remisionId ? "Corregir remisión" : "Remitir a orientación"}{(estudiante ?? detalle?.estudiante?.nombre) ? ` — ${estudiante ?? detalle?.estudiante?.nombre}` : ""}</DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" />
        {elige && (
          <div className="grid gap-3 sm:grid-cols-2">
            <ComboOpciones id="rem-sede" label="Sede" todos={false} placeholder="Seleccione" value={sede} options={opciones.sedeOpciones} onChange={(v) => { setSede(v); setJornada(""); setGrupo(""); setElegida("") }} />
            <ComboOpciones id="rem-jornada" label="Jornada" todos={false} placeholder="Seleccione" disabled={!sede} value={jornada} options={opciones.jornadaOpciones} onChange={(v) => { setJornada(v); setGrupo(""); setElegida("") }} />
            <ComboOpciones id="rem-grupo" label="Grado/Grupo" todos={false} placeholder="Seleccione" disabled={!jornada} value={grupo} options={opciones.grupoOpciones} onChange={(v) => { setGrupo(v); setElegida("") }} />
            <ComboOpciones id="rem-estudiante" label="Estudiante" required todos={false} placeholder="Seleccione" disabled={!grupo} value={elegida} options={(roster.data ?? []).map((m) => ({ value: String(m.id), label: m.nombre }))} onChange={setElegida} />
          </div>
        )}
        <form.AppField name="motivo">{(f) => <f.SelectField label="Motivo" required options={motivos} placeholder="Seleccione" />}</form.AppField>
        <form.AppField name="descripcion">{(f) => <f.TextareaField label="Descripción breve" required maxLength={500} />}</form.AppField>
        <h3 className="text-sm font-medium">Secciones de la remisión</h3>
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {SECCIONES_REMISION.map((s) => (
            <form.Subscribe key={s.name} selector={(st) => Boolean(st.values[s.name].trim())}>
              {(lleno) => (
                <SeccionPlegable
                  defaultAbierta={false}
                  titulo={
                    <span className="font-normal">
                      {s.label}
                      {lleno && <span className="ml-2 text-xs text-muted-foreground">· diligenciada</span>}
                    </span>
                  }
                  contentClassName="p-4"
                >
                  <form.AppField name={s.name}>{(f) => <f.TextareaField label={s.label} maxLength={1500} placeholder={s.guia || undefined} />}</form.AppField>
                </SeccionPlegable>
              )}
            </form.Subscribe>
          ))}
        </div>
        <AvisoPiar>Si sospecha autolesión o ideación suicida, use el Reporte de salud mental.</AvisoPiar>
        <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
        <DialogFooter>
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="muted" />}>Cancelar</DialogClose>
          <Button size="sm" disabled={crear.isPending || corregir.isPending} onClick={() => form.handleSubmit()}>
            {(crear.isPending || corregir.isPending) && <SpinnerIcon data-icon="inline-start" className="animate-spin" />}
            {remisionId ? "Guardar" : "Remitir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
