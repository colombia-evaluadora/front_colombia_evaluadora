import { useState } from "react"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { HashIcon } from "@/components/ui/icons"
import { Field, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { useNotify } from "@/components/notice/notice-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { rolVisible } from "@/features/comunicaciones/chat/lib/estado-mensaje"
import { iniciales } from "@/features/comunicaciones/chat/lib/chat-format"
import type { Conversacion, Persona } from "@/features/comunicaciones/chat/api/types"
import { useCrearCanal } from "@/features/comunicaciones/chat/api/mutations/use-acciones-conversacion"
import { coincidePersona, usePersonasQuery } from "@/features/comunicaciones/chat/api/query/use-personas-query"
import { SelectorChips } from "@/features/comunicaciones/chat/components/selector-chips"
import type { ResolucionSeleccion } from "@/features/comunicaciones/chat/api/types"
import { useResolverSeleccion } from "@/features/comunicaciones/chat/api/query/use-seleccion-grupal-query"
import { SelectorGrupal } from "@/features/comunicaciones/chat/components/selector-grupal"
import { ConfirmarAltaDialog } from "@/features/comunicaciones/chat/components/confirmar-alta-dialog"
import { OpcionesGrupoCampos } from "@/features/comunicaciones/chat/components/opciones-grupo-campos"
import type { OpcionesGrupo } from "@/features/comunicaciones/chat/api/mutations/use-acciones-conversacion"
import { modoValido, OPCIONES_GRUPO_INICIALES } from "@/features/comunicaciones/chat/lib/modo-grupo"
import {
  aCuerpoSeleccion,
  haySeleccionGrupal,
  resumenSeleccion,
  SELECCION_VACIA,
  type SeleccionGrupal,
} from "@/features/comunicaciones/chat/lib/seleccion-grupal"

const AYUDA =
  "Los foros son el lugar donde se producen las conversaciones sobre un tema. Usa un nombre que sea fácil de encontrar y comprender."
const AYUDA_GRUPO =
  "Un grupo reúne a las personas que elijas para conversar. Solo quien lo crea lo gestiona: es quien añade y quita participantes."

/** Etiqueta del perfil en el buscador de un grupo: el acudiente entra por invitación. */
export function EtiquetaInvitacion({ perfil }: { perfil?: Persona["perfil"] }) {
  if (perfil !== "ACUDIENTE") return null
  return (
    <span className="shrink-0 rounded-full bg-blue-22 px-2 py-0.5 text-xs text-blue">Acudiente · por invitación</span>
  )
}

// Nombres estilo canal: minúsculas y guiones en lugar de espacios.
const aNombreCanal = (v: string) => v.toLowerCase().replace(/\s+/g, "-").replace(/^#/, "")

// Crear un foro del chat (`CANAL`) o un grupo (`GRUPO`, al menos una persona): primero el
// nombre y luego las personas.
export function CrearChatDialog({
  open,
  onClose,
  onCreado,
  tipo = "CANAL",
}: {
  open: boolean
  onClose: () => void
  onCreado: (id: number) => void
  tipo?: "CANAL" | "GRUPO"
}) {
  const esGrupo = tipo === "GRUPO"
  const { notify } = useNotify()
  const [paso, setPaso] = useState<1 | 2>(1)
  const [nombre, setNombre] = useState("")
  const [opciones, setOpciones] = useState<OpcionesGrupo>(OPCIONES_GRUPO_INICIALES)
  const [miembros, setMiembros] = useState<Persona[]>([])
  const crear = useCrearCanal()
  const [consulta, setConsulta] = useState("")
  const personas = usePersonasQuery(open && paso === 2, consulta, { paraGrupo: esGrupo })
  const limpio = nombre.trim().replace(/-+$/, "")
  // Grupo: además de personas sueltas, grados, grupos académicos o roles (se confirma el conteo).
  const [grupal, setGrupal] = useState<SeleccionGrupal>(SELECCION_VACIA)
  const [confirmacion, setConfirmacion] = useState<ResolucionSeleccion | null>(null)
  const resolver = useResolverSeleccion()
  const conGrupal = esGrupo && haySeleccionGrupal(grupal)
  const error = crear.error ?? resolver.error

  const cerrar = () => {
    if (crear.isPending) return
    setPaso(1)
    setNombre("")
    setOpciones(OPCIONES_GRUPO_INICIALES)
    setMiembros([])
    setConsulta("")
    setGrupal(SELECCION_VACIA)
    setConfirmacion(null)
    crear.reset()
    resolver.reset()
    onClose()
  }

  const creado = (canal: Conversacion) => {
    notify(esGrupo ? `Se creó el grupo ${canal.nombre}.` : `Se creó #${canal.nombre}.`)
    cerrar()
    onCreado(canal.id)
  }

  const crearChat = (conMiembros: Persona[]) => {
    const ids = conMiembros.map((p) => p.id)
    const { GRADOS, GRUPOS, ROLES, PARA } = aCuerpoSeleccion(grupal)
    crear.mutate(
      {
        nombre: limpio,
        categoria: "GENERAL",
        miembros: ids,
        tipo: esGrupo ? "GRUPO" : undefined,
        grupal: conGrupal ? { GRADOS, GRUPOS, ROLES, PARA } : undefined,
        opciones: esGrupo ? opciones : undefined,
      },
      { onSuccess: creado },
    )
  }

  // Con grado, grupo o rol: primero el conteo que resuelve el servidor, luego se crea.
  const agregar = () => {
    if (!conGrupal) return crearChat(miembros)
    resolver.mutate({ cuerpo: aCuerpoSeleccion(grupal, miembros) }, { onSuccess: setConfirmacion })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && cerrar()}>
      {/* Una sola columna que no crece con el contenido: sin esto la grilla toma el min-content del
          hijo más ancho (chips largos, la fila de una invitación con sus botones) y todo el
          formulario se sale por la derecha del panel (QA acudiente, "Añadir personas a…"). */}
      <DialogContent className="max-h-[calc(100dvh-2rem)] grid-cols-[minmax(0,1fr)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">
            {paso === 1 ? (esGrupo ? "Crear un grupo" : "Crear un foro") : `Añadir personas a ${limpio}`}
          </DialogTitle>
        </DialogHeader>

        {paso === 1 ? (
          <form
            id="crear-chat"
            onSubmit={(e) => {
              e.preventDefault()
              if (limpio && (!esGrupo || modoValido(opciones.modo, opciones.rolesEscritura))) setPaso(2)
            }}
            className="space-y-1.5"
          >
            {/* Label flotante con los componentes estándar (como el login). El form NO scrollea: el
                único scroll es el del `DialogContent` (ya con `max-h` + `overflow-y-auto` y padding).
                Con un `overflow-y-auto` propio, el label (que sobresale por encima del borde del
                input) quedaba a 2 px del borde de recorte del form: bastaba que el form tuviera
                scroll (redondeo de fuentes/zoom, las opciones del grupo en pantallas bajas) y que el
                foco del `autoFocus` o la rueda lo desplazaran para cortar "Nombre" por arriba (QA
                testv2, input enfocado). `bg-popover` funde el label con el fondo del diálogo (en
                oscuro `background` ≠ `popover`). */}
            <Field variant="outlined">
              <FieldLabel htmlFor="crear-chat-nombre" className="bg-popover">
                Nombre
              </FieldLabel>
              <InputGroup className="rounded-md border-input has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20">
                {!esGrupo && (
                  <InputGroupAddon align="inline-start" className="ml-2">
                    <HashIcon aria-hidden className="size-5 text-muted-foreground" />
                  </InputGroupAddon>
                )}
                <InputGroupInput
                  id="crear-chat-nombre"
                  autoFocus
                  value={nombre}
                  maxLength={80}
                  onChange={(e) => setNombre(esGrupo ? e.target.value.replace(/^\s+/, "") : aNombreCanal(e.target.value))}
                  placeholder={esGrupo ? "Por ejemplo, Proyecto feria de ciencias" : "Por ejemplo, planificacion-presupuesto"}
                  aria-describedby="crear-chat-ayuda"
                />
              </InputGroup>
            </Field>
            <p id="crear-chat-ayuda" className="text-xs text-muted-foreground">
              {esGrupo ? AYUDA_GRUPO : AYUDA}
            </p>
            {esGrupo && (
              <div className="pt-3">
                <OpcionesGrupoCampos value={opciones} onChange={setOpciones} idPrefijo="crear-grupo" />
              </div>
            )}
          </form>
        ) : (
          <div className="space-y-1.5">
            <SelectorPersonas
              personas={personas.data ?? []}
              cargando={personas.isPending}
              delServidor={!personas.isPlaceholderData && consulta.trim().length >= 2}
              onConsulta={setConsulta}
              value={miembros}
              onChange={setMiembros}
              paraGrupo={esGrupo}
            />
            <p className="text-xs text-muted-foreground">
              {esGrupo
                ? "Añade al menos una persona. Verán todo el historial del grupo. Los acudientes reciben una invitación y entran solo si la aceptan."
                : "Las personas que añadas verán el historial del foro y podrán escribir en él."}
            </p>
            {esGrupo && (
              <div className="pt-3">
                <SelectorGrupal enabled={open && paso === 2} value={grupal} onChange={setGrupal} />
              </div>
            )}
          </div>
        )}

        <ErrorNoticeBanner error={error} />

        <DialogFooter>
          {paso === 1 ? (
            <Button
              type="submit"
              form="crear-chat"
              disabled={!limpio || (esGrupo && !modoValido(opciones.modo, opciones.rolesEscritura))}
            >
              Siguiente
            </Button>
          ) : miembros.length === 0 && !esGrupo ? (
            <Button
              type="button"
              color="neutral"
              onClick={() => crearChat([])}
              disabled={crear.isPending}
              aria-busy={crear.isPending}
            >
              Omitir
            </Button>
          ) : (
            <Button
              type="button"
              onClick={agregar}
              disabled={crear.isPending || resolver.isPending || (miembros.length === 0 && !conGrupal)}
              aria-busy={crear.isPending || resolver.isPending}
            >
              Agregar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
      <ConfirmarAltaDialog
        resolucion={confirmacion}
        resumen={resumenSeleccion(grupal, miembros.length)}
        grupo={limpio}
        pendiente={crear.isPending}
        onCancelar={() => setConfirmacion(null)}
        onConfirmar={() => {
          setConfirmacion(null)
          crearChat(miembros)
        }}
      />
    </Dialog>
  )
}

export function SelectorPersonas({
  personas,
  cargando,
  delServidor,
  onConsulta,
  value,
  onChange,
  paraGrupo = false,
  autoFocus = true,
}: {
  personas: Persona[]
  cargando: boolean
  delServidor: boolean
  onConsulta: (consulta: string) => void
  value: Persona[]
  onChange: (v: Persona[]) => void
  paraGrupo?: boolean
  autoFocus?: boolean
}) {
  return (
    <SelectorChips
      items={personas}
      value={value}
      onChange={onChange}
      getId={(p) => p.id}
      getLabel={(p) => p.nombre}
      filtrar={(p, t) => coincidePersona(p, t, delServidor)}
      onConsulta={onConsulta}
      cargando={cargando}
      autoFocus={autoFocus}
      ariaLabel="Buscar personas"
      placeholder="P. ej.: Natalia o pedro@iesimonbolivar.edu.co"
      vacio="Nadie coincide con la búsqueda."
      renderItem={(p) => (
        <span className="flex items-center gap-3">
          <Avatar size="sm">
            <AvatarFallback className="bg-navy-22 text-[0.65rem] font-semibold text-navy">
              {iniciales(p.nombre)}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{p.nombre}</span>
            <span className="block truncate text-xs text-muted-foreground">{rolVisible(p)}</span>
          </span>
          {paraGrupo && <EtiquetaInvitacion perfil={p.perfil} />}
        </span>
      )}
    />
  )
}
