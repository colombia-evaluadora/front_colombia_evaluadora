import { useState } from "react"

import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { NoticeProvider } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { FloppyDiskIcon, PlusIcon, SpinnerIcon } from "@/components/ui/icons"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { FormDisabledProvider } from "@/lib/forms"

import { ComboOpciones } from "@/features/gestion-estudiantil/convivencia/components/combo-opciones"
import { SeccionPlegable } from "@/features/gestion-estudiantil/convivencia/components/seccion-plegable"
import { formatFecha } from "@/features/gestion-estudiantil/observador/api/ui-mappings"
import { DialogRemisionExterna } from "@/features/gestion-estudiantil/inclusion/orientacion/components/dialogs/dialog-remision-externa"
import { useAtencionForm } from "@/features/gestion-estudiantil/inclusion/orientacion/hooks/use-atencion-form"
import { SECCIONES } from "@/features/gestion-estudiantil/inclusion/orientacion/utils/atencion-form"
import { AvisoPiar } from "@/features/gestion-estudiantil/inclusion/piar/components/ui-piar"
import { esOpcionElegida } from "@/features/gestion-estudiantil/inclusion/piar/utils/piar"
import { mensajePiar } from "@/features/gestion-estudiantil/inclusion/piar/utils/errores-piar"

/** G.4.ORI.ATE.1: nueva atención, modificar y ver detalle. */
export function AtencionFormPage() {
  const a = useAtencionForm()
  const { form } = a
  const [externa, setExterna] = useState(false)
  const opcionesEstudiante = a.estudiantes.map((m) => ({ value: String(m.fk_tmatricula), label: `${m.estudiante_nombre} · ${m.grado_grupo}` }))
  const titulo = a.soloLectura ? "Detalle de la atención" : a.id ? "Modificar atención" : "Nueva atención"

  return (
    <NoticeProvider>
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" color="neutral" onClick={a.volver}>{a.soloLectura ? "Volver" : "Cancelar"}</Button>
              {!a.soloLectura && (
                <Button size="sm" disabled={a.guardando} onClick={() => form.handleSubmit()}>
                  {a.guardando ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : <FloppyDiskIcon data-icon="inline-start" />}
                  Guardar
                </Button>
              )}
            </div>
          }
        >
          {titulo}
        </TableScreenTitle>
      </TableScreenHeader>
      <TableScreenBody contentClassName="flex flex-col gap-4">
        {a.cargando ? (
          <Skeleton className="h-96 w-full" />
        ) : a.error ? (
          <AvisoPiar tipo="error">{mensajePiar(a.error)}</AvisoPiar>
        ) : (
          <FormDisabledProvider disabled={a.soloLectura}>
            <NoticeBanner notice={a.notice} onClose={() => a.setNotice(null)} variant="error" />
            <div className="grid gap-4 sm:grid-cols-3">
              {a.estudianteFijo ? (
                <p className="self-center text-sm">Estudiante: <strong>{a.estudianteFijo}</strong></p>
              ) : (
                <ComboOpciones
                  id="ate-estudiante"
                  label="Estudiante"
                  required
                  todos={false}
                  placeholder="Seleccione"
                  value={a.matricula}
                  options={opcionesEstudiante}
                  onChange={a.setMatricula}
                  onInputChange={(texto) => !esOpcionElegida(texto, opcionesEstudiante) && a.setBusqueda(texto)}
                />
              )}
              <form.AppField name="fecha">{(f) => <f.DateField label="Fecha" required />}</form.AppField>
              <form.AppField name="modalidad">
                {(f) => (
                  <fieldset className="grid gap-2">
                    <legend className="text-sm font-medium">Modalidad*</legend>
                    <RadioGroup className="flex flex-wrap gap-4" value={f.state.value} onValueChange={(v) => f.handleChange(v as string)} disabled={a.soloLectura}>
                      {a.modalidades.map((m) => (
                        <label key={m.value} className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value={m.value} />
                          {m.label}
                        </label>
                      ))}
                    </RadioGroup>
                  </fieldset>
                )}
              </form.AppField>
              <form.AppField name="origen">{(f) => <f.SelectField label="Origen" required options={a.origenes} placeholder="Seleccione" />}</form.AppField>
              <form.Subscribe selector={(st) => st.values.origen}>
                {(origen) =>
                  a.origenes.find((o) => o.value === origen)?.codigo === "REMISION_DOCENTE" ? (
                    <ComboOpciones
                      id="ate-remision"
                      label="Remisión de origen"
                      required
                      todos={false}
                      placeholder="Seleccione"
                      disabled={a.soloLectura}
                      value={a.remision}
                      options={a.remisiones.filter((r) => r.estado_codigo === "RECIBIDA" || String(r.id) === a.remision).map((r) => ({ value: String(r.id), label: `${formatFecha(r.fecha)} · ${r.remite_nombre ?? "—"} · ${r.motivo_nombre}` }))}
                      onChange={a.setRemision}
                    />
                  ) : <span className="hidden sm:block" />
                }
              </form.Subscribe>
              <form.AppField name="motivo">{(f) => <f.SelectField label="Motivo" required options={a.motivos} placeholder="Seleccione" />}</form.AppField>
            </div>
            <h2 className="text-lg font-semibold">Secciones de la atención</h2>
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {SECCIONES.map((c) => (
                <form.Subscribe key={c.name} selector={(st) => Boolean(st.values[c.name].trim())}>
                  {(lleno) => (
                    <SeccionPlegable
                      defaultAbierta={"requerida" in c}
                      titulo={
                        <span className="font-normal">
                          {"requerida" in c && <span className="text-red">* </span>}
                          {c.label}
                          {lleno && <span className="ml-2 text-xs text-muted-foreground">· diligenciada</span>}
                        </span>
                      }
                      contentClassName="p-4"
                    >
                      <form.AppField name={c.name}>{(f) => <f.TextareaField label={c.label} maxLength={c.max} />}</form.AppField>
                    </SeccionPlegable>
                  )}
                </form.Subscribe>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <form.AppField name="proxima">{(f) => <f.DateField label="Próxima cita" />}</form.AppField>
            </div>
            {a.id && (
              <section className="grid gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Remisión externa</h2>
                  {!a.soloLectura && (
                    <Button size="xs" variant="outline" color="neutral" type="button" onClick={() => setExterna(true)}>
                      <PlusIcon data-icon="inline-start" />
                      Registrar
                    </Button>
                  )}
                </div>
                {a.detalle?.remisiones_externas.map((r) => (
                  <p key={r.id}>{formatFecha(r.fecha)} · <strong>{r.entidad.nombre}</strong> — {r.motivo}</p>
                ))}
                {!a.detalle?.remisiones_externas.length && <p className="text-muted-foreground">Sin remisiones externas.</p>}
              </section>
            )}
            {!a.soloLectura && <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>}
          </FormDisabledProvider>
        )}
      </TableScreenBody>
      {externa && a.id && <DialogRemisionExterna atencionId={a.id} entidades={a.entidades} onClose={() => setExterna(false)} />}
    </TableScreen>
    </NoticeProvider>
  )
}
