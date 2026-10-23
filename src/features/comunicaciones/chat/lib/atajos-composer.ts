// Atajos "/" del compositor (botón «/» de los diseños 3846:66590 y 4485:66928): acciones rápidas
// que se eligen con un clic o escribiendo "/" al inicio del mensaje (como Slack). Sin llamadas ni
// grabaciones: esas funciones quedaron fuera del alcance.

export type IdAtajo = "encuesta" | "votacion" | "eleccion" | "comunicado" | "adjuntar" | "programar"

export interface AtajoComposer {
  id: IdAtajo
  // Lo que se escribe después de "/" (sin tildes).
  comando: string
  etiqueta: string
  descripcion: string
}

export const ATAJOS: readonly AtajoComposer[] = [
  { id: "encuesta", comando: "encuesta", etiqueta: "Crear encuesta", descripcion: "Preguntas para un grupo de personas" },
  { id: "votacion", comando: "votacion", etiqueta: "Votación rápida", descripcion: "Sí/No o Verdadero/Falso con tiempo límite" },
  { id: "eleccion", comando: "eleccion", etiqueta: "Elección", descripcion: "Proceso electoral con candidatos" },
  { id: "comunicado", comando: "comunicado", etiqueta: "Comunicado", descripcion: "Anuncio oficial de solo lectura" },
  { id: "adjuntar", comando: "adjuntar", etiqueta: "Adjuntar archivo", descripcion: "Documentos, fotos o videos" },
  { id: "programar", comando: "programar", etiqueta: "Programar envío", descripcion: "Envía este mensaje más tarde" },
]

const sinTildes = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()

/**
 * Consulta del atajo escrito: el mensaje empieza por "/" y todavía no tiene espacios ("/enc" →
 * "enc", "/" → ""). Null si no es un atajo (texto normal, "/ hola" o una ruta "a/b").
 */
export function consultaAtajo(texto: string): string | null {
  const m = /^\/(\S*)$/.exec(texto)
  return m ? sinTildes(m[1]) : null
}

/**
 * Atajos disponibles que coinciden con la consulta: por el comando o por cualquier palabra de la
 * etiqueta ("/vot" y "/rap" encuentran Votación rápida), sin importar tildes ni mayúsculas.
 */
export function filtrarAtajos(consulta: string, disponibles: ReadonlySet<IdAtajo>): AtajoComposer[] {
  const q = sinTildes(consulta.trim())
  return ATAJOS.filter(
    (a) =>
      disponibles.has(a.id) &&
      (!q || a.comando.startsWith(q) || sinTildes(a.etiqueta).split(/\s+/).some((p) => p.startsWith(q))),
  )
}
