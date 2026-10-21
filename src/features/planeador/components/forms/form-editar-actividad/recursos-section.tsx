import { useState } from "react"
import { useSelector } from "@tanstack/react-form"
import { Link } from "@tanstack/react-router"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { CharacterCounter } from "@/components/ui/character-counter"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  CheckCircleFillIcon,
  EyeIcon,
  FileUploadOutlinedIcon,
  FolderOpenIcon,
  ImageIcon,
  PlusCircleIcon,
  PlusIcon,
  RemoveCircleOutlineIcon,
  TrashIcon,
  XCircleIcon,
} from "@/components/ui/icons"
import { paths } from "@/config/paths"
import {
  esDominioPermitido,
  useDominioMaterialCatalog,
} from "@/features/planeador/api/query/use-dominio-material-catalog"
import type { Actividad, Recurso } from "@/features/planeador/api/types/actividad"
import { DialogBibliotecaRecursos } from "@/features/planeador/components/dialogs/dialog-biblioteca-recursos"
import { saveActividadFormDraft, type ActividadFormDraftKey } from "@/features/planeador/lib/actividad-form-draft"
import {
  TEXTAREA_OUTLINED,
  type RecursoPresentacion,
  RECURSO_PRESENTACION,
} from "@/features/planeador/components/forms/form-editar-actividad/constants"
import type { FormActividad } from "@/features/planeador/components/forms/form-editar-actividad/types"
import { cryptoId } from "@/features/planeador/components/forms/form-editar-actividad/helpers"
import { useSoloLecturaActividad } from "@/features/planeador/components/forms/form-editar-actividad/context"
import { SoloEdicion } from "@/features/planeador/components/forms/form-editar-actividad/solo-edicion"

/** "Materiales requeridos": primera mitad del Bloque 3 (la otra es `RecursosSection`). */
export function MaterialesSection({ form, disabled }: { form: FormActividad; disabled: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <h4 className="text-sm font-semibold">Materiales requeridos</h4>
      <form.Field name="materiales">
        {(field) => (
          <Field variant="outlined">
            <FieldLabel htmlFor={field.name}>Materiales requeridos (lista breve)</FieldLabel>
            <Textarea className={TEXTAREA_OUTLINED}
              id={field.name}
              name={field.name}
              placeholder="Ej: Cuaderno, colores, computador portátil…"
              maxLength={500}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              rows={4}
              disabled={disabled}
            />
            <CharacterCounter value={field.state.value} max={500} />
          </Field>
        )}
      </form.Field>
    </div>
  )
}

/**
 * Borrador del recurso en estado local: recién se commitea a `recursos` con
 * "Agregar a la lista".
 */
type RecursoDraft = Omit<Recurso, "id">

const RECURSO_DRAFT_VACIO: RecursoDraft = {
  titulo: "",
  fuente: "",
  tipo: "URL",
  url: "",
  descripcion: "",
}

const RECURSO_MAX_ITEMS = 10

/**
 * Formatos permitidos en "Archivo en PC" (Regla 82): los ejecutables quedan fuera por
 * no estar en la lista. Se valida en el cliente (pedido de QA).
 */
const RECURSO_ARCHIVO_EXTENSIONES_PERMITIDAS = [
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "jpg", "jpeg", "png", "gif", "mp3", "mp4", "webm", "txt",
]
const RECURSO_ARCHIVO_ACCEPT_VALIDADO = RECURSO_ARCHIVO_EXTENSIONES_PERMITIDAS.map((ext) => `.${ext}`).join(",")
const RECURSO_ARCHIVO_MAX_BYTES = 20 * 1024 * 1024

const ESQUEMAS_URL_PELIGROSOS = ["javascript:", "data:"]

function extensionDe(nombre: string): string {
  return nombre.split(".").pop()?.toLowerCase() ?? ""
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const unidades = ["B", "KB", "MB", "GB"]
  const indice = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), unidades.length - 1)
  return `${(bytes / 1024 ** indice).toFixed(indice === 0 ? 0 : 1)} ${unidades[indice]}`
}

/** `esquemaPeligroso` va primero: `new URL("javascript:...")` no tira. */
function esUrlDeRecursoValida(value: string): boolean {
  const lower = value.trim().toLowerCase()
  if (ESQUEMAS_URL_PELIGROSOS.some((esquema) => lower.startsWith(esquema))) return false
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export function RecursosSection({
  form,
  draftKey,
  disabled,
  actividadId,
}: {
  form: FormActividad
  draftKey: ActividadFormDraftKey
  disabled: boolean
  /** 0 mientras la actividad no se guardó: la biblioteca exige una actividad existente. */
  actividadId: number
}) {
  // Grupo del form: ancla de la biblioteca al crear, cuando la actividad aún no existe.
  const grupoId = useSelector(form.store, (state) => state.values.grupoId)
  // Regla 82: máximo 10 materiales por actividad (tope del backend).
  const recursosCount = useSelector(
    form.store,
    (state) => (state.values.recursos as Recurso[]).length,
  )
  const limiteAlcanzado = recursosCount >= RECURSO_MAX_ITEMS

  // Mismo catálogo de dominios del backend (Regla 82). `undefined` mientras carga: no bloquea.
  const { data: dominiosUrl } = useDominioMaterialCatalog("DOMINIO_MATERIAL_URL")
  const { data: dominiosRepositorio } = useDominioMaterialCatalog("DOMINIO_MATERIAL_REPOSITORIO")

  function draftUrlInvalida(d: RecursoDraft): boolean {
    if (d.tipo === "Archivo" || !d.url.trim()) return false
    if (!esUrlDeRecursoValida(d.url)) return true
    const dominios = d.tipo === "Unidad virtual" ? dominiosRepositorio : dominiosUrl
    if (!dominios) return false
    return !esDominioPermitido(d.url, dominios)
  }

  const [collapsed, setCollapsed] = useState(false)
  const [bibliotecaOpen, setBibliotecaOpen] = useState(false)
  // Fuera del form field para que editar el borrador no ensucie el form.
  const [draft, setDraft] = useState<RecursoDraft>(RECURSO_DRAFT_VACIO)

  function updateDraft(patch: Partial<RecursoDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }))
  }

  function handleAddDraft() {
    // Un item sin URL/fuente no aporta nada.
    if (!draft.url.trim() && !draft.fuente.trim()) return
    if (draftUrlInvalida(draft)) return
    const list = form.getFieldValue("recursos") as Recurso[]
    if (list.length >= RECURSO_MAX_ITEMS) return
    form.setFieldValue("recursos", [
      ...list,
      { id: cryptoId(), ...draft },
    ])
    setDraft(RECURSO_DRAFT_VACIO)
  }

  // Id nuevo: reusar el del recurso original podría colisionar en la key del `<ul>`.
  const soloLectura = useSoloLecturaActividad()
  function handlePickFromBiblioteca(recurso: Omit<Recurso, "id">) {
    const list = form.getFieldValue("recursos") as Recurso[]
    if (list.length >= RECURSO_MAX_ITEMS) return
    form.setFieldValue("recursos", [...list, { id: cryptoId(), ...recurso }])
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Materiales de apoyo (agrega varios recursos)</h4>
        <div className="flex gap-2">
          <SoloEdicion>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  color="primary"
                  size="icon-sm"
                  type="button"
                  onClick={() => setBibliotecaOpen(true)}
                  aria-label="Adjuntar desde biblioteca"
                  // La biblioteca necesita la actividad (edición) o el grupo (alta); sin ninguno el backend da 400.
                  disabled={disabled || limiteAlcanzado || (actividadId <= 0 && !grupoId)}
                />
              }
            >
              <FolderOpenIcon />
            </TooltipTrigger>
            <TooltipContent>
              {actividadId > 0 || grupoId
                ? "Adjuntar desde biblioteca"
                : "Elegí el grupo para ver los archivos de otras actividades"}
            </TooltipContent>
          </Tooltip>
          </SoloEdicion>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="fill"
                  color="primary"
                  size="icon-sm"
                  type="button"
                  aria-label={collapsed ? "Expandir sección de recursos" : "Colapsar sección de recursos"}
                  aria-expanded={!collapsed}
                  onClick={() => setCollapsed((v) => !v)}
                  // Solo muestra/oculta la lista: en solo lectura sigue activo.
                  disabled={soloLectura ? false : disabled}
                />
              }
            >
              {collapsed ? <PlusCircleIcon /> : <RemoveCircleOutlineIcon />}
            </TooltipTrigger>
            <TooltipContent>
              {collapsed ? "Expandir sección de recursos" : "Colapsar sección de recursos"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {collapsed ? null : (
        <div className="flex flex-col gap-4">
          {/* `onBlur` del contenedor: si el foco sale del bloque se agrega el borrador solo, para no
          perderlo al ir directo al "Guardar" del form. */}
          {soloLectura ? null : limiteAlcanzado ? (
            <p className="text-muted-foreground text-sm">
              Alcanzaste el máximo de {RECURSO_MAX_ITEMS} materiales de apoyo por actividad. Quitá
              alguno de la lista para agregar otro.
            </p>
          ) : (
            <div
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) handleAddDraft()
              }}
            >
              <RecursoForm
                draft={draft}
                onChange={updateDraft}
                onAdd={handleAddDraft}
                urlInvalida={draftUrlInvalida(draft)}
                disabled={disabled}
              />
            </div>
          )}

          <form.Field name="recursos">
            {(field) => {
              const recursos = field.state.value as Recurso[]
              if (recursos.length === 0) return null
              return (
                <div className="flex flex-col gap-3">
                  <h4 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                    Recursos agregados
                  </h4>
                  <ul className="flex flex-col gap-2">
                    {recursos.map((recurso, index) => (
                      <RecursoItem
                        key={recurso.id}
                        recurso={recurso}
                        onRemove={() => {
                          const list = (field.state.value as Recurso[]).slice()
                          list.splice(index, 1)
                          field.handleChange(list)
                        }}
                        // "Ver recurso" desmonta el form: se guarda un borrador para restaurarlo al volver.
                        onVerRecurso={() =>
                          saveActividadFormDraft(draftKey, form.state.values as Actividad)
                        }
                        disabled={disabled}
                      />
                    ))}
                  </ul>
                </div>
              )
            }}
          </form.Field>
        </div>
      )}

      {/* Se le pasan los recursos actuales para excluir duplicados. */}
      <form.Subscribe selector={(state) => state.values.recursos}>
        {(recursos) => (
          <DialogBibliotecaRecursos
            open={bibliotecaOpen}
            onOpenChange={setBibliotecaOpen}
            actividadId={actividadId}
            grupoId={grupoId ?? 0}
            recursosActuales={recursos as Recurso[]}
            onSelect={handlePickFromBiblioteca}
          />
        )}
      </form.Subscribe>
    </div>
  )
}

/** Form de alta de un recurso; "Agregar a la lista" dispara el commit en el padre. */
function RecursoForm({
  draft,
  onChange,
  onAdd,
  urlInvalida,
  disabled,
}: {
  draft: RecursoDraft
  onChange: (patch: Partial<RecursoDraft>) => void
  onAdd: () => void
  /** Calculado por `RecursosSection` (formato + dominio permitido); `false` con la URL vacía. */
  urlInvalida: boolean
  disabled: boolean
}) {
  // Rechazado en el picker (formato/tamaño): no llega al `draft`.
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null)
  // Tamaño solo para el preview: no viaja al backend.
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<{ nombre: string; size: number } | null>(
    null,
  )

  const FuenteIcon =
    draft.tipo === "Unidad virtual"
      ? ImageIcon
      : draft.tipo === "Archivo"
        ? FileUploadOutlinedIcon
        : null

  // "Unidad virtual" escribe en `draft.url` (`type="url"`): su ejemplo es un enlace.
  const fuentePlaceholder =
    draft.tipo === "Unidad virtual"
      ? "https://drive.google.com/file/d/..."
      : draft.tipo === "Archivo"
        ? "Nombre del archivo"
        : "https://..."

  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Recurso - Fuente</h4>
      </div>

      <Field variant="outlined" className="mt-3">
        <FieldLabel>Nombre</FieldLabel>
        <Input
          maxLength={100}
          placeholder="Nombre con el que se identifica este recurso…"
          value={draft.titulo}
          onChange={(e) => onChange({ titulo: e.target.value })}
          disabled={disabled}
        />
        <CharacterCounter value={draft.titulo} max={100} />
      </Field>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr]">
        <Field variant="outlined">
          <FieldLabel>Tipo</FieldLabel>
          <Select
            value={draft.tipo}
            onValueChange={(v) => {
              setErrorArchivo(null)
              setArchivoSeleccionado(null)
              onChange({
                tipo: (v ?? "URL") as Recurso["tipo"],
                // Al pasar a "Archivo" la URL se limpia (`<input type="file">` solo acepta "").
                url: v === "Archivo" ? "" : draft.url,
              })
            }}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="URL / Sitio web">
                {(value) => {
                  const pres = RECURSO_PRESENTACION[value as Recurso["tipo"]]
                  if (!pres) return "URL / Sitio web"
                  const Icon = pres.Icon
                  return (
                    <span className="flex items-center gap-2">
                      <Icon className="size-3.5" />
                      {pres.label}
                    </span>
                  )
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(RECURSO_PRESENTACION) as [Recurso["tipo"], RecursoPresentacion][]).map(
                ([value, { label, Icon }]) => (
                  <SelectItem key={value} value={value}>
                    <span className="flex items-center gap-2">
                      <Icon className="size-3.5" />
                      {label}
                    </span>
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </Field>

        <Field variant="outlined">
          <FieldLabel>Fuente</FieldLabel>
          <div className="relative">
            {FuenteIcon && (
              <FuenteIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            )}
            <Input
              type={draft.tipo === "Archivo" ? "file" : "url"}
              // Acá el `accept` sí va con chequeo real en `onChange` (Regla 82).
              {...(draft.tipo === "Archivo" ? { accept: RECURSO_ARCHIVO_ACCEPT_VALIDADO } : {})}
              placeholder={fuentePlaceholder}
              maxLength={500}
              // `<input type="file">` no acepta `value` programático (tira `InvalidStateError`).
              {...(draft.tipo === "Archivo" ? {} : { value: draft.url })}
              onChange={(e) => {
                // `e.target.value` es un fakepath: el preview necesita un blob URL del `File`.
                if (draft.tipo === "Archivo") {
                  const file = e.target.files?.[0]
                  // Se libera el blob anterior antes de pisarlo.
                  if (draft.url.startsWith("blob:")) {
                    URL.revokeObjectURL(draft.url)
                  }
                  if (!file) {
                    setErrorArchivo(null)
                    setArchivoSeleccionado(null)
                    onChange({ url: "", fuente: "" })
                    return
                  }
                  const extension = extensionDe(file.name)
                  if (!RECURSO_ARCHIVO_EXTENSIONES_PERMITIDAS.includes(extension)) {
                    setErrorArchivo(
                      `Formato ".${extension || "desconocido"}" no permitido. Usá: ${RECURSO_ARCHIVO_EXTENSIONES_PERMITIDAS.join(", ")}.`,
                    )
                    setArchivoSeleccionado(null)
                    onChange({ url: "", fuente: "" })
                    e.target.value = ""
                    return
                  }
                  if (file.size > RECURSO_ARCHIVO_MAX_BYTES) {
                    setErrorArchivo("El archivo supera el tamaño máximo permitido (20 MB).")
                    setArchivoSeleccionado(null)
                    onChange({ url: "", fuente: "" })
                    e.target.value = ""
                    return
                  }
                  setErrorArchivo(null)
                  setArchivoSeleccionado({ nombre: file.name, size: file.size })
                  const blobUrl = URL.createObjectURL(file)
                  // `fuente` guarda el nombre: el resolver lo usa para la extensión (los blob URLs no la tienen).
                  onChange({
                    url: blobUrl,
                    fuente: file.name,
                  })
                } else {
                  onChange({ url: e.target.value })
                }
              }}
              className={FuenteIcon ? "pl-9" : undefined}
              aria-invalid={Boolean(errorArchivo) || urlInvalida}
              disabled={disabled}
            />
          </div>
          {/* Preview "nombre · peso" con estado de validación (pedido de QA). */}
          {draft.tipo === "Archivo" && archivoSeleccionado && !errorArchivo && (
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <CheckCircleFillIcon className="text-green size-3.5 shrink-0" />
              {archivoSeleccionado.nombre} · {formatBytes(archivoSeleccionado.size)}
            </p>
          )}
          {errorArchivo && (
            <p className="text-red flex items-center gap-1.5 text-xs">
              <XCircleIcon className="size-3.5 shrink-0" />
              {errorArchivo}
            </p>
          )}
          {draft.tipo !== "Archivo" && urlInvalida && (
            <FieldError
              errors={[
                {
                  message:
                    "El enlace no es una URL válida o su dominio no está en la lista de sitios admitidos.",
                },
              ]}
            />
          )}
        </Field>
      </div>

      <Field variant="outlined" className="mt-3">
        <FieldLabel>Descripción / nota</FieldLabel>
        <Textarea
          className={TEXTAREA_OUTLINED}
          rows={2}
          placeholder="Ej: Video introductorio (7 min)"
          maxLength={500}
          value={draft.descripcion}
          onChange={(e) => onChange({ descripcion: e.target.value })}
          disabled={disabled}
        />
      </Field>

      {/* Se oculta (no se deshabilita) sin URL ni fuente. */}
      {(draft.url.trim() || draft.fuente.trim()) && (
        <div className="mt-3 flex justify-end">
          <Button
            variant="fill"
            color="primary"
            size="sm"
            type="button"
            onClick={onAdd}
            disabled={disabled || Boolean(errorArchivo) || urlInvalida}
          >
            <PlusIcon data-icon="inline-start" />
            {/* No dice "Guardar": solo agrega el borrador a la lista y se confundía con guardar la actividad. */}
            Agregar a la lista
          </Button>
        </div>
      )}
    </div>
  )
}

/** Recurso ya agregado, de solo lectura; las acciones aparecen al hover/foco. */
function RecursoItem({
  recurso,
  onRemove,
  onVerRecurso,
  disabled,
}: {
  recurso: Recurso
  onRemove: () => void
  onVerRecurso: () => void
  disabled: boolean
}) {
  const { label, Icon, bg, text } = RECURSO_PRESENTACION[recurso.tipo]

  return (
    // `relative` ancla el overlay de acciones; mismo hover que las filas de `DataTable`.
    <li className="group/recuro relative flex items-center gap-3 rounded-md border bg-card px-3 py-2 transition-colors hover:bg-muted-22">
      <span
        aria-hidden
        className={cn("flex size-10 shrink-0 items-center justify-center rounded-md", bg, text)}
      >
        <Icon className="size-6" />
      </span>

      {/* `pr-*` reserva el ancho del overlay de acciones. */}
      <div className="min-w-0 flex-1 pr-24">
        <p
          className="truncate text-sm font-semibold"
          title={recurso.fuente || recurso.url}
        >
          {/* Archivo: muestra el nombre (no tiene URL de este lado); enlace: la URL. */}
          {recurso.fuente || recurso.url || "(sin URL)"}
        </p>
        {recurso.descripcion && (
          <p className="text-muted-foreground truncate text-xs" title={recurso.descripcion}>
            {recurso.descripcion}
          </p>
        )}
      </div>

      <Badge variant="soft" className={cn("shrink-0 text-xs", bg, text)}>
        <Icon data-icon="inline-start" />
        {label}
      </Badge>

      {/* Overlay absoluto (no mueve el contenido al hover). Fondo con `color-mix` opaco:
      `muted-22` lleva alfa y se transparentaba sobre el badge. */}
      <div
        className={cn(
          "absolute inset-y-0 right-0 flex items-center gap-1 rounded-r-md bg-[color-mix(in_srgb,var(--muted)_28%,var(--card))] pl-2 pr-3 opacity-0 transition-opacity",
          "group-hover/recuro:opacity-100 group-has-[:focus-visible]/recuro:opacity-100",
        )}
      >
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                color="neutral"
                size="icon-sm"
                type="button"
                aria-label="Ver recurso"
                nativeButton={!(recurso.url || recurso.archivoId !== undefined)}
                render={
                  // Un material guardado no tiene `url`: se previsualiza por `archivoId`.
                  recurso.url || recurso.archivoId !== undefined
                    ? (
                      <Link
                        to={paths.app.planeadorRecursoPreview.getHref()}
                        search={{
                          tipo: recurso.tipo,
                          url: recurso.url,
                          fuente: recurso.fuente,
                          titulo: recurso.titulo,
                          descripcion: recurso.descripcion,
                          archivoId: recurso.archivoId,
                        }}
                        onClick={onVerRecurso}
                      />
                    )
                    : undefined
                }
              />
            }
          >
            <EyeIcon />
          </TooltipTrigger>
          <TooltipContent>Ver recurso</TooltipContent>
        </Tooltip>
        <SoloEdicion>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                color="neutral"
                size="icon-sm"
                type="button"
                aria-label="Quitar de la lista"
                onClick={onRemove}
                disabled={disabled}
              />
            }
          >
            <TrashIcon />
          </TooltipTrigger>
          <TooltipContent>Quitar de la lista</TooltipContent>
        </Tooltip>
        </SoloEdicion>
      </div>
    </li>
  )
}
