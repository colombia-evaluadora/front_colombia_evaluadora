import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import { DatePicker } from "@/components/date-picker"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CharacterCounter } from "@/components/ui/character-counter"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { FloppyDiskIcon, InfoIcon, SpinnerIcon } from "@/components/ui/icons"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeOutlet, NoticeProvider, queueNotice, useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { formatDateValue, parseDateValue } from "@/lib/date-value"
import { paths } from "@/config/paths"

import { SelectorChips } from "@/features/comunicaciones/chat/components/selector-chips"
import {
  useActividadMatriculasGrupoQuery,
  type MatriculaGrupo,
} from "@/features/planeador/api/query/use-actividad-matriculas-grupo-query"
import { useAnotacionQuery } from "@/features/gestion-estudiantil/observador/api/query/use-anotaciones-query"
import { useCodigosAnotacionQuery } from "@/features/gestion-estudiantil/observador/api/query/use-codigos-anotacion-query"
import { useActualizarAnotacion, useCrearAnotacion } from "@/features/gestion-estudiantil/observador/api/mutations/anotaciones"
import { useOpcionesObservador } from "@/features/gestion-estudiantil/observador/api/use-opciones-observador"
import { colorDeTipo, MENSAJES } from "@/features/gestion-estudiantil/observador/api/ui-mappings"
import type { AnotacionRow, CodigoAnotacion } from "@/features/gestion-estudiantil/observador/api/types"
import { ComboOpciones } from "@/features/gestion-estudiantil/observador/components/combo-opciones"
import { observadorEditarRoute } from "@/router"

const OBS_MIN = 10
const OBS_MAX = 1000

interface Valores {
  sede: string
  jornada: string
  grupo: string
  estudiantes: MatriculaGrupo[]
  fecha: string
  codigo: string
  observacion: string
  preocupa: boolean
  mediacion: boolean
}

const hoy = () => formatDateValue(new Date())

function desdeAnotacion(a: AnotacionRow | undefined): Valores {
  return {
    sede: a ? String(a.fk_tsede) : "",
    jornada: a?.fk_tlv_jornada != null ? String(a.fk_tlv_jornada) : "",
    grupo: a ? String(a.fk_tgrupo) : "",
    estudiantes: a ? [{ id: a.fk_tmatricula, estudianteId: 0, nombre: a.estudiante_nombre }] : [],
    fecha: a ? a.fecha.slice(0, 10) : hoy(),
    codigo: a ? String(a.fk_tcomportamiento) : "",
    observacion: a?.observacion ?? "",
    preocupa: a?.preocupa_permanencia ?? false,
    mediacion: a?.requiere_mediacion ?? false,
  }
}

/** Errores de cliente; las reglas que dependen de la base (período Calificable, alcance) las da el backend. */
function validar(v: Valores, codigo: CodigoAnotacion | undefined) {
  const e: Partial<Record<keyof Valores, string>> = {}
  if (!v.estudiantes.length) e.estudiantes = "Elegí al menos un estudiante."
  if (!v.fecha) e.fecha = "La fecha es obligatoria."
  else if (v.fecha > hoy()) e.fecha = "La fecha no puede ser posterior a hoy."
  if (!codigo) e.codigo = "El código es obligatorio."
  const largo = v.observacion.trim().length
  if (largo < OBS_MIN) e.observacion = `La observación debe tener al menos ${OBS_MIN} caracteres.`
  if (v.mediacion && v.estudiantes.length < 2) e.mediacion = "Seleccione al menos dos estudiantes para una mediación."
  return e
}

function AnotacionForm({ anotacion }: { anotacion?: AnotacionRow }) {
  const editar = anotacion != null
  const navigate = useNavigate()
  const { notify } = useNotify()
  const [v, setV] = useState<Valores>(() => desdeAnotacion(anotacion))
  const [intento, setIntento] = useState(false)

  const opciones = useOpcionesObservador(v.sede, v.jornada)
  const codigos = useCodigosAnotacionQuery(opciones.establecimientoId)
  const roster = useActividadMatriculasGrupoQuery(!editar && v.grupo ? Number(v.grupo) : undefined)
  const codigo = codigos.data?.find((c) => String(c.id) === v.codigo)

  const tipoSituacion = codigo?.situacion_codigo
  const esGrave = tipoSituacion === "TIPO_II" || tipoSituacion === "TIPO_III"
  // Reglas 7 y 8: la permanencia es individual; la mediación, de Tipo I con dos o más.
  const permanenciaHabilitada = v.estudiantes.length === 1
  const mediacionHabilitada = !editar && tipoSituacion === "TIPO_I" && v.estudiantes.length >= 2

  const errores = intento ? validar(v, codigo) : {}

  const volver = () => navigate({ to: paths.app.observador.getHref() })
  const onError = (error: Error) => notify(getErrorMessage(error), { variant: "error" })

  const crear = useCrearAnotacion({
    mutationConfig: {
      onSuccess: (rows) => {
        queueNotice(MENSAJES.creada(rows.length || v.estudiantes.length), { variant: "success" })
        volver()
      },
      onError,
    },
  })
  const actualizar = useActualizarAnotacion({
    mutationConfig: {
      onSuccess: () => {
        queueNotice(MENSAJES.modificada, { variant: "success" })
        volver()
      },
      onError,
    },
  })
  const guardando = crear.isPending || actualizar.isPending

  function guardar() {
    setIntento(true)
    if (Object.keys(validar(v, codigo)).length) return
    const base = {
      fecha: v.fecha,
      comportamientoId: Number(v.codigo),
      observacion: v.observacion,
      preocupaPermanencia: permanenciaHabilitada && v.preocupa,
    }
    if (editar) actualizar.mutate({ id: anotacion.id, ...base })
    else
      crear.mutate({
        ...base,
        matriculas: v.estudiantes.map((e) => e.id),
        requiereMediacion: mediacionHabilitada && v.mediacion,
      })
  }

  const codigoOpciones = (codigos.data ?? []).map((c) => ({ value: String(c.id), label: `${c.codigo} - ${c.descripcion}` }))

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
          {editar ? "Observador › Modificar anotación" : "Observador › Nueva anotación"}
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        <div className="flex flex-col gap-5">
          {!editar && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <ComboOpciones
                id="anotacion-sede"
                label="Sede"
                todos={false}
                value={v.sede}
                options={opciones.sedeOpciones}
                onChange={(sede) => setV({ ...v, sede, jornada: "", grupo: "", estudiantes: [], codigo: "" })}
              />
              <ComboOpciones
                id="anotacion-jornada"
                label="Jornada"
                todos={false}
                disabled={!v.sede}
                value={v.jornada}
                options={opciones.jornadaOpciones}
                onChange={(jornada) => setV({ ...v, jornada, grupo: "", estudiantes: [] })}
              />
              <ComboOpciones
                id="anotacion-grupo"
                label="Grado/Grupo"
                todos={false}
                disabled={!v.jornada}
                value={v.grupo}
                options={opciones.grupoOpciones}
                onChange={(grupo) => setV({ ...v, grupo, estudiantes: [] })}
              />
            </div>
          )}

          <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(errores.estudiantes) || undefined}>
            <FieldLabel htmlFor="anotacion-estudiantes">{editar ? "Estudiante" : "Estudiantes*"}</FieldLabel>
            {editar ? (
              // La anotación es de un estudiante: no se cambia al modificar.
              <Input id="anotacion-estudiantes" value={v.estudiantes[0]?.nombre ?? ""} readOnly disabled />
            ) : (
              <SelectorChips
                items={roster.data ?? []}
                value={v.estudiantes}
                onChange={(estudiantes) =>
                  setV({ ...v, estudiantes, preocupa: estudiantes.length === 1 && v.preocupa, mediacion: v.mediacion && estudiantes.length >= 2 })
                }
                getId={(m) => m.id}
                getLabel={(m) => m.nombre}
                cargando={roster.isFetching}
                placeholder={v.grupo ? "Buscar estudiante" : "Elegí Grado/Grupo primero"}
                ariaLabel="Estudiantes"
                invalido={Boolean(errores.estudiantes)}
                conFlecha
              />
            )}
            {errores.estudiantes ? (
              <FieldError>{errores.estudiantes}</FieldError>
            ) : (
              !editar && (
                <FieldDescription>
                  Solo estudiantes con la misma conducta. El afectado o un testigo se agregan después al caso, sin
                  anotación.
                </FieldDescription>
              )
            )}
          </Field>

          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[12rem_minmax(0,1fr)_auto]">
            <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(errores.fecha) || undefined}>
              <FieldLabel htmlFor="anotacion-fecha">
                Fecha*
              </FieldLabel>
              <DatePicker
                id="anotacion-fecha"
                size="sm"
                maxDate={new Date()}
                value={parseDateValue(v.fecha)}
                onChange={(date) => setV({ ...v, fecha: formatDateValue(date) })}
              />
              {errores.fecha ? <FieldError>{errores.fecha}</FieldError> : <FieldDescription>En un período Calificable.</FieldDescription>}
            </Field>
            <ComboOpciones
              id="anotacion-codigo"
              size="default"
              label="Código"
              required
              todos={false}
              disabled={!opciones.establecimientoId}
              placeholder={opciones.establecimientoId ? "Buscar código" : "Elegí Sede primero"}
              value={v.codigo}
              options={codigoOpciones}
              error={errores.codigo}
              onChange={(c) => setV({ ...v, codigo: c, mediacion: false })}
            />
            {codigo && (
              <div className="mt-2 flex h-11 items-center gap-3 text-sm">
                <span className="flex items-center gap-1.5">
                  Tipo:
                  <Badge variant="soft" color={colorDeTipo(codigo.tipo_nombre)}>
                    {codigo.tipo_nombre}
                  </Badge>
                </span>
                {codigo.situacion_nombre && (
                  <span className="flex items-center gap-1.5">
                    Tipo de situación:
                    <Badge variant="soft" color="info">
                      {codigo.situacion_nombre}
                    </Badge>
                  </span>
                )}
              </div>
            )}
          </div>
          <p className="-mt-3 text-xs text-muted-foreground">
            Tipo, Tipo de situación, Responsable de enseñanza y Período de Evaluación no se digitan.
          </p>

          <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(errores.observacion) || undefined}>
            <FieldLabel htmlFor="anotacion-observacion">
              Observación*
            </FieldLabel>
            <Textarea
              id="anotacion-observacion"
              rows={3}
              className={TEXTAREA_OUTLINED}
              maxLength={OBS_MAX}
              value={v.observacion}
              aria-invalid={Boolean(errores.observacion) || undefined}
              onChange={(e) => setV({ ...v, observacion: e.target.value })}
            />
            <div className="flex justify-between">
              {errores.observacion ? <FieldError>{errores.observacion}</FieldError> : <span />}
              <CharacterCounter value={v.observacion} max={OBS_MAX} />
            </div>
          </Field>

          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3 text-sm">
              <Switch
                round
                checked={v.preocupa}
                disabled={!permanenciaHabilitada}
                onCheckedChange={(preocupa) => setV({ ...v, preocupa })}
                aria-label="Preocupa la permanencia"
              />
              Preocupa la permanencia
              <span className="text-xs text-muted-foreground">· solo con un estudiante</span>
            </label>
            <label className="flex items-center gap-3 text-sm">
              <Switch
                round
                checked={v.mediacion}
                disabled={!mediacionHabilitada}
                onCheckedChange={(mediacion) => setV({ ...v, mediacion })}
                aria-label="Requiere mediación"
              />
              Requiere mediación
              <span className="text-xs text-muted-foreground">· solo con un código Tipo I y dos o más estudiantes</span>
            </label>
            {errores.mediacion && <FieldError>{errores.mediacion}</FieldError>}
          </div>

          {esGrave && (
            <Alert>
              <InfoIcon aria-hidden="true" />
              <AlertDescription>
                Al guardar se crea un caso de convivencia {codigo?.situacion_nombre} con{" "}
                {v.estudiantes.length > 1 ? `los ${v.estudiantes.length} estudiantes` : "el estudiante"}, asignado a su
                gestor. En el boletín y en el portal del acudiente solo saldrán el código y su descripción, sin la
                Observación.
              </AlertDescription>
            </Alert>
          )}
          <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
        </div>
      </TableScreenBody>
    </>
  )
}

export function NuevaAnotacionPage() {
  return (
    <NoticeProvider>
      <TableScreen>
        <AnotacionForm />
      </TableScreen>
    </NoticeProvider>
  )
}

export function EditarAnotacionPage() {
  const { anotacionId } = observadorEditarRoute.useParams()
  const { data, isPending, isError, error } = useAnotacionQuery(Number(anotacionId))
  return (
    <NoticeProvider>
      <TableScreen>
        {isPending ? (
          <Skeleton className="m-6 h-96" />
        ) : isError || !data ? (
          <ErrorNoticeBanner error={error ?? true} fallback="No se encontró la anotación." className="m-6" />
        ) : (
          <AnotacionForm key={data.id} anotacion={data} />
        )}
      </TableScreen>
    </NoticeProvider>
  )
}
