import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { useParticipantesQuery } from "@/features/comunicaciones/espacios/api/query/use-espacios-query"
import {
  useEquiposQuery,
  useGuardarEquipo,
  type Equipo,
} from "@/features/comunicaciones/espacios/api/query/use-foro-equipos-query"
import type { EspacioDetalle } from "@/features/comunicaciones/espacios/api/types"
import { ChatEspacio } from "@/features/comunicaciones/espacios/components/chat-espacio"
import { ForoEspacio } from "@/features/comunicaciones/espacios/components/foro-espacio"

function DialogoEquipo({
  espacioId,
  equipo,
  equipos,
  onCerrar,
}: {
  espacioId: number
  equipo: Equipo | null
  equipos: Equipo[]
  onCerrar: () => void
}) {
  const { notify } = useNotify()
  const { data: participantes = [] } = useParticipantesQuery(espacioId, null)
  const guardar = useGuardarEquipo(espacioId)
  const [nombre, setNombre] = useState(equipo?.nombre ?? "")
  const [miembros, setMiembros] = useState<number[]>(equipo?.miembros.map((m) => m.usuarioId) ?? [])
  const estudiantes = participantes.filter((p) => p.rol === "ESTUDIANTE")
  const equipoDe = (usuario: number) =>
    equipos.find((q) => q.id !== equipo?.id && q.miembros.some((m) => m.usuarioId === usuario))
  const originales = equipo?.miembros.map((m) => m.usuarioId) ?? []
  const salen = originales.some((u) => !miembros.includes(u))
  const seMueven = miembros.some((u) => equipoDe(u))

  return (
    <Dialog open onOpenChange={(o) => !o && !guardar.isPending && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{equipo ? `Editar ${equipo.nombre}` : "Nuevo equipo"}</DialogTitle>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="nombre-equipo">Nombre</FieldLabel>
          <Input id="nombre-equipo" maxLength={80} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Field>
        <fieldset className="max-h-64 space-y-1 overflow-y-auto">
          <legend className="mb-1 text-sm font-medium">Estudiantes</legend>
          {estudiantes.map((s) => {
            const otro = equipoDe(s.usuarioId)
            return (
              <label key={s.usuarioId} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={miembros.includes(s.usuarioId)}
                  onCheckedChange={(marcado) =>
                    setMiembros(marcado ? [...miembros, s.usuarioId] : miembros.filter((u) => u !== s.usuarioId))
                  }
                />
                {s.nombre}
                {otro && <span className="text-xs text-muted-foreground">({otro.nombre})</span>}
              </label>
            )
          })}
        </fieldset>
        {(salen || seMueven) && (
          <p role="alert" className="rounded-md bg-yellow-22 p-2 text-sm">
            Quien sale de un equipo pierde el acceso a su contenido exclusivo, aunque sus aportaciones se conservan.
            Quien entra ve el historial del equipo. Cada estudiante queda en un solo equipo.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" color="neutral" disabled={guardar.isPending} onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            disabled={!nombre.trim() || guardar.isPending}
            onClick={() =>
              guardar.mutate(
                { equipo: equipo?.id ?? null, nombre: nombre.trim(), miembros },
                {
                  onSuccess: onCerrar,
                  onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
                },
              )
            }
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Equipos supervisados (Sección 5.5): solo el docente los crea; cada integrante ve el suyo. */
export function EquiposEspacio({ detalle }: { detalle: EspacioDetalle }) {
  const id = detalle.espacio.id
  const { data: equipos = [], isPending, isError } = useEquiposQuery(id)
  const [editando, setEditando] = useState<Equipo | "nuevo" | null>(null)
  const [abierto, setAbierto] = useState<number | null>(null)
  const { herramientas, puedeAdministrar, puedeEscribir } = detalle
  const gestiona = puedeAdministrar && herramientas.includes("EQUIPOS")

  if (isPending) return <Skeleton className="h-40 w-full" />
  if (isError) return <p className="text-sm text-red">No se pudieron cargar los equipos.</p>

  return (
    <div className="space-y-3">
      {gestiona && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setEditando("nuevo")}>
            + Nuevo equipo
          </Button>
        </div>
      )}
      {equipos.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {detalle.espacio.rol === "ESTUDIANTE" ? "No estás en ningún equipo." : "Todavía no hay equipos."}
        </p>
      )}
      <ul className="space-y-2">
        {equipos.map((q) => (
          <li key={q.id} className="space-y-2 rounded-md border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{q.nombre}</p>
                <p className="text-sm text-muted-foreground">
                  {q.miembros.map((m) => m.nombre).join(", ") || "Sin integrantes"}
                </p>
              </div>
              <span className="flex gap-2">
                {gestiona && (
                  <Button variant="outline" color="neutral" size="sm" onClick={() => setEditando(q)}>
                    Editar
                  </Button>
                )}
                <Button
                  variant="outline"
                  color="neutral"
                  size="sm"
                  aria-expanded={abierto === q.id}
                  onClick={() => setAbierto(abierto === q.id ? null : q.id)}
                >
                  {abierto === q.id ? "Cerrar" : "Abrir"}
                </Button>
              </span>
            </div>
            {abierto === q.id && (
              <div className="space-y-4 border-t pt-3">
                <section>
                  <h4 className="mb-2 text-sm font-medium">Conversación del equipo</h4>
                  <ChatEspacio detalle={detalle} equipo={q.id} puedeEscribir={puedeEscribir && herramientas.includes("CHAT")} />
                </section>
                <section>
                  <h4 className="mb-2 text-sm font-medium">Temas del equipo</h4>
                  <ForoEspacio detalle={detalle} equipo={q.id} puedeEscribir={puedeEscribir && herramientas.includes("FORO")} />
                </section>
              </div>
            )}
          </li>
        ))}
      </ul>
      {editando && (
        <DialogoEquipo
          espacioId={id}
          equipo={editando === "nuevo" ? null : editando}
          equipos={equipos}
          onCerrar={() => setEditando(null)}
        />
      )}
    </div>
  )
}
