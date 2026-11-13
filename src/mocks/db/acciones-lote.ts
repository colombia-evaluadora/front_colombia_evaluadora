import { matriculaDb } from "@/mocks/db/matricula"
import { reactivar } from "@/mocks/db/reactivar"

// Acciones de fila y de lote (C.1.LOT.1–8). Variedad fija por pk:
// - Complementaria: pk % 3 === 0 (IE Central · Mañana · Sistemas).
// - Reingreso sin cupo en su grupo: pk % 2 === 0; con caso de reintegración: pk % 5 === 0;
//   complementaria sin cupo para volver (bloquea): pk % 7 === 0.
// - Cambio de grado con registros en Gestión Académica: pk % 2 === 1.

const byPk = (pk: number) => matriculaDb.find((m) => Number(m.id) === pk)
const nombre = (pk: number) => {
  const m = byPk(pk)
  return m ? `${m.firstName} ${m.lastName}` : `Matrícula ${pk}`
}

export const complementariaDe = (pk: number) =>
  pk % 3 === 0 ? { sede: "IE Central", jornada: "Mañana", especialidad: "Sistemas" } : null

type Resultado = { pk_matricula: number; ok: boolean; mensaje: string | null }
const ok = (pk: number): Resultado => ({ pk_matricula: pk, ok: true, mensaje: null })
const falla = (pk: number, mensaje: string): Resultado => ({ pk_matricula: pk, ok: false, mensaje: `${nombre(pk)}: ${mensaje}` })

/* Retirar */

export function retirarLote(pks: number[]): Resultado[] {
  return pks.map((pk) => {
    const m = byPk(pk)
    if (!m) return falla(pk, "la matrícula no existe.")
    if (m.status !== "Cursando") return falla(pk, `está ${m.status}; solo se retira una matrícula Cursando.`)
    if (m.retiroSolicitado || m.anulacionPendiente) return falla(pk, "tiene una solicitud pendiente: respóndala primero.")
    m.status = "Retirado"
    return ok(pk)
  })
}

/* Reingresar */

const capacidad = 35
export const gruposDe = (grado: number, sinCupoCodigo?: string) =>
  ["A", "B", "C", "D"]
    .map((letra, i) => ({
      pk_grupo: grado * 100 + i + 1,
      codigo: `${grado}°${letra}`,
      ocupados: [35, 33, 31, 28][i],
      capacidad,
    }))
    .filter((g) => g.codigo !== sinCupoCodigo && g.ocupados < g.capacidad)

export function previaReingreso(pk: number) {
  const m = byPk(pk)
  if (!m) return null
  const sinCupo = pk % 2 === 0
  return {
    pk_matricula: pk,
    fecha_retiro: "2027-05-12",
    grupo_actual: m.group,
    sin_cupo: sinCupo,
    cupos_libres: sinCupo ? 0 : 2,
    periodo_abierto: pk % 11 !== 0,
    grupos_con_cupo: sinCupo ? gruposDe(m.grade, m.group) : [],
    periodos_durante_retiro: pk % 4 === 0 ? ["P2"] : [],
    caso_reintegracion: pk % 5 === 0 ? "Reingreso aprobado" : null,
    complementaria_sin_cupo: pk % 7 === 0 && complementariaDe(pk) ? "Electricidad" : null,
  }
}

export function reingresarLote(matriculas: { ID: number; FK_TGRUPO: number | null }[]): Resultado[] {
  // En lote la complementaria sin cupo no bloquea: la principal reingresa y se avisa (C.1.LOT.2).
  const lote = matriculas.length > 1
  return matriculas.map(({ ID: pk, FK_TGRUPO }) => {
    const m = byPk(pk)
    const previa = previaReingreso(pk)
    if (!m || !previa) return falla(pk, "la matrícula no existe.")
    if (m.status !== "Retirado") return falla(pk, `está ${m.status}; solo se reingresa una matrícula Retirada.`)
    if (!previa.periodo_abierto) return falla(pk, "su Período Académico ya está cerrado.")
    if (previa.complementaria_sin_cupo && !lote)
      return falla(pk, `no hay cupo libre en ${previa.complementaria_sin_cupo} para reingresar a la matrícula complementaria.`)
    if (previa.sin_cupo && !FK_TGRUPO) return falla(pk, "su grupo ya no tiene cupo: elija otro grupo.")
    m.status = "Cursando"
    if (FK_TGRUPO) m.group = gruposDe(m.grade).find((g) => g.pk_grupo === FK_TGRUPO)?.codigo ?? m.group
    return ok(pk)
  })
}

/* Emparejamiento */

const ASIGNATURAS = ["Matemáticas", "Lengua castellana", "Inglés", "Ciencias naturales", "Ciencias sociales"]

export function emparejamiento(pks: number[], grupoId: number | null) {
  const m = byPk(pks[0])
  const grupoDestino = grupoId ?? 0
  const gradoDestino = Math.floor(grupoDestino / 100)
  const mismoGrado = m ? gradoDestino === m.grade : true
  // El mock trata los grupos A y B como la misma sede y jornada del origen (mismo plan).
  const mismoPlan = mismoGrado && grupoDestino % 100 <= 2
  const periodos = mismoGrado ? ["P1", "P2", "P3"] : ["P1", "P2"]
  return {
    tipo: mismoPlan ? "Mismo plan" : mismoGrado ? "Cambio de sede y jornada" : "Mismo período · otro grado",
    mismo_plan: mismoPlan,
    periodos: periodos.map((p, i) => ({
      origen: p,
      en_curso: mismoGrado && i === 2 ? 40 : null,
      opciones: periodos,
      destino: p,
    })),
    asignaturas: [
      ...ASIGNATURAS.slice(0, 2).map((a) => ({ origen: a, destino: a, opciones: ASIGNATURAS, estado: "EMPAREJADA" })),
      { origen: null, destino: "Emprendimiento", opciones: [], estado: "PENDIENTE_NIVELACION" },
      { origen: "Cátedra de la paz", destino: null, opciones: [], estado: "SOLO_HISTORIAL" },
    ],
    escala_distinta: mismoGrado && !mismoPlan,
  }
}

/* Cambiar de grupo */

export function cambiarGrupoLote(pks: number[], grupoId: number): Resultado[] {
  return pks.map((pk) => {
    const m = byPk(pk)
    if (!m) return falla(pk, "la matrícula no existe.")
    if (m.status !== "Cursando") return falla(pk, `está ${m.status}; solo se cambia de grupo una matrícula Cursando.`)
    if (m.retiroSolicitado || m.anulacionPendiente) return falla(pk, "tiene una solicitud pendiente.")
    const grupo = gruposDe(m.grade).find((g) => g.pk_grupo === grupoId)
    if (!grupo) return falla(pk, "el grupo destino no es de su grado o ya no tiene cupo.")
    m.group = grupo.codigo
    return ok(pk)
  })
}

/* Cambiar de grado */

export function previaCambioGrado(pks: number[]) {
  const m = byPk(pks[0])
  const grado = m?.grade ?? 1
  const comp = pks.map(complementariaDe).find(Boolean) ?? null
  return {
    periodos: [
      { pk_periodo: 1, label: `IE Central · ${m?.shift ?? "Mañana"} · 2027 · Anual · Ciclo 1`, fk_sede: 1, jornada: m?.shift ?? "Mañana" },
    ],
    grados: Array.from({ length: 11 }, (_, i) => i + 1)
      .filter((g) => g !== grado)
      .map((g) => ({ valor: g, nombre: String(g) })),
    grado_siguiente: grado < 11 ? grado + 1 : null,
    registros: pks.some((pk) => pk % 2 === 1) ? { actividades: 14, definitivas: ["P1"], clases: 32 } : null,
    con_registros: pks.filter((pk) => pk % 2 === 1).length,
    complementaria: comp ? { ...comp, disponible_en_grado_siguiente: false } : null,
  }
}

export function cambiarGradoLote(pks: number[], tipo: string, grupoId: number, motivo: string, conActa: boolean): Resultado[] {
  const gradoDestino = Math.floor(grupoId / 100)
  return pks.map((pk) => {
    const m = byPk(pk)
    if (!m) return falla(pk, "la matrícula no existe.")
    if (m.status !== "Cursando") return falla(pk, `está ${m.status}; solo se cambia de grado una matrícula Cursando.`)
    if (motivo.trim().length < 10) return falla(pk, "el motivo debe tener al menos 10 caracteres.")
    if (tipo !== "CORRECCION" && !conActa) return falla(pk, "adjunte el acta o soporte.")
    if (tipo === "PROMOCION" && gradoDestino !== m.grade + 1) return falla(pk, "la promoción anticipada es solo al grado siguiente.")
    if (tipo === "CORRECCION") {
      m.grade = gradoDestino
    } else {
      m.status = tipo === "PROMOCION" ? "Promovido Anticipadamente" : "Reubicado"
    }
    m.group = gruposDe(gradoDestino).find((g) => g.pk_grupo === grupoId)?.codigo ?? m.group
    return ok(pk)
  })
}

/* Reactivar */

export function reactivarLote(pks: number[], motivo: string): Resultado[] {
  return pks.map((pk) => {
    // En lote solo Aprobadas o Reprobadas (Regla 56): no hay matrícula nueva que decidir.
    const estado = byPk(pk)?.status
    if (estado !== "Aprobado" && estado !== "Reprobado") return falla(pk, "en lote solo se reactivan Aprobadas o Reprobadas.")
    const error = reactivar(pk, motivo, null)
    return error ? falla(pk, error) : ok(pk)
  })
}
