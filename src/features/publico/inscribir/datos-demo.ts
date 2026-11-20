import type { CatalogosFijos } from "@/features/coverage/matricula/api/query/catalogos-fijos"
import type { DepartmentOption } from "@/features/coverage/matricula/components/forms/form-create-matricula"
import type { PeriodoOpcionCupo } from "@/features/coverage/inscripcion-reservas/api/query/use-inscripciones-query"

/**
 * Datos de la inscripción pública (U.2) para el modo mock: los sirve el handler MSW de
 * `/eval-col/public/service` con la forma del backend (sso V425/V426). Con el backend real
 * la cascada, los catálogos y el código vienen de `api/inscripcion-publica.ts`; las
 * constantes de límites reflejan las del backend (5 intentos, reenvío por minuto).
 */

export const ANIO_INSCRIPCION = 2028
export const MAX_OPCIONES = 3
export const MAX_INTENTOS_CODIGO = 5
export const SEGUNDOS_REENVIO = 60
export const MINUTOS_BLOQUEO = 15

const lista = (...nombres: string[]) => nombres.map((nombre, i) => ({ id: i + 1, nombre }))

export const CATALOGOS_DEMO: CatalogosFijos = {
  tipoDocumento: lista(
    "Registro civil",
    "Tarjeta de identidad",
    "Cédula de ciudadanía",
    "Cédula de extranjería",
    "Permiso por protección temporal",
    "Pasaporte",
  ),
  genero: lista("Femenino", "Masculino", "No binario"),
  pais: lista("Colombia", "Venezuela", "Ecuador", "Perú", "Otro"),
  lenguaMaterna: lista("Español", "Wayuunaiki", "Nasa Yuwe", "Inglés", "Otra"),
  condicionMigratoria: lista("No aplica", "PPT", "PEP", "Visa", "Sin documento"),
  parentesco: lista("Madre", "Padre", "Abuelo(a)", "Tío(a)", "Hermano(a)", "Otro"),
  situacionAnioAnterior: lista("Estudió el año anterior", "No estudió el año anterior", "Ingresa por primera vez"),
  condicionAnioAnterior: lista("Aprobó", "Reprobó", "Desertó", "Trasladado"),
  institucionBienestar: lista("No aplica", "ICBF", "Hogar comunitario", "Otra"),
  poblacionVictima: lista("No aplica", "Desplazado", "Desvinculado de grupos armados", "Hijo de adulto desmovilizado"),
  fuenteRecursos: lista("No aplica", "Recursos propios", "Subsidio estatal"),
  estrato: lista("1", "2", "3", "4", "5", "6", "Sin estrato"),
  sisben: lista("A", "B", "C", "D", "No tiene"),
  talento: lista("No aplica", "Talento excepcional", "Capacidad excepcional"),
  apoyoAcademico: lista("No aplica", "Apoyo pedagógico", "Apoyo terapéutico"),
  trastorno: lista("No aplica", "Trastorno del aprendizaje", "Trastorno del lenguaje"),
  srpa: lista("No aplica", "Vinculado al SRPA"),
  etnias: [
    { id: 1, code: "NA", name: "No aplica" },
    { id: 2, code: "WAY", name: "Wayuu" },
    { id: 3, code: "NAS", name: "Nasa" },
    { id: 4, code: "AFR", name: "Afrocolombiano" },
  ],
  discapacidades: [
    { id: 1, code: "NA", name: "No aplica" },
    { id: 2, code: "VIS", name: "Visual" },
    { id: 3, code: "AUD", name: "Auditiva" },
    { id: 4, code: "FIS", name: "Física" },
  ],
}

/** Siglas para el resumen ("TI 1098456123"). */
export const SIGLA_DOCUMENTO: Record<string, string> = {
  "Registro civil": "RC",
  "Tarjeta de identidad": "TI",
  "Cédula de ciudadanía": "CC",
  "Cédula de extranjería": "CE",
  "Permiso por protección temporal": "PPT",
  Pasaporte: "PA",
}

export const DEPARTAMENTOS_DEMO: DepartmentOption[] = [
  {
    name: "Santander",
    municipalities: [
      { id: 1, name: "Bucaramanga" },
      { id: 2, name: "Floridablanca" },
      { id: 3, name: "Girón" },
      { id: 4, name: "Piedecuesta" },
    ],
  },
  {
    name: "Cundinamarca",
    municipalities: [
      { id: 5, name: "Bogotá D.C." },
      { id: 6, name: "Soacha" },
    ],
  },
]

const GRADOS_DEMO = [
  "Transición",
  "Primero",
  "Segundo",
  "Tercero",
  "Cuarto",
  "Quinto",
  "Sexto",
  "Séptimo",
  "Octavo",
  "Noveno",
  "Décimo",
  "Undécimo",
]

const ANUAL = `${ANIO_INSCRIPCION} · Anual · Ciclo 1`
const SEMESTRAL = `${ANIO_INSCRIPCION} · Semestral · Ciclo 1`

// [establecimiento, sede, jornada, grupo de admisión]. IE Norte · Sede 2 · Tarde tiene el
// grado en dos períodos (anual y semestral): ahí el asistente pide la modalidad.
const OFERTA: [string, string, string, string][] = [
  ["IE Central", "IE Central", "Mañana", ANUAL],
  ["IE Central", "IE Central", "Tarde", ANUAL],
  ["IE Central", "Sede 2", "Mañana", ANUAL],
  ["IE Norte", "Sede principal", "Mañana", ANUAL],
  ["IE Norte", "Sede 2", "Tarde", ANUAL],
  ["IE Norte", "Sede 2", "Tarde", SEMESTRAL],
  ["IE Norte", "Sede 2", "Noche", ANUAL],
  ["IE Sur", "Sede principal", "Mañana", ANUAL],
  ["IE Sur", "Sede principal", "Única", ANUAL],
]

/** Cascada de opciones de la vista previa, con la forma de `fn_inscripcion_opciones_cupo_publicas_interno`. */
export const PERIODOS_DEMO: PeriodoOpcionCupo[] = OFERTA.map(([establecimiento, sede, jornada, grupo], i) => ({
  periodoId: 100 + i,
  establecimientoId: ["IE Central", "IE Norte", "IE Sur"].indexOf(establecimiento) + 1,
  establecimiento,
  sede,
  jornada,
  grupoAdmisionId: grupo === ANUAL ? 1 : 2,
  grupoAdmision: grupo,
  grados: GRADOS_DEMO.map((nombre, g) => ({ id: (100 + i) * 100 + g, nombre })),
}))
