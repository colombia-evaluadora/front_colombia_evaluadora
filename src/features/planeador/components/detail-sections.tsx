import type { Actividad } from "@/features/planeador/api/types/actividad"

import { formatDate } from "@/features/planeador/lib/format-date"

/**
 * Helpers de layout: `Definition` es un par término/definición; `DefinitionGrid`
 * los acomoda en N columnas. Sin esto las 8 secciones del detalle se
 * llenan de boilerplate y nadie encuentra dónde cambiar un margen.
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
      <dt className="text-muted-foreground text-xs font-semibold uppercase">
        {term}
      </dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

function DefinitionGrid({
  cols,
  className,
  children,
}: {
  cols: 2 | 3
  className?: string
  children: React.ReactNode
}) {
  const colsClass = cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"
  // Filas de alto automático en pares (término + definición): las declara la
  // grilla para que los `Definition` puedan engancharse con subgrid.
  return (
    <dl className={`grid auto-rows-auto gap-x-4 gap-y-4 ${colsClass} ${className ?? ""}`}>
      {children}
    </dl>
  )
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">—</p>
  }
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
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

/**
 * Recuadro con el título montado sobre el borde superior. Va solo en el
 * desglose de la unidad, que es el único que lleva ese tratamiento.
 *
 * Es un `<fieldset>` con `<legend>` y no un `div` + `span` posicionado: el
 * navegador ya recorta el borde detrás de la leyenda por su cuenta, así que
 * no hay que pintarle un fondo al título para tapar la línea —y no se rompe
 * cuando el título ocupa dos renglones o cuando el fondo de la card cambia
 * con el tema.
 */
function FloatingBox({
  title,
  children,
  className,
}: {
  title: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <fieldset
      className={`rounded-md border bg-card px-4 pb-4 ${className ?? ""}`}
    >
      <legend className="px-1.5 text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
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
  return (
    <div className="flex flex-col gap-4">
      {/* 1) Identificación de la actividad */}
      <Section title="Identificación de la actividad">
        <DefinitionGrid cols={3}>
          <Definition term="Nombre de la actividad">
            {actividad.nombre}
          </Definition>
          <Definition term="Tipo de actividad">{actividad.tipo}</Definition>
          <Definition term="Unidad temática asociada">
            {actividad.unidad.nombre}
          </Definition>
        </DefinitionGrid>

        {/* 2) Unidad N — anidada dentro de identificación, igual que en el
            mockup: es el desglose de la unidad que se nombra arriba. */}
        <FloatingBox title={actividad.unidad.nombre} className="mt-4">
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-semibold">Contenidos:</p>
              <BulletList items={actividad.contenidos} />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Objetivos:</p>
              <BulletList items={actividad.objetivos} />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Descripción:</p>
              <BulletList items={actividad.descripcionUnidad} />
            </div>
          </div>
        </FloatingBox>

        <DefinitionGrid cols={2} className="mt-4">
          <Definition term="Asignatura / materia">
            {actividad.asignatura}
          </Definition>
          <Definition term="Grado / Grupo">
            {actividad.grado} {actividad.grupo}
          </Definition>
        </DefinitionGrid>

        {/* 3) Materiales requeridos: un campo más de esta card, no una
            sección aparte. */}
        <Definition term="Materiales requeridos (lista breve)" className="mt-4">
          {actividad.materiales}
        </Definition>
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
                  <Definition term="Descripción / nota">
                    {recurso.descripcion}
                  </Definition>
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
        <DefinitionGrid cols={3}>
          <Definition term="Fecha inicio">
            {formatDate(actividad.fechaInicio)}
          </Definition>
          <Definition term="Fecha de entrega o cierre">
            {formatDate(actividad.fechaCierre)}
          </Definition>
          <Definition term="Duración estimada (horas o sesiones)">
            {actividad.duracionEstimada}
          </Definition>
          <Definition term="Semana del cronograma">
            {/* Solo un número o un rango simple ("10-12"), sin el prefijo
                "Semana" — el form restringe la entrada a ese formato (ver
                `toDigitsOrRangeInput` en `text-input.ts`). */}
            {actividad.semana}
          </Definition>
          <Definition term="Modalidad">{actividad.modalidad}</Definition>
        </DefinitionGrid>
      </Section>

      {/* 6) Evaluación */}
      <Section title="Evaluación">
        <DefinitionGrid cols={2}>
          <Definition term="¿Es actividad evaluativa?">
            {actividad.esEvaluativa ? "Sí" : "No"}
          </Definition>
          <Definition term="Instrumento de evaluación">
            {actividad.instrumento}
          </Definition>
        </DefinitionGrid>

        {/* 7) Definición de Rúbricas: va dentro de Evaluación —es el
            instrumento que se acaba de nombrar arriba— y no como card
            hermana. */}
        <Section title="Definición de Rubricas" className="mt-4">
          {actividad.rubrica.criterios.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Esta actividad no tiene criterios definidos.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {actividad.rubrica.criterios.map((criterio, index) => (
                <li key={criterio.id}>
                  <h4 className="text-sm font-semibold">Criterio {index + 1}</h4>
                  <div className="mt-2 space-y-3">
                    <Definition term="Nombre del criterio">
                      {criterio.nombre}
                    </Definition>
                    {/* "Excelente" va al lado de su descripción, no encima:
                        es una etiqueta corta con un texto largo al costado. */}
                    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                      <span className="text-sm font-semibold">Excelente</span>
                      <span className="text-sm">{criterio.excelente}</span>
                    </div>
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
      </Section>

      {/* 8) Seguimiento */}
      <Section title="Seguimiento">
        <DefinitionGrid cols={3}>
          <Definition term="¿Genera evidencias?">
            {actividad.generaEvidencias ? "Sí" : "No"}
          </Definition>
          <Definition term="Tipo de evidencia">
            {actividad.tipoEvidencia}
          </Definition>
          <Definition term="¿Requiere validación del coordinador?">
            {actividad.requiereValidacion ? "Sí" : "No"}
          </Definition>
        </DefinitionGrid>
        <Definition term="Observaciones del docente" className="mt-4">
          {actividad.observaciones}
        </Definition>
      </Section>
    </div>
  )
}
