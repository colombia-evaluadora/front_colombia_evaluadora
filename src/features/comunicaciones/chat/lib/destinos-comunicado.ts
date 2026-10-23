import type {
  Audiencia,
  Comunicado,
  Conversacion,
  DestinosComunicado,
  Persona,
} from "@/features/comunicaciones/chat/api/types"
import { AUDIENCIAS } from "@/features/comunicaciones/chat/api/ui-mappings"
import {
  etiquetaOpcion,
  SELECCION_VACIA,
  type ParaSeleccion,
  type SeleccionGrupal,
} from "@/features/comunicaciones/chat/lib/seleccion-grupal"

/**
 * Destinatarios de un comunicado además de la audiencia por rol (HU "Enviar mensaje institucional"):
 * personas puntuales, grupos del chat existentes y, con el mismo selector del alta masiva de grupos,
 * grados, grupos académicos y cargos. comms-service los resuelve en el servidor (sin duplicados y
 * dentro del establecimiento de quien publica); las etiquetas viajan solo para mostrarlos.
 */
export interface DestinosLocal {
  personas: Pick<Persona, "id" | "nombre" | "correo">[]
  gruposChat: Pick<Conversacion, "id" | "nombre">[]
  grupal: SeleccionGrupal
}

export const DESTINOS_VACIOS: DestinosLocal = { personas: [], gruposChat: [], grupal: SELECCION_VACIA }

export function hayDestinos(d: DestinosLocal): boolean {
  return (
    d.personas.length + d.gruposChat.length + d.grupal.grados.length + d.grupal.grupos.length + d.grupal.roles.length >
    0
  )
}

export function aDestinos(d: DestinosLocal): DestinosComunicado {
  return {
    grados: d.grupal.grados.map((o) => ({ valor: o.valor, etiqueta: o.etiqueta })),
    // La etiqueta del grupo lleva la sede ("601 · Sede principal").
    grupos: d.grupal.grupos.map((o) => ({ valor: o.valor, etiqueta: etiquetaOpcion(o) })),
    roles: d.grupal.roles.map((o) => ({ valor: o.valor, etiqueta: o.etiqueta })),
    usuarios: d.personas.map((p) => ({ valor: String(p.id), etiqueta: p.nombre })),
    gruposChat: d.gruposChat.map((g) => ({ valor: String(g.id), etiqueta: g.nombre })),
    para: d.grupal.para ?? "ESTUDIANTES",
  }
}

/** Lo guardado (edición o borrador) de vuelta al estado de los selectores. */
export function deDestinos(d: Partial<DestinosComunicado> | null | undefined): DestinosLocal {
  if (!d) return DESTINOS_VACIOS
  const opcion = (o: { valor: string; etiqueta: string }) => ({ valor: o.valor, etiqueta: o.etiqueta, total: 0 })
  return {
    personas: (d.usuarios ?? [])
      .filter((o) => Number.isFinite(Number(o.valor)))
      .map((o) => ({ id: Number(o.valor), nombre: o.etiqueta, correo: "" })),
    gruposChat: (d.gruposChat ?? [])
      .filter((o) => Number.isFinite(Number(o.valor)))
      .map((o) => ({ id: Number(o.valor), nombre: o.etiqueta })),
    grupal: {
      grados: (d.grados ?? []).map(opcion),
      grupos: (d.grupos ?? []).map(opcion),
      roles: (d.roles ?? []).map(opcion),
      para: (d.para ?? "ESTUDIANTES") as ParaSeleccion,
    },
  }
}

/** Grupos del chat que sirven de destino: grupos y foros generales (sin actividades ni el bot). */
export function esGrupoDestino(c: Conversacion): boolean {
  return !c.esBot && (c.tipo === "GRUPO" || (c.tipo === "CANAL" && c.categoria === "GENERAL"))
}

/**
 * "Dirigido a" del panel: roles, grados, grupos, cargos, personas y grupos del chat en una línea
 * ("Estudiantes, Docentes, grado Sexto, grupo 601, Natalia Ruiz, grupo Coordinación").
 */
export function resumenDestinatarios(audiencia: Audiencia[], d: DestinosComunicado | null | undefined): string {
  const partes = AUDIENCIAS.filter((a) => audiencia.includes(a.value)).map((a) => a.label)
  if (d) {
    partes.push(
      ...d.grados.map((o) => `grado ${o.etiqueta}`),
      ...d.grupos.map((o) => `grupo ${o.etiqueta}`),
      ...d.roles.map((o) => `rol ${o.etiqueta}`),
    )
    if (d.grados.length + d.grupos.length > 0 && d.para !== "ESTUDIANTES") {
      partes.push(d.para === "ACUDIENTES" ? "solo acudientes" : "estudiantes y acudientes")
    }
    partes.push(...d.usuarios.map((o) => o.etiqueta), ...d.gruposChat.map((o) => `grupo ${o.etiqueta}`))
  }
  return partes.join(", ")
}

/** El comunicado admite respuestas y ya se publicó: se muestra con la conversación debajo. */
export function comunicadoConRespuestas(c: Comunicado | null | undefined): boolean {
  return !!c?.permiteRespuestas && new Date(c.publicarEn) <= new Date()
}
