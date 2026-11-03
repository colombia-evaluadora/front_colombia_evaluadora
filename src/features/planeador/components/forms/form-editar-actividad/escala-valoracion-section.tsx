import { useEffect, useState } from "react"
import { useSelector } from "@tanstack/react-form"
import { useQueryClient } from "@tanstack/react-query"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CharacterCounter } from "@/components/ui/character-counter"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { ArrowCounterClockwiseIcon, CheckIcon, PlusCircleIcon, SpinnerIcon, TrashIcon, XIcon } from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import {
  escalaPrecargaQueryOptions,
  toEscalaVariantesConfig,
  useEscalaPrecargaQuery,
  type EscalaPrecarga,
} from "@/features/planeador/api/query/use-escala-precarga-query"
import type {
  EscalaCriterio,
  EscalaValoracion,
  EscalaValoracionTipo,
  InstrumentoPermitidoVariante,
  Nivel,
} from "@/features/planeador/api/types/actividad"
import { TEXTAREA_OUTLINED } from "@/features/planeador/components/forms/form-editar-actividad/constants"
import type { FormActividad } from "@/features/planeador/components/forms/form-editar-actividad/types"
import { cryptoId } from "@/features/planeador/components/forms/form-editar-actividad/helpers"
import { ERROR_OBLIGATORIO } from "@/features/planeador/components/forms/form-editar-actividad/hooks"
import {
  MENSAJE_PUNTAJE_REPETIDO,
  MENSAJE_PUNTAJE_TODOS_CERO,
  conflictosPuntaje,
  nombresRepetidos,
} from "@/features/planeador/lib/instrumento-faltantes"
import { SoloEdicion } from "@/features/planeador/components/forms/form-editar-actividad/solo-edicion"
import { SinEscalaAviso } from "@/features/planeador/components/sin-escala-aviso"

/**
 * Niveles con que nace cada criterio cualitativo (Regla 42): una COPIA de la escala de
 * valoración del período para el nivel de enseñanza del grado (etiqueta, descripción y
 * puntaje de cada nivel, `GET /planeador/actividades/escala-precarga`). Al ser copia, lo
 * que el docente edite, agregue o quite queda solo en ese criterio de esta actividad.
 * Sin escala configurada arranca con un nivel en blanco (y el form muestra `SinEscalaAviso`).
 */
function nivelesIniciales(precarga: EscalaPrecarga | undefined): Nivel[] {
  const niveles = precarga?.niveles ?? []
  if (niveles.length === 0) return [{ id: cryptoId(), nombre: "", descripcion: "" }]
  return niveles.map((nivel) => ({ id: cryptoId(), ...nivel }))
}

/** Criterio nuevo (Reglas 40/41/42): numérico con el máximo del formato de calificación, o cualitativo con la escala del período. */
function nuevoCriterio(tipo: EscalaValoracionTipo, precargaRaw: EscalaPrecarga | undefined): EscalaCriterio {
  // Sin escala no se inventan valores (ni 0-100 ni la nota máxima del formato).
  const precarga = precargaRaw?.sinEscala ? undefined : precargaRaw
  return tipo === "Numérica"
    ? {
        id: cryptoId(),
        nombre: "",
        valorMinimo: precarga?.valorMinimo,
        valorMaximo: precarga?.valorMaximo,
        interpretacion: "",
        niveles: [],
      }
    : { id: cryptoId(), nombre: "", interpretacion: "", niveles: nivelesIniciales(precarga) }
}

/** Regla 42: el valor máximo de un criterio cualitativo es el puntaje más alto de sus niveles. */
function valorMaximoCriterio(criterio: EscalaCriterio): number | undefined {
  const puntajes = criterio.niveles.map((n) => n.ponderacion).filter((p): p is number => p != null)
  return puntajes.length > 0 ? Math.max(...puntajes) : undefined
}

function numeroDesdeInput(raw: string): number | undefined {
  return raw === "" ? undefined : Number(raw)
}

/**
 * Editor de la escala de valoración (Reglas 40-42). El modo (Numérica/Cualitativa) es
 * de toda la escala; cada criterio es un bloque independiente ("+ Agregar más") con su
 * nombre y:
 * - Numérica: "Valor Asignado (Escala)" — valor mínimo/máximo (precargados desde la
 *   escala de la institución y editables por criterio) e interpretación (texto libre).
 * - Cualitativa: "Escala de Niveles" ("+ Agregar Nivel") con Etiqueta, Descriptor y
 *   Puntaje; el valor máximo del criterio es el puntaje más alto (solo lectura).
 * La nota del instrumento la calcula el backend: suma obtenida / suma de máximos.
 * "Otro (personalizado)" con método Escala monta este mismo componente (Regla 41) con las
 * `variantes` de `campos.metodoValoracion.catalogo[ESCALA_VALORACION]`.
 *
 * Regla 40: los modos ofrecidos y los valores iniciales salen de `variantes[]` (con su
 * `precarga`) de la configuración de la actividad; elegir modo no hace petición. Sin
 * `precarga` en la configuración (respuesta anterior) se cae a `GET escala-precarga`.
 */
export function EscalaValoracionSection({
  form,
  tipoEvaluacion,
  variantes,
  configuracionLista = true,
  disabled,
}: {
  form: FormActividad
  /** `TIPO_EVALUACION` del referente; `null` no restringe. Solo se usa si no llegan `variantes`. */
  tipoEvaluacion: string | null
  /** `variantes` de `ESCALA_VALORACION` en la configuración (filtradas por `tipoEvaluacion` en el backend). */
  variantes?: InstrumentoPermitidoVariante[]
  /** `false` sin configuración (o mientras carga): no se pide el respaldo antes de saber si hace falta. */
  configuracionLista?: boolean
  disabled: boolean
}) {
  // Errores inline; quien frena el guardado es `faltantesEscala`.
  const intentoGuardar = useSelector(form.store, (state) => state.submissionAttempts) > 0
  const grupoId = useSelector(form.store, (state) => state.values.grupoId)
  const asignaturaId = useSelector(form.store, (state) => state.values.asignaturaId)
  const unidadId = useSelector(form.store, (state) => state.values.unidad.id) || undefined
  const actividadId = useSelector(form.store, (state) => state.values.id) || undefined
  const precargaParams = { grupoId, asignaturaId, unidadId, actividadId }

  const config = toEscalaVariantesConfig(variantes)
  // Respaldo: solo si la configuración no trae `precarga`. Mientras carga no se crean
  // criterios: nacerían sin los valores de la institución.
  const respaldo = useEscalaPrecargaQuery(
    precargaParams,
    !disabled && configuracionLista && config?.precargas === undefined,
  )
  const cargandoPrecarga = respaldo.isLoading
  function precargaDe(tipo: EscalaValoracionTipo): EscalaPrecarga | undefined {
    return config?.precargas ? config.precargas[tipo] : respaldo.data
  }

  // Con `variantes` se ofrecen solo las que llegaron; sin ellas, CUANTITATIVA solo admite
  // Numérica, CUALITATIVA solo Cualitativa y mixto o sin dato, ambas.
  const permiteNumerica = config ? config.permitidas.includes("Numérica") : tipoEvaluacion !== "CUALITATIVA"
  const permiteCualitativa = config ? config.permitidas.includes("Cualitativa") : tipoEvaluacion !== "CUANTITATIVA"

  // Si el modo elegido dejó de estar permitido se corrige al único admitido (los
  // criterios se rehacen conservando el nombre: rango y niveles no se traducen).
  const escalaTipoActual = useSelector(form.store, (state) => state.values.escalaValoracion.tipo)
  const precargasConfig = config?.precargas
  useEffect(() => {
    const forzado: EscalaValoracionTipo | null =
      escalaTipoActual === "Numérica" && !permiteNumerica && permiteCualitativa
        ? "Cualitativa"
        : escalaTipoActual === "Cualitativa" && !permiteCualitativa && permiteNumerica
          ? "Numérica"
          : null
    if (forzado) {
      const precarga = precargasConfig ? precargasConfig[forzado] : respaldo.data
      form.setFieldValue("escalaValoracion", (prev) => ({
        ...prev,
        tipo: forzado,
        criterios: prev.criterios.map((c) => ({ ...nuevoCriterio(forzado, precarga), id: c.id, nombre: c.nombre })),
      }))
    }
  }, [escalaTipoActual, permiteNumerica, permiteCualitativa, form, precargasConfig, respaldo.data])

  // "Restaurar valores de la institución": relee la escala aplicable (`GET escala-precarga`)
  // y rehace cada criterio conservando nombre e interpretación. Guardar nunca modifica la
  // escala institucional.
  const queryClient = useQueryClient()
  const { notify } = useNotify()
  const [restaurando, setRestaurando] = useState(false)
  const [confirmarRestaurar, setConfirmarRestaurar] = useState(false)
  const [origenRestaurado, setOrigenRestaurado] = useState<string | null>(null)
  const sinContexto = !(grupoId && asignaturaId) && !unidadId && !actividadId
  async function restaurar() {
    setRestaurando(true)
    try {
      const precarga = await queryClient.fetchQuery({ ...escalaPrecargaQueryOptions(precargaParams), staleTime: 0 })
      setOrigenRestaurado(precarga.escala)
      form.setFieldValue("escalaValoracion", (prev) => ({
        ...prev,
        criterios: prev.criterios.map((c) => ({
          ...nuevoCriterio(prev.tipo, precarga),
          id: c.id,
          nombre: c.nombre,
          interpretacion: c.interpretacion,
        })),
      }))
      setConfirmarRestaurar(false)
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
    } finally {
      setRestaurando(false)
    }
  }
  const nombreEscala = origenRestaurado ?? respaldo.data?.escala ?? null

  // Sin escala aplicable (o sin niveles activos) no se precarga nada: se avisa y el flag
  // `sinEscala` (solo front, no viaja) hace que `faltantesEscala` frene el guardado. Un
  // error del respaldo (p. ej. 400 sin contexto) cuenta igual: no hay de dónde precargar.
  const precargaTipoActual = precargaDe(escalaTipoActual)
  const sinEscala =
    !disabled &&
    configuracionLista &&
    !cargandoPrecarga &&
    ((precargaTipoActual?.sinEscala ?? false) || (config?.precargas === undefined && respaldo.isError))
  const sinEscalaGuardado = useSelector(form.store, (state) => state.values.escalaValoracion.sinEscala ?? false)
  useEffect(() => {
    if (sinEscala !== sinEscalaGuardado) {
      form.setFieldValue("escalaValoracion", (prev) => ({ ...prev, sinEscala }), { dontUpdateMeta: true })
    }
  }, [sinEscala, sinEscalaGuardado, form])

  return (
    <Card className="gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Definición Escala de Valoración</h3>
        <SoloEdicion>
          <AlertDialog
            open={confirmarRestaurar}
            onOpenChange={(open) => {
              if (!restaurando) setConfirmarRestaurar(open)
            }}
          >
            <AlertDialogTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  color="primary"
                  size="sm"
                  disabled={disabled || cargandoPrecarga || sinContexto || sinEscala}
                />
              }
            >
              <ArrowCounterClockwiseIcon data-icon="inline-start" />
              Restaurar valores de la institución
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Restaurar valores de la institución</AlertDialogTitle>
                <AlertDialogDescription>
                  Los niveles y valores de cada criterio se reemplazan por los de la escala de valoración de la
                  institución. Se conservan los nombres de los criterios. ¿Desea continuar?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction onClick={restaurar} disabled={restaurando} aria-busy={restaurando}>
                  {restaurando ? (
                    <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                  ) : (
                    <CheckIcon data-icon="inline-start" />
                  )}
                  Restaurar
                </AlertDialogAction>
                <AlertDialogCancel variant="fill" color="neutral" disabled={restaurando}>
                  <XIcon data-icon="inline-start" />
                  Cancelar
                </AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </SoloEdicion>
      </div>

      <form.Field name="escalaValoracion">
        {(field) => {
          const escala = field.state.value as EscalaValoracion

          function setCriterios(criterios: EscalaCriterio[]) {
            field.handleChange({ ...escala, criterios })
          }

          function updateCriterio(index: number, patch: Partial<EscalaCriterio>) {
            const next = escala.criterios.slice()
            next[index] = { ...next[index]!, ...patch }
            setCriterios(next)
          }

          const sinCriterios = intentoGuardar && escala.criterios.length === 0
          const precargaActual = precargaDe(escala.tipo)

          return (
            <>
              <Field variant="outlined" className="sm:max-w-md">
                <FieldLabel>Modo de la escala</FieldLabel>
                <RadioGroup
                  className="flex min-h-11 items-center gap-6 rounded-md border border-input px-3"
                  value={escala.tipo}
                  disabled={disabled || cargandoPrecarga}
                  onValueChange={(value) => {
                    const tipo = value as EscalaValoracionTipo
                    if (tipo === escala.tipo) return
                    // Cambiar de modo rehace cada criterio (conserva el nombre) con la precarga de esa variante.
                    field.handleChange({
                      ...escala,
                      tipo,
                      criterios: escala.criterios.map((c) => ({
                        ...nuevoCriterio(tipo, precargaDe(tipo)),
                        id: c.id,
                        nombre: c.nombre,
                      })),
                    })
                  }}
                >
                  {/* La opción que el referente no admite ni se muestra. */}
                  {permiteNumerica && (
                    <label className="flex items-center gap-2">
                      <RadioGroupItem value="Numérica" className="data-checked:bg-primary" />
                      Numérica
                    </label>
                  )}
                  {permiteCualitativa && (
                    <label className="flex items-center gap-2">
                      <RadioGroupItem value="Cualitativa" className="data-checked:bg-primary" />
                      Cualitativa
                    </label>
                  )}
                </RadioGroup>
              </Field>

              {sinEscala ? (
                <SinEscalaAviso />
              ) : (
                precargaActual && (
                  <p className="text-muted-foreground text-xs" data-testid="escala-precarga-origen">
                    {escala.tipo === "Cualitativa"
                      ? `Los niveles de cada criterio nuevo se precargan desde ${nombreEscala ? `"${nombreEscala}"` : "la escala de valoración de la institución"}. Los cambios solo aplican a ese criterio de esta actividad.`
                      : `Los valores mínimo y máximo se precargan desde la escala de valoración de la institución${precargaActual.formato ? ` ("${precargaActual.formato}")` : ""}; puede ajustarlos en cada criterio.`}
                  </p>
                )
              )}

              {escala.criterios.length === 0 && !sinEscala && (
                // `tabIndex=-1`: sin controles adentro, "ir al error" enfoca el propio aviso.
                <div data-invalid={sinCriterios} tabIndex={-1}>
                  {sinCriterios ? (
                    <FieldError errors={[{ message: "Agrega al menos un criterio." }]} />
                  ) : (
                    <p className="text-muted-foreground text-sm">Esta escala todavía no tiene criterios.</p>
                  )}
                </div>
              )}

              <ul className="flex flex-col gap-4">
                {escala.criterios.map((criterio, index) => (
                  <li key={criterio.id}>
                    <CriterioEscalaCard
                      criterio={criterio}
                      index={index}
                      tipo={escala.tipo}
                      precarga={precargaActual}
                      intentoGuardar={intentoGuardar}
                      nombreRepetido={nombresRepetidos(escala.criterios.map((c) => c.nombre)).has(index)}
                      disabled={disabled}
                      onChange={(patch) => updateCriterio(index, patch)}
                      onRemove={() => setCriterios(escala.criterios.filter((_, i) => i !== index))}
                    />
                  </li>
                ))}
              </ul>

              <SoloEdicion>
                <div>
                  <Button
                    variant="outline"
                    color="primary"
                    type="button"
                    disabled={disabled || cargandoPrecarga || sinEscala}
                    onClick={() => setCriterios([...escala.criterios, nuevoCriterio(escala.tipo, precargaActual)])}
                  >
                    <PlusCircleIcon data-icon="inline-start" />
                    Agregar más
                  </Button>
                </div>
              </SoloEdicion>
            </>
          )
        }}
      </form.Field>
    </Card>
  )
}

function CriterioEscalaCard({
  criterio,
  index,
  tipo,
  precarga,
  intentoGuardar,
  nombreRepetido,
  disabled,
  onChange,
  onRemove,
}: {
  criterio: EscalaCriterio
  index: number
  tipo: EscalaValoracionTipo
  precarga: EscalaPrecarga | undefined
  intentoGuardar: boolean
  disabled: boolean
  /** Otro criterio de la escala ya usa este nombre (regla de `faltantesEscala`). */
  nombreRepetido: boolean
  onChange: (patch: Partial<EscalaCriterio>) => void
  onRemove: () => void
}) {
  const idBase = `escala-criterio-${criterio.id}`
  const nombreVacio = intentoGuardar && !criterio.nombre.trim()
  const nombreInvalido = nombreVacio || (intentoGuardar && nombreRepetido)
  // Puntajes repetidos / todos en 0 entre los niveles (solo Cualitativa): se marca el puntaje concreto.
  const conflictos = intentoGuardar && tipo !== "Numérica" ? conflictosPuntaje(criterio.niveles.map((n) => n.ponderacion)) : null

  function updateNivel(nIndex: number, patch: Partial<Nivel>) {
    const niveles = criterio.niveles.slice()
    niveles[nIndex] = { ...niveles[nIndex]!, ...patch }
    onChange({ niveles })
  }

  return (
    <Card className="gap-4 p-4" data-testid="escala-criterio">
      <div className="flex items-start gap-3">
        <Field variant="outlined" data-invalid={nombreInvalido} className="flex-1">
          <FieldLabel htmlFor={`${idBase}-nombre`}>Nombre del criterio *</FieldLabel>
          <Input
            id={`${idBase}-nombre`}
            placeholder={`Criterio ${index + 1}`}
            maxLength={200}
            value={criterio.nombre}
            onChange={(e) => onChange({ nombre: e.target.value })}
            aria-invalid={nombreInvalido}
            disabled={disabled}
          />
          <CharacterCounter value={criterio.nombre} max={200} />
          {nombreInvalido && (
            <FieldError
              errors={nombreVacio ? ERROR_OBLIGATORIO : [{ message: "Otro criterio de la escala ya tiene este nombre." }]}
            />
          )}
        </Field>
        <SoloEdicion>
          <Button
            variant="ghost"
            color="neutral"
            size="icon-sm"
            type="button"
            className="mt-2"
            aria-label={`Quitar criterio ${criterio.nombre || index + 1}`}
            title="Quitar criterio"
            disabled={disabled}
            onClick={onRemove}
          >
            <TrashIcon />
          </Button>
        </SoloEdicion>
      </div>

      {tipo === "Numérica" ? (
        <ValorAsignado
          criterio={criterio}
          idBase={idBase}
          intentoGuardar={intentoGuardar}
          disabled={disabled}
          onChange={onChange}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <h4 className="text-sm font-semibold">Escala de Niveles</h4>
          {criterio.niveles.length === 0 && (
            <div data-invalid={intentoGuardar} tabIndex={-1}>
              {intentoGuardar ? (
                <FieldError errors={[{ message: "Agrega al menos un nivel." }]} />
              ) : (
                <p className="text-muted-foreground text-sm">Este criterio todavía no tiene niveles.</p>
              )}
            </div>
          )}
          <ul className="flex flex-col gap-3">
            {criterio.niveles.map((nivel, nIndex) => {
              const descripcionInvalida = intentoGuardar && !nivel.descripcion.trim()
              const puntajeAusenteOFuera =
                intentoGuardar && (nivel.ponderacion == null || nivel.ponderacion < 0 || nivel.ponderacion > 100)
              const conflictoPuntaje = !conflictos
                ? undefined
                : conflictos.repetidos.has(nIndex)
                  ? MENSAJE_PUNTAJE_REPETIDO
                  : conflictos.todosCero && nIndex === 0
                    ? MENSAJE_PUNTAJE_TODOS_CERO
                    : undefined
              const puntajeInvalido = puntajeAusenteOFuera || Boolean(conflictoPuntaje)
              return (
                <li
                  key={nivel.id}
                  className="grid items-start gap-3 sm:grid-cols-[minmax(8rem,12rem)_minmax(0,1fr)_7rem_auto]"
                  data-testid="escala-nivel"
                >
                  <Field variant="outlined">
                    <FieldLabel htmlFor={`${nivel.id}-etiqueta`}>Etiqueta</FieldLabel>
                    <Input
                      id={`${nivel.id}-etiqueta`}
                      maxLength={130}
                      placeholder="Ej. En proceso"
                      value={nivel.nombre}
                      onChange={(e) => updateNivel(nIndex, { nombre: e.target.value })}
                      disabled={disabled}
                    />
                    <CharacterCounter value={nivel.nombre} max={130} />
                  </Field>
                  <Field variant="outlined" data-invalid={descripcionInvalida}>
                    <FieldLabel htmlFor={`${nivel.id}-descriptor`}>Descriptor *</FieldLabel>
                    <Textarea
                      id={`${nivel.id}-descriptor`}
                      className={TEXTAREA_OUTLINED}
                      rows={2}
                      maxLength={4000}
                      placeholder="Qué evidencia este nivel"
                      value={nivel.descripcion}
                      onChange={(e) => updateNivel(nIndex, { descripcion: e.target.value })}
                      aria-invalid={descripcionInvalida}
                      disabled={disabled}
                    />
                    <CharacterCounter value={nivel.descripcion} max={4000} />
                    {descripcionInvalida && <FieldError errors={ERROR_OBLIGATORIO} />}
                  </Field>
                  <Field variant="outlined" data-invalid={puntajeInvalido}>
                    <FieldLabel htmlFor={`${nivel.id}-puntaje`}>Puntaje *</FieldLabel>
                    <Input
                      id={`${nivel.id}-puntaje`}
                      type="number"
                      min={0}
                      max={100}
                      step="any"
                      value={nivel.ponderacion ?? ""}
                      onChange={(e) => updateNivel(nIndex, { ponderacion: numeroDesdeInput(e.target.value) })}
                      aria-invalid={puntajeInvalido}
                      disabled={disabled}
                    />
                    {puntajeInvalido && (
                      <FieldError
                        errors={
                          nivel.ponderacion == null
                            ? ERROR_OBLIGATORIO
                            : puntajeAusenteOFuera
                              ? [{ message: "El puntaje debe estar entre 0 y 100." }]
                              : [{ message: conflictoPuntaje }]
                        }
                      />
                    )}
                  </Field>
                  <SoloEdicion>
                    <Button
                      variant="ghost"
                      color="neutral"
                      size="icon-sm"
                      type="button"
                      className="mt-2"
                      aria-label={`Quitar nivel ${nivel.nombre || nIndex + 1}`}
                      title="Quitar nivel"
                      disabled={disabled}
                      onClick={() => onChange({ niveles: criterio.niveles.filter((_, i) => i !== nIndex) })}
                    >
                      <TrashIcon />
                    </Button>
                  </SoloEdicion>
                </li>
              )
            })}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SoloEdicion>
              <Button
                variant="ghost"
                color="primary"
                type="button"
                disabled={disabled}
                onClick={() =>
                  onChange({
                    niveles:
                      criterio.niveles.length === 0
                        ? nivelesIniciales(precarga)
                        : [...criterio.niveles, { id: cryptoId(), nombre: "", descripcion: "" }],
                  })
                }
              >
                <PlusCircleIcon data-icon="inline-start" />
                Agregar Nivel
              </Button>
            </SoloEdicion>
            {/* Regla 42: solo lectura, el puntaje más alto de los niveles. */}
            <Field variant="outlined" className="w-40">
              <FieldLabel htmlFor={`${idBase}-valor-maximo`}>Valor máximo</FieldLabel>
              <Input id={`${idBase}-valor-maximo`} readOnly disabled value={valorMaximoCriterio(criterio) ?? ""} />
            </Field>
          </div>
        </div>
      )}
    </Card>
  )
}

function ValorAsignado({
  criterio,
  idBase,
  intentoGuardar,
  disabled,
  onChange,
}: {
  criterio: EscalaCriterio
  idBase: string
  intentoGuardar: boolean
  disabled: boolean
  onChange: (patch: Partial<EscalaCriterio>) => void
}) {
  const minimoAusente = intentoGuardar && criterio.valorMinimo == null
  const maximoAusente = intentoGuardar && criterio.valorMaximo == null
  // El backend acepta hasta tres cifras enteras (`valorEscalaValido` de instrumento-faltantes).
  const fueraDeTresCifras = (v: number | undefined) => v != null && !(Number.isFinite(v) && Math.abs(v) < 1000)
  const minimoLargo = intentoGuardar && fueraDeTresCifras(criterio.valorMinimo)
  const maximoLargo = intentoGuardar && fueraDeTresCifras(criterio.valorMaximo)
  const ERROR_TRES_CIFRAS = [{ message: "Debe ser un número de hasta tres cifras." }]
  const rangoInvertido =
    intentoGuardar &&
    !minimoLargo &&
    !maximoLargo &&
    criterio.valorMinimo != null &&
    criterio.valorMaximo != null &&
    criterio.valorMinimo >= criterio.valorMaximo
  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-sm font-semibold">Valor Asignado (Escala)</h4>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field variant="outlined" data-invalid={minimoAusente || minimoLargo}>
          <FieldLabel htmlFor={`${idBase}-minimo`}>Valor mínimo *</FieldLabel>
          <Input
            id={`${idBase}-minimo`}
            type="number"
            step="any"
            value={criterio.valorMinimo ?? ""}
            onChange={(e) => onChange({ valorMinimo: numeroDesdeInput(e.target.value) })}
            aria-invalid={minimoAusente || minimoLargo}
            disabled={disabled}
          />
          {minimoAusente && <FieldError errors={ERROR_OBLIGATORIO} />}
          {minimoLargo && <FieldError errors={ERROR_TRES_CIFRAS} />}
        </Field>
        <Field variant="outlined" data-invalid={maximoAusente || maximoLargo || rangoInvertido}>
          <FieldLabel htmlFor={`${idBase}-maximo`}>Valor máximo *</FieldLabel>
          <Input
            id={`${idBase}-maximo`}
            type="number"
            step="any"
            value={criterio.valorMaximo ?? ""}
            onChange={(e) => onChange({ valorMaximo: numeroDesdeInput(e.target.value) })}
            aria-invalid={maximoAusente || maximoLargo || rangoInvertido}
            disabled={disabled}
          />
          {maximoAusente && <FieldError errors={ERROR_OBLIGATORIO} />}
          {maximoLargo && <FieldError errors={ERROR_TRES_CIFRAS} />}
          {rangoInvertido && <FieldError errors={[{ message: "Debe ser mayor que el valor mínimo." }]} />}
        </Field>
      </div>
      <Field variant="outlined">
        <FieldLabel htmlFor={`${idBase}-interpretacion`}>Interpretación</FieldLabel>
        <Textarea
          id={`${idBase}-interpretacion`}
          className={TEXTAREA_OUTLINED}
          rows={3}
          maxLength={4000}
          placeholder="Qué significa cada tramo del rango"
          value={criterio.interpretacion}
          onChange={(e) => onChange({ interpretacion: e.target.value })}
          disabled={disabled}
        />
      </Field>
    </div>
  )
}
