import { useAcademicPeriodsQuery } from "@/features/establishment/academic-period/api/query/use-academic-periods"
import { useTeachingLevelsQuery } from "@/features/establishment/academic-period/api/query/use-teaching-levels"
import { useRatingScalesQuery } from "@/features/establishment/academic-period/api/query/use-rating-scales"
import { nivelEducativoCodeForGradoPalabra } from "@/features/planeador/lib/grado-nivel-educativo"

/** Nombres por default — lo que se ve si no hay escala de valoración
 *  configurada para el nivel educativo de la unidad (o directamente no hay
 *  un periodo académico "Abierto" desde el cual leerla). Orden de menor a
 *  mayor desempeño, igual que las bandas de una escala real ordenadas por
 *  `notaMinima`. */
export const NIVELES_DESEMPENO_DEFAULT_NOMBRES = ["Bajo", "Básico", "Alto", "Superior"]

// Ninguna de las dos keywords de nivel se pisa entre sí ("Secundaria" no
// contiene "media" ni viceversa), así que alcanza con un `includes` por
// nivel en vez de un mapeo exacto contra el `nombre` — el texto real del
// catálogo puede variar levemente entre mock y backend (ver el comentario
// de `nivelEducativoCodeForGradoPalabra`, misma aproximación).
const NIVEL_CODE_KEYWORD: Record<string, string> = {
  PREESCOLAR: "preescolar",
  PRIMARIA: "primaria",
  SECUNDARIA: "secundaria",
  MEDIA: "media",
}

/**
 * Nombres de los niveles de desempeño (Bajo/Básico/Alto/Superior... tantos
 * como tenga la escala) del modal "Agregar criterio" (`DialogAgregarCriterio`)
 * y de las columnas de la tabla de Rúbricas — el TEXTO de cada nivel lo
 * sigue escribiendo el docente a mano, pero la CANTIDAD y el NOMBRE de los
 * niveles vienen de la escala de valoración que Establecimiento configuró
 * para el nivel educativo de la unidad, en vez de estar hardcodeados acá:
 * si la escala tiene 3 bandas, hay 3 niveles; si tiene 6, hay 6.
 *
 * Requiere un `academicPeriodId` (las escalas son por periodo) que acá no
 * hay forma de elegir a mano —Planeador no tiene noción de "periodo
 * actual"—, así que se toma el primer periodo con estado "Abierto" (`"A"`,
 * ver `AcademicPeriodStatus`) y, si no hay ninguno abierto, el primero de
 * la lista. Aproximación razonable mientras no exista un periodo activo
 * explícito en la app.
 */
export function useNivelesDesempenoNombres(gradoPalabra: string) {
  const nivelCode = nivelEducativoCodeForGradoPalabra(gradoPalabra)

  const { data: teachingLevels, isPending: isPendingLevels } = useTeachingLevelsQuery()
  const keyword = nivelCode ? NIVEL_CODE_KEYWORD[nivelCode] : undefined
  const teachingLevel = keyword
    ? (teachingLevels ?? []).find((level) => level.nombre.toLowerCase().includes(keyword))
    : undefined

  const { data: periodosResult, isPending: isPendingPeriodos } = useAcademicPeriodsQuery({
    filters: {},
    sorting: [],
    pageIndex: 0,
    pageSize: 50,
  })
  const periodos = periodosResult?.rows ?? []
  const academicPeriodId = (periodos.find((p) => p.status === "A") ?? periodos[0])?.id

  const { data: escalasResult, isPending: isPendingEscalas } = useRatingScalesQuery({
    filters: {},
    sorting: [],
    teachingLevelId: teachingLevel?.id,
    academicPeriodId,
  })

  const isPending = isPendingLevels || isPendingPeriodos || (academicPeriodId != null && isPendingEscalas)

  const bandas = (escalasResult?.rows ?? [])
    .slice()
    .sort((a, b) => a.notaMinima - b.notaMinima)

  const nombres = bandas.length > 0 ? bandas.map((banda) => banda.nombre) : NIVELES_DESEMPENO_DEFAULT_NOMBRES

  return { nombres, isPending }
}
