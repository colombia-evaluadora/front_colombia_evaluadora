// Formato tipo Markdown del chat. El mensaje viaja como texto plano con marcas;
// el editor las inserta y la lista de mensajes las pinta.

export interface Edicion {
  texto: string
  inicio: number
  fin: number
}

export type MarcaEnLinea = "**" | "_" | "~" | "`"

// Envuelve la selección; si ya está envuelta, quita la marca.
export function alternarMarca(e: Edicion, marca: MarcaEnLinea): Edicion {
  const { texto, inicio, fin } = e
  const n = marca.length
  const antes = texto.slice(inicio - n, inicio)
  const despues = texto.slice(fin, fin + n)
  if (antes === marca && despues === marca) {
    return {
      texto: texto.slice(0, inicio - n) + texto.slice(inicio, fin) + texto.slice(fin + n),
      inicio: inicio - n,
      fin: fin - n,
    }
  }
  return {
    texto: texto.slice(0, inicio) + marca + texto.slice(inicio, fin) + marca + texto.slice(fin),
    inicio: inicio + n,
    fin: fin + n,
  }
}

export function insertarEnlace(e: Edicion, url = "https://"): Edicion {
  const etiqueta = e.texto.slice(e.inicio, e.fin) || "texto"
  const enlace = `[${etiqueta}](${url})`
  const inicioUrl = e.inicio + etiqueta.length + 3
  return {
    texto: e.texto.slice(0, e.inicio) + enlace + e.texto.slice(e.fin),
    // Deja seleccionada la URL para escribirla encima.
    inicio: inicioUrl,
    fin: inicioUrl + url.length,
  }
}

export type TipoBloque = "numerada" | "vinetas" | "cita"

const PREFIJO: Record<TipoBloque, RegExp> = {
  numerada: /^\d+\. /,
  vinetas: /^- /,
  cita: /^> /,
}

// Pone o quita el prefijo de bloque en cada línea tocada por la selección.
export function alternarBloque(e: Edicion, tipo: TipoBloque): Edicion {
  const { texto } = e
  const desde = texto.lastIndexOf("\n", e.inicio - 1) + 1
  const finLinea = texto.indexOf("\n", e.fin)
  const hasta = finLinea === -1 ? texto.length : finLinea
  const lineas = texto.slice(desde, hasta).split("\n")
  const quitar = lineas.every((l) => PREFIJO[tipo].test(l))
  const nuevas = lineas.map((l, i) => {
    const limpia = l.replace(PREFIJO.numerada, "").replace(PREFIJO.vinetas, "").replace(PREFIJO.cita, "")
    if (quitar) return limpia
    if (tipo === "numerada") return `${i + 1}. ${limpia}`
    return `${tipo === "vinetas" ? "-" : ">"} ${limpia}`
  })
  const bloque = nuevas.join("\n")
  return {
    texto: texto.slice(0, desde) + bloque + texto.slice(hasta),
    inicio: desde,
    fin: desde + bloque.length,
  }
}

export function alternarBloqueCodigo(e: Edicion): Edicion {
  const { texto, inicio, fin } = e
  const sel = texto.slice(inicio, fin)
  const m = /^```\n([\s\S]*)\n```$/.exec(sel)
  if (m) {
    return { texto: texto.slice(0, inicio) + m[1] + texto.slice(fin), inicio, fin: inicio + m[1].length }
  }
  const bloque = "```\n" + sel + "\n```"
  return {
    texto: texto.slice(0, inicio) + bloque + texto.slice(fin),
    inicio: inicio + 4,
    fin: inicio + 4 + sel.length,
  }
}

// ---- Lectura (para pintar mensajes) ----

export type Segmento =
  | { tipo: "texto"; valor: string }
  | { tipo: "negrita" | "cursiva" | "tachado" | "codigo"; valor: string }
  | { tipo: "enlace"; valor: string; url: string }

const EN_LINEA =
  /\*\*(.+?)\*\*|(?<!\w)_(.+?)_(?!\w)|~(.+?)~|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g

export function segmentosEnLinea(linea: string): Segmento[] {
  const out: Segmento[] = []
  let ultimo = 0
  for (const m of linea.matchAll(EN_LINEA)) {
    if (m.index > ultimo) out.push({ tipo: "texto", valor: linea.slice(ultimo, m.index) })
    if (m[1] != null) out.push({ tipo: "negrita", valor: m[1] })
    else if (m[2] != null) out.push({ tipo: "cursiva", valor: m[2] })
    else if (m[3] != null) out.push({ tipo: "tachado", valor: m[3] })
    else if (m[4] != null) out.push({ tipo: "codigo", valor: m[4] })
    else out.push({ tipo: "enlace", valor: m[5], url: m[6] })
    ultimo = m.index + m[0].length
  }
  if (ultimo < linea.length) out.push({ tipo: "texto", valor: linea.slice(ultimo) })
  return out
}

export type Bloque =
  | { tipo: "parrafo"; lineas: string[] }
  | { tipo: "numerada" | "vinetas" | "cita"; lineas: string[] }
  | { tipo: "codigo"; valor: string }

export function bloques(texto: string): Bloque[] {
  const out: Bloque[] = []
  const lineas = texto.split("\n")
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i]
    if (l.trim() === "```") {
      const cierre = lineas.indexOf("```", i + 1)
      if (cierre !== -1) {
        out.push({ tipo: "codigo", valor: lineas.slice(i + 1, cierre).join("\n") })
        i = cierre
        continue
      }
    }
    const tipo = PREFIJO.numerada.test(l)
      ? "numerada"
      : PREFIJO.vinetas.test(l)
        ? "vinetas"
        : PREFIJO.cita.test(l)
          ? "cita"
          : "parrafo"
    const contenido = tipo === "parrafo" ? l : l.replace(PREFIJO[tipo], "")
    const previo = out.at(-1)
    if (previo && previo.tipo !== "codigo" && previo.tipo === tipo) previo.lineas.push(contenido)
    else out.push({ tipo, lineas: [contenido] })
  }
  return out
}
