import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import { DatePicker } from "@/components/date-picker"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { CaretDownIcon, FloppyDiskIcon, InfoIcon, LockIcon, SpinnerIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeOutlet, NoticeProvider, queueNotice, useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { formatDateValue, parseDateValue } from "@/lib/date-value"
import { paths } from "@/config/paths"

import { useActualizarCaso, useCrearCaso } from "@/features/gestion-estudiantil/convivencia/api/mutations/casos"
import { useCasoQuery, useGestorPrevistoQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-casos-query"
import { codigoDe, useCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import { esGrave } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import type { CasoDatosInput, CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"
import { ComboOpciones } from "@/features/gestion-estudiantil/convivencia/components/combo-opciones"
import { ConstructoresInvolucrados } from "@/features/gestion-estudiantil/convivencia/components/constructores-involucrados"
import type { EstudianteFila, InvolucradoFila } from "@/features/gestion-estudiantil/convivencia/api/form-types"
import { erroresInvolucrado } from "@/features/gestion-estudiantil/convivencia/api/validaciones"
import { DatosSiuceFields } from "@/features/gestion-estudiantil/convivencia/components/datos-siuce-fields"
import type { DatosSiuce } from "@/features/gestion-estudiantil/convivencia/api/form-types"
import { siuceBody, SIUCE_VACIO, useSecuelasHabilitadas, validarSiuce } from "@/features/gestion-estudiantil/convivencia/api/validaciones"
import { SiNo } from "@/features/gestion-estudiantil/convivencia/components/si-no"
import { SoportesUpload } from "@/features/gestion-estudiantil/convivencia/components/soportes-upload"
import { TextoLargo } from "@/features/gestion-estudiantil/convivencia/components/texto-largo"
import { errorLargo } from "@/features/gestion-estudiantil/convivencia/api/validaciones"

interface Valores {
  tipo: string
  manifestacion: string
  fechaConocida: boolean | null
  fechaHechos: string
  fechaConocimiento: string
  horaConocida: boolean | null
  hora: string
  lugar: string
  descripcion: string
  siuce: DatosSiuce
  soporte: File[]
  soporteExistente: number | null
  estudiantes: EstudianteFila[]
  involucrados: InvolucradoFila[]
  motivo: string
}

const pad = (n: number) => String(n).padStart(2, "0")
const hoy = () => formatDateValue(new Date())
const horaActual = () => {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function desdeCaso(c: CasoDetalle | undefined): Valores {
  return {
    tipo: c ? String(c.fk_tlv_tipo) : "",
    manifestacion: c?.fk_tlv_manifestacion ? String(c.fk_tlv_manifestacion) : "",
    fechaConocida: c ? Boolean(c.fecha_hechos_conocida) : null,
    fechaHechos: c?.fecha_hechos?.slice(0, 10) ?? "",
    fechaConocimiento: c ? c.fecha_conocimiento.slice(0, 10) : hoy(),
    horaConocida: c ? (c.fecha_hechos_conocida ? Boolean(c.hora_hechos_conocida) : null) : null,
    hora: c?.hora_hechos?.slice(0, 5) ?? "",
    lugar: c?.fk_tlv_lugar ? String(c.fk_tlv_lugar) : "",
    descripcion: c?.descripcion ?? "",
    siuce: c
      ? {
          tiposDano: (c.tipos_dano ?? []).map(String),
          agresion: c.fk_tlv_tipo_agresion ? String(c.fk_tlv_tipo_agresion) : "",
          evento: c.fk_tlv_evento_generador ? String(c.fk_tlv_evento_generador) : "",
          repetitiva: c.situacion_repetitiva ?? null,
          secuelas: c.secuelas_fisicas ?? null,
        }
      : SIUCE_VACIO,
    soporte: [],
    soporteExistente: c?.fk_tarchivo_soporte ?? null,
    estudiantes: (c?.estudiantes ?? []).map((e) => ({
      id: e.id,
      fk_matricula: e.fk_matricula,
      nombre: e.nombre,
      grado: e.grado_grupo ?? "",
      rol: String(e.fk_tlv_rol),
      rolOriginal: String(e.fk_tlv_rol),
    })),
    involucrados: (c?.otros_involucrados ?? []).map((i) => ({
      key: `inv-${i.id}`,
      id: i.id,
      tipo: String(i.fk_tlv_tipo_involucrado),
      nombre: i.nombre ?? "",
      tipoDoc: i.fk_tlv_tipo_documento ? String(i.fk_tlv_tipo_documento) : "",
      numDoc: i.numero_documento ?? "",
      rol: String(i.fk_tlv_rol),
      fk_funcionario: i.fk_funcionario,
    })),
    motivo: "",
  }
}

const fechasDe = (v: Valores) =>
  [v.fechaConocida, v.fechaConocida ? v.fechaHechos : "", v.fechaConocida ? v.horaConocida : null, v.horaConocida ? v.hora : "", v.fechaConocimiento].join("|")

type Errores = Partial<Record<keyof Valores | keyof DatosSiuce, string>>

/** Validaciones de cliente de 3.1; las que dependen de la base (alcance, matrícula Cursando) las da el backend. */
function validar(v: Valores, grave: boolean, tipoI: boolean, secuelas: boolean, fechasCambiaron: boolean): Errores {
  const e: Errores = {}
  if (!v.tipo) e.tipo = "El tipo de situación es obligatorio."
  if (!v.manifestacion) e.manifestacion = "La manifestación es obligatoria."
  if (v.fechaConocida == null) e.fechaConocida = "Indique si se conoce la fecha."
  if (!v.fechaConocimiento) e.fechaConocimiento = "La fecha de conocimiento es obligatoria."
  else if (v.fechaConocimiento > hoy()) e.fechaConocimiento = "No puede ser posterior a hoy."
  if (v.fechaConocida) {
    if (!v.fechaHechos) e.fechaHechos = "La fecha de los hechos es obligatoria."
    else if (v.fechaHechos > hoy()) e.fechaHechos = "No puede ser posterior a hoy."
    else if (v.fechaConocimiento && v.fechaHechos > v.fechaConocimiento)
      e.fechaHechos = "No puede ser posterior a la fecha de conocimiento."
    if (v.horaConocida == null) e.horaConocida = "Indique si se conoce la hora."
    if (v.horaConocida) {
      if (!v.hora) e.hora = "La hora es obligatoria."
      else if (v.fechaHechos === hoy() && v.hora > horaActual()) e.hora = "No puede ser posterior al momento actual."
    }
  }
  if (!v.lugar) e.lugar = "El lugar es obligatorio."
  const d = errorLargo(v.descripcion, 20, 3000, "La descripción")
  if (d) e.descripcion = d
  Object.assign(e, validarSiuce(v.siuce, grave, secuelas))
  if (!v.estudiantes.length) e.estudiantes = "Agregue al menos un estudiante."
  else if (v.estudiantes.some((x) => !x.rol)) e.estudiantes = "Elija el rol de cada estudiante."
  else if (tipoI && v.estudiantes.length + v.involucrados.length < 2)
    e.estudiantes = "Un caso Tipo I requiere al menos dos personas involucradas para la mediación."
  if (v.involucrados.some((i) => erroresInvolucrado(i))) e.involucrados = "Complete los otros involucrados."
  if (fechasCambiaron) {
    const m = errorLargo(v.motivo, 10, 1000, "El motivo de la corrección")
    if (m) e.motivo = m
  }
  return e
}

function CasoForm({ caso }: { caso?: CasoDetalle }) {
  const editar = caso != null
  const navigate = useNavigate()
  const { notify } = useNotify()
  const [v, setV] = useState<Valores>(() => desdeCaso(caso))
  const [inicial] = useState(() => fechasDe(desdeCaso(caso)))
  const [intento, setIntento] = useState(false)
  // Plegado al abrir (G.2.CAS.NUE.3); se abre solo en Tipo II/III, donde sus campos son obligatorios.
  const [siuceAbierto, setSiuceAbierto] = useState(() => esGrave(caso?.tipo_codigo))

  const tipos = useCatalogo("TIPO_SITUACION")
  const manifestaciones = useCatalogo("MANIFESTACION_SITUACION")
  const lugares = useCatalogo("LUGAR_SITUACION")
  const tipoCodigo = codigoDe(tipos, v.tipo)
  const grave = esGrave(tipoCodigo)
  const secuelas = useSecuelasHabilitadas(v.siuce)
  const fechasCambiaron = editar && fechasDe(v) !== inicial

  const matriculas = v.estudiantes.map((e) => e.fk_matricula)
  const previsto = useGestorPrevistoQuery(!editar && v.tipo ? Number(v.tipo) : null, editar ? [] : matriculas)

  const errores = intento ? validar(v, grave, tipoCodigo === "TIPO_I", secuelas, fechasCambiaron) : {}

  const volver = () =>
    navigate({ to: editar ? paths.app.convivenciaCaso.getHref(caso.id) : paths.app.convivencia.getHref() })
  const onError = (error: Error) => notify(getErrorMessage(error), { variant: "error" })

  const crear = useCrearCaso({
    mutationConfig: {
      onSuccess: () => {
        const p = previsto.data
        queueNotice(
          p && !p.sin_gestor && p.nombre
            ? `Caso de convivencia creado y asignado a ${p.nombre}.`
            : "Caso de convivencia creado.",
          { variant: "success" },
        )
        navigate({ to: paths.app.convivencia.getHref() })
      },
      onError,
    },
  })
  const actualizar = useActualizarCaso({
    mutationConfig: {
      onSuccess: () => {
        queueNotice("Caso de convivencia modificado.", { variant: "success" })
        volver()
      },
      onError,
    },
  })
  const guardando = crear.isPending || actualizar.isPending

  function guardar() {
    setIntento(true)
    const e = validar(v, grave, tipoCodigo === "TIPO_I", secuelas, fechasCambiaron)
    if (Object.keys(e).length) {
      if (e.tiposDano || e.agresion || e.repetitiva || e.secuelas) setSiuceAbierto(true)
      notify("Revise los campos marcados.", { variant: "error" })
      return
    }
    const datos: CasoDatosInput = {
      FK_TLV_MANIFESTACION: Number(v.manifestacion),
      FECHA_HECHOS_CONOCIDA: Boolean(v.fechaConocida),
      FECHA_HECHOS: v.fechaConocida ? v.fechaHechos : null,
      HORA_HECHOS_CONOCIDA: v.fechaConocida ? Boolean(v.horaConocida) : null,
      HORA_HECHOS: v.fechaConocida && v.horaConocida ? v.hora : null,
      FECHA_CONOCIMIENTO: v.fechaConocimiento,
      FK_TLV_LUGAR: Number(v.lugar),
      DESCRIPCION: v.descripcion.trim(),
      FK_TLV_EVENTO_GENERADOR: v.siuce.evento ? Number(v.siuce.evento) : null,
      ...siuceBody(v.siuce, secuelas),
      FK_ARCHIVO_SOPORTE: v.soporteExistente,
    }
    const toInvolucrado = (i: InvolucradoFila) => ({
      fk_tlv_tipo_involucrado: Number(i.tipo),
      fk_funcionario: i.fk_funcionario,
      nombre: i.nombre.trim(),
      fk_tlv_tipo_documento: i.tipoDoc ? Number(i.tipoDoc) : null,
      numero_documento: i.tipoDoc ? i.numDoc.trim() : null,
      fk_tlv_rol: Number(i.rol),
    })
    if (!editar) {
      crear.mutate({
        datos,
        tipoId: Number(v.tipo),
        soporte: v.soporte[0] ?? null,
        estudiantes: v.estudiantes.map((e) => ({ fk_matricula: e.fk_matricula, fk_tlv_rol: Number(e.rol) })),
        involucrados: v.involucrados.map(toInvolucrado),
      })
      return
    }
    const actuales = new Set(v.estudiantes.map((e) => e.id).filter(Boolean))
    const invActuales = new Set(v.involucrados.map((i) => i.id).filter(Boolean))
    actualizar.mutate({
      casoId: caso.id,
      datos,
      soporte: v.soporte[0] ?? null,
      motivoCorreccion: fechasCambiaron ? v.motivo.trim() : null,
      estudiantesNuevos: v.estudiantes.filter((e) => !e.id).map((e) => ({ fk_matricula: e.fk_matricula, fk_tlv_rol: Number(e.rol) })),
      estudiantesQuitados: (caso.estudiantes ?? []).filter((e) => !actuales.has(e.id)).map((e) => e.id),
      rolesCambiados: v.estudiantes
        .filter((e) => e.id && e.rol !== e.rolOriginal)
        .map((e) => ({ id: e.id!, fk_tlv_rol: Number(e.rol) })),
      involucradosNuevos: v.involucrados.filter((i) => !i.id).map(toInvolucrado),
      involucradosQuitados: (caso.otros_involucrados ?? []).filter((i) => !invActuales.has(i.id)).map((i) => i.id),
    })
  }

  const p = previsto.data

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" color="muted" onClick={volver} disabled={guardando}>
                Cancelar
              </Button>
              <Button size="sm" onClick={guardar} disabled={guardando}>
                {guardando ? (
                  <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                ) : (
                  <FloppyDiskIcon data-icon="inline-start" />
                )}
                Guardar
              </Button>
            </div>
          }
        >
          {editar ? `Convivencia › Caso ${caso.numero} › Modificar` : "Convivencia › Nuevo caso"}
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        <div className="flex max-w-5xl flex-col gap-5 pb-6">
          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-3">
            <ComboOpciones
              id="caso-tipo"
              label="Tipo de situación"
              required
              size="default"
              todos={false}
              disabled={editar}
              value={v.tipo}
              options={tipos}
              error={errores.tipo}
              onChange={(tipo) => {
                setV({ ...v, tipo })
                if (esGrave(codigoDe(tipos, tipo))) setSiuceAbierto(true)
              }}
            />
            <ComboOpciones
              id="caso-manifestacion"
              label="Manifestación"
              required
              size="default"
              todos={false}
              value={v.manifestacion}
              options={manifestaciones}
              error={errores.manifestacion}
              onChange={(manifestacion) => setV({ ...v, manifestacion })}
            />
            <ComboOpciones
              id="caso-lugar"
              label="Lugar"
              required
              size="default"
              todos={false}
              value={v.lugar}
              options={lugares}
              error={errores.lugar}
              onChange={(lugar) => setV({ ...v, lugar })}
            />
          </div>
          {editar && <p className="-mt-3 text-xs text-muted-foreground">El tipo se cambia con la acción Cambiar tipo.</p>}

          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-3">
            <SiNo
              id="caso-fecha-conocida"
              label="¿Se conoce la fecha de los hechos?"
              required
              value={v.fechaConocida}
              error={errores.fechaConocida}
              onChange={(fechaConocida) =>
                setV({ ...v, fechaConocida, ...(fechaConocida ? {} : { fechaHechos: "", horaConocida: null, hora: "" }) })
              }
            />
            <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(errores.fechaHechos) || undefined}>
              <FieldLabel htmlFor="caso-fecha-hechos">Fecha de los hechos{v.fechaConocida && "*"}</FieldLabel>
              <DatePicker
                id="caso-fecha-hechos"
                disabled={!v.fechaConocida}
                placeholder={v.fechaConocida === false ? "Desconocida" : undefined}
                maxDate={new Date()}
                value={parseDateValue(v.fechaHechos)}
                onChange={(date) => setV({ ...v, fechaHechos: date ? formatDateValue(date) : "" })}
              />
              {errores.fechaHechos && <FieldError>{errores.fechaHechos}</FieldError>}
            </Field>
            <Field
              orientation="vertical"
              variant="outlined"
              className="gap-2"
              data-invalid={Boolean(errores.fechaConocimiento) || undefined}
            >
              <FieldLabel htmlFor="caso-fecha-conocimiento">Fecha de conocimiento*</FieldLabel>
              <DatePicker
                id="caso-fecha-conocimiento"
                maxDate={new Date()}
                value={parseDateValue(v.fechaConocimiento)}
                onChange={(date) => setV({ ...v, fechaConocimiento: date ? formatDateValue(date) : "" })}
              />
              {errores.fechaConocimiento && <FieldError>{errores.fechaConocimiento}</FieldError>}
            </Field>
          </div>

          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-3">
            <SiNo
              id="caso-hora-conocida"
              label="¿Se conoce la hora de los hechos?"
              required={Boolean(v.fechaConocida)}
              disabled={!v.fechaConocida}
              value={v.horaConocida}
              error={errores.horaConocida}
              onChange={(horaConocida) => setV({ ...v, horaConocida, ...(horaConocida ? {} : { hora: "" }) })}
            />
            <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(errores.hora) || undefined}>
              <FieldLabel htmlFor="caso-hora">Hora de los hechos{v.horaConocida && "*"}</FieldLabel>
              <DatePicker
                id="caso-hora"
                mode="time"
                disabled={!v.fechaConocida || !v.horaConocida}
                placeholder={v.horaConocida === false ? "Hora desconocida" : undefined}
                value={v.hora}
                onChange={(hora) => setV({ ...v, hora })}
              />
              {errores.hora && <FieldError>{errores.hora}</FieldError>}
            </Field>
          </div>

          {fechasCambiaron && (
            <TextoLargo
              id="caso-motivo"
              label="Motivo de la corrección de fechas"
              required
              max={1000}
              value={v.motivo}
              onChange={(motivo) => setV({ ...v, motivo })}
              error={errores.motivo}
            />
          )}

          <TextoLargo
            id="caso-descripcion"
            label="Descripción de los hechos"
            required
            rows={5}
            max={3000}
            value={v.descripcion}
            onChange={(descripcion) => setV({ ...v, descripcion })}
            error={errores.descripcion}
          />

          <Collapsible
            open={siuceAbierto}
            onOpenChange={setSiuceAbierto}
            className="group/section overflow-hidden rounded-lg border border-border bg-background"
          >
            <CollapsibleTrigger className="flex w-full items-center gap-2 bg-muted/60 px-4 py-3 text-left text-base font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
              <CaretDownIcon className="size-5 shrink-0 -rotate-90 text-muted-foreground transition-transform group-data-[open]/section:rotate-0 motion-reduce:transition-none" />
              Datos para el SIUCE
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                Siguen el formulario del SIUCE · obligatorios en Tipo II y III
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent keepMounted className="flex flex-col gap-4 px-4 pt-5 pb-5 data-[closed]:hidden">
              <DatosSiuceFields
                idPrefix="caso-siuce"
                value={v.siuce}
                onChange={(siuce) => setV({ ...v, siuce })}
                required={grave}
                errores={errores}
              />
              <SoportesUpload
                label={v.soporteExistente ? "Reemplazar el soporte" : "Soporte"}
                archivos={v.soporte}
                onChange={(soporte) => setV({ ...v, soporte })}
                max={1}
              />
            </CollapsibleContent>
          </Collapsible>

          {!editar && v.tipo && matriculas.length > 0 && p && (
            <p className="text-sm">
              {p.sin_gestor || !p.nombre ? (
                "Sin gestor: se avisará al Administrador del establecimiento."
              ) : (
                <>
                  Gestor del caso: <span className="font-medium">{p.nombre}</span>{" "}
                  <span className="text-muted-foreground">(asignado por Sede y Jornada)</span>
                  <LockIcon aria-hidden="true" className="inline size-4 align-text-bottom text-muted-foreground" />
                </>
              )}
            </p>
          )}

          <ConstructoresInvolucrados
            estudiantes={v.estudiantes}
            onEstudiantes={(estudiantes) => setV({ ...v, estudiantes })}
            involucrados={v.involucrados}
            onInvolucrados={(involucrados) => setV({ ...v, involucrados })}
            errorEstudiantes={errores.estudiantes ?? errores.involucrados}
            mostrarErrores={intento}
          />

          {grave && !editar && (
            <Alert>
              <InfoIcon aria-hidden="true" />
              <AlertDescription>
                Los datos de un caso {tipos.find((t) => t.value === v.tipo)?.label} son sensibles: solo los ven quien lo
                gestiona, el Supervisor de sede y orientación. Quien reporta solo verá el estado del caso.
              </AlertDescription>
            </Alert>
          )}
          <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
        </div>
      </TableScreenBody>
    </>
  )
}

export function NuevoCasoPage() {
  return (
    <NoticeProvider>
      <TableScreen>
        <CasoForm />
      </TableScreen>
    </NoticeProvider>
  )
}

/** Modificar el caso y corregir fechas (G.2.CAS.GES.3). El id llega por props desde router.tsx. */
export function EditarCasoPage({ casoId }: { casoId: number }) {
  const { data, isPending, isError, error } = useCasoQuery(casoId)
  return (
    <NoticeProvider>
      <TableScreen>
        {isPending ? (
          <Skeleton className="m-6 h-96" />
        ) : isError || !data ? (
          <ErrorNoticeBanner error={error ?? true} fallback="No se encontró el caso." className="m-6" />
        ) : !data.acceso_completo ? (
          <ErrorNoticeBanner error={true} fallback="No tiene acceso a los datos de este caso." className="m-6" />
        ) : (
          <CasoForm key={data.id} caso={data} />
        )}
      </TableScreen>
    </NoticeProvider>
  )
}
