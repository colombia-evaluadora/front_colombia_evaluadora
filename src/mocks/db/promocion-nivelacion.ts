// Promoción y nivelación (Sección 4.7), en snake_case como lo mandaría el back
// (tarea 28 de pendientes-back.md). Escala 1,0–10,0; aprueba con 6,0; la Nota
// Máxima de Recuperación es 7,0. Laura Gómez ya tiene matrícula en 2027: no se
// promueve. Plazo de Andrés Ríos vencido; Sofía Pérez ya niveló todo.

const hoy = () => new Date().toISOString().slice(0, 10)
const desplazar = (dias: number) => {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

const SEDES = [
  { value: "1", label: "Sede Principal" },
  { value: "2", label: "Sede Rural El Carmen" },
]
const JORNADAS = [
  { value: "1", label: "Mañana" },
  { value: "2", label: "Tarde" },
]
const GRADOS = [
  { value: "6", label: "Sexto" },
  { value: "7", label: "Séptimo" },
  { value: "9", label: "Noveno" },
]
const GRUPOS = [
  { value: "601", label: "601", grado: "6" },
  { value: "602", label: "602", grado: "6" },
  { value: "701", label: "701", grado: "7" },
  { value: "901", label: "901", grado: "9" },
]

interface AreaRow {
  area: string
  abreviatura: string
  ih: number
  nota_final: number
  inasistencia: number
}

interface ReprobadoRow {
  matricula_id: number
  documento: string
  estudiante: string
  grado: string
  grupo: string
  sede: string
  jornada: string
  anio: number
  areas: AreaRow[]
  /** Ya tiene matrícula en el período siguiente. */
  siguiente: string | null
  promovido: boolean
}

const area = (nombre: string, abreviatura: string, ih: number, nota_final: number, inasistencia: number): AreaRow => ({
  area: nombre,
  abreviatura,
  ih,
  nota_final,
  inasistencia,
})

const comunes = (extra: AreaRow[]) => [
  area("Ciencias sociales", "SOC", 4, 7.2, 4),
  area("Educación física", "EDF", 2, 8.5, 2),
  area("Ética y valores", "ETI", 1, 8.0, 3),
  ...extra,
]

const reprobados: ReprobadoRow[] = [
  {
    matricula_id: 9101,
    documento: "1023456789",
    estudiante: "Camilo Andrés Torres Mejía",
    grado: "6",
    grupo: "601",
    sede: "1",
    jornada: "1",
    anio: 2026,
    areas: comunes([area("Matemáticas", "MAT", 5, 4.8, 6), area("Humanidades", "HUM", 5, 7.0, 5)]),
    siguiente: null,
    promovido: false,
  },
  {
    matricula_id: 9102,
    documento: "1023987654",
    estudiante: "Laura Valentina Gómez Ruiz",
    grado: "6",
    grupo: "602",
    sede: "1",
    jornada: "1",
    anio: 2026,
    areas: comunes([area("Matemáticas", "MAT", 5, 5.1, 3), area("Ciencias naturales", "NAT", 4, 5.4, 4)]),
    siguiente: "Año lectivo 2027",
    promovido: false,
  },
  {
    matricula_id: 9103,
    documento: "1024111222",
    estudiante: "Juan Esteban Ospina Lara",
    grado: "7",
    grupo: "701",
    sede: "2",
    jornada: "2",
    anio: 2026,
    areas: comunes([
      area("Matemáticas", "MAT", 5, 4.2, 12),
      area("Humanidades", "HUM", 5, 5.0, 10),
      area("Ciencias naturales", "NAT", 4, 5.6, 9),
    ]),
    siguiente: null,
    promovido: false,
  },
  {
    matricula_id: 9104,
    documento: "1024333444",
    estudiante: "Mariana Castaño Vélez",
    grado: "9",
    grupo: "901",
    sede: "1",
    jornada: "1",
    anio: 2026,
    areas: comunes([area("Inglés", "ING", 3, 5.8, 2)]),
    siguiente: null,
    promovido: false,
  },
]

const APRUEBA = 6
const NOTA_MAXIMA = 7
const reprobadas = (r: ReprobadoRow) => r.areas.filter((a) => a.nota_final < APRUEBA)
const promedio = (r: ReprobadoRow) => Math.round((r.areas.reduce((s, a) => s + a.nota_final, 0) / r.areas.length) * 10) / 10
const mayorInasistencia = (r: ReprobadoRow) => Math.max(...r.areas.map((a) => a.inasistencia))
const nombreGrado = (v: string) => GRADOS.find((g) => g.value === v)?.label ?? v

export function opcionesPromocion() {
  return {
    anios: [2026, 2025],
    periodos: [
      { value: "2026", label: "Año lectivo 2026", anio: 2026 },
      { value: "2025", label: "Año lectivo 2025", anio: 2025 },
    ],
    sedes: SEDES,
    jornadas: JORNADAS,
    grados: GRADOS,
    grupos: GRUPOS,
  }
}

export interface FiltrosPromocion {
  SEARCH: string | null
  ANIO: number | null
  PERIODO?: number | null
  SEDE: number | null
  JORNADA: number | null
  GRADO: number | null
  GRUPO?: number | null
  SEGUIMIENTO?: string | null
  PAGE_INDEX: number
  PAGE_SIZE: number
}

const coincide = (texto: string | null, ...campos: string[]) =>
  !texto || campos.some((c) => c.toLowerCase().includes(texto.toLowerCase()))
const igual = (filtro: number | null | undefined, valor: string | number) => filtro == null || String(filtro) === String(valor)

function paginar<T>(rows: T[], f: FiltrosPromocion) {
  return rows.slice(f.PAGE_INDEX * f.PAGE_SIZE, (f.PAGE_INDEX + 1) * f.PAGE_SIZE).map((r) => ({ ...r, total_count: rows.length }))
}

/** Orden de la Sección 4.7: menos áreas reprobadas, mayor rendimiento, menor inasistencia. */
export function listarReprobados(f: FiltrosPromocion) {
  const rows = reprobados
    .filter(
      (r) =>
        !r.promovido &&
        igual(f.ANIO, r.anio) &&
        igual(f.PERIODO, r.anio) &&
        igual(f.SEDE, r.sede) &&
        igual(f.JORNADA, r.jornada) &&
        igual(f.GRADO, r.grado) &&
        igual(f.GRUPO, r.grupo) &&
        coincide(f.SEARCH, r.estudiante, r.documento),
    )
    .sort(
      (a, b) =>
        reprobadas(a).length - reprobadas(b).length ||
        promedio(b) - promedio(a) ||
        mayorInasistencia(a) - mayorInasistencia(b),
    )
    .map((r) => ({
      matricula_id: r.matricula_id,
      documento: r.documento,
      estudiante: r.estudiante,
      grado: nombreGrado(r.grado),
      grupo: r.grupo,
      areas_reprobadas: reprobadas(r).map((a) => ({ abreviatura: a.abreviatura, nombre: a.area })),
      rendimiento: promedio(r),
      mayor_inasistencia: mayorInasistencia(r),
    }))
  return paginar(rows, f)
}

export function areasDelAnio(matriculaId: number) {
  const r = reprobados.find((x) => x.matricula_id === matriculaId)
  return (r?.areas ?? []).map((a) => ({
    area: a.area,
    ih: a.ih,
    nota_final: a.nota_final,
    aprobo: a.nota_final >= APRUEBA,
    inasistencia: a.inasistencia,
  }))
}

const bloqueoDe = (r: ReprobadoRow) =>
  r.siguiente ? `${r.estudiante} ya tiene matrícula en ${r.siguiente}; corrija su grado allí antes de promoverlo.` : null

export function previaPromover(ids: number[]) {
  return reprobados
    .filter((r) => ids.includes(r.matricula_id))
    .map((r) => ({
      matricula_id: r.matricula_id,
      estudiante: r.estudiante,
      areas: reprobadas(r).map((a) => ({ abreviatura: a.abreviatura, nombre: a.area })),
      grupo: r.grupo,
      fecha_cierre: `${r.anio}-11-27`,
      fin_periodo_siguiente: `${r.anio + 1}-11-30`,
      bloqueo: bloqueoDe(r),
    }))
}

// Áreas pendientes ------------------------------------------------------------

interface IntentoRow {
  id: number
  fecha: string
  nota: number
  responsable: string
  soporte_id: number | null
  observacion: string | null
  corregido_por: string | null
}

interface AreaPendienteRow {
  id: number
  area: string
  nota_final: number
  intentos: IntentoRow[]
}

interface PromocionRow {
  promocion_id: number
  matricula_id: number
  documento: string
  estudiante: string
  grado: string
  sede: string
  jornada: string
  anio: number
  grado_actual: string | null
  acta: string
  fecha_acta: string
  plazo: string
  fin_periodo: string
  /** Ya tiene matrícula en el período siguiente. */
  con_siguiente: boolean
  areas: AreaPendienteRow[]
}

let secuencia = 500
// Modo de cálculo de recuperación del mock: la nota tal cual.
const nivelada = (a: AreaPendienteRow) => (a.intentos.at(-1)?.nota ?? 0) >= APRUEBA

const promociones: PromocionRow[] = [
  {
    promocion_id: 301,
    matricula_id: 8101,
    documento: "1022555666",
    estudiante: "Andrés Felipe Ríos Cardona",
    grado: "7",
    sede: "1",
    jornada: "1",
    anio: 2025,
    grado_actual: "8°A",
    acta: "CEP-2025-014",
    fecha_acta: "2025-12-02",
    plazo: desplazar(-20),
    fin_periodo: desplazar(150),
    con_siguiente: true,
    areas: [
      {
        id: 1,
        area: "Matemáticas",
        nota_final: 4.6,
        intentos: [
          { id: 11, fecha: "2026-03-10", nota: 5.2, responsable: "Martha Lucía Henao", soporte_id: null, observacion: null, corregido_por: null },
        ],
      },
      { id: 2, area: "Inglés", nota_final: 5.5, intentos: [] },
    ],
  },
  {
    promocion_id: 302,
    matricula_id: 8102,
    documento: "1022777888",
    estudiante: "Sofía Pérez Montoya",
    grado: "6",
    sede: "2",
    jornada: "2",
    anio: 2025,
    grado_actual: "7°B",
    acta: "CEP-2025-014",
    fecha_acta: "2025-12-02",
    plazo: desplazar(40),
    fin_periodo: desplazar(150),
    con_siguiente: true,
    areas: [
      {
        id: 3,
        area: "Ciencias naturales",
        nota_final: 5.1,
        intentos: [
          {
            id: 12,
            fecha: "2026-02-20",
            nota: 6.8,
            responsable: "Jorge Iván Mesa",
            soporte_id: 9001,
            observacion: "Taller y sustentación.",
            corregido_por: null,
          },
        ],
      },
    ],
  },
  {
    promocion_id: 303,
    matricula_id: 8103,
    documento: "1022999000",
    estudiante: "Daniela Restrepo Gil",
    grado: "9",
    sede: "1",
    jornada: "1",
    anio: 2025,
    grado_actual: null,
    acta: "CEP-2025-015",
    fecha_acta: "2025-12-05",
    plazo: desplazar(60),
    fin_periodo: desplazar(150),
    con_siguiente: false,
    areas: [
      { id: 4, area: "Química", nota_final: 4.9, intentos: [] },
      { id: 5, area: "Física", nota_final: 5.3, intentos: [] },
    ],
  },
]

function seguimiento(p: PromocionRow) {
  if (p.areas.every(nivelada)) return "NIVELADO"
  return p.plazo < hoy() ? "VENCIDO" : "CON_PENDIENTES"
}

export function listarPendientes(f: FiltrosPromocion) {
  const rows = promociones
    .filter(
      (p) =>
        igual(f.ANIO, p.anio) &&
        igual(f.SEDE, p.sede) &&
        igual(f.JORNADA, p.jornada) &&
        igual(f.GRADO, p.grado) &&
        (!f.SEGUIMIENTO || seguimiento(p) === f.SEGUIMIENTO) &&
        coincide(f.SEARCH, p.estudiante, p.documento),
    )
    .map((p) => ({
      promocion_id: p.promocion_id,
      documento: p.documento,
      estudiante: p.estudiante,
      promovido_de: `${nombreGrado(p.grado)} · ${p.anio}`,
      anio: p.anio,
      grado: nombreGrado(p.grado),
      grupo_actual: p.grado_actual,
      areas_pendientes: p.areas.filter((a) => !nivelada(a)).map((a) => a.area),
      niveladas: p.areas.filter(nivelada).length,
      total: p.areas.length,
      plazo: p.plazo,
      seguimiento: seguimiento(p),
    }))
  return paginar(rows, f)
}

const buscar = (id: number) => promociones.find((p) => p.promocion_id === id)

export function detallePromocion(id: number) {
  const p = buscar(id)
  if (!p) return null
  return {
    promocion_id: p.promocion_id,
    estudiante: p.estudiante,
    acta: p.acta,
    fecha_acta: p.fecha_acta,
    plazo: p.plazo,
    fin_periodo: p.fin_periodo,
    nota_minima: 1,
    nota_maxima: NOTA_MAXIMA,
    areas: p.areas.map((a) => ({ ...a, estado: nivelada(a) ? "NIVELADA" : "PENDIENTE" })),
  }
}

type Resultado = string | null

export function promover(b: { IDS: number[]; ACTA: string; FECHA_ACTA: string; PLAZO: string }) {
  return b.IDS.map((id) => {
    const r = reprobados.find((x) => x.matricula_id === id)
    if (!r || r.promovido) return { matricula_id: id, ok: false, mensaje: "La matrícula ya no está Reprobado." }
    const bloqueo = bloqueoDe(r)
    if (bloqueo) return { matricula_id: id, ok: false, mensaje: bloqueo }
    r.promovido = true
    promociones.push({
      promocion_id: ++secuencia,
      matricula_id: id,
      documento: r.documento,
      estudiante: r.estudiante,
      grado: r.grado,
      sede: r.sede,
      jornada: r.jornada,
      anio: r.anio,
      grado_actual: null,
      acta: b.ACTA,
      fecha_acta: b.FECHA_ACTA,
      plazo: b.PLAZO,
      fin_periodo: `${r.anio + 1}-11-30`,
      con_siguiente: false,
      areas: reprobadas(r).map((a) => ({ id: ++secuencia, area: a.area, nota_final: a.nota_final, intentos: [] })),
    })
    return { matricula_id: id, ok: true, mensaje: null }
  })
}

export function anularPromocion(id: number): Resultado {
  const p = buscar(id)
  if (!p) return "La promoción no existe."
  if (p.con_siguiente || p.areas.some(nivelada))
    return `No se puede anular la promoción de ${p.estudiante} porque ya tiene matrícula en el período siguiente o áreas niveladas.`
  promociones.splice(promociones.indexOf(p), 1)
  const r = reprobados.find((x) => x.matricula_id === p.matricula_id)
  if (r) r.promovido = false
  return null
}

export function ampliarPlazo(id: number, plazo: string): Resultado {
  const p = buscar(id)
  if (!p) return "La promoción no existe."
  if (plazo <= p.plazo) return "La nueva fecha debe ser posterior al plazo actual."
  if (plazo > p.fin_periodo) return "La nueva fecha debe estar dentro del período académico siguiente."
  p.plazo = plazo
  return null
}

const areaDe = (id: number, areaId: number) => buscar(id)?.areas.find((a) => a.id === areaId)
const validarIntento = (p: PromocionRow, fecha: string, nota: number): Resultado => {
  if (fecha > hoy() || fecha < p.fecha_acta) return "La fecha no puede ser posterior a hoy ni anterior a la fecha del acta."
  if (nota < 1 || nota > NOTA_MAXIMA) return `La nota debe estar entre 1,0 y ${String(NOTA_MAXIMA)},0.`
  return null
}

export function registrarNivelacion(
  id: number,
  areaId: number,
  b: { fecha: string; nota: number; responsable: string; observacion: string | null; soporte: boolean },
): Resultado {
  const p = buscar(id)
  const a = areaDe(id, areaId)
  if (!p || !a) return "El área no existe."
  if (nivelada(a)) return "El área ya está Nivelada."
  const error = validarIntento(p, b.fecha, b.nota)
  if (error) return error
  a.intentos.push({
    id: ++secuencia,
    fecha: b.fecha,
    nota: b.nota,
    responsable: b.responsable,
    soporte_id: b.soporte ? ++secuencia : null,
    observacion: b.observacion,
    corregido_por: null,
  })
  return null
}

export function corregirNivelacion(id: number, areaId: number, b: { fecha: string; nota: number }): Resultado {
  const p = buscar(id)
  const ultimo = areaDe(id, areaId)?.intentos.at(-1)
  if (!p || !ultimo) return "El área no tiene intentos de nivelación."
  const error = validarIntento(p, b.fecha, b.nota)
  if (error) return error
  ultimo.fecha = b.fecha
  ultimo.nota = b.nota
  ultimo.corregido_por = "Usuario actual"
  return null
}
