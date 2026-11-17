import type { CatalogosFijos } from "@/features/coverage/matricula/api/query/catalogos-fijos"
import type { DepartmentOption } from "@/features/coverage/matricula/components/forms/form-create-matricula"

/**
 * Datos de la VISTA PREVIA de la inscripción pública (U.2).
 *
 * El backend todavía no expone la inscripción sin sesión (Cobertura §3.3): ni
 * el período abierto, ni los catálogos públicos, ni las opciones de cupo, ni el
 * envío y la validación del código. Mientras tanto la vista se arma con estos
 * datos fijos; cuando exista el servicio, cada constante se reemplaza por su
 * query (y `catalogos` por los catálogos públicos del backend).
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

export const GRADOS_DEMO = [
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

export const MODALIDADES_DEMO = ["Anual", "Semestral"]

interface JornadaDemo {
  nombre: string
  /** La sede ofrece el grado en dos períodos: hay que elegir la modalidad. */
  dosPeriodos?: boolean
}

export const ESTABLECIMIENTOS_DEMO: { nombre: string; sedes: { nombre: string; jornadas: JornadaDemo[] }[] }[] = [
  {
    nombre: "IE Central",
    sedes: [
      { nombre: "IE Central", jornadas: [{ nombre: "Mañana" }, { nombre: "Tarde" }] },
      { nombre: "Sede 2", jornadas: [{ nombre: "Mañana" }] },
    ],
  },
  {
    nombre: "IE Norte",
    sedes: [
      { nombre: "Sede principal", jornadas: [{ nombre: "Mañana" }] },
      { nombre: "Sede 2", jornadas: [{ nombre: "Tarde", dosPeriodos: true }, { nombre: "Noche" }] },
    ],
  },
  {
    nombre: "IE Sur",
    sedes: [{ nombre: "Sede principal", jornadas: [{ nombre: "Mañana" }, { nombre: "Única" }] }],
  },
]

export const sedesDe = (establecimiento: string) =>
  ESTABLECIMIENTOS_DEMO.find((e) => e.nombre === establecimiento)?.sedes ?? []

export const jornadasDe = (establecimiento: string, sede: string) =>
  sedesDe(establecimiento).find((s) => s.nombre === sede)?.jornadas ?? []

export const pideModalidad = (establecimiento: string, sede: string, jornada: string) =>
  Boolean(jornadasDe(establecimiento, sede).find((j) => j.nombre === jornada)?.dosPeriodos)
