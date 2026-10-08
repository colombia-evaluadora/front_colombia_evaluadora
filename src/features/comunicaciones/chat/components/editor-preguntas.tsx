import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  CaretDownIcon,
  CheckIcon,
  CheckSquareIcon,
  CopyIcon,
  PlusCircleIcon,
  RadioButtonIcon,
  TextAlignLeftIcon,
  TrashIcon,
  YesNoIcon,
  type Icon,
} from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { toDigitsOnly } from "@/lib/text-input"
import { cn } from "@/lib/utils"
import type { TipoPregunta } from "@/features/comunicaciones/chat/api/types"
import { tieneOpciones } from "@/features/comunicaciones/chat/lib/encuesta"
import {
  MIN_OPCIONES,
  conCorrectas,
  duplicarPregunta,
  errorPregunta,
  nuevaPregunta,
  opcion,
  opcionesIniciales,
  type ModoPreguntas,
  type PreguntaLocal,
} from "@/features/comunicaciones/chat/lib/preguntas"

// Editor de preguntas de la encuesta y la evaluación en línea.
const ICONOS: Record<TipoPregunta, Icon> = {
  MULTIPLE: CheckSquareIcon,
  UNICA: RadioButtonIcon,
  REDACCION: TextAlignLeftIcon,
  SI_NO: YesNoIcon,
}

const etiquetaTipo = (tipo: TipoPregunta, modo: ModoPreguntas) =>
  ({
    MULTIPLE: "Selección múltiple",
    UNICA: "Única selección",
    REDACCION: "Redacción",
    SI_NO: modo === "EVALUACION" ? "Verdadero / Falso" : "Sí / No",
  })[tipo]

const TIPOS: TipoPregunta[] = ["MULTIPLE", "UNICA", "REDACCION", "SI_NO"]

export function ListaPreguntas({
  modo,
  preguntas,
  onCambio,
  intentado,
  pie,
}: {
  modo: ModoPreguntas
  preguntas: PreguntaLocal[]
  onCambio: (fn: (ps: PreguntaLocal[]) => PreguntaLocal[]) => void
  intentado: boolean
  pie?: ReactNode
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Agregar preguntas</h3>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button size="icon" aria-label="Agregar pregunta" />}>
            <PlusCircleIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {TIPOS.map((tipo) => (
              <ItemTipo
                key={tipo}
                tipo={tipo}
                modo={modo}
                onClick={() => onCambio((ps) => [...ps, nuevaPregunta(tipo, modo)])}
              />
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ol className="-mx-1 min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-1">
        {preguntas.map((p, i) => (
          <li key={p.clave}>
            <EditorPregunta
              modo={modo}
              numero={i + 1}
              pregunta={p}
              error={intentado ? errorPregunta(p, modo) : null}
              onCambio={(nueva) => onCambio((ps) => ps.map((x) => (x.clave === p.clave ? nueva : x)))}
              onDuplicar={() =>
                onCambio((ps) => {
                  return [...ps.slice(0, i + 1), duplicarPregunta(p), ...ps.slice(i + 1)]
                })
              }
              onEliminar={() => onCambio((ps) => ps.filter((x) => x.clave !== p.clave))}
            />
          </li>
        ))}
      </ol>
      {preguntas.length === 0 && (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          Agrega una pregunta con el botón +.
        </p>
      )}
      {pie}
    </div>
  )
}

const ITEM_MENU = "gap-3 border-b py-2 text-sm last:border-b-0 [&_svg]:size-5!"

function ItemTipo({
  tipo,
  modo,
  onClick,
}: {
  tipo: TipoPregunta
  modo: ModoPreguntas
  onClick: () => void
}) {
  const Icono = ICONOS[tipo]
  return (
    <DropdownMenuItem className={ITEM_MENU} onClick={onClick}>
      <Icono className="text-muted-foreground" />
      {etiquetaTipo(tipo, modo)}
    </DropdownMenuItem>
  )
}

function EditorPregunta({
  modo,
  numero,
  pregunta: p,
  error,
  onCambio,
  onDuplicar,
  onEliminar,
}: {
  modo: ModoPreguntas
  numero: number
  pregunta: PreguntaLocal
  error: string | null
  onCambio: (p: PreguntaLocal) => void
  onDuplicar: () => void
  onEliminar: () => void
}) {
  const Icono = ICONOS[p.tipo]
  const evaluacion = modo === "EVALUACION"
  const marcaCorrectas = conCorrectas(p, modo)
  const unaSola = p.tipo !== "MULTIPLE"
  const fijas = !tieneOpciones(p)

  const cambiarTipo = (tipo: TipoPregunta) => {
    if (tipo === p.tipo) return
    // Entre múltiple y única se conservan las opciones escritas.
    const opciones =
      tieneOpciones(p) && tieneOpciones({ tipo })
        ? p.opciones.map((o) => ({ ...o, correcta: false }))
        : opcionesIniciales(tipo, modo)
    onCambio({ ...p, tipo, opciones })
  }

  const marcar = (clave: number) =>
    onCambio({
      ...p,
      opciones: p.opciones.map((o) =>
        o.clave === clave ? { ...o, correcta: !o.correcta } : unaSola ? { ...o, correcta: false } : o,
      ),
    })

  return (
    <section
      aria-label={`Pregunta ${numero}`}
      className={cn("overflow-hidden rounded-xl border bg-card", error && "border-red")}
    >
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border px-2.5 text-sm hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none sm:max-w-60">
            <Icono aria-hidden className="size-5 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate text-left">{etiquetaTipo(p.tipo, modo)}</span>
            <CaretDownIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {TIPOS.map((tipo) => (
              <ItemTipo key={tipo} tipo={tipo} modo={modo} onClick={() => cambiarTipo(tipo)} />
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="ml-auto flex items-center gap-1">
          {evaluacion && (
            <label className="mr-2 flex items-center gap-2 text-xs text-muted-foreground">
              Puntuación
              <input
                inputMode="numeric"
                value={p.puntos}
                onChange={(e) => onCambio({ ...p, puntos: toDigitsOnly(e.target.value, 3) })}
                className="h-7 w-10 rounded-md border bg-background text-center text-sm text-foreground tabular-nums focus-visible:border-primary focus-visible:outline-none"
              />
            </label>
          )}
          <BotonIcono etiqueta={`Duplicar pregunta ${numero}`} onClick={onDuplicar}>
            <CopyIcon className="size-5" />
          </BotonIcono>
          <BotonIcono etiqueta={`Eliminar pregunta ${numero}`} onClick={onEliminar} peligro>
            <TrashIcon className="size-5" />
          </BotonIcono>
        </div>
      </div>

      <div className="space-y-3 p-3">
        <CampoBorde etiqueta={`Pregunta ${numero}`}>
          <Input
            value={p.texto}
            maxLength={200}
            placeholder="Escribe la pregunta"
            onChange={(e) => onCambio({ ...p, texto: e.target.value })}
            className="h-auto border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </CampoBorde>

        {p.tipo === "SI_NO" && !evaluacion && (
          <div className="flex gap-6 px-1 text-sm text-muted-foreground">
            {["Sí", "No"].map((o) => (
              <span key={o} className="flex items-center gap-2">
                <span aria-hidden className="size-4 rounded-full border" />
                {o}
              </span>
            ))}
          </div>
        )}

        {p.opciones.map((o, j) => (
          <CampoBorde
            key={o.clave}
            etiqueta={`Opción ${j + 1}`}
            className={cn(o.correcta && "border-green bg-green-22/40")}
          >
            {marcaCorrectas ? (
              <button
                type="button"
                aria-pressed={o.correcta}
                aria-label={`Marcar opción ${j + 1} como correcta`}
                title={o.correcta ? "Respuesta correcta" : "Marcar como correcta"}
                onClick={() => marcar(o.clave)}
                className={cn(
                  "grid size-5 shrink-0 place-items-center border text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                  unaSola ? "rounded-full" : "rounded-sm",
                  o.correcta ? "border-green bg-green" : "hover:border-primary",
                )}
              >
                {o.correcta && <CheckIcon className="size-3.5" />}
              </button>
            ) : (
              <span
                aria-hidden
                className={cn("size-4 shrink-0 border", unaSola ? "rounded-full" : "rounded-sm")}
              />
            )}
            {fijas ? (
              <span className="flex-1 py-1 text-sm">{o.texto}</span>
            ) : (
              <Input
                value={o.texto}
                maxLength={120}
                placeholder="Escribe la opción"
                aria-label={`Opción ${j + 1} de la pregunta ${numero}`}
                onChange={(e) =>
                  onCambio({
                    ...p,
                    opciones: p.opciones.map((x) =>
                      x.clave === o.clave ? { ...x, texto: e.target.value } : x,
                    ),
                  })
                }
                className="h-auto flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
            )}
            {!fijas && j >= MIN_OPCIONES && (
              <BotonIcono
                etiqueta={`Eliminar opción ${j + 1}`}
                peligro
                onClick={() =>
                  onCambio({ ...p, opciones: p.opciones.filter((x) => x.clave !== o.clave) })
                }
              >
                <TrashIcon className="size-5" />
              </BotonIcono>
            )}
          </CampoBorde>
        ))}

        {tieneOpciones(p) && (
          <button
            type="button"
            onClick={() => onCambio({ ...p, opciones: [...p.opciones, opcion()] })}
            className="flex items-center gap-1.5 rounded px-1 text-xs font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <PlusCircleIcon aria-hidden className="size-4" />
            Añadir opción
          </button>
        )}

        {marcaCorrectas && !error && (
          <p className="text-xs text-muted-foreground">
            {unaSola
              ? "Marca la respuesta correcta."
              : "Marca todas las respuestas correctas."}
          </p>
        )}
        {error && (
          <p role="alert" className="text-xs text-red">
            {error}
          </p>
        )}
      </div>
    </section>
  )
}

// Marco con la etiqueta sobre el borde, igual que los campos "outlined".
function CampoBorde({
  etiqueta,
  className,
  children,
}: {
  etiqueta: string
  className?: string
  children: ReactNode
}) {
  return (
    <label
      className={cn(
        "relative flex items-center gap-3 rounded-lg border px-4 pt-3 pb-2 focus-within:border-primary",
        className,
      )}
    >
      <span className="absolute -top-2.5 left-3 bg-card px-1 text-sm font-medium">{etiqueta}</span>
      {children}
    </label>
  )
}

function BotonIcono({
  etiqueta,
  onClick,
  peligro,
  children,
}: {
  etiqueta: string
  onClick: () => void
  peligro?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      onClick={onClick}
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
        peligro ? "hover:text-red" : "hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}
