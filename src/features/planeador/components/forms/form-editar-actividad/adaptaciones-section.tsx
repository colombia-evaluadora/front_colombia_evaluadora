import { useState } from "react"
import { useSelector } from "@tanstack/react-form"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { CharacterCounter } from "@/components/ui/character-counter"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { EstudiantesMultiSelect } from "@/features/planeador/components/forms/estudiantes-multi-select"
import { esEstudianteDeLaActividad } from "@/features/planeador/lib/adaptacion-estudiantes"
import { useArchivoViewUrl } from "@/features/files/api/query/use-archivo-view-url"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
  ComboboxGroup,
  ComboboxEmpty,
} from "@/components/ui/combobox"
import {
  useAdaptacionesReutilizablesQuery,
  type AdaptacionReutilizable,
} from "@/features/planeador/api/query/use-adaptaciones-reutilizables-query"
import { useTipoAdaptacionCatalogQuery } from "@/features/planeador/api/query/use-tipo-adaptacion-catalog"
import {
  EyeIcon,
  FileUploadOutlinedIcon,
  PlusCircleIcon,
  RemoveCircleOutlineIcon,
  TrashIcon,
} from "@/components/ui/icons"
import type { Adaptacion, AdaptacionArchivo } from "@/features/planeador/api/types/actividad"
import type { MatriculaGrupo } from "@/features/planeador/api/query/use-actividad-matriculas-grupo-query"
import { faltaTipoEvidencia } from "@/features/planeador/lib/campos-obligatorios-faltantes"
import {
  TEXTAREA_OUTLINED,
  ADAPTACION_TIPO_LABELS,
  VERSION_MODIFICADA_LABELS,
} from "@/features/planeador/components/forms/form-editar-actividad/constants"
import type { FormActividad } from "@/features/planeador/components/forms/form-editar-actividad/types"
import {
  useErrorObligatorio,
  ERROR_OBLIGATORIO,
} from "@/features/planeador/components/forms/form-editar-actividad/hooks"
import { SoloEdicion } from "@/features/planeador/components/forms/form-editar-actividad/solo-edicion"

export function AdaptacionesSection({
  form,
  matriculas,
  disabled,
  actividadId,
}: {
  form: FormActividad
  matriculas: MatriculaGrupo[]
  disabled: boolean
  actividadId: number
}) {
  const grupoId = useSelector(form.store, (state) => state.values.grupoId)
  // Error de "obligatorio" = "tocado" local del item o intento de guardar del form.
  const submissionAttempts = useSelector(form.store, (state) => state.submissionAttempts)
  // Regla 47: solo estudiantes de la actividad, no todo el grupo (el backend rechaza el resto).
  const asignarTodoElGrupo = useSelector(form.store, (state) => state.values.asignarTodoElGrupo)
  const matriculasIds = useSelector(form.store, (state) => state.values.matriculasIds)
  const estudiantesActividad = matriculas.filter((m) =>
    esEstudianteDeLaActividad({ asignarTodoElGrupo, matriculasIds }, m.id),
  )
  return (
    <Card className="gap-4 p-4">
      <h3 className="text-base font-semibold">Adaptaciones curriculares</h3>

      <form.Field name="adaptaciones">
        {(field) => {
          const adaptaciones = field.state.value as Adaptacion[]
          const add = () =>
            field.handleChange([
              ...adaptaciones,
              {
                tipo: "",
                especificacionTipo: "",
                descripcion: "",
                versionModificada: "no",
                versionModificadaRef: "",
                nombrePlantilla: "",
                aplicaA: "",
                estudiantesIds: [],
                archivos: [],
              },
            ])
          // El "+" vive siempre en el header, haya o no adaptaciones.
          return (
            <>
              <div className="flex items-center justify-between rounded-md border bg-card p-3">
                <p className="text-sm font-semibold">
                  {adaptaciones.length === 0
                    ? "Si aplica, registre las adaptaciones"
                    : "Adaptaciones registradas"}
                </p>
                <SoloEdicion>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="fill"
                        color="primary"
                        size="icon-sm"
                        type="button"
                        aria-label="Agregar adaptación"
                        disabled={disabled}
                        onClick={add}
                      />
                    }
                  >
                    <PlusCircleIcon />
                  </TooltipTrigger>
                  <TooltipContent>Agregar adaptación</TooltipContent>
                </Tooltip>
                </SoloEdicion>
              </div>

              {adaptaciones.length > 0 && (
                <ul className="mt-3 flex flex-col gap-3">
                  {adaptaciones.map((adapt, aIndex) => (
                    <AdaptacionItem
                      key={aIndex}
                      index={aIndex}
                      adaptacion={adapt}
                      matriculas={estudiantesActividad}
                      disabled={disabled}
                      actividadId={actividadId}
                      grupoId={grupoId ?? 0}
                      submissionAttempts={submissionAttempts}
                      onChange={(next) => {
                        const list = adaptaciones.slice()
                        list[aIndex] = next
                        field.handleChange(list)
                      }}
                      onRemove={() => {
                        const list = adaptaciones.slice()
                        list.splice(aIndex, 1)
                        field.handleChange(list)
                      }}
                    />
                  ))}
                </ul>
              )}
            </>
          )
        }}
      </form.Field>
    </Card>
  )
}

/**
 * Abre la plantilla ya subida en pestaña nueva. No usa `RecursoPreview`: no hay nombre
 * de archivo para adivinar el tipo, el navegador decide por el `Content-Type`.
 */
function VerPlantillaAdaptacion({ archivoId }: { archivoId: number }) {
  const { data: url, isPending } = useArchivoViewUrl(archivoId)
  if (isPending || !url) return null
  return (
    <Button
      variant="ghost"
      color="neutral"
      size="sm"
      type="button"
      nativeButton={false}
      render={<a href={url} target="_blank" rel="noopener noreferrer" />}
    >
      <EyeIcon data-icon="inline-start" />
      Ver plantilla cargada
    </Button>
  )
}

/**
 * Regla 50: combobox con las versiones modificadas que el propio docente registró en otras
 * actividades, filtradas por el tipo elegido. Una sola página de 100, filtrado en el cliente.
 */
function AdaptacionBibliotecaField({
  actividadId,
  grupoId,
  adaptacion,
  onChange,
  disabled,
}: {
  actividadId: number
  grupoId: number
  adaptacion: Adaptacion
  onChange: (next: Adaptacion) => void
  disabled: boolean
}) {
  const tieneAncla = actividadId > 0 || grupoId > 0
  const { data: tipoAdaptacionOptions } = useTipoAdaptacionCatalogQuery()
  const tipoAdaptacionId = tipoAdaptacionOptions?.find((o) => o.tipo === adaptacion.tipo)?.id
  const { data, isPending } = useAdaptacionesReutilizablesQuery(
    { actividadId, grupoId, tipoAdaptacionId, search: "", pagina: 1, size: 100 },
    tieneAncla,
  )
  const items = data?.items ?? []
  // Se identifica por la fila de origen: una plantilla de solo enlace no tiene archivo.
  const seleccionado = items.find((item) =>
    item.archivoId != null
      ? item.archivoId === adaptacion.archivoId
      : item.url != null && item.url === adaptacion.versionModificadaRef,
  )
  const etiqueta = (item: AdaptacionReutilizable) => item.nombrePlantilla || item.nombreArchivo || item.url || "—"

  function handleChange(value: string | null) {
    const item = items.find((it) => String(it.pkTactividadAdaptacion) === value)
    onChange({
      ...adaptacion,
      archivoId: item?.archivoId,
      archivoNombre: item?.nombreArchivo,
      // Sin blob: el recurso ya está en el servidor; si es de solo enlace viaja la URL.
      versionModificadaRef: item?.archivoId == null ? (item?.url ?? "") : "",
    })
  }

  return (
    <ComboboxField
      items={Object.fromEntries(
        items.map((item) => [String(item.pkTactividadAdaptacion), `${etiqueta(item)} — de: ${item.actividadOrigenTitulo}`]),
      )}
      value={seleccionado ? String(seleccionado.pkTactividadAdaptacion) : null}
      onValueChange={handleChange}
      disabled={disabled || !tieneAncla}
    >
      <ComboboxFieldTrigger className="w-full">
        <ComboboxFieldValue placeholder={!tieneAncla ? "Elegí un grupo primero" : "Seleccione"}>
          {() => (seleccionado ? etiqueta(seleccionado) : "Seleccione")}
        </ComboboxFieldValue>
      </ComboboxFieldTrigger>
      <ComboboxFieldContent>
        <ComboboxGroup>
          {items.map((item) => (
            <ComboboxFieldItem key={item.pkTactividadAdaptacion} value={String(item.pkTactividadAdaptacion)}>
              <span className="flex flex-col">
                <span>{etiqueta(item)}</span>
                <span className="text-muted-foreground text-xs">de: {item.actividadOrigenTitulo}</span>
              </span>
            </ComboboxFieldItem>
          ))}
        </ComboboxGroup>
        <ComboboxEmpty>
          {isPending
            ? "Buscando…"
            : "No hay plantillas guardadas en tus otras actividades todavía."}
        </ComboboxEmpty>
      </ComboboxFieldContent>
    </ComboboxField>
  )
}

// Formatos de la plantilla de adaptación (documentos, no multimedia). Se valida en el
// cliente (pedido de QA).
const ADAPTACION_ARCHIVO_ACCEPT = ".pdf,.doc,.docx,.jpg,.jpeg,.png"
const ADAPTACION_ARCHIVO_MIME_ACCEPT = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]
const ADAPTACION_ARCHIVO_MAX_BYTES = 10 * 1024 * 1024

/** Sin protocolo (`http`/`https`) no sirve como enlace. */
function esUrlValida(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

/**
 * Bloque de una adaptación curricular. `especificacionTipo`/`nombrePlantilla` validan por
 * `blur`; el checklist de estudiantes además con `submissionAttempts` (el backend rechaza la lista vacía).
 */
function AdaptacionItem({
  index,
  adaptacion,
  matriculas,
  disabled,
  actividadId,
  grupoId,
  submissionAttempts,
  onChange,
  onRemove,
}: {
  index: number
  adaptacion: Adaptacion
  matriculas: MatriculaGrupo[]
  disabled: boolean
  actividadId: number
  grupoId: number
  submissionAttempts: number
  onChange: (next: Adaptacion) => void
  onRemove: () => void
}) {
  const [tocoEspecificacionTipo, setTocoEspecificacionTipo] = useState(false)
  const [tocoNombrePlantilla, setTocoNombrePlantilla] = useState(false)
  // Rechazado en el picker (formato/tamaño): no llega a `adaptacion`.
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null)
  const [tocoEnlace, setTocoEnlace] = useState(false)
  const [tocoEstudiantes, setTocoEstudiantes] = useState(false)

  const especificacionTipoInvalida =
    tocoEspecificacionTipo && adaptacion.tipo === "Otro" && !adaptacion.especificacionTipo.trim()
  const nombrePlantillaInvalida =
    tocoNombrePlantilla &&
    (adaptacion.versionModificada === "archivo" || adaptacion.versionModificada === "enlace") &&
    !adaptacion.nombrePlantilla.trim()
  const enlaceInvalido =
    tocoEnlace && adaptacion.versionModificada === "enlace" && adaptacion.versionModificadaRef !== "" &&
    !esUrlValida(adaptacion.versionModificadaRef)
  // Solo cuentan los que siguen siendo estudiantes de la actividad.
  const estudiantesSeleccionados = adaptacion.estudiantesIds.filter((id) => matriculas.some((m) => m.id === id))
  const todosSeleccionados = matriculas.length > 0 && estudiantesSeleccionados.length === matriculas.length
  const estudiantesInvalido =
    (tocoEstudiantes || submissionAttempts > 0) &&
    adaptacion.aplicaA === "Estudiantes específicos" &&
    estudiantesSeleccionados.length === 0

  return (
    <li className="rounded-md border bg-card p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Adaptación {index + 1}</h4>
        <SoloEdicion>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                color="neutral"
                size="icon-sm"
                type="button"
                aria-label={`Quitar adaptación ${index + 1}`}
                disabled={disabled}
                onClick={onRemove}
              />
            }
          >
            <TrashIcon />
          </TooltipTrigger>
          <TooltipContent>{`Quitar adaptación ${index + 1}`}</TooltipContent>
        </Tooltip>
        </SoloEdicion>
      </div>

      <Field variant="outlined" className="mt-3">
        <FieldLabel>¿Qué tipo de adaptación requiere esta actividad?</FieldLabel>
        <Select
          value={(adaptacion.tipo || "__none__") as never}
          onValueChange={(value) =>
            onChange({
              ...adaptacion,
              tipo: (!value || value === "__none__" ? "" : value) as Adaptacion["tipo"],
            })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccione">
              {(value) =>
                value === "__none__"
                  ? "Seleccione"
                  : (ADAPTACION_TIPO_LABELS[value as string] ?? (value as string))
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Seleccione</SelectItem>
            <SelectItem value="Discapacidad visual">Discapacidad visual</SelectItem>
            <SelectItem value="Discapacidad auditiva">Discapacidad auditiva</SelectItem>
            <SelectItem value="Dificultades cognitivas">Dificultades cognitivas</SelectItem>
            <SelectItem value="Estilo de aprendizaje">
              Estilo de aprendizaje (visual, kinestésico, auditivo)
            </SelectItem>
            <SelectItem value="Modalidad">
              Modalidad (virtual, asincrónica, presencial)
            </SelectItem>
            <SelectItem value="Nivel de desempeño">
              Nivel de desempeño (refuerzo, ampliación)
            </SelectItem>
            <SelectItem value="Otro">Otro</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {/* Solo "Otro" la exige. */}
      {adaptacion.tipo === "Otro" && (
        <Field variant="outlined" className="mt-4" data-invalid={especificacionTipoInvalida}>
          <FieldLabel>Especifique el tipo de adaptación *</FieldLabel>
          <Input
            maxLength={150}
            placeholder="Describa el tipo de adaptación…"
            value={adaptacion.especificacionTipo}
            onChange={(e) => onChange({ ...adaptacion, especificacionTipo: e.target.value })}
            onBlur={() => setTocoEspecificacionTipo(true)}
            aria-invalid={especificacionTipoInvalida}
            disabled={disabled}
          />
          <CharacterCounter value={adaptacion.especificacionTipo} max={150} />
          {especificacionTipoInvalida && <FieldError errors={ERROR_OBLIGATORIO} />}
        </Field>
      )}

      <Field variant="outlined" className="mt-4">
        <FieldLabel>Describa cómo se adapta la actividad para este caso</FieldLabel>
        <Textarea
          rows={3}
          maxLength={500}
          placeholder="Describa la adaptación…"
          value={adaptacion.descripcion}
          onChange={(e) => onChange({ ...adaptacion, descripcion: e.target.value })}
          className={TEXTAREA_OUTLINED}
          disabled={disabled}
        />
        <CharacterCounter value={adaptacion.descripcion} max={500} />
      </Field>

      <Field variant="outlined" className="mt-4">
        <FieldLabel>
          ¿Se usará una versión modificada del instrumento de evaluación?
        </FieldLabel>
        <Select
          value={adaptacion.versionModificada as never}
          onValueChange={(value) =>
            onChange({
              ...adaptacion,
              versionModificada: (value ?? "") as Adaptacion["versionModificada"],
              // Al cambiar de modo se limpia el auxiliar.
              versionModificadaRef: "",
              archivoNombre: undefined,
              archivoId: undefined,
              archivos: [],
            })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccione">
              {(value) => VERSION_MODIFICADA_LABELS[value as string] ?? "Seleccione"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Seleccione</SelectItem>
            <SelectItem value="no">No</SelectItem>
            <SelectItem value="archivo">Sí, Adjuntar plantilla (archivo)</SelectItem>
            <SelectItem value="enlace">Sí, Adjuntar plantilla (enlace)</SelectItem>
            <SelectItem value="biblioteca">Sí, Adjuntar plantilla (biblioteca)</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {adaptacion.versionModificada === "archivo" && (
        <>
          <Field variant="outlined" className="mt-4" data-invalid={Boolean(errorArchivo)}>
            <FieldLabel>Archivos de plantilla (hasta 3) *</FieldLabel>
            {adaptacion.archivos.length > 0 && (
              <ul className="mb-2 flex flex-col gap-1">
                {adaptacion.archivos.map((archivo, archivoIndex) => (
                  <li
                    // Un archivo recién elegido aún no tiene id: cae al `blobUrl`.
                    key={archivo.fkTarchivo ?? archivo.blobUrl}
                    className="flex items-center justify-between gap-2 rounded-sm border px-2 py-1 text-sm"
                  >
                    <span className="truncate">{archivo.nombre}</span>
                    <div className="flex shrink-0 items-center gap-1">
                      {archivo.fkTarchivo !== undefined && !archivo.blobUrl && (
                        <VerPlantillaAdaptacion archivoId={archivo.fkTarchivo} />
                      )}
                      <SoloEdicion>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              color="neutral"
                              size="icon-sm"
                              type="button"
                              aria-label={`Quitar ${archivo.nombre}`}
                              disabled={disabled}
                              onClick={() => {
                                if (archivo.blobUrl) URL.revokeObjectURL(archivo.blobUrl)
                                onChange({
                                  ...adaptacion,
                                  archivos: adaptacion.archivos.filter((_, i) => i !== archivoIndex),
                                })
                              }}
                            />
                          }
                        >
                          <RemoveCircleOutlineIcon />
                        </TooltipTrigger>
                        <TooltipContent>{`Quitar ${archivo.nombre}`}</TooltipContent>
                      </Tooltip>
                      </SoloEdicion>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {adaptacion.archivos.length < 3 && (
              <div className="relative">
                <FileUploadOutlinedIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  type="file"
                  // `<input type="file">` no acepta `value` programático. Se valida tipo/tamaño y se limpia
                  // el input tras cada elección para poder repetir archivo y sumar items.
                  accept={ADAPTACION_ARCHIVO_ACCEPT}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    if (!ADAPTACION_ARCHIVO_MIME_ACCEPT.includes(file.type)) {
                      setErrorArchivo("Formato no permitido. Usá PDF, Word (.doc/.docx), JPG o PNG.")
                      e.target.value = ""
                      return
                    }
                    if (file.size > ADAPTACION_ARCHIVO_MAX_BYTES) {
                      setErrorArchivo("El archivo supera el tamaño máximo permitido (10 MB).")
                      e.target.value = ""
                      return
                    }
                    setErrorArchivo(null)
                    const nuevo: AdaptacionArchivo = { nombre: file.name, blobUrl: URL.createObjectURL(file) }
                    onChange({ ...adaptacion, archivos: [...adaptacion.archivos, nuevo] })
                    e.target.value = ""
                  }}
                  className="pl-9"
                  disabled={disabled}
                />
              </div>
            )}
            {errorArchivo && <FieldError errors={[{ message: errorArchivo }]} />}
            {adaptacion.archivos.length === 0 && !errorArchivo && (
              <FieldDescription>
                Hasta 3 archivos — PDF, Word (.doc/.docx), JPG o PNG, máx. 10 MB cada uno.
              </FieldDescription>
            )}
          </Field>
          <Field variant="outlined" className="mt-4" data-invalid={nombrePlantillaInvalida}>
            <FieldLabel>Nombre de plantilla *</FieldLabel>
            <Input
              maxLength={100}
              placeholder="Nombre con el que se identifica la plantilla…"
              value={adaptacion.nombrePlantilla}
              onChange={(e) => onChange({ ...adaptacion, nombrePlantilla: e.target.value })}
              onBlur={() => setTocoNombrePlantilla(true)}
              aria-invalid={nombrePlantillaInvalida}
              disabled={disabled}
            />
            <CharacterCounter value={adaptacion.nombrePlantilla} max={100} />
            {nombrePlantillaInvalida && <FieldError errors={ERROR_OBLIGATORIO} />}
          </Field>
        </>
      )}

      {adaptacion.versionModificada === "enlace" && (
        <>
          <Field variant="outlined" className="mt-4" data-invalid={enlaceInvalido}>
            <FieldLabel>Enlace de la plantilla</FieldLabel>
            <Input
              type="url"
              placeholder="https://…"
              maxLength={500}
              value={adaptacion.versionModificadaRef}
              onChange={(e) =>
                onChange({ ...adaptacion, versionModificadaRef: e.target.value })
              }
              onBlur={() => setTocoEnlace(true)}
              aria-invalid={enlaceInvalido}
              disabled={disabled}
            />
            <CharacterCounter value={adaptacion.versionModificadaRef} max={500} />
            {enlaceInvalido && (
              <FieldError
                errors={[{ message: "Ingresá una URL válida (debe empezar con http:// o https://)." }]}
              />
            )}
          </Field>
          <Field variant="outlined" className="mt-4" data-invalid={nombrePlantillaInvalida}>
            <FieldLabel>Nombre de plantilla *</FieldLabel>
            <Input
              maxLength={100}
              placeholder="Nombre con el que se identifica la plantilla…"
              value={adaptacion.nombrePlantilla}
              onChange={(e) => onChange({ ...adaptacion, nombrePlantilla: e.target.value })}
              onBlur={() => setTocoNombrePlantilla(true)}
              aria-invalid={nombrePlantillaInvalida}
              disabled={disabled}
            />
            <CharacterCounter value={adaptacion.nombrePlantilla} max={100} />
            {nombrePlantillaInvalida && <FieldError errors={ERROR_OBLIGATORIO} />}
          </Field>
        </>
      )}

      {adaptacion.versionModificada === "biblioteca" && (
        <Field variant="outlined" className="mt-4">
          <FieldLabel>Seleccionar desde biblioteca institucional</FieldLabel>
          <AdaptacionBibliotecaField
            actividadId={actividadId}
            grupoId={grupoId}
            adaptacion={adaptacion}
            onChange={onChange}
            disabled={disabled}
          />
        </Field>
      )}

      <Field variant="outlined" className="mt-4">
        <FieldLabel>¿A quién se aplica esta adaptación?</FieldLabel>
        <Select
          value={(adaptacion.aplicaA || "__none__") as never}
          onValueChange={(value) => {
            const next = (!value || value === "__none__" ? "" : value) as Adaptacion["aplicaA"]
            onChange({
              ...adaptacion,
              aplicaA: next,
              // Fuera de "Estudiantes específicos" la selección se limpia.
              estudiantesIds: next === "Estudiantes específicos" ? adaptacion.estudiantesIds : [],
            })
          }}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccione">
              {(value) => (value === "__none__" ? "Seleccione" : (value as string))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Seleccione</SelectItem>
            <SelectItem value="A todo el grupo">A todo el grupo</SelectItem>
            <SelectItem value="Estudiantes específicos">Estudiantes específicos</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {/* Solo con "Estudiantes específicos"; opciones = estudiantes de la actividad (Regla 47).
      Siempre guarda la lista explícita: "todos" se deriva de la selección. */}
      {adaptacion.aplicaA === "Estudiantes específicos" && (
        <Field variant="outlined" className="mt-4" data-invalid={estudiantesInvalido}>
          <FieldLabel htmlFor={`adaptacion-${index}-estudiantes`}>Estudiantes de la adaptación</FieldLabel>
          <EstudiantesMultiSelect
            id={`adaptacion-${index}-estudiantes`}
            estudiantes={matriculas}
            value={estudiantesSeleccionados}
            allSelected={todosSeleccionados}
            allSelectedLabel="Todos los estudiantes de la actividad"
            onChange={({ matriculaIds, allSelected }) => {
              setTocoEstudiantes(true)
              onChange({
                ...adaptacion,
                estudiantesIds: allSelected ? matriculas.map((m) => m.id) : matriculaIds,
              })
            }}
            onOpenChange={(open) => {
              if (!open) setTocoEstudiantes(true)
            }}
            invalid={estudiantesInvalido}
            disabled={disabled}
            placeholder="La actividad todavía no tiene estudiantes"
          />
          {estudiantesInvalido && <FieldError errors={ERROR_OBLIGATORIO} />}
        </Field>
      )}
    </li>
  )
}

/** Seguimiento solo aparece con alguna adaptación registrada. */
export function SeguimientoSection({ form, disabled }: { form: FormActividad; disabled: boolean }) {
  // Solo se monta con referente no formativo, por eso `false`.
  const tipoEvidenciaInvalido = useErrorObligatorio(
    form,
    useSelector(form.store, (state) => faltaTipoEvidencia(state.values, false)),
  )
  return (
    <form.Subscribe selector={(state) => state.values.adaptaciones.length > 0}>
      {(hasAdaptaciones) =>
        !hasAdaptaciones ? null : (
          <Card className="gap-4 p-4">
            <h3 className="text-base font-semibold">Seguimiento</h3>

            <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <form.Field name="generaEvidencias">
          {(field) => (
            <>
              <Field variant="outlined">
                <FieldLabel htmlFor={field.name}>¿Genera evidencias?</FieldLabel>
                <Select
                  value={field.state.value ? "si" : "no"}
                  onValueChange={(value) => field.handleChange(value === "si")}
                  disabled={disabled}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue>{(value) => (value === "si" ? "Sí" : "No")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="si">Sí</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              {/* Deshabilitado (no oculto) cuando no genera evidencias. */}
              <form.Field name="tipoEvidencia">
                {(tipoField) => (
                  <Field variant="outlined" data-invalid={tipoEvidenciaInvalido}>
                    <FieldLabel htmlFor={tipoField.name}>Tipo de evidencia{field.state.value ? " *" : ""}</FieldLabel>
                    <Select
                      value={tipoField.state.value}
                      onValueChange={(v) => v && tipoField.handleChange(v)}
                      disabled={!field.state.value || disabled}
                    >
                      <SelectTrigger id={tipoField.name} aria-invalid={tipoEvidenciaInvalido}>
                        <SelectValue />
                      </SelectTrigger>
                      {/* Valores = `nombre` real de `TIPO_EVIDENCIA` en `TLISTA_VALOR`. */}
                      <SelectContent>
                        <SelectItem value="Archivo">Archivo</SelectItem>
                        <SelectItem value="Enlace">Enlace</SelectItem>
                        <SelectItem value="Imagen">Imagen</SelectItem>
                        <SelectItem value="Observación">Observación</SelectItem>
                      </SelectContent>
                    </Select>
                    {tipoEvidenciaInvalido && <FieldError errors={ERROR_OBLIGATORIO} />}
                  </Field>
                )}
              </form.Field>
            </>
          )}
        </form.Field>
      </div>

      <form.Field name="observaciones">
        {(field) => (
          <Field variant="outlined">
            <FieldLabel htmlFor={field.name}>Observaciones del docente</FieldLabel>
            <Textarea className={TEXTAREA_OUTLINED}
              id={field.name}
              rows={4}
              placeholder="Ej: Reforzar con ejemplos del contexto local, revisar individualmente la participación de los estudiantes con bajo rendimiento…"
              maxLength={500}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              disabled={disabled}
            />
          </Field>
        )}
      </form.Field>
          </Card>
        )
      }
    </form.Subscribe>
  )
}
