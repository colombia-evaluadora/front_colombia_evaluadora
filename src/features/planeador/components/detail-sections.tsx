import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import type { Actividad } from "@/features/planeador/api/types/actividad"

import { formatDate } from "@/features/planeador/lib/format-date"
import { FichaDatos } from "@/components/ficha-datos"
import { paths } from "@/config/paths"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { useUnidadDetalleQuery } from "@/features/planeador/api/query/use-unidades-query"
import { useUnidadReferenteQuery } from "@/features/planeador/api/query/use-unidad-referente-query"
import {
  instrumentoLabelFromReferente,
  resolveInstrumentoLabel,
  useUnidadesTabsQuery,
} from "@/features/planeador/api/query/use-unidades-tabs-query"
import { useStudyPlanSubjectLabel } from "@/features/establishment/academic-period/api/query/use-study-plan-subject-label"
import { useAgregarEvidenciaActividad } from "@/features/planeador/api/mutations/agregar-evidencia-actividad"
import { useInstrumentoActividadFormQuery } from "@/features/planeador/api/query/use-instrumento-actividad-form-query"
import { esActividadFormativa } from "@/features/planeador/lib/actividad-formativa"
import { UNIDAD_TAB_FALLBACK } from "@/features/planeador/components/planeador-tabs"
import {
  ROTULO_ACTIVIDAD_FALLBACK,
  rotuloEnMinuscula,
} from "@/features/planeador/api/query/use-rotulo-actividad-query"
import { usePlaneadorSoloLectura } from "@/features/planeador/hooks/use-planeador-solo-lectura"
import {
  EnunciadosEvidenciasChecklist,
  UnidadFicha,
} from "@/features/planeador/components/unidad-evidencias-section"

/**
 * Los datos de la actividad van en la ficha de los Ver detalle (`FichaDatos`).
 * `Definition` queda para los pares sueltos dentro de las listas (recursos,
 * criterios e ítems de los instrumentos).
 */

function Definition({
  term,
  children,
  className,
}: {
  term: string
  children: React.ReactNode
  className?: string
}) {
  // `row-span-2` + `grid-rows-subgrid`: el par término/definición toma las
  // dos filas de la grilla padre en vez de armar su propia caja. Así todos
  // los valores de una fila arrancan a la misma altura aunque un término
  // envuelva a dos renglones —que es lo que desalineaba `Duración estimada`
  // contra las fechas—. Fuera de una grilla el subgrid no aplica y el par
  // se apila normal.
  return (
    <div className={`row-span-2 grid grid-rows-subgrid gap-1 ${className ?? ""}`}>
      <dt className="text-muted-foreground text-xs font-semibold uppercase">{term}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

/**
 * Card de sección: el título va DENTRO de la card, arriba del contenido. Es
 * el tratamiento de todas las secciones de primer nivel del detalle.
 */
function Section({
  title,
  children,
  className,
}: {
  title: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-md border bg-card p-4 ${className ?? ""}`}>
      <h3 className="mb-3 text-base font-semibold">{title}</h3>
      {children}
    </section>
  )
}

interface DetailSectionsProps {
  actividad: Actividad
}

/**
 * Cuerpo del detalle de una actividad: ocho secciones, todas visibles a la
 * vez. Antes era un `Accordion` —una sección abierta por vez—, pero el
 * detalle se lee de corrido y obligaba a abrir y cerrar para comparar
 * fechas, rúbricas y seguimiento.
 */
export function DetailSections({ actividad }: DetailSectionsProps) {
  // Regla de negocio confirmada (misma que `EvaluacionSection` en
  // `form-editar-actividad.tsx`, ver el comentario de `esFormativa` ahí):
  // "una unidad formativa nunca lleva instrumentos, ponderación,
  // adaptaciones ni seguimiento" — el detalle de solo lectura mostraba
  // "Evaluación"/"Seguimiento" siempre, aunque el form de edición de esa
  // MISMA actividad ya las escondiera.
  const formativa = esActividadFormativa(actividad)
  // Mismos dos rótulos dinámicos que ya usa el form de edición —antes acá
  // quedaban fijos ("Unidad temática asociada"/"Asignatura / materia") aunque
  // el form de esa MISMA actividad ya dijera "Proyecto pedagógico"/
  // "Dimensión" para un grado de Preescolar (`UnidadAsociadaSection`/
  // `AsignaturaGradoSection` en `form-editar-actividad.tsx`).
  const { data: unidadTabs } = useUnidadesTabsQuery()
  const unidadLabel = resolveInstrumentoLabel(actividad.gradoId, unidadTabs, UNIDAD_TAB_FALLBACK)
  const subjectLabel = useStudyPlanSubjectLabel(actividad.gradoId, false)
  // Rótulo real (Regla 13, sso V452/V511) — nunca "actividad" fijo.
  const rotuloLabelLower = rotuloEnMinuscula(actividad.rotuloEjecucion ?? ROTULO_ACTIVIDAD_FALLBACK)
  return (
    <div className="flex flex-col gap-4">
      {/* 1) Identificación de la actividad */}
      <Section title={`Identificación de la ${rotuloLabelLower}`}>
        <FichaDatos
          datos={[
            { etiqueta: `Nombre de la ${rotuloLabelLower}`, valor: actividad.nombre },
            { etiqueta: `Tipo de ${rotuloLabelLower}`, valor: actividad.tipo },
            { etiqueta: `${unidadLabel} asociada`, valor: actividad.unidad.nombre },
            // Docente dueño (sso V553: quien dicta el grupo+asignatura o, sin
            // grupo, el autor de la unidad). Sirve sobre todo a Super Admin,
            // Rector y Coordinador mirando planeadores ajenos; se muestra
            // siempre que el backend lo resuelva.
            ...(actividad.docenteNombre ? [{ etiqueta: "Docente", valor: actividad.docenteNombre }] : []),
          ]}
        />

        {/* 2) Unidad N — anidada dentro de identificación, igual que en el
            mockup: es el desglose de la unidad que se nombra arriba. Solo
            se muestra con unidad elegida — una actividad huérfana
            (`unidad.id === 0`) no tiene ficha ni evidencias que ofrecer. */}
        {actividad.unidad.id !== 0 && (
          <UnidadFichaYEvidenciasDetalle actividad={actividad} className="mt-4" />
        )}

        {/* "¿Requiere validación del coordinador?" va en Identificación, igual
            que en el form de edición: es una propiedad de toda la actividad
            (antes salía en Seguimiento, que no aplica a unidades formativas). */}
        {/* 3) Materiales requeridos: un campo más de esta card, no una
            sección aparte. */}
        <FichaDatos
          className="mt-4"
          datos={[
            { etiqueta: `${subjectLabel} / materia`, valor: actividad.asignatura },
            { etiqueta: "Grado / Grupo", valor: `${actividad.grado} ${actividad.grupo}` },
            { etiqueta: "¿Requiere validación del coordinador?", valor: actividad.requiereValidacion ? "Sí" : "No" },
            {
              etiqueta: "Materiales requeridos (lista breve)",
              valor: actividad.materiales ? <span className="whitespace-pre-line">{actividad.materiales}</span> : null,
              ancho: true,
            },
          ]}
        />
      </Section>

      {/* 4) Materiales de apoyo (read-only) */}
      <Section title="Materiales de apoyo (agrega varios recursos)">
        {/* Vacío = no se muestra nada bajo el título. Un placeholder
            ("no tiene recursos") repite la ausencia sin aportar, y en
            read-only el "(agrega varios recursos)" del header igual
            invita al usuario a pasar al modo edición si quiere cargar. */}
        {actividad.recursos.length === 0 ? null : (
          <ul className="flex flex-col gap-4">
            {actividad.recursos.map((recurso, index) => (
              <li key={recurso.id}>
                {/* La fuente va en el encabezado, así que no se repite abajo.
                    Tipo y URL comparten renglón —el tipo describe el enlace
                    que tiene al lado— y la descripción cierra a lo ancho. */}
                <h4 className="text-sm font-semibold">
                  Recurso {index + 1} — {recurso.fuente}
                </h4>
                <div className="mt-2 space-y-3">
                  <Definition term="Tipo">
                    <span className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                      <span className="font-semibold">{recurso.tipo}</span>
                      <a
                        href={recurso.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary break-all underline underline-offset-4"
                      >
                        {recurso.url}
                      </a>
                    </span>
                  </Definition>
                  <Definition term="Descripción / nota">{recurso.descripcion}</Definition>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* 5) Programación */}
      <Section title="Programación">
        {/* Una sola grilla para los cinco campos: partirlos en dos `dl` de 3
            y 2 columnas hacía que la segunda fila no alineara con la de
            arriba. */}
        <FichaDatos
          datos={[
            { etiqueta: "Fecha inicio", valor: formatDate(actividad.fechaInicio) },
            { etiqueta: "Fecha de entrega o cierre", valor: formatDate(actividad.fechaCierre) },
            { etiqueta: "Duración estimada (minutos)", valor: actividad.duracionEstimada },
            // Solo un número o un rango simple ("10-12"), sin el prefijo
            // "Semana" — el form restringe la entrada a ese formato (ver
            // `toDigitsOrRangeInput` en `text-input.ts`).
            { etiqueta: "Semana del cronograma", valor: actividad.semana },
            { etiqueta: "Modalidad", valor: actividad.modalidad },
          ]}
        />
      </Section>

      {/* 6) Evaluación — no aplica en una unidad formativa. */}
      {!formativa && <EvaluacionDetalle actividad={actividad} />}

      {/* 8) Seguimiento — mismo gate que Evaluación. */}
      {!formativa && (
        <Section title="Seguimiento">
          <FichaDatos
            datos={[
              { etiqueta: "¿Genera evidencias?", valor: actividad.generaEvidencias ? "Sí" : "No" },
              { etiqueta: "Tipo de evidencia", valor: actividad.tipoEvidencia },
              {
                etiqueta: "Observaciones del docente",
                valor: actividad.observaciones ? (
                  <span className="whitespace-pre-line">{actividad.observaciones}</span>
                ) : null,
                ancho: true,
              },
            ]}
          />
        </Section>
      )}
    </div>
  )
}

/**
 * "Evaluación" del panel de "Ver actividad" — antes SIEMPRE mostraba
 * "Definición de Rubricas" leyendo `actividad.rubrica`, sin importar qué
 * instrumento se hubiera elegido de verdad (Lista de cotejo/Escala de
 * valoración/Otro personalizado quedaban sin su propia ficha), y encima
 * `actividad.rubrica`/`listaCotejo`/`escalaValoracion`/
 * `instrumentoPersonalizado` vienen SIEMPRE vacíos en el detalle real
 * (`GET .../actividades/:id` no trae esa definición — ver el comentario de
 * `ActividadDetalleRow` en `use-actividad-detalle-query.ts`), así que el
 * mensaje "no tiene criterios definidos" salía incluso con una rúbrica ya
 * guardada.
 *
 * La definición real vive en `GET .../actividades/:id/instrumento` — el
 * MISMO endpoint que ya precarga `EditarActividadForm` al editar
 * (`useInstrumentoActividadFormQuery`) — así que acá se pide igual y se
 * ramifica por `actividad.instrumento`, igual que `InstrumentoEvaluacionSection`
 * en `form-editar-actividad.tsx`.
 */
function EvaluacionDetalle({ actividad }: { actividad: Actividad }) {
  const { data: instrumentoData } = useInstrumentoActividadFormQuery(actividad.id, actividad.esEvaluativa)
  const rubrica = instrumentoData?.rubrica ?? actividad.rubrica
  const listaCotejo = instrumentoData?.listaCotejo ?? actividad.listaCotejo
  const escalaValoracion = instrumentoData?.escalaValoracion ?? actividad.escalaValoracion
  const instrumentoPersonalizado = instrumentoData?.instrumentoPersonalizado ?? actividad.instrumentoPersonalizado

  return (
    <Section title="Evaluación">
      <FichaDatos
        datos={[
          {
            etiqueta: `¿Es ${rotuloEnMinuscula(actividad.rotuloEjecucion ?? ROTULO_ACTIVIDAD_FALLBACK)} evaluativa?`,
            valor: actividad.esEvaluativa ? "Sí" : "No",
          },
          {
            etiqueta: "Instrumento de evaluación",
            valor: actividad.instrumento === "Otro" ? "Otro (personalizado)" : actividad.instrumento || "—",
          },
        ]}
      />

      {/* Misma ramificación que `InstrumentoEvaluacionSection` (form de
          edición): cada instrumento monta su propia ficha, no siempre la
          de Rúbrica. */}
      {actividad.instrumento === "Lista de cotejo" ? (
        <ListaCotejoDetalle listaCotejo={listaCotejo} />
      ) : actividad.instrumento === "Escala de valoración" ? (
        <EscalaValoracionDetalle escala={escalaValoracion} />
      ) : actividad.instrumento === "Otro" ? (
        <InstrumentoPersonalizadoDetalle
          instrumentoPersonalizado={instrumentoPersonalizado}
          rubrica={rubrica}
          listaCotejo={listaCotejo}
          escalaValoracion={escalaValoracion}
        />
      ) : (
        <RubricaDetalle rubrica={rubrica} />
      )}
    </Section>
  )
}

function RubricaDetalle({ rubrica }: { rubrica: Actividad["rubrica"] }) {
  return (
    <Section title="Definición de rúbrica" className="mt-4">
      {rubrica.criterios.length === 0 ? (
        <p className="text-muted-foreground text-sm">Esta actividad no tiene criterios definidos.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {rubrica.criterios.map((criterio, index) => (
            <li key={criterio.id}>
              <h4 className="text-sm font-semibold">Criterio {index + 1}</h4>
              <div className="mt-2 space-y-3">
                <Definition term="Nombre del criterio">{criterio.nombre}</Definition>
                {/* "Excelente" y cada nivel intermedio van al lado de su
                    descripción, no encima: son etiquetas cortas con un
                    texto largo al costado. */}
                <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                  <span className="text-sm font-semibold">Excelente</span>
                  <span className="text-sm">{criterio.excelente}</span>
                </div>
                {criterio.niveles.map((nivel) => (
                  <div key={nivel.id} className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                    <span className="text-sm font-semibold">{nivel.nombre}</span>
                    <span className="text-sm">{nivel.descripcion}</span>
                  </div>
                ))}
                <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                  <span className="text-sm font-semibold">Ponderación</span>
                  <span className="text-sm">{criterio.ponderacion}%</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function ListaCotejoDetalle({ listaCotejo }: { listaCotejo: Actividad["listaCotejo"] }) {
  return (
    <Section title="Definición de lista de cotejo" className="mt-4">
      {listaCotejo.items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Esta actividad no tiene ítems definidos.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {listaCotejo.items.map((item, index) => (
            <li key={item.id}>
              <h4 className="text-sm font-semibold">Ítem {index + 1}</h4>
              <div className="mt-2 space-y-3">
                <Definition term="Descripción">{item.descripcion}</Definition>
                {item.ponderacion != null && <Definition term="Puntaje">{item.ponderacion}%</Definition>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function EscalaValoracionDetalle({ escala }: { escala: Actividad["escalaValoracion"] }) {
  const numerica = escala.tipo === "Numérica"
  return (
    <Section title="Definición de escala de valoración" className="mt-4">
      {escala.criterios.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Esta actividad no tiene escala de valoración definida.
        </p>
      ) : (
        <div className="space-y-4">
          <Definition term="Tipo de escala">{escala.tipo}</Definition>
          {escala.criterios.map((criterio) => {
            // Regla 42: el valor máximo del criterio cualitativo es su puntaje más alto.
            const puntajes = criterio.niveles.map((n) => n.ponderacion).filter((p): p is number => p != null)
            const maximo = numerica ? criterio.valorMaximo : puntajes.length > 0 ? Math.max(...puntajes) : undefined
            return (
              <div key={criterio.id} className="space-y-2 rounded-md border p-3">
                <Definition term="Criterio">{criterio.nombre}</Definition>
                {numerica ? (
                  <>
                    <Definition term="Valor asignado">
                      {criterio.valorMinimo != null || criterio.valorMaximo != null
                        ? `${criterio.valorMinimo ?? "…"} – ${criterio.valorMaximo ?? "…"}`
                        : "—"}
                    </Definition>
                    {criterio.interpretacion && <Definition term="Interpretación">{criterio.interpretacion}</Definition>}
                  </>
                ) : (
                  <>
                    <ul className="flex flex-col gap-2">
                      {criterio.niveles.map((nivel) => (
                        <li key={nivel.id} className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                          <span className="text-sm font-semibold">{nivel.nombre}</span>
                          <span className="text-sm">{nivel.descripcion}</span>
                          {nivel.ponderacion != null && (
                            <span className="text-muted-foreground text-sm">{nivel.ponderacion} pts</span>
                          )}
                        </li>
                      ))}
                    </ul>
                    {maximo != null && <Definition term="Valor máximo">{maximo}</Definition>}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Section>
  )
}

function InstrumentoPersonalizadoDetalle({
  instrumentoPersonalizado,
  rubrica,
  listaCotejo,
  escalaValoracion,
}: {
  instrumentoPersonalizado: Actividad["instrumentoPersonalizado"]
  rubrica: Actividad["rubrica"]
  listaCotejo: Actividad["listaCotejo"]
  escalaValoracion: Actividad["escalaValoracion"]
}) {
  return (
    <Section title="Definición del instrumento personalizado" className="mt-4">
      <FichaDatos
        datos={[
          {
            etiqueta: "Descripción del instrumento",
            valor: instrumentoPersonalizado.descripcion ? (
              <span className="whitespace-pre-line">{instrumentoPersonalizado.descripcion}</span>
            ) : (
              "—"
            ),
            ancho: true,
          },
          { etiqueta: "Tipo de evidencia esperada", valor: instrumentoPersonalizado.tipoEvidenciaEsperada || "—" },
          { etiqueta: "Método de valoración", valor: instrumentoPersonalizado.metodoValoracion || "—" },
        ]}
      />
      <div className="mt-4 flex flex-col gap-1 text-sm">
        <span>{instrumentoPersonalizado.requiereArchivo ? "Sí" : "No"} requiere adjuntar un archivo.</span>
        <span>
          {instrumentoPersonalizado.requiereRespuestaTexto ? "Sí" : "No"} requiere una respuesta escrita.
        </span>
      </div>

      {/* Mismo criterio que `InstrumentoPersonalizadoSection` (form de
          edición): el método de valoración elegido monta la MISMA ficha
          que si fuera el instrumento directo. */}
      {instrumentoPersonalizado.metodoValoracion === "Rúbrica" ? (
        <RubricaDetalle rubrica={rubrica} />
      ) : instrumentoPersonalizado.metodoValoracion === "Lista de cotejo" ? (
        <ListaCotejoDetalle listaCotejo={listaCotejo} />
      ) : instrumentoPersonalizado.metodoValoracion === "Escala de valoración" ? (
        <EscalaValoracionDetalle escala={escalaValoracion} />
      ) : null}
    </Section>
  )
}

/**
 * Ficha de la unidad + checklist de evidencias del panel de detalle
 * (solo lectura de la actividad en sí, pero acá SÍ se guarda al toque:
 * tildar una evidencia nueva la manda de una vía `POST .../evidencias`,
 * sin botón "Guardar" aparte — mismo criterio que "Marcar todo como
 * Asistió" en Asistencia). El lápiz de la ficha va a editar la UNIDAD
 * (descripción/objetivos/contenidos son datos de la unidad, no de esta
 * actividad).
 *
 * Igual que en `form-editar-actividad.tsx`, la descripción/objetivos/
 * contenidos salen de `useUnidadDetalleQuery` y no de la actividad —
 * `actividad.contenidos`/`objetivos`/`descripcionUnidad` quedan siempre
 * vacíos contra el backend real (`toActividadDetalle` los deja en `[]`).
 */
function UnidadFichaYEvidenciasDetalle({
  actividad,
  className,
}: {
  actividad: Actividad
  className?: string
}) {
  const navigate = useNavigate()
  const { notify } = useNotify()
  const { puedeEditar } = usePlaneadorSoloLectura()
  const { data: unidad } = useUnidadDetalleQuery(actividad.unidad.id)
  // Mismo criterio que `UnidadFichaYEvidencias` en `form-editar-actividad.tsx`:
  // el árbol de enunciados (ya acotado a los que la UNIDAD relacionó) +
  // evidencias, y los rótulos `nivel1Etiqueta`/`nivel2Etiqueta`, salen de
  // `GET /planeador/unidades/:id/referente` — no hace falta cruzar contra
  // grado+asignatura ni contra `unidad.enunciadosDba` a mano.
  const { data: referente } = useUnidadReferenteQuery(actividad.unidad.id)
  const { data: unidadTabs } = useUnidadesTabsQuery()
  // Por `referente.id` (`pk_referente_curricular`), no por `gradoId` a
  // secas — ver el comentario de `instrumentoLabelFromReferente` en
  // `use-unidades-tabs-query.ts`.
  const instrumentoLabel = instrumentoLabelFromReferente(referente?.id ?? undefined, unidadTabs, UNIDAD_TAB_FALLBACK)
  const [pendingId, setPendingId] = useState<number | null>(null)
  // `actividad.evidenciasIds` ya trae lo guardado de verdad (`fn_actividad_
  // buscar_por_pk`, V224/V440, ver `use-actividad-detalle-query.ts`). Este
  // estado local sigue haciendo falta para el instante entre que
  // `agregarEvidencia` responde y el refetch del detalle (que invalida la
  // query) termina de llegar: sin él, el checkbox recién tildado se veía
  // destildar un momento hasta que la foto nueva llegara.
  const [agregadasEnSesion, setAgregadasEnSesion] = useState<number[]>([])
  const seleccionadas = [...actividad.evidenciasIds, ...agregadasEnSesion]

  const agregarEvidencia = useAgregarEvidenciaActividad({
    mutationConfig: {
      onSuccess: (_data, variables) => {
        setPendingId(null)
        setAgregadasEnSesion((prev) => [...prev, variables.evidenciaId])
      },
      onError: (error) => {
        setPendingId(null)
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  function handleToggle(evidenciaId: number) {
    // Ya relacionada: `EnunciadosEvidenciasChecklist` la manda acá
    // deshabilitada (ver `disabledIds`), así que este toggle es siempre
    // un alta nueva — no hace falta distinguir agregar de quitar.
    setPendingId(evidenciaId)
    agregarEvidencia.mutate({ actividadId: actividad.id, evidenciaId })
  }

  return (
    <div className={className}>
      <UnidadFicha
        instrumentoLabel={instrumentoLabel}
        nombre={unidad?.nombre ?? actividad.unidad.nombre}
        descripcion={unidad?.descripcion ?? ""}
        objetivos={unidad?.objetivos ?? []}
        contenidos={unidad?.contenidos ?? []}
        onEditar={
          puedeEditar
            ? () => navigate({ to: paths.app.planeadorUnidadEditar.getHref(String(actividad.unidad.id)) })
            : undefined
        }
      />
      {referente && referente.enunciados.length > 0 && (
        <EnunciadosEvidenciasChecklist
          className="mt-4"
          instrumentoLabel={instrumentoLabel}
          nivel1Etiqueta={referente.nivel1Etiqueta}
          nivel2Etiqueta={referente.nivel2Etiqueta}
          enunciados={referente.enunciados}
          seleccionadas={seleccionadas}
          onToggle={handleToggle}
          // "Ver actividad" es de solo lectura: TODAS las evidencias quedan
          // deshabilitadas (no solo las ya tildadas) — marcar una nueva
          // evidencia se hace desde "Editar", no desde acá.
          disabledIds={referente.enunciados.flatMap((enunciado) =>
            enunciado.evidencias.map((evidencia) => evidencia.id),
          )}
          pendingId={pendingId}
        />
      )}
    </div>
  )
}
