import { useRef, useState, type ReactNode } from "react"

import { MarcoOpciones } from "@/components/marco-opciones"
import { NoticeBanner, type Notice } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { TituloConAyuda } from "@/components/titulo-con-ayuda"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { FloppyDiskIcon, SpinnerIcon, UploadSimpleIcon, XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { getErrorMessage } from "@/lib/api-client"

import { useReorderMenus } from "@/features/administration/roles-menus/api/mutations/reorder-menus"
import { useSaveMenu } from "@/features/administration/roles-menus/api/mutations/save-menu"
import { useSetMenuActions } from "@/features/administration/roles-menus/api/mutations/set-menu-actions"
import { useSetMenuState } from "@/features/administration/roles-menus/api/mutations/set-menu-state"
import {
  buildMenuTree,
  reorderSiblings,
  type MenuCatalogNode,
  type MenuNode,
} from "@/features/administration/roles-menus/api/types/role-menu"
import { getNavIcon } from "@/features/navigation/api/ui-mappings"

const NOMBRE_MAX = 60
const ICONO_MAX_KB = 200
const NINGUNO = "ninguno"

interface DialogVistaProps {
  /** Catálogo completo (Módulos y submódulos), con inactivos. */
  menus: MenuCatalogNode[]
  /** Presente = modificar. */
  menu?: MenuCatalogNode
  onClose: () => void
}

/**
 * «Nuevo módulo o submódulo» / «Modificar…» (S.3.CAT.3). Se monta al abrir: arranca con los datos
 * del momento. Con módulo padre es un submódulo; colgando de un submódulo, una pestaña con permiso
 * propio (S.3.VRO.1a).
 */
export function DialogVista({ menus, menu, onClose }: DialogVistaProps) {
  const isEditing = menu != null
  const { notify } = useNotify()
  const tree = buildMenuTree(menus)
  const byId = new Map(menus.map((it) => [it.id, it]))
  const hermanos = (padre: number | null, excepto?: number) =>
    menus
      .filter((it) => (it.idParent ?? null) === padre && it.id !== excepto)
      .sort((a, b) => a.menuOrder - b.menuOrder)

  const [nombre, setNombre] = useState(menu?.name ?? "")
  const [padre, setPadre] = useState<string>(menu?.idParent != null ? String(menu.idParent) : NINGUNO)
  const [icono, setIcono] = useState<string>(menu?.icon ?? "")
  const [iconoArchivo, setIconoArchivo] = useState<string | null>(null)
  const [ruta, setRuta] = useState(menu?.path ?? "")
  const idPadre = padre === NINGUNO ? null : Number(padre)
  const posicionActual = menu ? hermanos(menu.idParent ?? null).findIndex((it) => it.id === menu.id) + 1 : 0
  const [orden, setOrden] = useState<string>(
    String(menu ? posicionActual : hermanos(idPadre).length + 1),
  )
  const [guardar, setGuardar] = useState(menu?.admiteGuardar ?? true)
  // Como el prototipo: una vista nueva admite Guardar y no Eliminar.
  const [eliminar, setEliminar] = useState(menu?.admiteEliminar ?? false)
  const [activo, setActivo] = useState(menu?.activo ?? true)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<Notice | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const padreNodo = idPadre != null ? byId.get(idPadre) : undefined
  const esModulo = idPadre == null
  const esPestana = padreNodo?.idParent != null
  // Un módulo con submódulos no puede pasar a colgar de otro (no hay cuarto nivel).
  const tieneHijos = menu != null && menus.some((it) => it.idParent === menu.id)
  // Posiciones posibles: al moverse de padre, se suma al final de los nuevos hermanos.
  const maxOrden = hermanos(idPadre, menu?.id).length + 1

  const saveMenu = useSaveMenu()
  const setActions = useSetMenuActions()
  const setEstado = useSetMenuState()
  const reorder = useReorderMenus()
  const busy = saveMenu.isPending || setActions.isPending || setEstado.isPending || reorder.isPending

  function cambiarPadre(next: string) {
    setPadre(next)
    // El orden por defecto es el siguiente al último de los nuevos hermanos.
    const nuevo = next === NINGUNO ? null : Number(next)
    if (!menu || (menu.idParent ?? null) !== nuevo) setOrden(String(hermanos(nuevo, menu?.id).length + 1))
    else setOrden(String(posicionActual))
  }

  function cargarIcono(file: File | undefined) {
    if (!file) return
    const tipoOk = file.type === "image/svg+xml" || file.type === "image/png"
    if (!tipoOk) {
      setErrores((prev) => ({ ...prev, icono: "El ícono debe ser SVG o PNG." }))
      return
    }
    if (file.size > ICONO_MAX_KB * 1024) {
      setErrores((prev) => ({ ...prev, icono: `El ícono pesa más de ${ICONO_MAX_KB} KB.` }))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setIcono(String(reader.result))
      setIconoArchivo(file.name)
      setErrores(({ icono: _icono, ...resto }) => resto)
    }
    reader.readAsDataURL(file)
  }

  function validar() {
    const next: Record<string, string> = {}
    if (nombre.trim().length < 3) next.nombre = "Escriba un nombre de 3 a 60 caracteres."
    if (!icono) next.icono = "Cargue el ícono de la vista."
    if (!esModulo && !esPestana && !ruta.trim().startsWith("/")) next.ruta = "Escriba la ruta de la vista, empezando por /."
    const n = Number(orden)
    if (!Number.isInteger(n) || n < 1 || n > maxOrden) next.orden = `De 1 a ${maxOrden}.`
    const repetido = menus.some(
      (it) =>
        it.id !== menu?.id &&
        (it.idParent ?? null) === idPadre &&
        it.name.trim().toLowerCase() === nombre.trim().toLowerCase(),
    )
    if (repetido) next.nombre = "Ya existe una vista con ese nombre en el mismo lugar."
    setErrores(next)
    return Object.keys(next).length === 0
  }

  async function guardarVista(e: React.FormEvent) {
    e.preventDefault()
    if (!validar()) return
    setNotice(null)
    // Las pestañas no navegan: su ruta es la del submódulo con un ancla.
    const path = esModulo ? (menu?.path ?? "") : esPestana ? `${padreNodo?.path ?? ""}#${slug(nombre)}` : ruta.trim()
    try {
      const datos = {
        name: nombre.trim(),
        path,
        icon: icono,
        idParent: idPadre,
        visible: esPestana ? false : (menu?.visible ?? true),
        // Se conserva el plan que ya tenga; el prototipo no lo muestra.
        ...(menu?.planId !== undefined ? { planId: menu.planId } : {}),
      }
      const cambianDatos =
        !menu ||
        datos.name !== menu.name ||
        datos.path !== (menu.path ?? "") ||
        datos.icon !== (menu.icon ?? "") ||
        datos.idParent !== (menu.idParent ?? null)
      const guardado: MenuNode = cambianDatos
        ? await saveMenu.mutateAsync({ id: menu?.id, ...datos })
        : menu
      const id = guardado.id

      // El backend crea la vista con las dos acciones: se corrige si se pidió otra cosa.
      if (guardar !== (menu?.admiteGuardar ?? true) || eliminar !== (menu?.admiteEliminar ?? true)) {
        await setActions.mutateAsync({ id, guardar, eliminar })
      }
      if (activo !== (menu?.activo ?? true)) await setEstado.mutateAsync({ id, activo })

      // Orden: se mueve entre sus hermanos hasta la posición pedida.
      const lista = [...hermanos(idPadre, id), { ...guardado, menuOrder: Number.MAX_SAFE_INTEGER }]
      const actual = menu && (menu.idParent ?? null) === idPadre ? posicionActual : lista.length
      const ordenados = menu && actual !== lista.length ? [...hermanos(idPadre)] : lista
      const destino = ordenados[Number(orden) - 1]
      if (destino && destino.id !== id) {
        const items = reorderSiblings(
          ordenados.map((it, i) => ({ ...it, menuOrder: i })),
          ordenados.map((it) => it.id),
          id,
          destino.id,
        )
        if (items.length > 0) await reorder.mutateAsync(items)
      }

      onClose()
      notify(isEditing ? "La vista se actualizó correctamente." : "La vista se creó correctamente.")
    } catch (error) {
      setNotice({ id: Date.now(), message: getErrorMessage(error) })
    }
  }

  const titulo = isEditing
    ? `Modificar ${esModulo ? "módulo" : esPestana ? "pestaña" : "submódulo"}`
    : "Nuevo módulo o submódulo"

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" />
        <form id="vista-form" onSubmit={guardarVista} className="flex flex-col gap-4">
          <div className="grid items-start gap-4 sm:grid-cols-2">
            <Field variant="outlined" data-invalid={errores.nombre ? "true" : undefined}>
              <FieldLabel htmlFor="vista-nombre">Nombre*</FieldLabel>
              <ConContador valor={nombre} max={NOMBRE_MAX}>
                <Input
                  id="vista-nombre"
                  placeholder="Agregar"
                  autoFocus
                  maxLength={NOMBRE_MAX}
                  className="pr-16"
                  value={nombre}
                  aria-invalid={Boolean(errores.nombre)}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </ConContador>
              <FieldError>{errores.nombre}</FieldError>
            </Field>

            <Field variant="outlined">
              <FieldLabel htmlFor="vista-padre">Módulo padre</FieldLabel>
              <Select value={padre} disabled={tieneHijos} onValueChange={(v) => v && cambiarPadre(String(v))}>
                <SelectTrigger id="vista-padre" variant="outlined">
                  <SelectValue>
                    {(value) =>
                      value === NINGUNO ? "Ninguno (es un módulo)" : (byId.get(Number(value))?.name ?? "")
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NINGUNO}>Ninguno (es un módulo)</SelectItem>
                  {tree
                    .filter((group) => group.id !== menu?.id)
                    .map((group) => (
                      <SelectGroup key={group.id}>
                        <SelectLabel>{group.name}</SelectLabel>
                        <SelectItem value={String(group.id)}>{group.name}</SelectItem>
                        {/* Colgar de un submódulo crea una pestaña con permiso propio. */}
                        {group.children
                          .filter((child) => child.id !== menu?.id && !tieneHijos)
                          .map((child) => (
                            <SelectItem key={child.id} value={String(child.id)} className="pl-6">
                              {child.name} (pestaña)
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                {tieneHijos
                  ? "Tiene submódulos: sigue siendo un módulo."
                  : esPestana
                    ? "Será una pestaña de ese submódulo, con permiso propio."
                    : "Sin padre, es un módulo del menú lateral."}
              </FieldDescription>
            </Field>

            <MarcoOpciones
              id="vista-icono-marco"
              label="Icono"
              required
              error={errores.icono}
              descripcion={`SVG o PNG, máx. ${ICONO_MAX_KB} KB.`}
              // Mismo alto que los inputs de la fila (40 px): botón compacto y sin el padding del recuadro.
              contentClassName="h-10 flex-nowrap gap-x-2 py-0 pt-0"
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-sm bg-muted-22">
                <IconoVista icono={icono} />
              </span>
              <Button type="button" size="xs" variant="outline" color="neutral" onClick={() => fileRef.current?.click()}>
                <UploadSimpleIcon data-icon="inline-start" />
                Cargar icono
              </Button>
              {iconoArchivo ? <span className="min-w-0 truncate text-xs text-muted-foreground">{iconoArchivo}</span> : null}
              <input
                ref={fileRef}
                id="vista-icono"
                type="file"
                aria-label="Archivo del icono"
                accept=".svg,.png,image/svg+xml,image/png"
                className="sr-only"
                onChange={(e) => {
                  cargarIcono(e.target.files?.[0])
                  e.target.value = ""
                }}
              />
            </MarcoOpciones>

            <Field variant="outlined" data-invalid={errores.orden ? "true" : undefined}>
              <FieldLabel htmlFor="vista-orden">Orden*</FieldLabel>
              <Input
                id="vista-orden"
                type="number"
                min={1}
                max={maxOrden}
                className="tabular-nums"
                value={orden}
                aria-invalid={Boolean(errores.orden)}
                onChange={(e) => setOrden(e.target.value)}
              />
              {errores.orden ? (
                <FieldError>{errores.orden}</FieldError>
              ) : (
                <FieldDescription>Por defecto, el siguiente al último.</FieldDescription>
              )}
            </Field>

            {/* El prototipo no la muestra, pero el menú lateral la necesita para abrir el submódulo. */}
            {!esModulo && !esPestana ? (
              <Field variant="outlined" className="sm:col-span-2" data-invalid={errores.ruta ? "true" : undefined}>
                <FieldLabel htmlFor="vista-ruta">
                  <TituloConAyuda
                    titulo="Ruta"
                    ayuda="Dirección de la vista dentro del sistema; la usa el menú lateral para abrirla."
                  >
                    Ruta<span data-required-mark="">*</span>
                  </TituloConAyuda>
                </FieldLabel>
                <Input
                  id="vista-ruta"
                  placeholder="/app/modulo/vista"
                  className="font-mono"
                  value={ruta}
                  aria-invalid={Boolean(errores.ruta)}
                  onChange={(e) => setRuta(e.target.value)}
                />
                <FieldError>{errores.ruta}</FieldError>
              </Field>
            ) : null}

            <MarcoOpciones
                id="vista-acciones"
                label="Acciones disponibles"
                descripcion="Las que admite la vista además del Acceso."
              >
                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox checked={guardar} onCheckedChange={(c) => setGuardar(c === true)} />
                  Guardar
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox checked={eliminar} onCheckedChange={(c) => setEliminar(c === true)} />
                  Eliminar
                </label>
              </MarcoOpciones>

            <MarcoOpciones
              id="vista-estado-marco"
              label="Estado"
              required
              descripcion={
                activo
                  ? "Aparece en el menú de los roles que la tengan."
                  : esModulo
                    ? "No aparece en el menú de ningún rol, ni sus submódulos."
                    : "No aparece en el menú de ningún rol."
              }
            >
              <label htmlFor="vista-estado" className="flex w-fit cursor-pointer items-center gap-3">
                <Switch round id="vista-estado" checked={activo} onCheckedChange={setActivo} />
                {activo ? "Activo" : "Inactivo"}
              </label>
            </MarcoOpciones>
          </div>
        </form>
        <DialogFooter className="sm:items-center">
          <p className="text-xs text-muted-foreground sm:mr-auto">Los campos marcados con * son obligatorios</p>
          <Button variant="outline" color="neutral" size="sm" type="button" disabled={busy} onClick={onClose}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button size="sm" type="submit" color="primary" form="vista-form" disabled={busy} aria-busy={busy}>
            {busy ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <FloppyDiskIcon data-icon="inline-start" />
            )}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Ícono de la vista: el archivo cargado o, en las existentes, el del catálogo de íconos. */
function IconoVista({ icono }: { icono: string }) {
  if (!icono) return <span className="text-xs text-muted-foreground">—</span>
  if (icono.startsWith("data:") || icono.startsWith("http")) {
    return <img src={icono} alt="Ícono de la vista" className="size-5" />
  }
  const Icon = getNavIcon(icono)
  return <Icon className="size-5" />
}

function ConContador({ valor, max, children }: { valor: string; max: number; children: ReactNode }) {
  return (
    <div className="relative">
      {children}
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground tabular-nums">
        {valor.length} / {max}
      </span>
    </div>
  )
}

const slug = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
