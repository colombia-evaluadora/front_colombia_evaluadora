import type {
  BloqueCriterio,
  CampoOpcion,
  CriterioPrioridad,
  ReglaCodigo,
  ReglaOpcion,
} from "@/features/administration/criterios-prioridad/api/types/criterio-prioridad"

// Réplica en memoria de V318–V319: los campos evaluables por bloque, la lista
// Regla de prioridad y los 9 criterios iniciales. La aplicabilidad de cada
// regla sigue `fn_criterioprio_regla_motivo`.

export const reglasDb: { pkRegla: number; codigo: ReglaCodigo; nombre: string }[] = [
  { pkRegla: 1, codigo: "ES_SI", nombre: "Es Sí" },
  { pkRegla: 2, codigo: "TIENE_VALOR", nombre: "Tiene valor" },
  { pkRegla: 3, codigo: "ES_UNO_DE", nombre: "Es uno de" },
  { pkRegla: 4, codigo: "MENOR_A_MAYOR", nombre: "De menor a mayor" },
  { pkRegla: 5, codigo: "MAYOR_A_MENOR", nombre: "De mayor a menor" },
]

let nextValor = 1000
const valores = (...nombres: string[]) => nombres.map((nombre) => ({ pkListaValor: nextValor++, nombre }))

interface CampoMock extends Omit<CampoOpcion, "reglas"> {
  bloque: BloqueCriterio
  orden: number
}

const B = {
  b22: { codigo: "2.2", nombre: "Información del estudiante" },
  b27: { codigo: "2.7", nombre: "Víctima conflicto armado" },
  b28: { codigo: "2.8", nombre: "Información complementaria" },
  b29: { codigo: "2.9", nombre: "Subsidio o beneficios" },
  insc: { codigo: "INSCRIPCION", nombre: "Inscripción" },
}

const siNo = (pkCampo: number, codigo: string, nombre: string, bloque: BloqueCriterio, orden: number): CampoMock => ({
  pkCampo, codigo, nombre, tipo: "SI_NO", categoria: null, esOrdinal: false, valores: [], bloque, orden,
})

export const camposDb: CampoMock[] = [
  { pkCampo: 1, codigo: "TIPO_DOC_ESTUDIANTE", nombre: "Tipo de documento del estudiante", tipo: "SELECTOR", categoria: "TIPO_DOCUMENTO", esOrdinal: false, valores: valores("Registro civil", "Tarjeta de identidad", "Cédula de ciudadanía"), bloque: B.b22, orden: 1 },
  { pkCampo: 2, codigo: "GENERO_ESTUDIANTE", nombre: "Género del estudiante", tipo: "SELECTOR", categoria: "GENERO", esOrdinal: false, valores: valores("Femenino", "Masculino", "Otro"), bloque: B.b22, orden: 2 },
  { pkCampo: 7, codigo: "VICTIMA_CONFLICTO", nombre: "Población víctima conflicto", tipo: "SELECTOR", categoria: "POB_VICT_CONF", esOrdinal: false, valores: valores("En situación de desplazamiento", "Desvinculados de grupos armados", "Hijos de adultos desmovilizados", "No Aplica"), bloque: B.b27, orden: 7 },
  { pkCampo: 8, codigo: "ESTRATO", nombre: "Estrato socio económico del estudiante", tipo: "SELECTOR", categoria: "ESTRATO", esOrdinal: true, valores: valores("Estrato 0", "Estrato 1", "Estrato 2", "Estrato 3", "Estrato 4", "Estrato 5", "Estrato 6"), bloque: B.b28, orden: 8 },
  { pkCampo: 9, codigo: "SISBEN", nombre: "Sisbén", tipo: "SELECTOR", categoria: "SISBEN", esOrdinal: true, valores: valores("Grupo A", "Grupo B", "Grupo C", "Grupo D", "No Aplica"), bloque: B.b28, orden: 9 },
  { pkCampo: 10, codigo: "CONDICIONES_ESPECIALES", nombre: "Condiciones especiales del estudiante", tipo: "SELECTOR", categoria: null, esOrdinal: false, valores: [], bloque: B.b28, orden: 10 },
  { pkCampo: 11, codigo: "TALENTO", nombre: "Talento del estudiante", tipo: "SELECTOR", categoria: "TALENTO", esOrdinal: false, valores: valores("Superdotado", "Con talento científico", "Con talento tecnológico", "No Aplica"), bloque: B.b28, orden: 11 },
  siNo(12, "SUBSIDIADO", "Subsidiado", B.b29, 12),
  { pkCampo: 13, codigo: "FUENTE_RECURSOS", nombre: "Fuente de recursos", tipo: "SELECTOR", categoria: "FUENTE_DE_RECURSO", esOrdinal: false, valores: valores("SGP", "FNR", "Otros Recursos de la Nación"), bloque: B.b29, orden: 13 },
  siNo(14, "MADRE_CABEZA_FAMILIA", "Alumnos madre cabeza de familia", B.b29, 14),
  siNo(15, "HIJO_MADRE_CABEZA", "Hijos de madre cabeza de familia", B.b29, 15),
  siNo(16, "VETERANO_FUERZA_PUBLICA", "Veteranos de la fuerza pública", B.b29, 16),
  siNo(17, "HEROE_NACION", "Héroes de la nación", B.b29, 17),
  siNo(21, "HERMANO_VERIFICADO", "Hermano verificado", B.insc, 21),
]

export function reglaMotivo(campo: CampoMock, codigo: ReglaCodigo): string | null {
  const nombre = reglasDb.find((r) => r.codigo === codigo)?.nombre
  if (campo.tipo === "SI_NO" && codigo !== "ES_SI") return `${nombre} no aplica: el campo es Sí/No.`
  if (campo.tipo === "SELECTOR" && codigo === "ES_SI") return `${nombre} no aplica: el campo es un selector.`
  if (campo.tipo === "SELECTOR" && campo.categoria == null && codigo !== "TIENE_VALOR")
    return `${nombre} no aplica: el campo no usa una lista de valores.`
  if ((codigo === "MENOR_A_MAYOR" || codigo === "MAYOR_A_MENOR") && !campo.esOrdinal)
    return `${nombre} no aplica: la lista ${campo.categoria} no es ordinal.`
  return null
}

export const reglasDe = (campo: CampoMock): ReglaOpcion[] =>
  reglasDb.map((r) => ({ ...r, motivo: reglaMotivo(campo, r.codigo) }))

/** Cuáles están en uso (Configuración de la admisión): Estrato, para ver el aviso. */
export const enUsoDb = new Set<number>([4])

const inicial: [number, string, string, ReglaCodigo][] = [
  [1, "Hermanos estudiando en el Establecimiento", "HERMANO_VERIFICADO", "ES_SI"],
  [2, "Víctima del conflicto", "VICTIMA_CONFLICTO", "TIENE_VALOR"],
  [3, "Nivel de Sisbén", "SISBEN", "MENOR_A_MAYOR"],
  [4, "Estrato", "ESTRATO", "MENOR_A_MAYOR"],
  [5, "Discapacidad o condiciones especiales", "CONDICIONES_ESPECIALES", "TIENE_VALOR"],
  [6, "Madre cabeza de familia", "MADRE_CABEZA_FAMILIA", "ES_SI"],
  [7, "Hijos de madre cabeza de familia", "HIJO_MADRE_CABEZA", "ES_SI"],
  [8, "Veteranos de la fuerza pública", "VETERANO_FUERZA_PUBLICA", "ES_SI"],
  [9, "Héroes de la nación", "HEROE_NACION", "ES_SI"],
]

export interface CriterioMock {
  pkCriterio: number
  nombre: string
  descripcion: string | null
  habilitado: boolean
  pkCampo: number
  pkRegla: number
  valores: number[]
}

export const criteriosDb: CriterioMock[] = inicial.map(([pkCriterio, nombre, campo, regla]) => ({
  pkCriterio,
  nombre,
  descripcion: null,
  habilitado: true,
  pkCampo: camposDb.find((c) => c.codigo === campo)!.pkCampo,
  pkRegla: reglasDb.find((r) => r.codigo === regla)!.pkRegla,
  valores: [],
}))

export function toCriterio(c: CriterioMock): CriterioPrioridad {
  const campo = camposDb.find((x) => x.pkCampo === c.pkCampo)!
  const regla = reglasDb.find((r) => r.pkRegla === c.pkRegla)!
  return {
    pkCriterio: c.pkCriterio,
    nombre: c.nombre,
    descripcion: c.descripcion,
    habilitado: c.habilitado,
    enUso: enUsoDb.has(c.pkCriterio),
    campo: {
      pkCampo: campo.pkCampo,
      codigo: campo.codigo,
      nombre: campo.nombre,
      tipo: campo.tipo,
      categoria: campo.categoria,
      bloque: campo.bloque,
    },
    regla,
    valores: campo.valores.filter((v) => c.valores.includes(v.pkListaValor)),
  }
}
