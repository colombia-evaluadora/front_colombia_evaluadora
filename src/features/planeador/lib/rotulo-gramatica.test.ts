import { describe, expect, it } from "vitest"

import {
  articuloDefinidoRotulo,
  articuloIndefinidoRotulo,
  deArticuloRotulo,
  demostrativoRotulo,
  generoRotulo,
  pluralizarRotulo,
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
    expect(info.Ponderado.label).toBe("Ponderar proyectos")
    expect(info["Promedio simple"].description).toBe("Se calcula el promedio aritmético de todos los proyectos")
    expect(metodoCalculoInfo("Experiencia de aprendizaje")["Suma de puntos"].label).toBe(
      "Sumatoria de experiencias de aprendizaje",
    )
  })
})
