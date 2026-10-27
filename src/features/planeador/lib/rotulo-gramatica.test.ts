import { describe, expect, it } from "vitest"

import {
  articuloDefinidoRotulo,
  articuloIndefinidoRotulo,
  deArticuloRotulo,
  demostrativoRotulo,
  generoRotulo,
  pluralizarRotulo,
  concordanciaRotulo,
  esPluralRotulo,
  ningunRotulo,
  rotuloEnFrase,
  terminacionRotulo,
} from "@/features/planeador/lib/rotulo-gramatica"

/**
 * Los rótulos salen del referente curricular (texto libre). Los casos de
 * abajo son los valores reales conocidos —"Unidad temática"/"Proyecto
 * pedagógico" para la unidad, "Actividad"/"Experiencia de aprendizaje"/
 * "Proyecto" para la actividad— más algunos plausibles que rompían la
 * heurística vieja ("todo lo que no empiece por 'proyecto' es femenino").
 */
describe("generoRotulo", () => {
  it.each([
    ["Unidad temática", "f"],
    ["Proyecto pedagógico", "m"],
    ["Actividad", "f"],
    ["Experiencia de aprendizaje", "f"],
    ["Proyecto", "m"],
    ["Taller", "m"],
    ["Sesión de clase", "f"],
    ["Clase", "f"],
    ["Tema", "m"],
    ["Reto", "m"],
    ["", "f"],
  ] as const)("%s → %s", (rotulo, genero) => {
    expect(generoRotulo(rotulo)).toBe(genero)
  })
})

describe("artículos y concordancia", () => {
  it("femenino", () => {
    expect(articuloDefinidoRotulo("Unidad temática")).toBe("la")
    expect(articuloIndefinidoRotulo("Unidad temática")).toBe("una")
    expect(demostrativoRotulo("Unidad temática")).toBe("esta")
    expect(deArticuloRotulo("Unidad temática")).toBe("de la")
    expect(terminacionRotulo("Actividad")).toBe("a")
  })

  it("masculino", () => {
    expect(articuloDefinidoRotulo("Proyecto pedagógico")).toBe("el")
    expect(articuloIndefinidoRotulo("Proyecto pedagógico")).toBe("un")
    expect(demostrativoRotulo("Proyecto pedagógico")).toBe("este")
    expect(deArticuloRotulo("Proyecto pedagógico")).toBe("del")
    expect(terminacionRotulo("Taller")).toBe("o")
  })
})

describe("pluralizarRotulo", () => {
  it.each([
    ["Unidad temática", "Unidades temáticas"],
    ["unidad temática", "unidades temáticas"],
    ["Proyecto pedagógico", "Proyectos pedagógicos"],
    ["Actividad", "Actividades"],
    ["actividad", "actividades"],
    ["Experiencia de aprendizaje", "Experiencias de aprendizaje"],
    ["Sesión de clase", "Sesiones de clase"],
    ["Taller", "Talleres"],
    ["Luz", "Luces"],
    ["Crisis", "Crisis"],
    ["  Proyecto  ", "Proyectos"],
  ])("%s → %s", (rotulo, plural) => {
    expect(pluralizarRotulo(rotulo)).toBe(plural)
  })
})

describe("metodoCalculoInfo", () => {
  it("usa el rótulo de la actividad en plural y concordado", async () => {
    const { metodoCalculoInfo } = await import("@/features/planeador/lib/metodo-calculo-info")
    const info = metodoCalculoInfo("Proyecto")
    expect(info.Ponderado.label).toBe("Ponderar Proyectos")
    expect(info["Promedio simple"].description).toBe("Se calcula el promedio aritmético de todos los Proyectos")
    expect(metodoCalculoInfo("Experiencia de aprendizaje")["Suma de puntos"].label).toBe(
      "Sumatoria de Experiencias de aprendizaje",
    )
  })
})

/**
 * El rótulo es texto libre del referente: se muestra EXACTAMENTE como lo
 * escribió el usuario (sin minúscula ni capitalización forzadas) y los
 * artículos concuerdan también en número ("Tareas" → "de las Tareas", no
 * "de la tareas", el bug reportado).
 */
describe("rótulo tal cual lo escribió el usuario", () => {
  it("no transforma mayúsculas/minúsculas", () => {
    expect(rotuloEnFrase("Tareas")).toBe("Tareas")
    expect(rotuloEnFrase("tareas")).toBe("tareas")
    expect(rotuloEnFrase("Proyecto STEM")).toBe("Proyecto STEM")
  })

  it.each([
    ["Tareas", true],
    ["Proyectos pedagógicos", true],
    ["Talleres", true],
    ["Actividades", true],
    ["Actividad", false],
    ["Análisis", false],
    ["Tesis", false],
    ["Mes", false],
  ] as const)("esPluralRotulo(%s) → %s", (rotulo, plural) => {
    expect(esPluralRotulo(rotulo)).toBe(plural)
  })

  it("concuerda en género y número con un rótulo en plural", () => {
    expect(deArticuloRotulo("Tareas")).toBe("de las")
    expect(articuloDefinidoRotulo("Tareas")).toBe("las")
    expect(articuloIndefinidoRotulo("Tareas")).toBe("unas")
    expect(demostrativoRotulo("Tareas")).toBe("estas")
    expect(concordanciaRotulo("Tareas")).toBe("as")
    expect(ningunRotulo("Tareas")).toBe("ningunas")
    expect(deArticuloRotulo("Talleres")).toBe("de los")
    expect(deArticuloRotulo("Actividades")).toBe("de las")
    expect(concordanciaRotulo("Proyectos")).toBe("os")
    expect(concordanciaRotulo("Actividad")).toBe("a")
    expect(pluralizarRotulo("Tareas")).toBe("Tareas")
  })
})
