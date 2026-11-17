import { required } from "@/lib/forms/messages"
import type { OpcionSeleccion } from "@/features/comunicaciones/chat/api/types"
import {
  esAcademico,
  TIPOS,
  TODOS,
  type Cascada,
  type Conjunto,
} from "@/features/comunicaciones/comunicados/api/comunicado-documento"

/** Valor de Jornada para "Todas las jornadas": solo vale en un conjunto de funcionarios (M.1.AGR.3). */
export const TODAS_LAS_JORNADAS = "TODAS"

export const etiquetaDe = (opciones: OpcionSeleccion[] | undefined, valor: string) =>
  opciones?.find((o) => o.valor === valor)?.etiqueta ?? ""

/** Sede y Jornada elegidas sin períodos Abiertos (M.1.AGR.5): no se puede publicar a esa audiencia. */
export const sinPeriodos = (c: Conjunto, datos: Cascada | undefined) =>
  esAcademico(c) && !!c.sede && !!c.jornada && c.jornada !== TODAS_LAS_JORNADAS && !!datos && datos.anios.length === 0

const jornadaDe = (c: Conjunto, datos: Cascada | undefined) =>
  c.jornada === TODAS_LAS_JORNADAS ? "Todas las jornadas" : etiquetaDe(datos?.jornadas, c.jornada)

/** "IE Central · Principal · 2027 · Mañana · Anual · Ciclo 1": identidad del período resuelto. */
export function textoPeriodo(c: Conjunto, datos: Cascada | undefined): string | null {
  if (!esAcademico(c) || !datos?.periodo) return null
  return [
    etiquetaDe(datos.establecimientos, c.establecimiento),
    etiquetaDe(datos.sedes, c.sede),
    datos.periodo.anio,
    jornadaDe(c, datos),
    datos.periodo.nombreModalidad,
    `Ciclo ${datos.periodo.ciclo}`,
  ].join(" · ")
}

/** "Sexto · Todos los grupos" y, con funcionarios, sus roles. */
export function textoFiltros(c: Conjunto, datos: Cascada | undefined): string {
  const partes: string[] = []
  if (esAcademico(c)) {
    partes.push(c.grado === TODOS ? "Todos los grados" : etiquetaDe(datos?.grados, c.grado))
    if (c.grado && c.grado !== TODOS) {
      partes.push(c.grupo === TODOS ? "Todos los grupos" : etiquetaDe(datos?.grupos, c.grupo))
      if (c.grupo && c.grupo !== TODOS) {
        partes.push(
          c.todosEstudiantes
            ? "Todos los estudiantes"
            : `${c.estudiantes.length} ${c.estudiantes.length === 1 ? "estudiante" : "estudiantes"}`,
        )
      }
    }
  }
  if (c.tipos.includes("FUNCIONARIOS")) {
    partes.push(c.todosRoles ? "Todos los roles" : c.roles.join(", "))
    if (c.seleccionFuncionarios === "ESPECIFICOS") {
      partes.push(`${c.funcionarios.length} ${c.funcionarios.length === 1 ? "funcionario" : "funcionarios"}`)
    }
  }
  return partes.filter(Boolean).join(" · ")
}

/** Texto guardado con el conjunto para mostrarlo después (detalle y "Dirigido a"). */
export function resumenConjunto(c: Conjunto, datos: Cascada | undefined): string {
  return [
    etiquetaDe(datos?.establecimientos, c.establecimiento),
    etiquetaDe(datos?.sedes, c.sede),
    jornadaDe(c, datos),
    TIPOS.filter((t) => c.tipos.includes(t.valor))
      .map((t) => t.etiqueta)
      .join(", "),
    textoFiltros(c, datos),
  ]
    .filter(Boolean)
    .join(" · ")
}

/**
 * Id del control de cada campo del conjunto N en el DOM: clave de los errores por campo, para
 * marcarlo en rojo y enfocar el primero al intentar previsualizar.
 */
export const conjuntoCampoId = (numero: number, campo: string) => `conjunto-${numero}-${campo}`

export type ErroresCampos = Record<string, string>

/**
 * Lo que le falta al conjunto para previsualizar, por id de control y en el orden visual del panel
 * (el primero es el que se enfoca): cada campo obligatorio exige una selección válida.
 */
export function erroresConjunto(c: Conjunto, numero: number): ErroresCampos {
  const e: ErroresCampos = {}
  const id = (campo: string) => conjuntoCampoId(numero, campo)
  if (!c.establecimiento) e[id("est")] = required("El establecimiento")
  if (!c.sede) e[id("sede")] = required("La sede", { femenino: true })
  if (!c.jornada) e[id("jornada")] = required("La jornada", { femenino: true })
  if (c.tipos.length === 0) e[id("tipos")] = "Selecciona al menos un tipo de destinatario"
  if (esAcademico(c)) {
    if (!c.anio) e[id("anio")] = required("El año")
    if (!c.modalidad) e[id("modalidad")] = required("La modalidad", { femenino: true })
    if (!c.ciclo) e[id("ciclo")] = required("El ciclo")
    if (!c.grado) e[id("grado")] = required("El grado")
    if (c.grado && c.grado !== TODOS && !c.grupo) e[id("grupo")] = required("El grupo")
    if (c.grupo && c.grupo !== TODOS && !c.todosEstudiantes && c.estudiantes.length === 0) {
      e[id("estudiantes")] = "Selecciona al menos un estudiante de referencia"
    }
  }
  if (c.tipos.includes("FUNCIONARIOS")) {
    if (!c.todosRoles && c.roles.length === 0) e[id("roles")] = "Selecciona al menos un rol de funcionarios"
    if (!c.seleccionFuncionarios) e[id("seleccion")] = required("La selección de funcionarios", { femenino: true })
    if (c.seleccionFuncionarios === "ESPECIFICOS" && c.funcionarios.length === 0) {
      e[id("funcionarios")] = "Selecciona al menos un funcionario"
    }
  }
  return e
}

/** Número de conjunto (desde 1) al que pertenece un id de `conjuntoCampoId`, o null. */
export function numeroDeCampo(id: string): number | null {
  const m = /^conjunto-(\d+)-/.exec(id)
  return m ? Number(m[1]) : null
}

/** Aviso de página al intentar con errores (el detalle va en cada campo), igual que en planeador. */
export const ERRORES_MENSAJE = "Revisa los campos marcados en rojo antes de guardar."

/**
 * Scroll suave y foco al control del primer error. Se espera al render que pinta los errores y abre
 * el panel plegado; si el id es de un grupo (checkboxes, radios), se enfoca su primer control.
 */
export function enfocarPrimerError(errores: ErroresCampos) {
  const primero = Object.keys(errores)[0]
  if (!primero) return
  setTimeout(() => {
    const el = document.getElementById(primero)
    if (!el) return
    const FOCO =
      "input:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex='-1'])"
    const campo = el.matches(FOCO) ? el : (el.querySelector<HTMLElement>(FOCO) ?? el)
    campo.scrollIntoView({ block: "center", behavior: "smooth" })
    campo.focus({ preventScroll: true })
  }, 50)
}

// Qué limpia cada nivel al cambiar (informe §3.1, "Cambios de contexto").
export const ACADEMICO_VACIO = {
  anio: "",
  modalidad: "",
  ciclo: "",
  grado: "",
  grupo: "",
  todosEstudiantes: false,
  estudiantes: [] as string[],
}

export const FUNCIONARIOS_VACIO = {
  todosRoles: false,
  roles: [] as string[],
  seleccionFuncionarios: "" as const,
  funcionarios: [] as string[],
}

export type Nivel = "establecimiento" | "sede" | "jornada" | "anio" | "modalidad" | "ciclo" | "grado" | "grupo"

export const NOMBRE_NIVEL: Record<Nivel, string> = {
  establecimiento: "el establecimiento",
  sede: "la sede",
  jornada: "la jornada",
  anio: "el año",
  modalidad: "la modalidad",
  ciclo: "el ciclo",
  grado: "el grado",
  grupo: "el grupo",
}

export function alCambiar(c: Conjunto, nivel: Nivel, valor: string): Conjunto {
  switch (nivel) {
    case "establecimiento":
      return { ...c, ...ACADEMICO_VACIO, ...FUNCIONARIOS_VACIO, establecimiento: valor, sede: "", jornada: "" }
    case "sede":
      return { ...c, ...ACADEMICO_VACIO, ...FUNCIONARIOS_VACIO, sede: valor, jornada: "" }
    case "jornada":
      return { ...c, ...ACADEMICO_VACIO, ...FUNCIONARIOS_VACIO, jornada: valor }
    case "anio":
      return { ...c, ...ACADEMICO_VACIO, anio: valor }
    case "modalidad":
      // Con Anual el ciclo es 1 y queda en solo lectura.
      return { ...c, ...ACADEMICO_VACIO, anio: c.anio, modalidad: valor, ciclo: valor === "ANUAL" ? "1" : "" }
    case "ciclo":
      return { ...c, ...ACADEMICO_VACIO, anio: c.anio, modalidad: c.modalidad, ciclo: valor }
    case "grado":
      return { ...c, grado: valor, grupo: "", todosEstudiantes: false, estudiantes: [] }
    case "grupo":
      return { ...c, grupo: valor, todosEstudiantes: false, estudiantes: [] }
  }
}

/** Si cambiar ese nivel descartaría algo ya elegido más abajo: se avisa antes. */
export function descarta(c: Conjunto, nivel: Nivel): boolean {
  const academico = !!(c.anio || c.grado)
  const funcionarios = c.roles.length > 0 || c.todosRoles || c.funcionarios.length > 0
  switch (nivel) {
    case "establecimiento":
      return !!c.sede
    case "sede":
      return !!c.jornada || academico || funcionarios
    case "jornada":
      return academico || funcionarios
    case "anio":
      return !!c.modalidad
    case "modalidad":
      return !!c.grado || (!!c.ciclo && c.modalidad !== "ANUAL")
    case "ciclo":
      return !!c.grado
    case "grado":
      return !!c.grupo
    case "grupo":
      return c.todosEstudiantes || c.estudiantes.length > 0
  }
}
