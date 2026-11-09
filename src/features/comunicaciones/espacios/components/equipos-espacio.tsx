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

/**
 * Mover a un estudiante entre equipos (M.3.HER.3). No hay endpoint propio de "mover": se reusa el PUT
 * de equipo (reemplazo de MIEMBROS), primero sacándolo del equipo de origen y luego sumándolo al
 * destino, porque cada estudiante está en un equipo como máximo.
 */
function DialogoMover({
  espacioId,
  estudiante,
  origen,
  equipos,
  onCerrar,
}: {
  espacioId: number
  estudiante: Integrante
  origen: Equipo | null
  equipos: Equipo[]
  onCerrar: () => void
}) {
  const { notify } = useNotify()
  const guardar = useGuardarEquipo(espacioId)
  const destinos = equipos.filter((q) => q.id !== origen?.id)
  const [destinoId, setDestinoId] = useState<number | null>(destinos.length === 1 ? destinos[0].id : null)
  const destino = destinos.find((q) => q.id === destinoId) ?? null
  const ids = (q: Equipo) => q.miembros.map((m) => m.usuarioId)

  const confirmar = async () => {
    if (!destino) return
    try {
      if (origen) {
        await guardar.mutateAsync({
          equipo: origen.id,
          nombre: origen.nombre,
          miembros: ids(origen).filter((u) => u !== estudiante.usuarioId),
        })
      }
      await guardar.mutateAsync({
        equipo: destino.id,
        nombre: destino.nombre,
        miembros: [...ids(destino), estudiante.usuarioId],
      })
      onCerrar()
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !guardar.isPending && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {destino ? `Mover a ${estudiante.nombre} al ${destino.nombre}` : `Mover a ${estudiante.nombre}`}
          </DialogTitle>
        </DialogHeader>
        {destinos.length > 1 && (
          <fieldset className="space-y-1">
            <legend className="mb-1 text-sm font-medium">Equipo de destino</legend>
            {destinos.map((q) => (
              <label key={q.id} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="destino-equipo"
                  checked={destinoId === q.id}
                  onChange={() => setDestinoId(q.id)}
                />
                {q.nombre}
              </label>
            ))}
          </fieldset>
        )}
        {destino && (
          <p className="text-sm">
            Verá el historial del {destino.nombre}
            {origen ? ` y perderá el acceso al contenido exclusivo del ${origen.nombre}` : ""}. Sus aportaciones
            anteriores se conservan.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" color="neutral" disabled={guardar.isPending} onClick={onCerrar}>
            Cancelar
          </Button>
          <Button disabled={!destino || guardar.isPending} onClick={confirmar}>
            Confirmar cambio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface Integrante {
  usuarioId: number
  nombre: string
}

/** Equipos supervisados (Sección 5.5): solo el docente los crea; cada integrante ve el suyo. */
export function EquiposEspacio({ detalle }: { detalle: EspacioDetalle }) {
  const id = detalle.espacio.id
  const { data: equipos = [], isPending, isError } = useEquiposQuery(id)
  const { espacio, herramientas, puedeAdministrar, puedeEscribir } = detalle
  const gestiona = puedeAdministrar && herramientas.includes("EQUIPOS")
  // Participantes solo para el docente: "Sin equipo" es información de gestión.
  const { data: participantes = [] } = useParticipantesQuery(id, null, gestiona)
  const [editando, setEditando] = useState<Equipo | "nuevo" | null>(null)
  const [abierto, setAbierto] = useState<number | null>(null)
  const [moviendo, setMoviendo] = useState<{ estudiante: Integrante; origen: Equipo | null } | null>(null)
  const conEquipo = new Set(equipos.flatMap((q) => q.miembros.map((m) => m.usuarioId)))
  const sinEquipo = participantes.filter((p) => p.rol === "ESTUDIANTE" && !conEquipo.has(p.usuarioId))

  if (isPending) return <Skeleton className="h-40 w-full" />
  if (isError) return <p className="text-sm text-red">No se pudieron cargar los equipos.</p>

  const integrantes = (lista: Integrante[], origen: Equipo | null) =>
    lista.map((m, i) => (
      <span key={m.usuarioId} className="inline-flex items-center">
        {i > 0 && "· "}
        {m.nombre}
        {gestiona && equipos.some((q) => q.id !== origen?.id) && (
          <Button
            variant="link"
            size="sm"
            aria-label={`Mover a ${m.nombre}`}
            onClick={() => setMoviendo({ estudiante: m, origen })}
          >
            Mover
          </Button>
        )}
      </span>
    ))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium">
          {["Equipos de trabajo", espacio.grupo, espacio.asignatura].filter(Boolean).join(" · ")}
        </h2>
        {gestiona && (
          <Button size="sm" onClick={() => setEditando("nuevo")}>
            Nuevo equipo
          </Button>
        )}
      </div>
      {equipos.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {espacio.rol === "ESTUDIANTE" ? "No estás en ningún equipo." : "Todavía no hay equipos."}
        </p>
      )}
      <ul className="space-y-2">
        {equipos.map((q) => (
          <li key={q.id} className="space-y-2 rounded-md border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">
                  {q.nombre} ({q.miembros.length})
                </p>
                <p className="flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground">
                  {q.miembros.length === 0 ? "Sin integrantes" : integrantes(q.miembros, q)}
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
        {gestiona && sinEquipo.length > 0 && (
          <li className="flex flex-wrap items-center gap-x-1 rounded-md border border-dashed p-3 text-sm">
            <span className="font-medium">Sin equipo ({sinEquipo.length}):</span>
            <span className="flex flex-wrap items-center gap-x-1 text-muted-foreground">
              {integrantes(sinEquipo, null)}
            </span>
          </li>
        )}
      </ul>
      {editando && (
        <DialogoEquipo
          espacioId={id}
          equipo={editando === "nuevo" ? null : editando}
          equipos={equipos}
          onCerrar={() => setEditando(null)}
        />
      )}
      {moviendo && (
        <DialogoMover
          espacioId={id}
          estudiante={moviendo.estudiante}
          origen={moviendo.origen}
          equipos={equipos}
          onCerrar={() => setMoviendo(null)}
        />
      )}
    </div>
  )
}
