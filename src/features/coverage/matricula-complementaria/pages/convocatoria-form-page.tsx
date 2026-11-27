import { useState, type ReactNode } from "react"
import { Link, useNavigate, useParams } from "@tanstack/react-router"
import { MarcaPendientes } from "@/components/marca-pendientes"
import { MarcoOpciones } from "@/components/marco-opciones"

import { DatePicker } from "@/components/date-picker"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { NoticeProvider, queueNotice } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { ControlPointIcon, FloppyDiskIcon, LockIcon, SpinnerIcon, TrashIcon, XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ACTIONS_BUTTON_HOVER_CLASS } from "@/components/table-row-actions"
import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import { formatDateValue, parseDateValue } from "@/lib/date-value"
import { toDigitsOnly } from "@/lib/text-input"
import { cn } from "@/lib/utils"

import { SelectorChips } from "@/features/comunicaciones/chat/components/selector-chips"
import {
  useConvocatoriaQuery,
  useGuardarConvocatoria,
  useOpcionesConvocatoriaQuery,
} from "@/features/coverage/matricula-complementaria/api/convocatorias"
import type {
  Convocatoria,
  Desempate,
  FormaPostulacion,
  ModoSeleccion,
  Opcion,
  OpcionesConvocatoria,
} from "@/features/coverage/matricula-complementaria/api/types"
import {
  ESTADO_CONVOCATORIA,
  Marca,
  fecha,
} from "@/features/coverage/matricula-complementaria/api/ui-mappings"
import { Seccion, Secciones } from "@/features/coverage/inscripcion-reservas/components/reserva-ui"
import {
  Aviso,
  CampoSelect,
} from "@/features/coverage/matricula/components/dialogs/acciones/compartido"

const hoy = () => new Date().toISOString().slice(0, 10)

interface CupoForm {
  key: string
  id: number | null
  sedeId: string
  periodoId: string
  gradoId: string
  especialidadId: string
  cupo: string
  seleccionados: number
}

interface Valores {
  origenes: Opcion[]
  forma: FormaPostulacion
  continuidad: boolean
  listaEspera: boolean
  modo: ModoSeleccion
  desempate: Desempate
  inicio: string
  cierre: string
  publicacion: string
  limite: string
  cupos: CupoForm[]
}

let llave = 0
const cupoVacio = (): CupoForm => ({
  key: `n${llave++}`,
  id: null,
  sedeId: "",
  periodoId: "",
  gradoId: "",
  especialidadId: "",
  cupo: "",
  seleccionados: 0,
})

function iniciales(c: Convocatoria | undefined): Valores {
  if (!c)
    return {
      origenes: [],
      forma: "ABIERTA",
      continuidad: false,
      listaEspera: false,
      modo: "MANUAL",
      desempate: "SORTEO",
      inicio: "",
      cierre: "",
      publicacion: "",
      limite: "",
      cupos: [cupoVacio()],
    }
  return {
    origenes: c.origenes,
    forma: c.forma,
    continuidad: c.continuidadAutomatica,
    listaEspera: c.listaEspera,
    modo: c.modo,
    desempate: c.desempate,
    inicio: c.inicioPostulacion,
    cierre: c.cierrePostulacion,
    publicacion: c.publicacion ?? "",
    limite: c.limiteMatricula,
    cupos: c.cupos.map((x) => ({
      key: `c${x.id}`,
      id: x.id,
      sedeId: String(x.sedeId),
      periodoId: String(x.periodoId),
      gradoId: String(x.gradoId),
      especialidadId: String(x.especialidadId),
      cupo: String(x.cupo),
      seleccionados: x.seleccionados,
    })),
  }
}

/** Crear y editar una convocatoria (Sección 2.16.2). Sin `convocatoriaId` en la ruta, es nueva. */
export function ConvocatoriaFormPage() {
  const { convocatoriaId } = useParams({ strict: false }) as { convocatoriaId?: string }
  const id = convocatoriaId ? Number(convocatoriaId) : null
  const convocatoria = useConvocatoriaQuery(id)
  // Año actual: una sola convocatoria por establecimiento y año.
  const anio = convocatoria.data?.anio ?? new Date().getFullYear()
  const opciones = useOpcionesConvocatoriaQuery(anio)

  const listo = opciones.data && (id == null || convocatoria.data)
  const error = opciones.error ?? convocatoria.error
  return (
    <NoticeProvider>
      {listo ? (
        <Formulario
          key={id ?? "nueva"}
          id={id}
          anio={anio}
          convocatoria={convocatoria.data}
          opciones={opciones.data}
        />
      ) : (
        <TableScreen>
          <TableScreenHeader>
            <TableScreenTitle>Matrícula complementaria</TableScreenTitle>
          </TableScreenHeader>
          <TableScreenBody>
            {error ? (
              <p className="p-10 text-center text-red">{getErrorMessage(error)}</p>
            ) : (
              <div className="flex items-center justify-center gap-2 p-10 text-muted-foreground">
                <SpinnerIcon className="animate-spin" aria-hidden />
                Cargando…
              </div>
            )}
          </TableScreenBody>
        </TableScreen>
      )}
    </NoticeProvider>
  )
}

function Formulario({
  id,
  anio,
  convocatoria,
  opciones,
}: {
  id: number | null
  anio: number
  convocatoria: Convocatoria | undefined
  opciones: OpcionesConvocatoria
}) {
  const navigate = useNavigate()
  const guardar = useGuardarConvocatoria()
  const [v, setV] = useState<Valores>(() => iniciales(convocatoria))
  // Se compara sin la clave interna de cada cupo (cupoVacio() genera una nueva en cada llamada; no es un dato).
  const sinClaves = (x: Valores) => JSON.stringify({ ...x, cupos: x.cupos.map(({ key: _k, ...resto }) => resto) })
  const hayCambios = sinClaves(v) !== sinClaves(iniciales(convocatoria))
  const [intentado, setIntentado] = useState(false)
  const [aviso, setAviso] = useState<{ id: number; message: string } | null>(null)
  const set = (patch: Partial<Valores>) => setV((prev) => ({ ...prev, ...patch }))

  // Restricciones de Cambios (Sección 2.16.2, Comportamiento).
  const estado = convocatoria?.estado ?? "PROGRAMADA"
  const cerro = ["EN_SELECCION", "PUBLICADA", "CERRADA"].includes(estado)
  const conPostulaciones = convocatoria?.tienePostulaciones ?? false
  const origenesFijos = cerro ? (convocatoria?.origenes ?? []).map((o) => o.id) : []
  // Una fecha que ya pasó no se ajusta.
  const pasada = (original: string | null | undefined) =>
    Boolean(id && original && original < hoy())

  const abierta = v.forma === "ABIERTA"
  const conPublicacion = abierta || v.listaEspera

  // Lo que se puede elegir en cada cupo.
  const sedeDe = (c: CupoForm) => opciones.sedes.find((s) => String(s.id) === c.sedeId)
  const periodoDe = (c: CupoForm) => sedeDe(c)?.periodos.find((p) => String(p.id) === c.periodoId)
  const gradoDe = (c: CupoForm) => periodoDe(c)?.grados.find((g) => String(g.id) === c.gradoId)
  const especialidadDe = (c: CupoForm) =>
    gradoDe(c)?.especialidades.find((e) => String(e.id) === c.especialidadId)

  const periodosElegidos = v.cupos.map(periodoDe).filter((p) => p != null)
  const todosAnuales = periodosElegidos.length > 0 && periodosElegidos.every((p) => p.anual)
  // Independiente de la forma: con ella se reserva el cupo de los que continúan.
  const continuidadActiva = v.continuidad && todosAnuales
  // La fecha límite no pasa la menor Fecha límite de matrícula de los períodos de sus cupos.
  const topeLimite = periodosElegidos.map((p) => p.limiteMatricula).sort()[0] ?? ""
  const claveDe = (c: CupoForm) => `${c.periodoId}-${c.gradoId}-${c.especialidadId}`

  function cambiarCupo(key: string, patch: Partial<CupoForm>) {
    set({ cupos: v.cupos.map((c) => (c.key === key ? { ...c, ...patch } : c)) })
  }

  /* Validación */
  const errores = {
    origenes: v.origenes.length === 0 ? "Elija al menos un establecimiento de origen." : "",
    inicio: !v.inicio
      ? "Indique la fecha."
      : !pasada(convocatoria?.inicioPostulacion) && v.inicio < hoy()
        ? "No puede ser anterior a hoy."
        : "",
    cierre: !v.cierre
      ? "Indique la fecha."
      : v.cierre < v.inicio
        ? "No puede ser anterior al inicio."
        : "",
    publicacion: !conPublicacion
      ? ""
      : !v.publicacion
        ? "Indique la fecha."
        : v.publicacion < v.cierre
          ? "No puede ser anterior al cierre."
          : "",
    limite: !v.limite
      ? "Indique la fecha."
      : v.limite < (conPublicacion ? v.publicacion : v.cierre)
        ? conPublicacion
          ? "No puede ser anterior a la publicación."
          : "No puede ser anterior al cierre."
        : topeLimite && v.limite > topeLimite
          ? `Hasta el ${fecha(topeLimite)}.`
          : "",
  }
  // Obligatorios vacíos por sección, para la marca «N pendientes» de cada acordeón (CLAUDE.md §13).
  const pendientes = {
    datos: v.origenes.length ? 0 : 1,
    postulacion: [v.forma, v.modo, v.desempate].filter((x) => !x).length,
    fechas: [v.inicio, v.cierre, conPublicacion ? v.publicacion : "x", v.limite].filter((x) => !x).length,
    cupos: v.cupos.reduce(
      (n, c) => n + [c.sedeId, c.periodoId, c.gradoId, c.especialidadId, c.cupo].filter((x) => !x).length,
      0,
    ),
  }
  const errorCupo = (c: CupoForm) => {
    const n = Number(c.cupo)
    const libres = especialidadDe(c)?.libres ?? 0
    const antes = convocatoria?.cupos.find((x) => x.id === c.id)?.cupo ?? 0
    if (!c.sedeId || !c.periodoId || !c.gradoId || !c.especialidadId) return "Complete el cupo."
    if (v.cupos.filter((x) => claveDe(x) === claveDe(c)).length > 1)
      return "Este cupo está repetido."
    if (!c.cupo || n < 1) return "Mínimo 1."
    if (n < c.seleccionados) return `No menor que sus ${c.seleccionados} seleccionados.`
    // Un cupo ya guardado conserva su valor aunque hoy queden menos libres.
    if (n > Math.max(libres, antes))
      return `Máximo ${Math.max(libres, antes)}, los puestos libres de sus grupos.`
    return ""
  }
  const hayError =
    Object.values(errores).some(Boolean) ||
    v.cupos.length === 0 ||
    v.cupos.some((c) => errorCupo(c))

  function enviar() {
    setIntentado(true)
    if (hayError) return
    guardar.mutate(
      {
        id,
        input: {
          anio,
          origenIds: v.origenes.map((o) => o.id),
          forma: v.forma,
          continuidadAutomatica: v.continuidad && todosAnuales,
          listaEspera: !abierta && v.listaEspera,
          modo: v.modo,
          desempate: v.desempate,
          inicioPostulacion: v.inicio,
          cierrePostulacion: v.cierre,
          publicacion: conPublicacion ? v.publicacion : null,
          limiteMatricula: v.limite,
          cupos: v.cupos.map((c) => ({
            id: c.id,
            periodoId: Number(c.periodoId),
            gradoId: Number(c.gradoId),
            especialidadId: Number(c.especialidadId),
            cupo: Number(c.cupo),
          })),
        },
      },
      {
        onSuccess: () => {
          queueNotice(
            id == null
              ? `Se creó la convocatoria ${anio}.`
              : `Se guardaron los cambios de la convocatoria ${anio}.`,
            {
              variant: "success",
            },
          )
          navigate({ to: paths.app.coberturaComplementaria.getHref() })
        },
        onError: (err) => setAviso({ id: Date.now(), message: getErrorMessage(err) }),
      },
    )
  }

  const fechaCampo = (
    campo: "inicio" | "cierre" | "publicacion" | "limite",
    label: string,
    original: string | null | undefined,
    min: string,
    descripcion?: ReactNode,
  ) => {
    const invalido = intentado && Boolean(errores[campo])
    return (
      <Field variant="outlined" className="gap-1.5" data-invalid={invalido || undefined}>
        <FieldLabel htmlFor={`conv-${campo}`}>
          {label}
          <span data-required-mark="">*</span>
        </FieldLabel>
        <DatePicker
          id={`conv-${campo}`}
          mode="date"
          size="sm"
          variant="outlined"
          value={parseDateValue(v[campo])}
          minDate={parseDateValue(min)}
          disabled={pasada(original)}
          aria-invalid={invalido}
          onChange={(d) => set({ [campo]: formatDateValue(d) })}
        />
        {invalido ? (
          <FieldDescription className="text-red">{errores[campo]}</FieldDescription>
        ) : descripcion ? (
          <FieldDescription>{descripcion}</FieldDescription>
        ) : null}
      </Field>
    )
  }

  const continuan = opciones.continuan.filter((x) => x.cantidad > 0)
  /** Cada cupo muestra cuántos continúan en su especialidad y grado (Regla 80). */
  const continuanEn = (especialidad: string, grado: string | undefined) => {
    const n = continuan.find((x) => x.especialidad === especialidad && x.grado === grado)?.cantidad
    return n ? ` Continúan ${n}.` : ""
  }

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          ruta="Matrícula complementaria"
          action={
            // Sin cambios: Cerrar y Guardar deshabilitado; con cambios: Cancelar (vuelve a como se abrió) (CLAUDE.md §13).
            <div className="flex gap-2">
              {hayCambios ? (
                <Button type="button" variant="outline" color="neutral" size="sm" disabled={guardar.isPending} onClick={() => setV(iniciales(convocatoria))}>
                  <XIcon data-icon="inline-start" />
                  Cancelar
                </Button>
              ) : (
                <Button
                  render={<Link to={paths.app.coberturaComplementaria.getHref()} />}
                  nativeButton={false}
                  variant="outline"
                  color="neutral"
                  size="sm"
                >
                  <XIcon data-icon="inline-start" />
                  Cerrar
                </Button>
              )}
              <Button
                type="button"
                variant="fill"
                color="primary"
                size="sm"
                disabled={guardar.isPending || !hayCambios}
                onClick={enviar}
              >
                {guardar.isPending ? (
                  <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                ) : (
                  <FloppyDiskIcon data-icon="inline-start" />
                )}
                Guardar
              </Button>
            </div>
          }
        >
          {id == null ? `Nueva convocatoria ${anio}` : `Convocatoria ${anio}`}
          {/* Estado junto al título, en su misma línea (hay espacio a la derecha). */}
          <span className="ml-3 inline-flex align-middle text-sm font-normal"><Marca {...ESTADO_CONVOCATORIA[estado]} /></span>
        </TableScreenTitle>
      </TableScreenHeader>

      <TableScreenBody>
        <div className="grid gap-4">
          <NoticeBanner notice={aviso} onClose={() => setAviso(null)} variant="error" />
          <Secciones abiertas={["datos", "postulacion", "fechas", "cupos"]}>
            <Seccion value="datos" titulo="1. Establecimientos" extra={<MarcaPendientes pendientes={pendientes.datos} />}>
              <div className="grid gap-x-4 gap-y-5 md:grid-cols-[1fr_0.5fr_2fr]">
                <Field variant="outlined" className="gap-1.5">
                  <FieldLabel htmlFor="conv-establecimiento">Establecimiento que recibe</FieldLabel>
                  <div className="relative">
                    <Input id="conv-establecimiento" size="sm" value={opciones.establecimiento} disabled readOnly className="pr-9" />
                    <LockIcon aria-hidden className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </Field>
                <Field variant="outlined" className="gap-1.5">
                  <FieldLabel htmlFor="conv-anio">Año</FieldLabel>
                  <div className="relative">
                    <Input id="conv-anio" size="sm" value={String(anio)} disabled readOnly className="pr-9" />
                    <LockIcon aria-hidden className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </Field>
                <Field
                  variant="outlined"
                  className="gap-1.5"
                  data-invalid={(intentado && Boolean(errores.origenes)) || undefined}
                >
                  <FieldLabel>
                    Establecimientos de origen<span data-required-mark="">*</span>
                  </FieldLabel>
                  <SelectorChips
                    items={opciones.origenes}
                    value={v.origenes}
                    // Desde el cierre de postulación no se quitan orígenes.
                    onChange={(next) =>
                      set({
                        origenes: [
                          ...next,
                          ...v.origenes.filter(
                            (o) => origenesFijos.includes(o.id) && !next.some((n) => n.id === o.id),
                          ),
                        ],
                      })
                    }
                    getId={(o) => o.id}
                    getLabel={(o) => o.nombre}
                    visibles={8}
                    conFlecha
                    ariaLabel="Establecimientos de origen"
                    placeholder={v.origenes.length ? "" : "Seleccione"}
                    invalido={intentado && Boolean(errores.origenes)}
                  />
                  <FieldDescription className={cn(intentado && errores.origenes && "text-red")}>
                    {intentado && errores.origenes
                      ? errores.origenes
                      : cerro
                        ? `Los que tienen convenio de adscripción Aceptado para ${anio}. Desde el cierre de postulación solo se agregan.`
                        : `Los que tienen convenio de adscripción Aceptado para ${anio}.`}
                  </FieldDescription>
                </Field>
              </div>
            </Seccion>

            <Seccion
              value="postulacion"
              titulo="2. Postulación y selección"
              extra={<MarcaPendientes pendientes={pendientes.postulacion} />}
            >
              {/* Los cuatro del mismo ancho: en una línea cuando la sección mide 92rem o más (caben sin partir las
                  opciones); si no, 2 por fila (también del mismo ancho); angosta: 1. */}
              <div className="@container">
              <div className="grid gap-x-4 gap-y-6 @2xl:grid-cols-2 @[92rem]:grid-cols-4 @[92rem]:[&_[role=radiogroup]]:flex-nowrap @[92rem]:[&_[role=radiogroup]]:whitespace-nowrap">
                <MarcoOpciones
                    id="conv-forma-de-postulacion"
                    label="Forma de postulación"
                    required
                    descripcion={<>No se cambia desde la primera postulación.</>}
                  >
                  <RadioGroup
                    className="flex flex-wrap gap-x-6 gap-y-2"
                    value={v.forma}
                    disabled={conPostulaciones}
                    onValueChange={(f) => {
                      const forma = f as FormaPostulacion
                      // Continuidad por defecto: No con Abierta, Sí por el origen.
                      set({ forma, continuidad: forma === "ORIGEN", listaEspera: false })
                    }}
                  >
                    <Opcion valor="ABIERTA">Abierta</Opcion>
                    <Opcion valor="ORIGEN">Por el establecimiento de origen</Opcion>
                  </RadioGroup>
                </MarcoOpciones>
                <MarcoOpciones
                    id="conv-continuidad-automatica"
                    label="Continuidad automática"
                    descripcion={<>{periodosElegidos.length && !todosAnuales
                      ? "La continuidad automática solo aplica a períodos de modalidad Anual."
                      : "Solo con períodos de modalidad Anual."}</>}
                  >
                  <Interruptor
                    checked={v.continuidad && todosAnuales}
                    disabled={!todosAnuales || cerro}
                    onChange={(continuidad) => set({ continuidad })}
                  />
                </MarcoOpciones>
                {!abierta ? (
                  <MarcoOpciones
                      id="conv-lista-de-espera"
                      label="Lista de espera"
                      descripcion={<>Al agotarse el cupo, la postulación entra a la lista por orden de llegada.</>}
                    >
                    <Interruptor
                      checked={v.listaEspera}
                      disabled={conPostulaciones}
                      onChange={(listaEspera) => set({ listaEspera })}
                    />
                  </MarcoOpciones>
                ) : null}
                {abierta ? (
                  <>
                  <MarcoOpciones
                      id="conv-modo-de-seleccion"
                      label="Modo de selección"
                      required
                      descripcion={<>Automática: el sistema selecciona en la fecha de cierre.</>}
                    >
                    <RadioGroup
                      className="flex flex-wrap gap-x-6 gap-y-2"
                      value={v.modo}
                      disabled={cerro}
                      onValueChange={(m) => set({ modo: m as ModoSeleccion })}
                    >
                      <Opcion valor="MANUAL">Manual</Opcion>
                      <Opcion valor="AUTOMATICA">Automática</Opcion>
                    </RadioGroup>
                  </MarcoOpciones>
                  <MarcoOpciones
                      id="conv-desempate"
                      label="Desempate"
                      required
                      descripcion={<>Orden de inscripción es el orden de registro de la postulación.</>}
                    >
                    <RadioGroup
                      className="flex flex-wrap gap-x-6 gap-y-2"
                      value={v.desempate}
                      disabled={cerro}
                      onValueChange={(d) => set({ desempate: d as Desempate })}
                    >
                      <Opcion valor="SORTEO">Sorteo</Opcion>
                      <Opcion valor="ORDEN">Orden de inscripción</Opcion>
                    </RadioGroup>
                  </MarcoOpciones>
                  </>
                ) : null}
              </div>
              </div>
            </Seccion>

            <Seccion value="fechas" titulo="3. Fechas" extra={<MarcaPendientes pendientes={pendientes.fechas} />}>
              <div
                className={cn(
                  "grid gap-x-4 gap-y-5",
                  conPublicacion ? "md:grid-cols-4" : "md:grid-cols-3",
                )}
              >
                {fechaCampo(
                  "inicio",
                  "Fecha de inicio de postulación",
                  convocatoria?.inicioPostulacion,
                  hoy(),
                )}
                {fechaCampo(
                  "cierre",
                  "Fecha de cierre de postulación",
                  convocatoria?.cierrePostulacion,
                  v.inicio,
                )}
                {conPublicacion
                  ? fechaCampo(
                      "publicacion",
                      "Publicación de resultados",
                      convocatoria?.publicacion,
                      v.cierre,
                    )
                  : null}
                {fechaCampo(
                  "limite",
                  "Fecha límite para matricular",
                  convocatoria?.limiteMatricula,
                  conPublicacion ? v.publicacion : v.cierre,
                  topeLimite
                    ? `Hasta la menor Fecha límite de matrícula de los períodos (${fecha(topeLimite)}).`
                    : undefined,
                )}
              </div>
            </Seccion>

            <Seccion
              value="cupos"
              titulo="4. Cupos por especialidad"
              extra={<MarcaPendientes pendientes={pendientes.cupos} />}
              // Agregar: primario, en la cabecera del acordeón, a la derecha; el cupo nuevo sale de primero (CLAUDE.md §13).
              accion={
                <Button
                  type="button"
                  variant="fill"
                  color="primary"
                  size="sm"
                  onClick={() => {
                    set({ cupos: [cupoVacio(), ...v.cupos] })
                  }}
                >
                  <ControlPointIcon data-icon="inline-start" />
                  Agregar cupo
                </Button>
              }
            >
              <div className="grid gap-3">
                {v.cupos.map((c, i) => {
                  const sede = sedeDe(c)
                  const periodo = periodoDe(c)
                  const grado = gradoDe(c)
                  // Con la forma por el origen y continuidad, solo el grado inicial de la especialidad.
                  const grados = (periodo?.grados ?? []).filter(
                    (g) => !(v.forma === "ORIGEN" && v.continuidad) || g.inicial,
                  )
                  const err = intentado ? errorCupo(c) : ""
                  const especialidad = especialidadDe(c)
                  // Un cupo con seleccionados no cambia de combinación ni se quita: se baja hasta ellos.
                  const fijo = c.seleccionados > 0
                  return (
                    <div
                      key={c.key}
                      // Fondo blanco: la etiqueta flotante corta el borde del campo sobre el mismo color.
                      className="grid gap-2 rounded-lg border border-border bg-background p-3 pt-4"
                    >
                      <div className="grid items-end gap-3 md:grid-cols-[1.2fr_1.5fr_1fr_1.2fr_0.6fr_0.5fr_auto]">
                        <CampoSelect
                          id={`cupo-${c.key}-sede`}
                          label="Sede"
                          required
                          value={c.sedeId}
                          disabled={fijo}
                          onChange={(sedeId) =>
                            cambiarCupo(c.key, {
                              sedeId,
                              periodoId: "",
                              gradoId: "",
                              especialidadId: "",
                            })
                          }
                          opciones={opciones.sedes.map((s) => ({
                            value: String(s.id),
                            label: s.nombre,
                          }))}
                          invalido={Boolean(err) && !c.sedeId}
                        />
                        <CampoSelect
                          id={`cupo-${c.key}-periodo`}
                          label="Período"
                          required
                          value={c.periodoId}
                          disabled={!sede || fijo}
                          onChange={(periodoId) =>
                            cambiarCupo(c.key, { periodoId, gradoId: "", especialidadId: "" })
                          }
                          opciones={(sede?.periodos ?? []).map((p) => ({
                            value: String(p.id),
                            label: p.label,
                          }))}
                          invalido={Boolean(err) && !c.periodoId}
                        />
                        <CampoSelect
                          id={`cupo-${c.key}-grado`}
                          label="Grado"
                          required
                          value={c.gradoId}
                          disabled={!periodo || fijo}
                          onChange={(gradoId) =>
                            cambiarCupo(c.key, { gradoId, especialidadId: "" })
                          }
                          opciones={grados.map((g) => ({ value: String(g.id), label: g.nombre }))}
                          invalido={Boolean(err) && !c.gradoId}
                        />
                        <CampoSelect
                          id={`cupo-${c.key}-especialidad`}
                          label="Especialidad"
                          required
                          value={c.especialidadId}
                          disabled={!grado || fijo}
                          onChange={(especialidadId) => cambiarCupo(c.key, { especialidadId })}
                          opciones={(grado?.especialidades ?? []).map((e) => ({
                            value: String(e.id),
                            label: e.nombre,
                          }))}
                          invalido={Boolean(err) && !c.especialidadId}
                        />
                        <Field variant="outlined" className="min-w-0 gap-1.5" data-invalid={(Boolean(err) && c.especialidadId !== "") || undefined}>
                          <FieldLabel htmlFor={`cupo-${c.key}-n`}>
                            Cupo<span data-required-mark="">*</span>
                          </FieldLabel>
                          <Input
                            id={`cupo-${c.key}-n`}
                            size="sm"
                            inputMode="numeric"
                            className="tabular-nums"
                            value={c.cupo}
                            onChange={(e) =>
                              cambiarCupo(c.key, { cupo: toDigitsOnly(e.target.value, 3) })
                            }
                          />
                        </Field>
                        {/* Solo lectura con candado (CLAUDE.md §13). */}
                        <Field variant="outlined" className="min-w-0 gap-1.5">
                          <FieldLabel htmlFor={`cupo-${c.key}-sel`}>Selecc.</FieldLabel>
                          <div className="relative">
                            <Input
                              id={`cupo-${c.key}-sel`}
                              size="sm"
                              className="pr-9 tabular-nums"
                              value={String(c.seleccionados)}
                              disabled
                              readOnly
                            />
                            <LockIcon aria-hidden className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
                          </div>
                        </Field>
                        {/* Eliminar con confirmación (ConfirmRemoveButton); un cupo sin ningún dato se quita directo. */}
                        <div className={cn("flex", ACTIONS_BUTTON_HOVER_CLASS)}>
                          {!c.sedeId && !c.periodoId && !c.gradoId && !c.especialidadId && !c.cupo ? (
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    color="destructive"
                                    size="icon-sm"
                                    aria-label={`Eliminar el cupo ${i + 1}`}
                                    disabled={v.cupos.length === 1}
                                    onClick={() => set({ cupos: v.cupos.filter((x) => x.key !== c.key) })}
                                  />
                                }
                              >
                                <TrashIcon />
                              </TooltipTrigger>
                              <TooltipContent>Eliminar</TooltipContent>
                            </Tooltip>
                          ) : (
                          <ConfirmRemoveButton
                            label={`Eliminar el cupo ${i + 1}`}
                            title="Eliminar cupo"
                            description={
                              especialidad ? (
                                <>
                                  ¿Eliminar el cupo de <strong>{especialidad.nombre}</strong>
                                  {grado ? <> en <strong>{grado.nombre}</strong></> : null}
                                  {sede ? <> de <strong>{sede.nombre}</strong></> : null}? El cambio se aplica al guardar la convocatoria.
                                </>
                              ) : (
                                "¿Eliminar este cupo sin completar?"
                              )
                            }
                            disabled={fijo || v.cupos.length === 1}
                            onConfirm={() => set({ cupos: v.cupos.filter((x) => x.key !== c.key) })}
                          />
                          )}
                        </div>
                      </div>
                      {err || especialidad ? (
                        <p className={cn("text-xs", err ? "text-red" : "text-muted-foreground")}>
                          {err ||
                            (especialidad &&
                              `${especialidad.libres} puestos libres en los grupos que dictan ${especialidad.nombre}.${continuanEn(especialidad.nombre, grado?.nombre)}`)}
                        </p>
                      ) : null}
                    </div>
                  )
                })}

                {continuan.map((x) => (
                  <Aviso
                    key={`${x.especialidad}-${x.grado}`}
                    tono="info"
                    titulo={
                      continuidadActiva
                        ? `Continúan ${x.cantidad} en ${x.especialidad}, ${x.grado}.`
                        : `${x.cantidad} adscritos del año anterior continúan en ${x.especialidad}. Considérelos al fijar el cupo.`
                    }
                  >
                    {continuidadActiva
                      ? "Su cupo del grado siguiente queda reservado hasta que el cierre confirme quiénes continúan."
                      : "Tienen prioridad en la selección (marca Continuidad), pero el cupo no se reserva. Al abrirse la convocatoria se les avisa y 3 días antes del cierre se les recuerda postularse."}
                  </Aviso>
                ))}
              </div>
            </Seccion>
          </Secciones>

          <p className="text-xs text-muted-foreground">
            Los campos marcados con * son obligatorios.
          </p>
        </div>
      </TableScreenBody>
    </TableScreen>
  )
}



function Opcion({ valor, children }: { valor: string; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm has-disabled:cursor-not-allowed has-disabled:opacity-60">
      <RadioGroupItem value={valor} />
      {children}
    </label>
  )
}

function Interruptor({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label
      className={cn(
        "flex w-fit items-center gap-2",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      )}
    >
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        className="rounded-full [&_[data-slot=switch-thumb]]:rounded-full"
      />
      <span className="text-sm">{checked ? "Sí" : "No"}</span>
    </label>
  )
}

