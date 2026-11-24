import { useState } from "react"
import { useNavigate, useParams } from "@tanstack/react-router"
import { paths } from "@/config/paths"
import { useOpcionesCascada } from "@/features/gestion-estudiantil/commons/hooks/use-opciones-cascada"
import { useAccesoPrevencionQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-parametros-indicadores-query"
import { useHistorialQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-tablero-query"
import { useAtencionQuery } from "@/features/gestion-estudiantil/inclusion/orientacion/api/query/use-orientacion-query"
import type { AtencionDetalle } from "@/features/gestion-estudiantil/inclusion/orientacion/api/types"

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { NoticeOutlet, NoticeProvider } from "@/components/notice/notice-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FilePdfIcon, FloppyDiskIcon, PlusIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { FormDisabledProvider } from "@/lib/forms"

import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { descargarRemisionExterna } from "@/features/gestion-estudiantil/inclusion/orientacion/api/descargas"
import { orientacionKeys } from "@/features/gestion-estudiantil/inclusion/orientacion/api/query-keys"
import { DialogoGestionRemision, DialogoRespuestaRemision, type ResumenRemision } from "@/features/gestion-estudiantil/commons/components/remisiones/dialogos-remision"
import type { RemisionExterna } from "@/features/gestion-estudiantil/inclusion/orientacion/api/types"
import { FirmantesAtencion } from "@/features/gestion-estudiantil/inclusion/orientacion/components/firmantes-atencion"
import { DialogRemisionExterna } from "@/features/gestion-estudiantil/inclusion/orientacion/components/dialogs/dialog-remision-externa"
import { useAtencionForm } from "@/features/gestion-estudiantil/inclusion/orientacion/hooks/use-atencion-form"
import { SECCIONES } from "@/features/gestion-estudiantil/inclusion/orientacion/utils/atencion-form"
import { AvisoPiar } from "@/features/gestion-estudiantil/inclusion/piar/components/ui-piar"
import { esOpcionElegida } from "@/features/gestion-estudiantil/inclusion/piar/utils/piar"
import { mensajePiar } from "@/features/gestion-estudiantil/inclusion/piar/utils/errores-piar"
import { MarcoOpciones } from "@/components/marco-opciones"

const etiquetaEstado = (r: RemisionExterna) => (r.estado === "RESPONDIDA" ? "Respondida" : "Enviada")

/** G.4.ORI.ATE.1: nueva atención, modificar y ver detalle. */
export function AtencionFormPage() {
  const { atencionId } = useParams({ strict: false }) as { atencionId?: string }
  const id = atencionId ? Number(atencionId) : undefined
  const q = useAtencionQuery(id)
  // El formulario nace con el detalle ya cargado: así sus valores iniciales son los guardados.
  if (id != null && q.isPending) return <TableScreen><TableScreenBody><Skeleton className="h-96 w-full" /></TableScreenBody></TableScreen>
  return <AtencionFormContenido key={q.data?.id ?? "nueva"} detalle={q.data} estado={q} />
}

function AtencionFormContenido({ detalle, estado }: { detalle: AtencionDetalle | undefined; estado: { isPending: boolean; error: unknown } }) {
  const a = useAtencionForm(detalle, estado)
  const { form } = a
  const navigate = useNavigate()
  // Matrícula de la atención: la del detalle o la elegida en el formulario.
  const matriculaId = a.detalle ? a.detalle.estudiante.fk_tmatricula : a.matricula ? Number(a.matricula) : undefined
  const { establecimientoId } = useOpcionesCascada("", "")
  const accesoPrevencion = useAccesoPrevencionQuery(establecimientoId).data
  // Valorar el riesgo se decide por estudiante (`puede_valorar` del historial de Prevención).
  const puedeValorar = useHistorialQuery(matriculaId, matriculaId != null).data?.puede_valorar === true
  const estudianteTexto = a.estudianteFijo ?? a.estudiantes.find((m) => String(m.fk_tmatricula) === a.matricula)?.estudiante_nombre
  const [externa, setExterna] = useState(false)
  const [gestion, setGestion] = useState<{ accion: "gestion" | "respuesta"; remision: ResumenRemision } | null>(null)
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null)
  const resumen = (r: RemisionExterna): ResumenRemision => ({
    id: r.id,
    entidad_nombre: r.entidad.nombre,
    estudiante_nombre: a.estudianteFijo,
    fecha_remision: r.fecha,
    fecha_esperada: r.fecha_esperada ?? null,
    estado_etiqueta: etiquetaEstado(r),
    vencida: Boolean(r.vencida),
  })
  const descargar = async (r: RemisionExterna) => {
    const res = await descargarRemisionExterna(r.id)
    setErrorDescarga(res.status === "error" ? res.message : null)
  }
  const opcionesEstudiante = a.estudiantes.map((m) => ({ value: String(m.fk_tmatricula), label: `${m.estudiante_nombre} · ${m.grado_grupo}` }))
  const titulo = a.soloLectura ? "Detalle de la atención" : a.id ? "Modificar atención" : "Nueva atención"

  return (
    <NoticeProvider>
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" color="neutral" disabled={!matriculaId || !puedeValorar} onClick={() => navigate({ to: paths.app.prevencionValorar.getHref(), search: { matricula: matriculaId } })}>Crear valoración del riesgo</Button>
              <Button size="sm" variant="outline" color="neutral" disabled={!matriculaId || !accesoPrevencion?.puede_reportar_salud_mental} onClick={() => navigate({ to: paths.app.prevencionSaludMentalNuevo.getHref(), search: { matricula: matriculaId, estudiante: estudianteTexto } })}>Registrar señal de salud mental</Button>
              <Button size="sm" variant="outline" color="neutral" onClick={a.volver}>{a.soloLectura ? "Volver" : "Cancelar"}</Button>
              {!a.soloLectura && (
                <Button size="sm" disabled={a.guardando} onClick={() => form.handleSubmit()}>
                  <IconoCarga cargando={a.guardando}><FloppyDiskIcon data-icon="inline-start" /></IconoCarga>
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
        <NoticeOutlet />
        {a.cargando ? (
          <Skeleton className="h-96 w-full" />
        ) : a.error ? (
          <AvisoPiar tipo="error">{mensajePiar(a.error, "atención")}</AvisoPiar>
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
                  <MarcoOpciones id="ate-modalidad" label="Modalidad" required>
                    <RadioGroup aria-labelledby="ate-modalidad-label" value={f.state.value} onValueChange={(v) => f.handleChange(v as string)} disabled={a.soloLectura}>
                      {a.modalidades.map((m) => (
                        <label key={m.value} className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value={m.value} />
                          {m.label}
                        </label>
                      ))}
                    </RadioGroup>
                  </MarcoOpciones>
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
            <form.AppField name="proxima">{(f) => <f.DateField label="Próxima cita" />}</form.AppField>
            <FirmantesAtencion filas={a.firmantes} onChange={a.setFirmantes} calidades={a.calidades} disabled={a.soloLectura} />
            {a.id && (
              <section className="grid gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Remisión externa</h2>
                  <Button size="xs" variant="outline" color="neutral" type="button" disabled={!a.detalle?.puede_registrar_remision_externa} onClick={() => setExterna(true)}>
                      <PlusIcon data-icon="inline-start" />
                      Registrar
                    </Button>
                </div>
                {errorDescarga && <AvisoPiar tipo="error">{errorDescarga}</AvisoPiar>}
                {a.detalle?.remisiones_externas.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border p-3">
                    <span className="mr-auto">
                      {formatFecha(r.fecha)} · <strong>{r.entidad.nombre}</strong> — {r.motivo}
                      {r.fecha_esperada && <span className="text-muted-foreground"> · Respuesta esperada el {formatFecha(r.fecha_esperada)}</span>}
                    </span>
                    <Badge variant="soft" color={r.estado === "RESPONDIDA" ? "success" : "info"}>{etiquetaEstado(r)}</Badge>
                    {r.vencida && <Badge variant="soft" color="destructive">Respuesta pendiente — plazo vencido</Badge>}
                    <Button size="xs" variant="outline" color="neutral" type="button" disabled={!r.puede_descargar} onClick={() => descargar(r)}>
                      <FilePdfIcon data-icon="inline-start" />
                      Descargar
                    </Button>
                    <Button size="xs" variant="outline" color="neutral" type="button" disabled={!r.puede_registrar_gestion} onClick={() => setGestion({ accion: "gestion", remision: resumen(r) })}>Registrar gestión</Button>
                    <Button size="xs" variant="outline" color="neutral" type="button" disabled={!r.puede_registrar_respuesta} onClick={() => setGestion({ accion: "respuesta", remision: resumen(r) })}>Registrar respuesta</Button>
                  </div>
                ))}
                {!a.detalle?.remisiones_externas.length && <p className="text-muted-foreground">Sin remisiones externas.</p>}
              </section>
            )}
            {!a.soloLectura && <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>}
          </FormDisabledProvider>
        )}
      </TableScreenBody>
      {externa && a.id && a.detalle && <DialogRemisionExterna atencionId={a.id} fechaAtencion={a.detalle.fecha} entidades={a.entidades} onClose={() => setExterna(false)} />}
      {gestion?.accion === "gestion" && <DialogoGestionRemision remision={gestion.remision} invalidar={orientacionKeys.all} onClose={() => setGestion(null)} />}
      {gestion?.accion === "respuesta" && <DialogoRespuestaRemision remision={gestion.remision} invalidar={orientacionKeys.all} onClose={() => setGestion(null)} />}
    </TableScreen>
    </NoticeProvider>
  )
}
