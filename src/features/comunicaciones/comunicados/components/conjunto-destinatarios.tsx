import { useEffect, useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { InfoIcon, WarningCircleIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import { SelectOpciones } from "@/components/select-opciones"
import type { OpcionSeleccion } from "@/features/comunicaciones/chat/api/types"
import { SelectorChips } from "@/features/comunicaciones/chat/components/selector-chips"
import {
  esAcademico,
  TIPOS,
  TODOS,
  useCascadaQuery,
  type Cascada,
  type Conjunto,
  type TipoDestinatario,
} from "@/features/comunicaciones/comunicados/api/comunicado-documento"
import {
  ACADEMICO_VACIO,
  alCambiar,
  descarta,
  etiquetaDe,
  FUNCIONARIOS_VACIO,
  NOMBRE_NIVEL,
  sinPeriodos,
  textoPeriodo,
  TODAS_LAS_JORNADAS,
  type ErroresCampos,
  type Nivel,
} from "@/features/comunicaciones/comunicados/lib/conjunto"

const NO_APLICA = "No aplica a funcionarios"
const SUPERIOR = "Incluidos en la selección superior"
const SIN = "Sin opciones"

/**
 * Cuerpo de un panel "Destinatarios · conjunto N" (prototipo M.1.AGR.1, M.1.AGR.3 y M.1.AGR.5):
 * contexto institucional, tipos, población y la cascada académica. Todos los campos permanecen
 * visibles; los que no aplican se ven deshabilitados con su motivo dentro del propio selector.
 */
export function ConjuntoDestinatarios({
  numero,
  conjunto: c,
  onChange,
  onDatos,
  errores,
}: {
  numero: number
  conjunto: Conjunto
  onChange: (c: Conjunto) => void
  // La página necesita las etiquetas (previsualización) y saber si el conjunto quedó sin períodos.
  onDatos: (datos: Cascada | undefined) => void
  // Errores por id de control (`conjuntoCampoId`); la página solo los pasa tras el primer intento.
  errores?: ErroresCampos
}) {
  const cascada = useCascadaQuery(c)
  const datos = cascada.data
  const [pendiente, setPendiente] = useState<{ nivel: Nivel; valor: string } | null>(null)
  const academico = esAcademico(c)
  const conFuncionarios = c.tipos.includes("FUNCIONARIOS")
  const bloqueado = sinPeriodos(c, datos)
  const id = `conjunto-${numero}`
  const periodo = textoPeriodo(c, datos)

  useEffect(() => {
    onDatos(datos)
    // Solo cuando llegan opciones nuevas: `onDatos` cambia en cada render de la página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos])

  // Establecimiento viene elegido si el emisor solo tiene uno; un único ciclo se elige solo.
  useEffect(() => {
    if (!datos) return
    if (!c.establecimiento && datos.establecimientos.length === 1) {
      onChange(alCambiar(c, "establecimiento", datos.establecimientos[0].valor))
    } else if (c.modalidad && !c.ciclo && datos.ciclos.length === 1) {
      onChange(alCambiar(c, "ciclo", datos.ciclos[0].valor))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos, c.establecimiento, c.modalidad, c.ciclo])

  const cambiar = (nivel: Nivel, valor: string) => {
    if (descarta(c, nivel)) setPendiente({ nivel, valor })
    else onChange(alCambiar(c, nivel, valor))
  }

  const ponerTipos = (tipos: TipoDestinatario[]) => {
    let nuevo: Conjunto = { ...c, tipos: TIPOS.map((t) => t.valor).filter((t) => tipos.includes(t)) }
    // Lo que deja de aplicar se limpia: un campo deshabilitado no puede seguir filtrando.
    if (!esAcademico(nuevo)) nuevo = { ...nuevo, ...ACADEMICO_VACIO }
    if (!nuevo.tipos.includes("FUNCIONARIOS")) nuevo = { ...nuevo, ...FUNCIONARIOS_VACIO }
    // "Todas las jornadas" solo vale sin estudiantes ni acudientes: el período es de una jornada.
    if (esAcademico(nuevo) && nuevo.jornada === TODAS_LAS_JORNADAS) nuevo = { ...nuevo, jornada: "" }
    onChange(nuevo)
  }

  const estudiantes = datos?.estudiantes ?? []
  const roles = datos?.roles ?? []
  // Solo personas con los roles elegidos en esa sede y jornada.
  const funcionarios = (datos?.funcionarios ?? []).filter(
    (f) => c.todosRoles || (f.detalle != null && c.roles.includes(f.detalle)),
  )

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Selector
          errores={errores}
          id={`${id}-est`}
          etiqueta="Establecimiento"
          requerido
          valor={c.establecimiento}
          opciones={datos?.establecimientos ?? []}
          onChange={(v) => cambiar("establecimiento", v)}
        />
        <Selector
          errores={errores}
          id={`${id}-sede`}
          etiqueta="Sede"
          requerido
          valor={c.sede}
          opciones={datos?.sedes ?? []}
          deshabilitado={!c.establecimiento}
          onChange={(v) => cambiar("sede", v)}
        />
        <Selector
          errores={errores}
          id={`${id}-jornada`}
          etiqueta="Jornada"
          requerido
          valor={c.jornada}
          opciones={datos?.jornadas ?? []}
          // Un conjunto solo de funcionarios puede abarcar todas las jornadas de la sede (M.1.AGR.3).
          todos={conFuncionarios && !academico ? "Todas las jornadas" : undefined}
          valorTodos={TODAS_LAS_JORNADAS}
          deshabilitado={!c.sede}
          onChange={(v) => cambiar("jornada", v)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <div className="min-w-0 space-y-2">
          <Etiqueta requerido>Tipos de destinatario</Etiqueta>
          <div
            id={`${id}-tipos`}
            role="group"
            aria-label="Tipos de destinatario"
            data-invalid={errores?.[`${id}-tipos`] ? true : undefined}
            className={cn(
              "flex flex-wrap items-center gap-x-4 gap-y-2 text-sm",
              errores?.[`${id}-tipos`] && "rounded-md text-red outline outline-offset-4 outline-red-stroke",
            )}
          >
            {TIPOS.map((t) => (
              <label key={t.valor} className="flex items-center gap-2">
                <Checkbox
                  aria-invalid={errores?.[`${id}-tipos`] ? true : undefined}
                  checked={c.tipos.includes(t.valor)}
                  onCheckedChange={(v) =>
                    ponerTipos(v === true ? [...c.tipos, t.valor] : c.tipos.filter((x) => x !== t.valor))
                  }
                />
                {t.etiqueta}
              </label>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              color="neutral"
              onClick={() => ponerTipos(TIPOS.map((t) => t.valor))}
            >
              Toda la comunidad
            </Button>
          </div>
          <ErrorCampo mensaje={errores?.[`${id}-tipos`]} />
        </div>
        <div className="min-w-0 space-y-2">
          <Etiqueta requerido={academico}>Población académica</Etiqueta>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm" role="radiogroup" aria-label="Población académica">
            <label className={academico ? "flex items-center gap-2" : "flex items-center gap-2 text-muted-foreground"}>
              <input type="radio" name={`${id}-poblacion`} checked={academico} disabled={!academico} readOnly />
              Matriculados
            </label>
            {/* Inscripciones aún no tiene backend: la opción existe, pero todavía no se puede elegir. */}
            <label
              className="flex items-center gap-2 text-muted-foreground"
              title="Aún no disponible: Inscripciones todavía no está conectado."
            >
              <input type="radio" name={`${id}-poblacion`} disabled />
              Aspirantes
            </label>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="min-w-0">
          <Selector
            errores={errores}
            id={`${id}-anio`}
            etiqueta="Año"
            requerido={academico}
            valor={c.anio}
            opciones={datos?.anios ?? []}
            deshabilitado={!academico || !c.jornada || bloqueado}
            vacio={!academico ? NO_APLICA : bloqueado ? SIN : undefined}
            onChange={(v) => cambiar("anio", v)}
          />
          {bloqueado && <p className="mt-1 text-xs text-red">No hay años con períodos Abiertos</p>}
        </div>
        <Selector
          errores={errores}
          id={`${id}-modalidad`}
          etiqueta="Modalidad"
          requerido={academico}
          valor={c.modalidad}
          opciones={datos?.modalidades ?? []}
          deshabilitado={!academico || !c.anio}
          vacio={!academico ? NO_APLICA : bloqueado ? SIN : undefined}
          onChange={(v) => cambiar("modalidad", v)}
        />
        <Selector
          errores={errores}
          id={`${id}-ciclo`}
          etiqueta="Ciclo"
          requerido={academico}
          valor={c.ciclo}
          opciones={datos?.ciclos ?? []}
          // Con Anual el ciclo es 1 y queda en solo lectura.
          deshabilitado={!academico || !c.modalidad || c.modalidad === "ANUAL"}
          vacio={!academico ? NO_APLICA : bloqueado ? SIN : undefined}
          onChange={(v) => cambiar("ciclo", v)}
        />
      </div>

      {periodo && (
        <p className="flex flex-wrap items-center gap-2 rounded-md border border-blue-stroke bg-blue-22 px-3 py-2 text-sm">
          <InfoIcon aria-hidden className="size-4 shrink-0 text-blue" />
          <span className="min-w-0 break-words">Período: {periodo}</span>
          <Badge variant="soft" color="success">
            Abierto
          </Badge>
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Selector
          errores={errores}
          id={`${id}-grado`}
          etiqueta="Grado"
          requerido={academico}
          valor={c.grado}
          opciones={datos?.grados ?? []}
          todos="Todos los grados"
          deshabilitado={!academico || !datos?.periodo}
          vacio={!academico ? NO_APLICA : bloqueado ? SIN : undefined}
          onChange={(v) => cambiar("grado", v)}
        />
        <Selector
          errores={errores}
          id={`${id}-grupo`}
          etiqueta="Grupo"
          requerido={academico}
          valor={c.grupo}
          opciones={datos?.grupos ?? []}
          todos="Todos los grupos"
          deshabilitado={!academico || !c.grado || c.grado === TODOS}
          vacio={!academico ? NO_APLICA : c.grado === TODOS ? SUPERIOR : bloqueado ? SIN : undefined}
          onChange={(v) => cambiar("grupo", v)}
        />
        <Multiple
          errores={errores}
          id={`${id}-estudiantes`}
          etiqueta="Estudiantes de referencia"
          requerido={academico && !!c.grupo && c.grupo !== TODOS}
          opciones={estudiantes}
          seleccion={c.estudiantes}
          todos={c.todosEstudiantes}
          etiquetaTodos="Todos los estudiantes"
          motivo={
            !academico
              ? NO_APLICA
              : bloqueado
                ? SIN
                : !c.grado || c.grado === TODOS || !c.grupo || c.grupo === TODOS
                  ? SUPERIOR
                  : undefined
          }
          onChange={(todos, seleccion) => onChange({ ...c, todosEstudiantes: todos, estudiantes: seleccion })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Multiple
          errores={errores}
          id={`${id}-roles`}
          etiqueta="Roles de funcionarios"
          requerido={conFuncionarios}
          opciones={roles}
          seleccion={c.roles}
          todos={c.todosRoles}
          etiquetaTodos="Todos los roles"
          motivo={!conFuncionarios ? NO_APLICA : !c.jornada ? "Elija primero la jornada" : undefined}
          onChange={(todos, seleccion) => onChange({ ...c, todosRoles: todos, roles: seleccion, funcionarios: [] })}
        />
        <div className="min-w-0 space-y-2">
          <Etiqueta requerido={conFuncionarios} htmlFor={`${id}-seleccion`}>
            Selección de funcionarios
          </Etiqueta>
          {!conFuncionarios ? (
            <SelectOpciones
              id={`${id}-seleccion`}
              variant="outlined"
              disabled
              value=""
              opciones={[{ value: "", label: NO_APLICA }]}
              onValueChange={() => {}}
            />
          ) : (
            <div
              id={`${id}-seleccion`}
              role="radiogroup"
              aria-label="Selección de funcionarios"
              aria-invalid={errores?.[`${id}-seleccion`] ? true : undefined}
              className={cn(
                "flex min-h-9 flex-wrap items-center gap-x-4 gap-y-2 text-sm",
                errores?.[`${id}-seleccion`] && "rounded-md text-red outline outline-offset-4 outline-red-stroke",
              )}
            >
              {(
                [
                  ["TODOS", "Todos los que cumplen el filtro"],
                  ["ESPECIFICOS", "Personas específicas"],
                ] as const
              ).map(([valor, etiqueta]) => (
                <label key={valor} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`${id}-seleccion`}
                    checked={c.seleccionFuncionarios === valor}
                    onChange={() => onChange({ ...c, seleccionFuncionarios: valor, funcionarios: [] })}
                  />
                  {etiqueta}
                </label>
              ))}
            </div>
          )}
          <ErrorCampo mensaje={errores?.[`${id}-seleccion`]} />
        </div>
      </div>

      {conFuncionarios && c.seleccionFuncionarios === "ESPECIFICOS" && (
        <Multiple
          errores={errores}
          id={`${id}-funcionarios`}
          etiqueta="Funcionarios"
          requerido
          opciones={funcionarios}
          seleccion={c.funcionarios}
          todos={false}
          motivo={!c.todosRoles && c.roles.length === 0 ? "Elija primero los roles" : undefined}
          onChange={(_todos, seleccion) => onChange({ ...c, funcionarios: seleccion })}
        />
      )}

      {bloqueado && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-red-stroke bg-red-22 px-3 py-2 text-sm">
          <WarningCircleIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-red" />
          <div className="min-w-0">
            <p className="font-medium">No se puede publicar para esta audiencia</p>
            <p>
              La sede {etiquetaDe(datos?.sedes, c.sede)}, jornada {etiquetaDe(datos?.jornadas, c.jornada)} no tiene
              períodos Abiertos (se excluyen los Cerrados y los de Inscripciones). El filtro no se amplía: elija otra
              jornada o quite Estudiantes y Acudientes de este conjunto.
            </p>
          </div>
        </div>
      )}

      <AlertDialog open={pendiente != null} onOpenChange={(o) => !o && setPendiente(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar la selección</AlertDialogTitle>
            <AlertDialogDescription>
              Cambiar {pendiente ? NOMBRE_NIVEL[pendiente.nivel] : ""} limpia lo que ya eligió en los niveles que
              dependen de él.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="fill" color="neutral">
              Volver
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendiente) onChange(alCambiar(c, pendiente.nivel, pendiente.valor))
                setPendiente(null)
              }}
            >
              Cambiar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/** Etiqueta de campo con el asterisco rojo delante, como el prototipo. */
export function Etiqueta({
  children,
  requerido,
  htmlFor,
}: {
  children: string
  requerido?: boolean
  htmlFor?: string
}) {
  return (
    <label htmlFor={htmlFor} className="block text-sm">
      {requerido && (
        <span aria-hidden className="mr-1 text-red">
          *
        </span>
      )}
      {children}
    </label>
  )
}

/** Mensaje de error bajo un grupo que no es un `Field` (checkboxes, radios). */
function ErrorCampo({ mensaje }: { mensaje?: string }) {
  return mensaje ? <FieldError>{mensaje}</FieldError> : null
}

function Selector({
  errores,
  id,
  etiqueta,
  requerido,
  valor,
  opciones,
  todos,
  valorTodos = TODOS,
  deshabilitado,
  vacio,
  onChange,
}: {
  id: string
  etiqueta: string
  requerido?: boolean
  valor: string
  opciones: OpcionSeleccion[]
  // Etiqueta de la opción que abarca todo el nivel ("Todos los grados").
  todos?: string
  valorTodos?: string
  deshabilitado?: boolean
  // Texto del selector cuando no aplica o no tiene opciones.
  vacio?: string
  onChange: (valor: string) => void
  errores?: ErroresCampos
}) {
  const error = errores?.[id]
  return (
    <Field variant="outlined" className="min-w-0" data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>
        {etiqueta}
        {requerido && "*"}
      </FieldLabel>
      <SelectOpciones
        id={id}
        variant="outlined"
        value={vacio ? "" : valor}
        disabled={deshabilitado}
        aria-required={requerido}
        aria-invalid={!!error}
        onValueChange={onChange}
        opciones={[
          { value: "", label: vacio ?? "Seleccione" },
          ...(todos && !vacio ? [{ value: valorTodos, label: todos }] : []),
          ...(vacio ? [] : opciones.map((o) => ({ value: o.valor, label: o.etiqueta }))),
        ]}
      />
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}

const TODOS_ITEM = "__todos__"

/**
 * Selector múltiple con chips y el atajo "Todos". Con `motivo` se ve como un selector deshabilitado
 * que dice por qué ("No aplica a funcionarios", "Incluidos en la selección superior").
 */
function Multiple({
  errores,
  id,
  etiqueta,
  requerido,
  opciones,
  seleccion,
  todos,
  etiquetaTodos,
  motivo,
  onChange,
}: {
  id: string
  etiqueta: string
  requerido?: boolean
  opciones: OpcionSeleccion[]
  seleccion: string[]
  todos: boolean
  etiquetaTodos?: string
  motivo?: string
  onChange: (todos: boolean, seleccion: string[]) => void
  errores?: ErroresCampos
}) {
  const error = errores?.[id]
  const items: OpcionSeleccion[] = etiquetaTodos
    ? [{ valor: TODOS_ITEM, etiqueta: etiquetaTodos, detalle: null, total: 0 }, ...opciones]
    : opciones
  const valor = todos ? items.filter((o) => o.valor === TODOS_ITEM) : items.filter((o) => seleccion.includes(o.valor))
  return (
    <Field variant="outlined" className="min-w-0" data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>
        {etiqueta}
        {requerido && "*"}
      </FieldLabel>
      {motivo || opciones.length === 0 ? (
        <SelectOpciones
          id={id}
          variant="outlined"
          disabled
          value=""
          aria-invalid={!!error}
          opciones={[{ value: "", label: motivo ?? SIN }]}
          onValueChange={() => {}}
        />
      ) : (
        // El id va en un contenedor: `enfocarPrimerError` busca adentro el input de los chips.
        <div id={id} className="min-w-0">
        <SelectorChips
          items={items}
          value={valor}
          getId={(o) => o.valor}
          getLabel={(o) => (o.detalle ? `${o.etiqueta} · ${o.detalle}` : o.etiqueta)}
          visibles={2}
          conFlecha
          invalido={!!error}
          ariaLabel={etiqueta}
          placeholder="Seleccione"
          onChange={(v) => {
            // "Todos" y una selección puntual se excluyen: gana lo último que se marcó.
            const eligioTodos = v.some((o) => o.valor === TODOS_ITEM)
            if (eligioTodos && !todos) onChange(true, [])
            else onChange(false, v.filter((o) => o.valor !== TODOS_ITEM).map((o) => o.valor))
          }}
        />
        </div>
      )}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}
