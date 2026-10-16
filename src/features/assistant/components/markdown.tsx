import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"

import { esRutaInterna } from "@/features/assistant/lib/acciones-ui"

// Markdown mínimo y seguro para las respuestas del asistente: se arman
// elementos de React (nunca `dangerouslySetInnerHTML`), así que un texto con
// HTML se muestra literal. Cubre lo que produce el modelo: párrafos, títulos,
// listas, **negrita**, *cursiva*, `código` y enlaces. Los enlaces internos
// (`/app/...`) navegan con el router; los externos solo `https:`.

function inline(texto: string, clave: string): ReactNode[] {
  const nodos: ReactNode[] = []
  const patron = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g
  let ultimo = 0
  let i = 0
  for (const match of texto.matchAll(patron)) {
    const token = match[0]
    const inicio = match.index ?? 0
    if (inicio > ultimo) nodos.push(texto.slice(ultimo, inicio))
    const k = `${clave}-${i++}`
    if (token.startsWith("**")) {
      nodos.push(<strong key={k}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith("`")) {
      nodos.push(
        <code key={k} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
          {token.slice(1, -1)}
        </code>,
      )
    } else if (token.startsWith("[")) {
      const [, etiqueta, href] = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token) ?? []
      if (href && esRutaInterna(href)) {
        nodos.push(
          <Link key={k} to={href as never} className="text-primary underline underline-offset-2">
            {etiqueta}
          </Link>,
        )
      } else if (href && /^https:\/\//.test(href)) {
        nodos.push(
          <a key={k} href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
            {etiqueta}
          </a>,
        )
      } else {
        nodos.push(etiqueta ?? token)
      }
    } else {
      nodos.push(<em key={k}>{token.slice(1, -1)}</em>)
    }
    ultimo = inicio + token.length
  }
  if (ultimo < texto.length) nodos.push(texto.slice(ultimo))
  return nodos
}

export function Markdown({ texto }: { texto: string }) {
  const lineas = texto.replace(/\r\n/g, "\n").split("\n")
  const bloques: ReactNode[] = []
  let lista: { ordenada: boolean; items: string[] } | null = null
  let parrafo: string[] = []

  const cerrarParrafo = () => {
    if (parrafo.length === 0) return
    const k = `p-${bloques.length}`
    bloques.push(
      <p key={k} className="whitespace-pre-wrap">
        {inline(parrafo.join("\n"), k)}
      </p>,
    )
    parrafo = []
  }
  const cerrarLista = () => {
    if (!lista) return
    const k = `l-${bloques.length}`
    const items = lista.items.map((item, i) => <li key={i}>{inline(item, `${k}-${i}`)}</li>)
    bloques.push(
      lista.ordenada ? (
        <ol key={k} className="list-decimal space-y-0.5 pl-5">
          {items}
        </ol>
      ) : (
        <ul key={k} className="list-disc space-y-0.5 pl-5">
          {items}
        </ul>
      ),
    )
    lista = null
  }

  for (const linea of lineas) {
    const vineta = /^\s*[-*•]\s+(.*)$/.exec(linea)
    const numerada = /^\s*\d+[.)]\s+(.*)$/.exec(linea)
    const titulo = /^(#{1,4})\s+(.*)$/.exec(linea)
    if (vineta || numerada) {
      cerrarParrafo()
      const ordenada = Boolean(numerada)
      if (lista && lista.ordenada !== ordenada) cerrarLista()
      lista ??= { ordenada, items: [] }
      lista.items.push((vineta ?? numerada)![1])
    } else if (titulo) {
      cerrarParrafo()
      cerrarLista()
      const k = `h-${bloques.length}`
      bloques.push(
        <p key={k} className="font-semibold">
          {inline(titulo[2], k)}
        </p>,
      )
    } else if (linea.trim() === "") {
      cerrarParrafo()
      cerrarLista()
    } else {
      cerrarLista()
      parrafo.push(linea)
    }
  }
  cerrarParrafo()
  cerrarLista()

  return <div className="flex flex-col gap-2 text-sm leading-relaxed">{bloques}</div>
}
