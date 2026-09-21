import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type {
  Actividad,
  Criterio,
  EscalaValoracion,
  InstrumentoPersonalizado,
  ListaCotejo,
  Nivel,
  Rubrica,
} from "@/features/planeador/api/types/actividad"

/**
 * `GET /planeador/actividades/:id/instrumento` — el MISMO endpoint que ya
 * usa `use-instrumento-actividad-query.ts` (planilla, calificación), pero
 * mapeado a la forma que edita `EditarActividadForm`
 * (`rubrica`/`listaCotejo`/`escalaValoracion`/`instrumentoPersonalizado`) en
 * vez de a `InstrumentoActividad` (pensada solo para calificar: no modela
 * "OTRO" ni los campos completos de escala NUMÉRICA — `tipoEscala`,
 * `valorMin`/`valorMax`, `interpretacionRangos`).
 *
 * Row confirmada real (colección Postman `planeador-instrumentos-tipos-
 * completo`): `tipoEscala`/`tipoEvidencia`/`metodoValoracion` vienen como
 * CÓDIGO ("NUMERICA", "ENLACE", "LISTA_COTEJO", …), no como el id numérico
 * que pide el `PUT` — por eso el mapeo de vuelta es por código/nombre, no
 * por id.
 */
interface RawNivel {
  pk?: number
  etiqueta: string
  descripcion?: string | null
  ponderacion?: number | null
}

interface RawCriterio {
  pk?: number
  nombre: string
  descripcion?: string | null
  niveles: RawNivel[]
}

interface RawCotejoItem {
  pk?: number
  descripcion: string
  ponderacion?: number | null
}

interface RawEscala {
  pk?: number
  tipoEscala: "NUMERICA" | "CUALITATIVA"
  criteriosGenerales?: string | null
  valorMin?: number | null
  valorMax?: number | null
  interpretacionRangos?: string | null
  niveles?: RawNivel[]
}

interface RawOtro {
  pk?: number
  tipoEvidencia: string | null
  tipoEvidenciaNombre?: string | null
  metodoValoracion: "RUBRICA" | "LISTA_COTEJO" | "ESCALA_VALORACION" | null
  metodoValoracionNombre?: string | null
  definicion: RawCriterio[] | RawCotejoItem[] | RawEscala
}

type RawInstrumentoActividadRow =
  | { instrumento: null; definicion: null }
  | { instrumento: "RUBRICA"; definicion: RawCriterio[] }
  | { instrumento: "LISTA_COTEJO"; definicion: RawCotejoItem[] }
  | { instrumento: "ESCALA_VALORACION"; definicion: RawEscala }
  | { instrumento: "OTRO"; definicion: RawOtro }

/** `TIPO_EVIDENCIA_OTRO` de vuelta a los 4 valores del `<Select>` de
 *  "Tipo de evidencia esperada" — por `nombre`, mismo criterio de
 *  substring que `use-tipo-evidencia-otro-catalog.ts` para no depender de
 *  un código exacto sin confirmar. */
function tipoEvidenciaEsperadaDesdeNombre(nombre: string | null | undefined): string {
  if (!nombre) return ""
  const lower = nombre.toLowerCase()
  if (lower.includes("archivo")) return "Archivo"
  if (lower.includes("enlace")) return "Enlace"
  if (lower.includes("observaci")) return "Observación directa"
  if (lower.includes("registro")) return "Registro en campo"
  return ""
}

function metodoValoracionDesdeCodigo(
  codigo: RawOtro["metodoValoracion"],
): InstrumentoPersonalizado["metodoValoracion"] {
  if (codigo === "RUBRICA") return "Rúbrica"
  if (codigo === "LISTA_COTEJO") return "Lista de cotejo"
  if (codigo === "ESCALA_VALORACION") return "Escala de valoración"
  return ""
}

let nivelIdSeed = -1
/** Ids sintéticos NEGATIVOS para niveles/items/criterios sin `pk` confirmado
 *  en la captura real (el front los usa solo como `key` de lista, nunca
 *  para identificar algo del lado del servidor) — negativos para que nunca
 *  choquen con un `pk` real, que siempre es positivo. */
function syntheticId(pk: number | undefined): number {
  return pk ?? nivelIdSeed--
}

function nivelDesdeRaw(nivel: RawNivel): Nivel {
  return {
    id: syntheticId(nivel.pk),
    nombre: nivel.etiqueta,
    descripcion: nivel.descripcion ?? "",
    ponderacion: nivel.ponderacion ?? undefined,
  }
}

/**
 * Inverso de `criterioABody` (`update-instrumento-actividad.ts`): el nivel
 * "Excelente" vuelve a separarse del array `niveles[]` a los campos propios
 * `criterio.excelente`/`excelentePonderacion` — es como el form los edita.
 */
function criterioDesdeRaw(criterio: RawCriterio): Criterio {
  const excelente = criterio.niveles.find((n) => n.etiqueta === "Excelente")
  const resto = criterio.niveles.filter((n) => n.etiqueta !== "Excelente")
  return {
    id: syntheticId(criterio.pk),
    nombre: criterio.nombre,
    excelente: excelente?.descripcion ?? "",
    excelentePonderacion: excelente?.ponderacion ?? undefined,
    niveles: resto.map(nivelDesdeRaw),
    ponderacion: 0,
  }
}

function rubricaDesdeRaw(criterios: RawCriterio[]): Rubrica {
  return { id: 0, criterios: criterios.map(criterioDesdeRaw) }
}

function listaCotejoDesdeRaw(items: RawCotejoItem[]): ListaCotejo {
  return {
    id: 0,
    items: items.map((item) => ({
      id: syntheticId(item.pk),
      descripcion: item.descripcion,
      ponderacion: item.ponderacion ?? undefined,
    })),
  }
}

function escalaDesdeRaw(raw: RawEscala): EscalaValoracion {
  // Comparación tolerante a mayúsculas/espacios — mismo motivo que el
  // matcheo por `valor` en `use-tipo-escala-catalog.ts`: si esta fila viene
  // con otro casing ("Numerica" en vez de "NUMERICA"), el `===` estricto
  // caía siempre a la rama Cualitativa y se perdían valorMin/valorMax/
  // interpretacionRangos sin ningún error — el docente los guardaba bien
  // (confirmado contra el PUT real) pero al reabrir la actividad la
  // pantalla mostraba "Cualitativa" con esos tres campos vacíos.
  if (String(raw.tipoEscala).trim().toUpperCase() === "NUMERICA") {
    return {
      id: 0,
      criteriosGenerales: raw.criteriosGenerales ?? "",
      tipo: "Numérica",
      valorMinimo: raw.valorMin ?? undefined,
      valorMaximo: raw.valorMax ?? undefined,
      interpretacionRangos: raw.interpretacionRangos ?? "",
      niveles: [],
    }
  }
  return {
    id: 0,
    criteriosGenerales: raw.criteriosGenerales ?? "",
    tipo: "Cualitativa",
    interpretacionRangos: "",
    niveles: (raw.niveles ?? []).map(nivelDesdeRaw),
  }
}

/** Campos del form que este endpoint puede completar — se aplican con
 *  `form.setFieldValue` uno por uno, nunca de punta a punta, para no pisar
 *  los otros campos ya cargados por el detalle real. */
export interface InstrumentoActividadParaForm {
  rubrica: Actividad["rubrica"]
  listaCotejo: Actividad["listaCotejo"]
  escalaValoracion: Actividad["escalaValoracion"]
  instrumentoPersonalizado: Actividad["instrumentoPersonalizado"]
}

function vacioParaForm(): InstrumentoActividadParaForm {
  return {
    rubrica: { id: 0, criterios: [] },
    listaCotejo: { id: 0, items: [] },
    escalaValoracion: {
      id: 0,
      criteriosGenerales: "",
      tipo: "Numérica",
      interpretacionRangos: "",
      niveles: [],
    },
    instrumentoPersonalizado: {
      descripcion: "",
      tipoEvidenciaEsperada: "",
      metodoValoracion: "",
      requiereArchivo: false,
      requiereRespuestaTexto: false,
    },
  }
}

function toInstrumentoActividadParaForm(row: RawInstrumentoActividadRow | undefined): InstrumentoActividadParaForm {
  const base = vacioParaForm()
  if (!row || row.instrumento == null) return base

  // Defensivo más allá de lo que el tipo promete: el mock, por ejemplo,
  // responde `definicion: null` para "OTRO" (ver `instrumentoActividadDe` en
  // `mocks/db/planilla.ts` — todavía no lo modela) aunque el tipo real
  // documentado por Postman diga que siempre viene un objeto.
  if (row.instrumento === "RUBRICA") {
    return row.definicion ? { ...base, rubrica: rubricaDesdeRaw(row.definicion) } : base
  }
  if (row.instrumento === "LISTA_COTEJO") {
    return row.definicion ? { ...base, listaCotejo: listaCotejoDesdeRaw(row.definicion) } : base
  }
  if (row.instrumento === "ESCALA_VALORACION") {
    return row.definicion ? { ...base, escalaValoracion: escalaDesdeRaw(row.definicion) } : base
  }
  // "OTRO" delega en uno de los tres métodos (ver `InstrumentoPersonalizadoSection`):
  // la definición interna se carga en la MISMA sección (`rubrica`/
  // `listaCotejo`/`escalaValoracion`) que si fuera el instrumento directo.
  const otro = row.definicion
  if (!otro) return base
  const metodoValoracion = metodoValoracionDesdeCodigo(otro.metodoValoracion)
  const instrumentoPersonalizado: InstrumentoPersonalizado = {
    descripcion: "",
    tipoEvidenciaEsperada: tipoEvidenciaEsperadaDesdeNombre(otro.tipoEvidenciaNombre ?? otro.tipoEvidencia),
    metodoValoracion,
    requiereArchivo: false,
    requiereRespuestaTexto: false,
  }
  if (metodoValoracion === "Rúbrica") {
    return { ...base, instrumentoPersonalizado, rubrica: rubricaDesdeRaw(otro.definicion as RawCriterio[]) }
  }
  if (metodoValoracion === "Lista de cotejo") {
    return {
      ...base,
      instrumentoPersonalizado,
      listaCotejo: listaCotejoDesdeRaw(otro.definicion as RawCotejoItem[]),
    }
  }
  if (metodoValoracion === "Escala de valoración") {
    return {
      ...base,
      instrumentoPersonalizado,
      escalaValoracion: escalaDesdeRaw(otro.definicion as RawEscala),
    }
  }
  return { ...base, instrumentoPersonalizado }
}

async function fetchInstrumentoActividadParaForm(actividadId: number): Promise<InstrumentoActividadParaForm> {
  const rows = await evalCol.getRows<RawInstrumentoActividadRow>(
    `/planeador/actividades/${actividadId}/instrumento`,
  )
  return toInstrumentoActividadParaForm(rows[0])
}

export const instrumentoActividadFormQueryKey = (actividadId: number) =>
  ["planeador", "actividad", actividadId, "instrumento", "form"] as const

/**
 * Precarga la definición YA GUARDADA del instrumento (rúbrica/lista de
 * cotejo/escala/personalizado) al editar una actividad — el detalle real
 * (`GET .../actividades/:id`) no la trae, vive acá aparte (ver el
 * comentario de `tieneDefinicionInstrumento` en
 * `update-instrumento-actividad.ts`). `enabled` lo decide el caller: solo
 * tiene sentido con una actividad YA creada y evaluativa.
 */
export function useInstrumentoActividadFormQuery(actividadId: number | undefined, enabled: boolean) {
  return useQuery({
    queryKey:
      actividadId != null
        ? instrumentoActividadFormQueryKey(actividadId)
        : (["planeador", "actividad", "none", "instrumento", "form"] as const),
    queryFn: () => fetchInstrumentoActividadParaForm(actividadId!),
    enabled: enabled && actividadId != null,
    staleTime: 1000 * 60,
  })
}
