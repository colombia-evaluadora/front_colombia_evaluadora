// Parser mínimo de Server-Sent Events. El streaming del agente es un POST
// (lleva cuerpo), así que no sirve `EventSource` (solo GET y sin cabeceras):
// se lee el `ReadableStream` de `fetch` y se parte acá.

export interface EventoSse {
  evento: string
  datos: string
}

/**
 * Parte un buffer acumulado en eventos completos. Devuelve los eventos y el
 * resto sin terminar (que se concatena con el siguiente chunk). Acepta `\n`
 * y `\r\n`; un evento sin `event:` es `message`; varias líneas `data:` se
 * unen con `\n` (spec de SSE). Comentarios (`:`) se ignoran.
 */
export function parsearSse(buffer: string): { eventos: EventoSse[]; resto: string } {
  const normalizado = buffer.replace(/\r\n/g, "\n")
  const bloques = normalizado.split("\n\n")
  const resto = bloques.pop() ?? ""
  const eventos: EventoSse[] = []
  for (const bloque of bloques) {
    let evento = "message"
    const datos: string[] = []
    for (const linea of bloque.split("\n")) {
      if (!linea || linea.startsWith(":")) continue
      const separador = linea.indexOf(":")
      const campo = separador === -1 ? linea : linea.slice(0, separador)
      let valor = separador === -1 ? "" : linea.slice(separador + 1)
      if (valor.startsWith(" ")) valor = valor.slice(1)
      if (campo === "event") evento = valor
      else if (campo === "data") datos.push(valor)
    }
    if (datos.length > 0) eventos.push({ evento, datos: datos.join("\n") })
  }
  return { eventos, resto }
}

/** Itera los eventos de un cuerpo SSE a medida que llegan. */
export async function* leerSse(cuerpo: ReadableStream<Uint8Array>): AsyncGenerator<EventoSse> {
  const lector = cuerpo.getReader()
  const decodificador = new TextDecoder()
  let buffer = ""
  try {
    while (true) {
      const { value, done } = await lector.read()
      if (done) break
      buffer += decodificador.decode(value, { stream: true })
      const { eventos, resto } = parsearSse(buffer)
      buffer = resto
      yield* eventos
    }
    // Un servidor que cierra sin la línea en blanco final: se procesa igual.
    const { eventos } = parsearSse(`${buffer}${decodificador.decode()}\n\n`)
    yield* eventos
  } finally {
    lector.releaseLock()
  }
}
