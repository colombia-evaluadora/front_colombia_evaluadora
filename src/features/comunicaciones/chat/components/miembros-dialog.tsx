import { useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarBadge, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PlusIcon, ProhibitIcon, StarIcon, XIcon } from "@/components/ui/icons"
import { Badge } from "@/components/ui/badge"
import { EtiquetaInvitacion } from "@/features/comunicaciones/chat/components/crear-chat-dialog"
import { ArchivoImage } from "@/features/files/components/archivo-image"
import { resumenModo } from "@/features/comunicaciones/chat/lib/modo-grupo"
import { Skeleton } from "@/components/ui/skeleton"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import type { Conversacion, Miembro, Persona } from "@/features/comunicaciones/chat/api/types"
import { useMiembrosQuery } from "@/features/comunicaciones/chat/api/query/use-miembros-query"
import { coincidePersona, usePersonasQuery } from "@/features/comunicaciones/chat/api/query/use-personas-query"
import {
  useAgregarMiembros,
  useBloquearMiembro,
  useCambiarRolMiembro,
  useEliminarMiembro,
} from "@/features/comunicaciones/chat/api/mutations/use-acciones-miembro"
import { SelectorChips } from "@/features/comunicaciones/chat/components/selector-chips"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useChatAccess } from "@/features/comunicaciones/chat/api/use-chat-access"
import { puedeAgregarParticipantes, puedeNombrarAdministradores } from "@/features/comunicaciones/chat/lib/politica-chat"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { iniciales } from "@/features/comunicaciones/chat/lib/chat-format"
import type { ResolucionSeleccion } from "@/features/comunicaciones/chat/api/types"
import { useAgregarMiembrosMasivo } from "@/features/comunicaciones/chat/api/mutations/use-acciones-miembro"
import { useResolverSeleccion } from "@/features/comunicaciones/chat/api/query/use-seleccion-grupal-query"
import { SelectorGrupal } from "@/features/comunicaciones/chat/components/selector-grupal"
import { ConfirmarAltaDialog } from "@/features/comunicaciones/chat/components/confirmar-alta-dialog"
import {
  aCuerpoSeleccion,
  haySeleccionGrupal,
  resumenSeleccion,
  SELECCION_VACIA,
  type SeleccionGrupal,
} from "@/features/comunicaciones/chat/lib/seleccion-grupal"

const POR_PAGINA = 6

const ACCION =
  "grid size-8 place-items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-50"

// Participantes del grupo o foro. Solo quien administra (`esAdmin`) añade, bloquea y quita; los
// demás ven la lista. Un grupo lo gestiona solo quien lo creó (sin sucesión: si sale, nadie lo gestiona) y no se
// nombran administradores adicionales (decisión de Natalia, `politica.grupos.administradoresAdicionales`);
// en un grupo se agrega también por grado, grupo académico o rol, con confirmación del conteo.
export function MiembrosDialog({
  conversacion: c,
  open,
  onClose,
}: {
  conversacion: Conversacion
  open: boolean
  onClose: () => void
}) {
  const [seleccion, setSeleccion] = useState<Persona[]>([])
  // Quitar: uno (botón ✕ de la fila) o varios (casillas + "Quitar seleccionados").
  const [porEliminar, setPorEliminar] = useState<Miembro[]>([])
  const [marcados, setMarcados] = useState<Set<number>>(new Set())
  const [quitando, setQuitando] = useState(false)
  const [pagina, setPagina] = useState(0)
  const miembros = useMiembrosQuery(open ? c.id : undefined)
  const [consulta, setConsulta] = useState("")
  const esGrupo = c.tipo === "GRUPO"
  const personas = usePersonasQuery(open, consulta, { paraGrupo: esGrupo })
  const delServidor = !personas.isPlaceholderData && consulta.trim().length >= 2
  const deBusqueda = new Set(delServidor ? (personas.data ?? []).map((p) => p.id) : [])
  const agregar = useAgregarMiembros(c.id)
  const agregarMasivo = useAgregarMiembrosMasivo(c.id)
  const resolver = useResolverSeleccion()
  const [grupal, setGrupal] = useState<SeleccionGrupal>(SELECCION_VACIA)
  const [confirmacion, setConfirmacion] = useState<ResolucionSeleccion | null>(null)
  const bloquear = useBloquearMiembro(c.id)
  const eliminar = useEliminarMiembro(c.id)
  const rol = useCambiarRolMiembro(c.id)
  const error =
    agregar.error ?? agregarMasivo.error ?? resolver.error ?? bloquear.error ?? eliminar.error ?? rol.error
  const esAdmin = c.esAdmin ?? !!c.esCreador
  const { politica } = useChatAccess()
  const { user } = useAuth()
  // Con `comms.politica.grupos.agregar=TODOS` cualquier miembro de un grupo añade participantes.
  const puedeAgregar = puedeAgregarParticipantes(politica, { tipo: c.tipo, esAdmin })
  // En un grupo no hay "Hacer administrador" salvo que la política lo permita.
  const nombraAdmins = puedeNombrarAdministradores(politica, c.tipo)
  const conGrupal = esGrupo && haySeleccionGrupal(grupal)
  const agregando = agregar.isPending || agregarMasivo.isPending || resolver.isPending
  const limpiarAlta = () => {
    setSeleccion([])
    setGrupal(SELECCION_VACIA)
    setConfirmacion(null)
  }
  const onAgregar = () => {
    if (!conGrupal) {
      agregar.mutate(
        seleccion.map((p) => p.id),
        { onSuccess: () => setSeleccion([]) },
      )
      return
    }
    resolver.mutate(
      { cuerpo: aCuerpoSeleccion(grupal, seleccion), conversacionId: c.id },
      { onSuccess: setConfirmacion },
    )
  }
  // "grupo" o "foro" en los textos (los CANAL del chat se llaman foros).
  const donde = c.tipo === "GRUPO" ? "grupo" : "foro"

  const todos = miembros.data ?? []
  // Invitaciones (acudientes): solo las ve quien gestiona; no son miembros ni cuentan.
  const invitados = new Map(todos.filter((m) => m.estado && m.estado !== "ACTIVO").map((m) => [m.id, m.estado]))
  // Buscar en la lista de participantes (diseño 4567:68583), para todos los miembros.
  const [filtro, setFiltro] = useState("")
  const f = filtro.trim()
  const lista = f ? todos.filter((m) => coincidePersona({ id: m.id, nombre: m.nombre, correo: "" }, f, false)) : todos
  const enGrupo = new Set(todos.map((m) => m.id))
  // El buscador sugiere a todo el colegio e indica quién ya está en el canal.
  const sugerencias: Persona[] = [
    ...(personas.data ?? []),
    ...todos
      .filter((m) => !personas.data?.some((p) => p.id === m.id))
      .map((m) => ({ id: m.id, nombre: m.nombre, correo: "" })),
  ]
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA))
  const actual = Math.min(pagina, paginas - 1)
  const visibles = lista.slice(actual * POR_PAGINA, (actual + 1) * POR_PAGINA)

  const cerrar = () => {
    if (agregarMasivo.isPending) return
    limpiarAlta()
    setConsulta("")
    setFiltro("")
    setPagina(0)
    setMarcados(new Set())
    onClose()
  }

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="truncate">
            {puedeAgregar ? `Añadir personas a ${c.nombre}` : `Participantes de ${c.nombre}`}
          </DialogTitle>
        </DialogHeader>

        {esGrupo && (c.imagenArchivoId != null || c.descripcion || resumenModo(c)) && (
          <section aria-label="Información del grupo" className="flex items-start gap-3 rounded-lg bg-muted/40 p-3">
            {c.imagenArchivoId != null && (
              <ArchivoImage
                archivoId={c.imagenArchivoId}
                alt={`Imagen de ${c.nombre}`}
                className="size-14 shrink-0 rounded-lg object-cover"
              />
            )}
            <div className="min-w-0 space-y-1 text-sm">
              {c.descripcion && <p className="whitespace-pre-line">{c.descripcion}</p>}
              <p className="text-muted-foreground">Quién escribe: {resumenModo(c) ?? "todos los miembros"}</p>
            </div>
          </section>
        )}

        {puedeAgregar && (
        <div className="flex items-start gap-2">
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute -top-2.5 left-3 z-10 bg-popover px-1 text-sm font-medium">
              Buscar
            </span>
            <SelectorChips
              items={sugerencias}
              value={seleccion}
              onChange={setSeleccion}
              getId={(p) => p.id}
              getLabel={(p) => p.nombre}
              filtrar={(p, t) => coincidePersona(p, t, deBusqueda.has(p.id))}
              onConsulta={setConsulta}
              cargando={personas.isPending}
              autoFocus
              ariaLabel="Buscar personas para añadir"
              placeholder="P. ej.: Natalia o pedro@iesimonbolivar.edu.co"
              vacio={null}
              soloConConsulta
              // Quien rechazó la invitación se puede volver a invitar.
              deshabilitado={(p) => enGrupo.has(p.id) && invitados.get(p.id) !== "RECHAZADO"}
              renderItem={(p) => (
                <span className="flex items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{p.nombre}</span>
                    {p.correo && <span className="block truncate text-xs text-muted-foreground">{p.correo}</span>}
                  </span>
                  {invitados.get(p.id) === "INVITADO" ? (
                    <span className="shrink-0 rounded-full bg-blue-22 px-2 py-0.5 text-xs text-blue">Invitación pendiente</span>
                  ) : enGrupo.has(p.id) && !invitados.has(p.id) ? (
                    <span className="shrink-0 rounded-full bg-green-22 px-2 py-0.5 text-xs text-green">En el {donde}</span>
                  ) : esGrupo && p.perfil === "ACUDIENTE" ? (
                    <EtiquetaInvitacion perfil={p.perfil} />
                  ) : (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">No está en el {donde}</span>
                  )}
                </span>
              )}
            />
          </div>
          {(seleccion.length > 0 || conGrupal) && (
          <Button
            type="button"
            size="icon"
            aria-label={`Añadir al ${donde}`}
            title={`Añadir al ${donde}`}
            disabled={agregando}
            aria-busy={agregando}
            onClick={onAgregar}
            className="size-11 shrink-0"
          >
            <PlusIcon className="size-6" />
          </Button>
          )}
        </div>
        )}

        {puedeAgregar && esGrupo && <SelectorGrupal enabled={open} value={grupal} onChange={setGrupal} />}

        {error && (
          <p role="alert" className="text-sm text-red">
            {getErrorMessage(error)}
          </p>
        )}

        <Field variant="outlined">
          <FieldLabel htmlFor="filtro-miembros">Buscar en {c.tipo === "GRUPO" ? "el grupo" : "el foro"}</FieldLabel>
          <Input
            id="filtro-miembros"
            type="search"
            value={filtro}
            onChange={(e) => {
              setFiltro(e.target.value)
              setPagina(0)
            }}
            placeholder="Nombre de la persona"
          />
        </Field>

        <div className="rounded-lg border">
          {miembros.isPending ? (
            <div className="space-y-2 p-3" aria-busy>
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : miembros.isError ? (
            <p className="p-4 text-sm text-muted-foreground">
              No se pudieron cargar los miembros.{" "}
              <button type="button" onClick={() => void miembros.refetch()} className="font-medium text-primary underline">
                Reintentar
              </button>
            </p>
          ) : (
            <>
              {esAdmin && marcados.size > 0 && (
                <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2 text-sm">
                  <span className="tabular-nums">
                    {marcados.size === 1 ? "1 persona seleccionada" : `${marcados.size} personas seleccionadas`}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="soft"
                    color="destructive"
                    onClick={() => setPorEliminar(todos.filter((m) => marcados.has(m.id)))}
                  >
                    <XIcon data-icon="inline-start" />
                    Quitar seleccionados
                  </Button>
                </div>
              )}
              <ul className="divide-y">
                {visibles.map((m) => (
                  <FilaMiembro
                    key={m.id}
                    miembro={m}
                    donde={donde}
                    // Nadie se bloquea ni se quita a sí mismo (para irse está "Salir").
                    gestionar={esAdmin && m.id !== user?.userId}
                    nombraAdmins={nombraAdmins}
                    marcado={marcados.has(m.id)}
                    onMarcar={(v) =>
                      setMarcados((prev) => {
                        const next = new Set(prev)
                        if (v) next.add(m.id)
                        else next.delete(m.id)
                        return next
                      })
                    }
                    ocupado={bloquear.isPending || eliminar.isPending || rol.isPending || quitando}
                    onAdmin={() => rol.mutate({ id: m.id, admin: !m.esAdmin })}
                    onBloquear={() => bloquear.mutate({ id: m.id, bloqueado: !m.bloqueado })}
                    // Una invitación se retira sin confirmar (no deja mensaje en el grupo).
                    onEliminar={() => (invitados.has(m.id) ? eliminar.mutate(m.id) : setPorEliminar([m]))}
                    onReinvitar={() => agregar.mutate([m.id])}
                  />
                ))}
              </ul>
              {lista.length === 0 && (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  {f ? `Nadie coincide con «${f}».` : `Aún no hay nadie en el ${donde}.`}
                </p>
              )}
              {paginas > 1 && (
                <nav aria-label="Páginas de miembros" className="flex items-center justify-center gap-2 border-t p-3 text-sm">
                  <button
                    type="button"
                    disabled={actual === 0}
                    onClick={() => setPagina(actual - 1)}
                    className="px-2 py-1 disabled:text-muted-foreground"
                  >
                    Previo
                  </button>
                  {Array.from({ length: paginas }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-current={i === actual ? "page" : undefined}
                      onClick={() => setPagina(i)}
                      className={cn(
                        "grid size-8 place-items-center rounded-md tabular-nums",
                        i === actual ? "bg-primary text-primary-foreground" : "bg-muted/60 hover:bg-muted",
                      )}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={actual === paginas - 1}
                    onClick={() => setPagina(actual + 1)}
                    className="px-2 py-1 disabled:text-muted-foreground"
                  >
                    Próximo
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>

      <AlertDialog open={porEliminar.length > 0} onOpenChange={(o) => !o && !quitando && setPorEliminar([])}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {porEliminar.length === 1
                ? `¿Eliminar a ${porEliminar[0].nombre} del ${donde}?`
                : `¿Eliminar a ${porEliminar.length} personas del ${donde}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {porEliminar.length === 1 ? "Dejará" : "Dejarán"} de ver los mensajes de {c.nombre} y
              {porEliminar.length === 1 ? " recibirá" : " recibirán"} un aviso. Puedes volver a añadirlas desde el
              buscador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="fill" color="neutral" disabled={quitando}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              color="destructive"
              disabled={quitando}
              aria-busy={quitando}
              onClick={async () => {
                // Uno por uno (comms-service no tiene baja por lote): si una falla, se detiene y el
                // error queda a la vista; las anteriores ya salieron.
                setQuitando(true)
                try {
                  for (const m of porEliminar) await eliminar.mutateAsync(m.id)
                  setMarcados(new Set())
                  setPorEliminar([])
                } catch {
                  setPorEliminar([])
                } finally {
                  setQuitando(false)
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ConfirmarAltaDialog
        resolucion={confirmacion}
        resumen={resumenSeleccion(grupal, seleccion.length)}
        grupo={c.nombre}
        pendiente={agregarMasivo.isPending}
        onCancelar={() => setConfirmacion(null)}
        onConfirmar={() =>
          agregarMasivo.mutate(aCuerpoSeleccion(grupal, seleccion), {
            onSuccess: limpiarAlta,
            onError: () => setConfirmacion(null),
          })
        }
      />
    </>
  )
}

function FilaMiembro({
  miembro: m,
  donde,
  gestionar,
  nombraAdmins,
  marcado,
  onMarcar,
  ocupado,
  onAdmin,
  onBloquear,
  onEliminar,
  onReinvitar,
}: {
  miembro: Miembro
  donde: string
  gestionar: boolean
  nombraAdmins: boolean
  marcado: boolean
  onMarcar: (v: boolean) => void
  ocupado: boolean
  onAdmin: () => void
  onBloquear: () => void
  onEliminar: () => void
  onReinvitar: () => void
}) {
  if (m.estado && m.estado !== "ACTIVO") {
    const pendiente = m.estado === "INVITADO"
    return (
      <li className="flex items-center gap-3 px-3 py-2">
        <span className="flex min-w-0 flex-1 items-center gap-3 opacity-80">
          <AvatarPersona nombre={m.nombre} />
          <span className="min-w-0 leading-tight">
            <span className="block truncate">{m.nombre}</span>
            <span className="block truncate text-sm text-muted-foreground">Acudiente</span>
          </span>
        </span>
        <Badge variant="soft" color={pendiente ? "info" : "warning"}>
          {pendiente ? "Invitación pendiente" : "Invitación rechazada"}
        </Badge>
        {gestionar && !pendiente && (
          <Button type="button" size="sm" variant="ghost" disabled={ocupado} onClick={onReinvitar}>
            Volver a invitar
          </Button>
        )}
        {gestionar && (
          <button
            type="button"
            onClick={onEliminar}
            disabled={ocupado}
            aria-label={`Retirar la invitación de ${m.nombre}`}
            title="Retirar invitación"
            className={cn(ACCION, "bg-muted/60 text-muted-foreground hover:bg-red-22 hover:text-red")}
          >
            <XIcon className="size-4" />
          </button>
        )}
      </li>
    )
  }
  return (
    <li className="flex items-center gap-3 px-3 py-2">
      {gestionar && (
        <Checkbox
          checked={marcado}
          onCheckedChange={(v) => onMarcar(!!v)}
          disabled={ocupado}
          aria-label={`Seleccionar a ${m.nombre}`}
        />
      )}
      <span className={cn("flex min-w-0 flex-1 items-center gap-3", m.bloqueado && "opacity-45")}>
        <AvatarPersona nombre={m.nombre} enLinea={m.enLinea} />
        <span className="min-w-0 leading-tight">
          <span className="block truncate">{m.nombre}</span>
          <span className="block truncate text-sm text-muted-foreground">
            {m.rol}
            {m.bloqueado && " · No puede escribir"}
          </span>
        </span>
      </span>
      {gestionar && (
      <>
      {nombraAdmins && (
      <button
        type="button"
        onClick={onAdmin}
        disabled={ocupado}
        aria-pressed={!!m.esAdmin}
        aria-label={m.esAdmin ? `Quitar administración a ${m.nombre}` : `Hacer administrador a ${m.nombre}`}
        title={m.esAdmin ? "Quitar administración" : "Hacer administrador"}
        className={cn(
          ACCION,
          m.esAdmin ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <StarIcon className="size-4" />
      </button>
      )}
      <button
        type="button"
        onClick={onBloquear}
        disabled={ocupado}
        aria-pressed={m.bloqueado}
        aria-label={m.bloqueado ? `Permitir escribir a ${m.nombre}` : `Bloquear a ${m.nombre}`}
        title={m.bloqueado ? "Permitir escribir" : "Bloquear: no podrá escribir"}
        className={cn(
          ACCION,
          m.bloqueado ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <ProhibitIcon className="size-4" />
      </button>
      <button
        type="button"
        onClick={onEliminar}
        disabled={ocupado}
        aria-label={`Eliminar a ${m.nombre} del ${donde}`}
        title={`Eliminar del ${donde}`}
        className={cn(ACCION, "bg-muted/60 text-muted-foreground hover:bg-red-22 hover:text-red")}
      >
        <XIcon className="size-4" />
      </button>
      </>
      )}
    </li>
  )
}

function AvatarPersona({ nombre, enLinea }: { nombre: string; enLinea?: boolean }) {
  return (
    <Avatar>
      <AvatarFallback className="bg-navy-22 text-[0.65rem] font-semibold text-navy">
        {iniciales(nombre)}
      </AvatarFallback>
      {enLinea && <AvatarBadge className="bg-green" />}
    </Avatar>
  )
}
