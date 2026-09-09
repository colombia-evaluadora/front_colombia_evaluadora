import type { ActividadStatus } from "@/features/planeador/api/types/actividad"

/**
 * Modelo de "Unidad temática" del Planeador — la agrupación pedagógica de la
 * que cuelgan las actividades. Es la segunda vista de la pantalla: mismo
 * listado a la izquierda, distinto contenido a la derecha.
 *
 * Comparte `ActividadStatus` con `Actividad` a propósito: es el mismo semáforo
 * y duplicarlo desincronizaría los colores entre las dos vistas.
 */

/** Cómo se combinan las notas de las actividades para dar la nota de la unidad. */
export type MetodoCalculo = "Ponderado" | "Promedio simple" | "Suma de puntos"

/**
 * Enfoque pedagógico del referente curricular asociado a la unidad —
 * mismo catálogo de dos valores que `PEDAGOGICAL_APPROACHES` en
 * `academic-management/curricular-references/api/catalogs.ts`
 * ("Evaluativo" / "Formativo"). Cada unidad temática cuelga de un
 * referente curricular; acá se guarda el enfoque de ese referente
 * directamente en la unidad (sin ir a buscarlo a la tabla de
 * referentes) porque es lo único de él que el Planeador necesita.
 *
 * Gobierna una regla de negocio: una unidad con enfoque FORMATIVO no
 * admite actividades sumativas — el seguimiento formativo no pondera
 * nota. El form de actividad (`form-editar-actividad.tsx`,
 * `EvaluacionSection`) bloquea "¿Es evaluación sumativa?" en "No"
 * cuando la unidad seleccionada es formativa.
 */
export type EnfoquePedagogico = "Evaluativo" | "Formativo"

/**
 * Descripción de un criterio en UN nivel de desempeño puntual. `nombre` es
 * el nombre de la banda ("Bajo"/"Básico"/"Alto"/"Superior" por default, o
 * el que traiga la escala de valoración configurada para el nivel
 * educativo de la unidad — ver `useNivelesDesempenoNombres` en
 * `use-niveles-desempeno.ts`); `descripcion` es lo que el docente escribe.
 */
export interface NivelDesempenoCriterio {
  nombre: string
  descripcion: string
  /** `pk_tescala_valoracion` real de esta banda (`useUnidadValoracionesQuery`)
   *  — lo que `POST .../criterios` necesita mandar como
   *  `NIVELES[].fkTescalaValoracion`. `undefined` en datos de mock viejos
   *  que todavía no pasaron por ese endpoint. */
  valoracionId?: number
}

/**
 * Criterio de la rúbrica de la unidad. NO es el `Criterio` de `Actividad`:
 * acá el criterio se describe en TANTOS niveles de desempeño como tenga la
 * escala de valoración configurada (una columna por nivel en la tabla) —
 * no un número fijo—, mientras que el de la actividad solo guarda el
 * nivel "excelente" y una ponderación.
 */
export interface CriterioUnidad {
  id: number
  nombre: string
  niveles: NivelDesempenoCriterio[]
}

/**
 * Actividad vinculada a la unidad, con su peso dentro de ella. Es un
 * registro de vínculo (join), no la actividad completa: `nombre`/`tipo`/
 * `instrumento`/`grupo` quedan congelados acá al momento de vincular
 * —igual que el resto de este modelo, que no vive sincronizado con el
 * de `Actividad`— y `actividadId` es la única referencia real de vuelta
 * a la actividad de origen (`Actividad.id` en `planeadorDb`).
 *
 * Esa referencia es lo que permite calcular, al abrir "Agregar
 * actividad", qué actividades de la unidad TODAVÍA no están vinculadas
 * (`Actividad.unidad.id === unidad.id` y su id no aparece en ningún
 * `UnidadActividad.actividadId` de `unidad.actividades`).
 */
export interface UnidadActividad {
  id: number
  /** Referencia a `Actividad.id` — ver el comentario de arriba. */
  actividadId: number
  nombre: string
  /** "Formativa" | "Sumativa" — no es el `ActividadTipo` del otro modelo. */
  tipo: string
  instrumento: string
  grupo: string
  /** Peso dentro de la unidad, 0-100. Solo tiene sentido cuando
   *  `metodoCalculo === "Ponderado"`; con "Promedio simple" o "Suma de
   *  puntos" el vínculo no pide porcentaje y este campo queda en 0. */
  ponderacion: number
}

export interface UnidadTematica {
  id: number
  nombre: string
  /** Área/competencia — "Comunicativa", "Cognitiva"… */
  area: string
  /** Ver `EnfoquePedagogico`. */
  enfoquePedagogico: EnfoquePedagogico
  status: ActividadStatus
  /** `yyyy-MM-dd`. */
  fechaInicio: string
  /** `yyyy-MM-dd`. */
  fechaFin: string
  descripcion: string
  objetivos: string[]
  contenidos: string[]
  metodoCalculo: MetodoCalculo
  grado: string
  asignatura: string
  /** `PK_TGRADO`/`PK_TASIGNATURA` reales — solo se conocen cuando el
   *  docente ELIGE grado/asignatura en el form (vía
   *  `useDocenteGradoAsignaturaQuery`, no hay forma de resolverlos de
   *  vuelta desde el nombre plano que devuelve el listado/detalle real).
   *  Si quedan `undefined` al editar, `update-unidad.ts` no manda
   *  `FK_TGRADO`/`FK_TASIGNATURA` — el backend real trata el PUT como
   *  parcial, así que el grado/asignatura ya guardados no se tocan. */
  gradoId?: number
  asignaturaId?: number
  /** Conteo real (`total_actividades` del listado) — la card del rail lo
   *  usa en vez de `actividades.length`, que contra el backend real queda
   *  siempre vacío (esa lista vive en `GET /unidades/:id/actividades`,
   *  aparte del listado/detalle). `undefined` en mock, donde sí alcanza
   *  con `.length`. */
  totalActividades?: number
  /**
   * `false` = la unidad guarda un referente curricular que ya no resuelve
   * (lo desactivaron: `ACTIVE=false` o `ESTADO='I'`) — confirmado real,
   * colección Postman `planeador-delta-cambios`, punto 6. Distinto de "no
   * se acoge a ninguno" (`gradoId`/referente en null con esto en `true`):
   * una unidad con referente muerto no puede ofrecer enunciados/evidencias.
   * `undefined` en mock y en respuestas de antes de este cambio — ahí no
   * hay aviso porque no hay de dónde derivarlo.
   */
  referenteVigente?: boolean
  /**
   * Textos de los enunciados de Derechos Básicos de Aprendizaje (DBA)
   * elegidos para esta unidad. Se ofrecen para elegir según el Referente
   * Curricular que le corresponde al `grado` (por nivel educativo) — ver
   * `useEnunciadosDbaQuery` —, pero acá se guarda el texto plano, no el id
   * del enunciado: mismo criterio que `objetivos`/`contenidos`, así el
   * form los agrega/quita con el mismo widget (`ListaAgregableCaja`).
   */
  enunciadosDba: string[]
  criterios: CriterioUnidad[]
  actividades: UnidadActividad[]
}

/** Sobre que devuelve `QueryPathController`, igual que el de actividades. */
export interface UnidadTematicaQueryResponse {
  rows: UnidadTematica[]
  pageCount: number
  totalCount: number
}
