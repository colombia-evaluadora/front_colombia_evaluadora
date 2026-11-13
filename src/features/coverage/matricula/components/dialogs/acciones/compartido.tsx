import { useState, type ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { ArrowRightIcon, InfoIcon, ListChecksIcon, WarningCircleIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

import type { Emparejamiento, EmparejamientoElegido, ResultadoLote } from "@/features/coverage/matricula/api/acciones-lote"
import { resumirLote } from "@/features/coverage/matricula/api/acciones-lote"
import type { Matricula } from "@/features/coverage/matricula/api/types/matricula"
import { MatriculaStatusBadge } from "@/features/coverage/matricula/components/table/columns-matricula"
import { useMatriculaGradeLabel } from "@/features/coverage/matricula/hooks/use-matricula-grade-label"

// Piezas comunes de los modales de acción de fila y de lote (C.1.LOT).

export const nombreDe = (m: Matricula) => `${m.firstName} ${m.lastName}`

/** «Retirar — Laura Gil Santos» o «Retirar 12 estudiantes». */
export const tituloAccion = (accion: string, matriculas: Matricula[]) =>
  matriculas.length === 1 ? `${accion} — ${nombreDe(matriculas[0])}` : `${accion} ${matriculas.length} estudiantes`

/** Debajo del título: la matrícula (una) o la lista plegable (lote). */
export function MatriculasAfectadas({ matriculas, extra }: { matriculas: Matricula[]; extra?: ReactNode }) {
  const gradeLabel = useMatriculaGradeLabel()
  const [verTodos, setVerTodos] = useState(false)
  if (matriculas.length === 1) {
    const m = matriculas[0]
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span>Matrícula: {[m.campus, m.shift, gradeLabel(m.grade), m.group].filter(Boolean).join(" · ")}</span>
        <MatriculaStatusBadge status={m.status} />
        {extra}
      </div>
    )
  }
  const visibles = verTodos ? matriculas : matriculas.slice(0, 4)
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm">
      {visibles.map((m) => (
        <Badge key={m.id} variant="soft" color="neutral" className="rounded-full text-xs font-medium tracking-normal">
          {nombreDe(m)} · {m.group}
        </Badge>
      ))}
      {matriculas.length > 4 ? (
        <button
          type="button"
          className="rounded-xs text-xs font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          onClick={() => setVerTodos((v) => !v)}
        >
          {verTodos ? "Ver menos" : `y ${matriculas.length - 4} más`}
        </button>
      ) : null}
      {extra}
    </div>
  )
}

export function BadgeComplementaria() {
  return (
    <Badge variant="soft" color="info" className="rounded-full text-xs font-medium tracking-normal">
      Con matrícula complementaria
    </Badge>
  )
}

/** Aviso amarillo (consecuencia) o azul (información), como en los prototipos. */
export function Aviso({
  tono,
  titulo,
  children,
  className,
}: {
  tono: "advertencia" | "info"
  titulo?: ReactNode
  children?: ReactNode
  className?: string
}) {
  const Icon = tono === "advertencia" ? WarningCircleIcon : InfoIcon
  return (
    <div
      role="note"
      className={cn(
        "flex gap-3 rounded-md border px-4 py-3 text-sm",
        tono === "advertencia" ? "border-yellow-stroke bg-yellow-22" : "border-blue-stroke bg-blue-22",
        className,
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", tono === "advertencia" ? "text-yellow" : "text-blue")} aria-hidden />
      <div className="flex flex-col gap-1">
        {titulo ? <p className="font-medium">{titulo}</p> : null}
        {children ? <div>{children}</div> : null}
      </div>
    </div>
  )
}

export function Resumen({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-md border border-border bg-muted/40 px-4 py-3 text-sm">
      <ListChecksIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <p>
        <span className="font-semibold">Resumen:</span> {children}
      </p>
    </div>
  )
}

export function EstadoBadge({ children, color }: { children: ReactNode; color: "success" | "muted" | "warning" }) {
  return (
    <Badge
      variant={color === "muted" ? "outline" : "soft"}
      color={color}
      className="mx-0.5 rounded-full align-middle text-xs font-medium tracking-normal"
    >
      {children}
    </Badge>
  )
}

export interface OpcionSelect {
  value: string
  label: string
}

/** Select con etiqueta sobre el borde (estilo outlined de la app). */
export function CampoSelect({
  id,
  label,
  required,
  value,
  onChange,
  opciones,
  descripcion,
  invalido,
  disabled,
  placeholder = "Seleccione",
  className,
}: {
  id: string
  label?: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  opciones: OpcionSelect[]
  descripcion?: ReactNode
  invalido?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
}) {
  const items = Object.fromEntries(opciones.map((o) => [o.value, o.label]))
  return (
    <Field variant="outlined" className={cn("min-w-0 gap-1.5", className)} data-invalid={invalido || undefined}>
      {label ? (
        <FieldLabel htmlFor={id}>
          {label}
          {required ? <span data-required-mark="">*</span> : null}
        </FieldLabel>
      ) : null}
      <ComboboxField items={items} value={value} onValueChange={(next) => onChange(next ? String(next) : "")} disabled={disabled}>
        <ComboboxFieldTrigger id={id} size="sm" variant="outlined" className="w-full" aria-invalid={invalido} aria-label={label ? undefined : placeholder}>
          <ComboboxFieldValue placeholder={placeholder} />
        </ComboboxFieldTrigger>
        <ComboboxFieldContent>
          {opciones.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">No hay opciones.</p>
          ) : (
            opciones.map((o) => (
              <ComboboxFieldItem key={o.value} value={o.value} title={o.label}>
                {o.label}
              </ComboboxFieldItem>
            ))
          )}
        </ComboboxFieldContent>
      </ComboboxField>
      {descripcion ? <FieldDescription className={cn(invalido && "text-red")}>{descripcion}</FieldDescription> : null}
    </Field>
  )
}

export const elegidoInicial = (e: Emparejamiento): EmparejamientoElegido => ({
  periodos: Object.fromEntries(e.periodos.map((p) => [p.origen, p.destino])),
  asignaturas: Object.fromEntries(
    e.asignaturas.filter((a) => a.estado === "EMPAREJADA" && a.origen).map((a) => [a.origen as string, a.destino ?? ""]),
  ),
})

function Fila({ origen, children }: { origen: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,10rem)_auto_minmax(0,14rem)] items-center gap-3 text-sm">
      <span className="truncate text-right">{origen}</span>
      <ArrowRightIcon className="size-4 text-muted-foreground" aria-hidden />
      {children}
    </div>
  )
}

/** Emparejamiento de notas: períodos y asignaturas origen → destino, ajustable. */
export function EmparejamientoNotas({
  idBase,
  emparejamiento,
  elegido,
  onChange,
  tituloPeriodos = "Períodos de evaluación",
  tituloAsignaturas = "Asignaturas",
}: {
  idBase: string
  emparejamiento: Emparejamiento
  elegido: EmparejamientoElegido
  onChange: (e: EmparejamientoElegido) => void
  tituloPeriodos?: string
  tituloAsignaturas?: string
}) {
  return (
    <div className="flex flex-col gap-4 rounded-md border border-border p-4">
      <section className="flex flex-col gap-2" aria-label={tituloPeriodos}>
        <h3 className="text-xs font-semibold text-muted-foreground">{tituloPeriodos}</h3>
        {emparejamiento.periodos.map((p) => (
          <Fila key={p.origen} origen={p.enCurso != null ? `${p.origen} (en curso, ${p.enCurso} %)` : p.origen}>
            <CampoSelect
              id={`${idBase}-periodo-${p.origen}`}
              value={elegido.periodos[p.origen] ?? ""}
              onChange={(v) => onChange({ ...elegido, periodos: { ...elegido.periodos, [p.origen]: v } })}
              opciones={p.opciones.map((o) => ({ value: o, label: o }))}
              placeholder={`Destino de ${p.origen}`}
            />
          </Fila>
        ))}
      </section>
      <hr className="border-border" />
      <section className="flex flex-col gap-2" aria-label={tituloAsignaturas}>
        <h3 className="text-xs font-semibold text-muted-foreground">{tituloAsignaturas}</h3>
        {emparejamiento.asignaturas.map((a) =>
          a.estado === "EMPAREJADA" && a.origen ? (
            <Fila key={a.origen} origen={a.origen}>
              <CampoSelect
                id={`${idBase}-asig-${a.origen}`}
                value={elegido.asignaturas[a.origen] ?? ""}
                onChange={(v) =>
                  onChange({ ...elegido, asignaturas: { ...elegido.asignaturas, [a.origen as string]: v } })
                }
                opciones={a.opciones.map((o) => ({ value: o, label: o }))}
                placeholder={`Destino de ${a.origen}`}
              />
            </Fila>
          ) : a.estado === "PENDIENTE_NIVELACION" ? (
            <Fila key={`n-${a.destino}`} origen={<span className="text-muted-foreground">—</span>}>
              <span className="flex items-center gap-2 font-semibold">
                {a.destino}
                <EstadoBadge color="warning">Pendiente por nivelación</EstadoBadge>
              </span>
            </Fila>
          ) : (
            <Fila key={`h-${a.origen}`} origen={a.origen}>
              <span className="flex items-center gap-2 text-muted-foreground">
                —<EstadoBadge color="muted">Solo historial</EstadoBadge>
              </span>
            </Fila>
          ),
        )}
      </section>
      {emparejamiento.escalaDistinta ? (
        <Aviso tono="info">Escala distinta: cada definitiva se convierte con la nota equivalente de la escala del origen.</Aviso>
      ) : null}
    </div>
  )
}

export const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

/** Texto del resumen del emparejamiento, como en el prototipo. */
export function textoEmparejamiento(e: Emparejamiento) {
  const pendientes = e.asignaturas.filter((a) => a.estado === "PENDIENTE_NIVELACION").length
  const enCurso = e.periodos.find((p) => p.enCurso != null)
  return [
    `${plural(e.periodos.length, "período homologado", "períodos homologados")}`,
    enCurso ? `${enCurso.origen} combina la nota parcial (${enCurso.enCurso} %) con las del grupo nuevo` : null,
    pendientes
      ? `${plural(pendientes, "asignatura pendiente", "asignaturas pendientes")} por nivelación`
      : "todas las asignaturas con equivalente",
  ]
    .filter(Boolean)
    .join(" · ")
}

/** Mensaje de cierre de un lote: éxito, parcial o falla total. */
export function mensajeLote(resultados: ResultadoLote[], exito: (n: number) => string) {
  const { ok, fallidas } = resumirLote(resultados)
  if (fallidas.length === 0) return { variant: "success" as const, texto: exito(ok) }
  const detalle = fallidas.map((f) => f.mensaje).join(" ")
  if (ok === 0) return { variant: "error" as const, texto: detalle }
  return { variant: "warning" as const, texto: `${exito(ok)} No se aplicó a ${fallidas.length}: ${detalle}` }
}
