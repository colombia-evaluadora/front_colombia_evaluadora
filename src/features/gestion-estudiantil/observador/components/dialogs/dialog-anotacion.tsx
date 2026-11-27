import { useState } from "react"

import { Field, FieldError, FieldLabel, FieldDescription } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { DatePicker } from "@/components/date-picker"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CharacterCounter } from "@/components/ui/character-counter"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FloppyDiskIcon, InfoIcon, XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { formatDateValue, parseDateValue } from "@/lib/date-value"

import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"
import { SelectorChips } from "@/features/comunicaciones/chat/components/selector-chips"
import { CombosCascadaEstudiante } from "@/features/gestion-estudiantil/observador/components/cascada-estudiante"
import {
  etiquetaEstudiante,
  useBusquedaEstudiantes,
} from "@/features/gestion-estudiantil/observador/hooks/use-busqueda-estudiantes"
import { useAnotacionQuery } from "@/features/gestion-estudiantil/observador/api/query/use-anotaciones-query"
import { useCodigosAnotacionQuery } from "@/features/gestion-estudiantil/observador/api/query/use-codigos-anotacion-query"
import { useActualizarAnotacion, useCrearAnotacion } from "@/features/gestion-estudiantil/observador/api/mutations/anotaciones"
import { useOpcionesCascada } from "@/features/gestion-estudiantil/commons/hooks/use-opciones-cascada"
import { colorDeTipo, MENSAJES } from "@/features/gestion-estudiantil/observador/api/ui-mappings"
import type { AnotacionRow, CodigoAnotacion, EstudianteObservador } from "@/features/gestion-estudiantil/observador/api/types"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { MarcoOpciones } from "@/components/marco-opciones"

const OBS_MIN = 10
const OBS_MAX = 1000

interface Valores {
  /** Solo al modificar: de ahí sale el establecimiento del catálogo de códigos. */
  sede: string
  estudiantes: EstudianteObservador[]
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
    estudiantes: a
      ? [
          {
            fk_tmatricula: a.fk_tmatricula,
            estudiante_nombre: a.estudiante_nombre,
            estudiante_documento: a.estudiante_documento,
            fk_tgrupo: a.fk_tgrupo,
            grado_grupo: a.grado_grupo,
            fk_tsede: a.fk_tsede,
            sede_nombre: a.sede_nombre,
            fk_tlv_jornada: a.fk_tlv_jornada,
            jornada_nombre: a.jornada_nombre,
            fk_testablecimiento: 0,
          },
        ]
      : [],
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
  if (!v.estudiantes.length) e.estudiantes = "Seleccione al menos un estudiante."
  if (!v.fecha) e.fecha = "La fecha es obligatoria."
  else if (v.fecha > hoy()) e.fecha = "La fecha no puede ser posterior a hoy."
  if (!codigo) e.codigo = "El código es obligatorio."
  const largo = v.observacion.trim().length
  if (largo < OBS_MIN) e.observacion = `La observación debe tener al menos ${OBS_MIN} caracteres.`
  if (v.mediacion && v.estudiantes.length < 2) e.mediacion = "Seleccione al menos dos estudiantes para una mediación."
  return e
}

/** Modificar (desde la tabla o un enlace directo): carga la anotación y abre el mismo modal. */
export function DialogEditarAnotacion({ id, onClose }: { id: number; onClose: () => void }) {
  const { data, isPending, isError, error } = useAnotacionQuery(id)
  if (data) return <DialogAnotacion key={data.id} anotacion={data} onClose={onClose} />
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Modificar anotación</DialogTitle>
        </DialogHeader>
        {isPending ? <Skeleton className="h-64" /> : null}
        {isError ? <ErrorNoticeBanner error={error ?? true} fallback="No se encontró la anotación." /> : null}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Nueva anotación y Modificar anotación (Gestión Estudiantil 2.2), en un modal sobre el listado del Observador.
 * Al guardar avisa en la página y se cierra; los errores del back se ven dentro del modal.
 */
export function DialogAnotacion({ anotacion, onClose }: { anotacion?: AnotacionRow; onClose: () => void }) {
  const editar = anotacion != null
  const { notify } = useNotify()
  const [inicial] = useState<Valores>(() => desdeAnotacion(anotacion))
  const [v, setV] = useState<Valores>(inicial)
  const [intento, setIntento] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState<unknown>(null)

  const b = useBusquedaEstudiantes("REGISTRAR", !editar)
  // Al modificar no hay cascada: el establecimiento sale de la sede de la anotación.
  const opciones = useOpcionesCascada(editar ? v.sede : b.filtro.sede, "", editar ? "" : b.filtro.establecimiento)
  // El establecimiento del catálogo de códigos es el de los estudiantes elegidos (todos del mismo);
  // sin elegir, el único del usuario.
  const establecimientoEstudiantes = v.estudiantes[0]?.fk_testablecimiento || null
  const establecimientoId = establecimientoEstudiantes ?? opciones.establecimientoId
  const codigos = useCodigosAnotacionQuery(establecimientoId)
  const estudiantesQuery = b.estudiantes
  const codigo = codigos.data?.find((c) => String(c.id) === v.codigo)

  const tipoSituacion = codigo?.situacion_codigo
  const esGrave = tipoSituacion === "TIPO_II" || tipoSituacion === "TIPO_III"
  // Reglas 7 y 8: la permanencia es individual; la mediación, de Tipo I con dos o más.
  const permanenciaHabilitada = v.estudiantes.length === 1
  const mediacionHabilitada = !editar && tipoSituacion === "TIPO_I" && v.estudiantes.length >= 2

  const errores = intento ? validar(v, codigo) : {}
  // Guardar sin cambios = deshabilitado; Cancelar vuelve a como se abrió (CLAUDE.md §13). La fecha de hoy por
  // defecto no cuenta como cambio.
  const hayCambios = JSON.stringify(v) !== JSON.stringify(inicial)
  function deshacer() {
    setV(inicial)
    setIntento(false)
    setErrorGuardar(null)
  }

  const crear = useCrearAnotacion({
    mutationConfig: {
      onSuccess: (rows) => {
        notify(MENSAJES.creada(rows.length || v.estudiantes.length), { variant: "success" })
        onClose()
      },
      onError: setErrorGuardar,
    },
  })
  const actualizar = useActualizarAnotacion({
    mutationConfig: {
      onSuccess: () => {
        notify(MENSAJES.modificada, { variant: "success" })
        onClose()
      },
      onError: setErrorGuardar,
    },
  })
  const guardando = crear.isPending || actualizar.isPending

  function guardar() {
    setIntento(true)
    setErrorGuardar(null)
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
        matriculas: v.estudiantes.map((e) => e.fk_tmatricula),
        requiereMediacion: mediacionHabilitada && v.mediacion,
      })
  }

  const codigoOpciones = (codigos.data ?? []).map((c) => ({ value: String(c.id), label: `${c.codigo} · ${c.descripcion}` }))

  return (
    // No se cierra mientras guarda.
    <Dialog open onOpenChange={(open) => !open && !guardando && onClose()}>
      <DialogContent showCloseButton={false} className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editar ? "Modificar anotación" : "Nueva anotación"}</DialogTitle>
          <DialogDescription>
            {editar
              ? `${anotacion.estudiante_nombre} · ${anotacion.grado_grupo}`
              : "Registre una anotación del observador para uno o varios estudiantes."}
          </DialogDescription>
        </DialogHeader>
        <ErrorNoticeBanner error={errorGuardar} />

        <div className="flex flex-col gap-5">
          {!editar && (
            <CombosCascadaEstudiante
              idPrefix="anotacion"
              filtro={b.filtro}
              onChange={b.setFiltro}
              cascada={b.cascada}
              grupoOpciones={b.grupoOpciones}
              // Lo elegido de otro establecimiento, y su catálogo de códigos, ya no valen.
              onEstablecimientoCambia={() => setV((prev) => ({ ...prev, estudiantes: [], codigo: "", mediacion: false, preocupa: false }))}
            />
          )}

          <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(errores.estudiantes) || undefined}>
            <FieldLabel htmlFor="anotacion-estudiantes">{editar ? "Estudiante" : "Estudiantes*"}</FieldLabel>
            {editar ? (
              // La anotación es de un estudiante: no se cambia al modificar.
              <Input id="anotacion-estudiantes" value={v.estudiantes[0]?.estudiante_nombre ?? ""} readOnly disabled />
            ) : (
              <SelectorChips
                items={estudiantesQuery.data ?? []}
                value={v.estudiantes}
                onChange={(estudiantes) =>
                  setV({ ...v, estudiantes, preocupa: estudiantes.length === 1 && v.preocupa, mediacion: v.mediacion && estudiantes.length >= 2 })
                }
                getId={(m) => m.fk_tmatricula}
                getLabel={etiquetaEstudiante}
                renderItem={(m) => (
                  <span className="flex flex-col">
                    <span>{m.estudiante_nombre}</span>
                    <span className="text-xs text-muted-foreground">
                      {m.grado_grupo}
                      {m.estudiante_documento ? ` · ${m.estudiante_documento}` : ""}
                    </span>
                  </span>
                )}
                filtrar={() => true}
                onConsulta={b.setConsulta}
                cargando={estudiantesQuery.isFetching}
                placeholder="Buscar por nombre o documento"
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

          <div className="flex flex-col gap-2">
            <div className={`grid grid-cols-1 items-start gap-3 ${codigo ? "sm:grid-cols-[12rem_minmax(0,1fr)_auto]" : "sm:grid-cols-[12rem_minmax(0,1fr)]"}`}>
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
                disabled={!establecimientoId}
                placeholder={establecimientoId ? "Buscar código" : "Seleccione estudiantes primero"}
                value={v.codigo}
                options={codigoOpciones}
                error={errores.codigo}
                onChange={(c) => setV({ ...v, codigo: c, mediacion: false })}
              />
              {codigo && (
                <div className="mt-2 flex h-10 items-center gap-3 text-sm">
                  <span className="flex items-center gap-1.5">
                    Tipo:
                    <Badge variant="soft" color={colorDeTipo(codigo.tipo_codigo)}>
                      {codigo.tipo_nombre}
                    </Badge>
                  </span>
                  {codigo.situacion_nombre && (
                    <span className="flex items-center gap-1.5">
                      Tipo de situación:
                      <Badge variant="soft" color="info">
                        <span>{codigo.situacion_nombre}</span>
                      </Badge>
                    </span>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Tipo, Tipo de situación, Responsable de enseñanza y Período de Evaluación no se digitan.
            </p>
          </div>

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

          {/* Las dos marcas en recuadros, una al lado de la otra (en pantallas angostas, una debajo de otra). */}
          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
            <MarcoOpciones id="anotacion-preocupa">
              <label className="flex items-start gap-3">
                <Switch
                  round
                  checked={v.preocupa}
                  disabled={!permanenciaHabilitada}
                  onCheckedChange={(preocupa) => setV({ ...v, preocupa })}
                  aria-label="Preocupa la permanencia"
                />
                {/* La condición debajo del texto: en el modal no cabe al lado. */}
                <span className="flex flex-col">
                  Preocupa la permanencia
                  <span className="text-xs text-muted-foreground">Solo con un estudiante</span>
                </span>
              </label>
            </MarcoOpciones>
            <MarcoOpciones id="anotacion-mediacion" error={errores.mediacion}>
              <label className="flex items-start gap-3">
                <Switch
                  round
                  checked={v.mediacion}
                  disabled={!mediacionHabilitada}
                  onCheckedChange={(mediacion) => setV({ ...v, mediacion })}
                  aria-label="Requiere mediación"
                />
                {/* La condición debajo del texto: en el modal no cabe al lado. */}
                <span className="flex flex-col">
                  Requiere mediación
                  <span className="text-xs text-muted-foreground">Solo con un código Tipo I y dos o más estudiantes</span>
                </span>
              </label>
            </MarcoOpciones>
          </div>

          {mediacionHabilitada && v.mediacion && (
            <Alert variant="info">
              <InfoIcon aria-hidden="true" />
              <AlertDescription>
                Al guardar se crea un caso de convivencia Tipo I con los {v.estudiantes.length} estudiantes, que usted
                gestiona. En el caso se completan el rol de cada uno y la descripción de los hechos.
              </AlertDescription>
            </Alert>
          )}
          {esGrave && (
            <Alert variant="info">
              <InfoIcon aria-hidden="true" />
              <AlertDescription>
                Al guardar se crea un caso de convivencia {codigo?.situacion_nombre} con{" "}
                {v.estudiantes.length > 1 ? `los ${v.estudiantes.length} estudiantes` : "el estudiante"}, asignado a su
                gestor. En el boletín y en el portal del acudiente solo saldrán el código y su descripción, sin la
                Observación.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Nota de obligatorios en la línea de los botones; sin cambios: Cerrar y Guardar deshabilitado (§13). */}
        <DialogFooter>
          <p className="text-xs text-muted-foreground sm:mr-auto">Los campos marcados con * son obligatorios</p>
          {hayCambios ? (
            <Button size="sm" variant="outline" color="neutral" onClick={deshacer} disabled={guardando}>
              <XIcon data-icon="inline-start" />
              Cancelar
            </Button>
          ) : (
            <Button size="sm" variant="outline" color="neutral" onClick={onClose}>
              <XIcon data-icon="inline-start" />
              Cerrar
            </Button>
          )}
          <Button size="sm" onClick={guardar} disabled={guardando || !hayCambios}>
            <IconoCarga cargando={guardando}>
              <FloppyDiskIcon data-icon="inline-start" />
            </IconoCarga>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
