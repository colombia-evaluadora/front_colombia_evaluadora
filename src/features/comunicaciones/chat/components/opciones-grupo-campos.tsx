import { CharacterCounter } from "@/components/ui/character-counter"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { ImageUploadField } from "@/components/image-upload-field"
import { ArchivoImage } from "@/features/files/components/archivo-image"
import type { ModoGrupo } from "@/features/comunicaciones/chat/api/types"
import type { OpcionesGrupo } from "@/features/comunicaciones/chat/api/mutations/use-acciones-conversacion"
import type { PerfilChat } from "@/features/comunicaciones/chat/lib/politica-chat"
import { MODOS_GRUPO, PERFILES_ESCRITURA } from "@/features/comunicaciones/chat/lib/modo-grupo"

const DESCRIPCION_MAX = 500

// comms-service acepta JPG, PNG, WebP o GIF de hasta 2 MB para la imagen del grupo.
const IMAGEN_ACCEPT = "image/jpeg,image/png,image/webp,image/gif"
const IMAGEN_HINT = "JPG, PNG, WebP o GIF · Máximo 2 MB"

/**
 * Descripción e imagen (opcionales) y quién escribe en un grupo: Abierto, Solo lectura o Moderado
 * con los perfiles elegidos. Se usa al crear y al editar el grupo; quien lo crea lo cambia cuando
 * quiera. `imagenActual`: la guardada (edición), que se puede reemplazar o quitar.
 */
export function OpcionesGrupoCampos({
  value,
  onChange,
  imagenActual,
  idPrefijo,
}: {
  value: OpcionesGrupo
  onChange: (v: OpcionesGrupo) => void
  imagenActual?: number | null
  idPrefijo: string
}) {
  const moderadoSinPerfiles = value.modo === "MODERADO" && value.rolesEscritura.length === 0
  const conImagenGuardada = imagenActual != null && value.imagen === undefined

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor={`${idPrefijo}-descripcion`} className="text-sm font-medium">
          Descripción <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <Textarea
          id={`${idPrefijo}-descripcion`}
          value={value.descripcion}
          maxLength={DESCRIPCION_MAX}
          rows={3}
          onChange={(e) => onChange({ ...value, descripcion: e.target.value })}
          placeholder="De qué trata el grupo"
        />
        <CharacterCounter value={value.descripcion} max={DESCRIPCION_MAX} />
      </div>

      <div className="space-y-1.5">
        <span className="text-sm font-medium">
          Imagen <span className="font-normal text-muted-foreground">(opcional)</span>
        </span>
        <ImageUploadField
          value={value.imagen ?? null}
          // Quitar el archivo recién elegido vuelve a "sin cambios"; la guardada se quita con su X.
          onValueChange={(imagen) => onChange({ ...value, imagen: imagen ?? undefined })}
          accept={IMAGEN_ACCEPT}
          hint={IMAGEN_HINT}
          description="la imagen del grupo"
          deleteLabel="Quitar imagen"
          existingPreview={
            conImagenGuardada ? (
              <ArchivoImage archivoId={imagenActual} alt="Imagen actual del grupo" className="size-full object-cover" />
            ) : undefined
          }
          onRemoveExisting={conImagenGuardada ? () => onChange({ ...value, imagen: null }) : undefined}
          className="h-32"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium">¿Quién puede escribir?</legend>
        <RadioGroup
          value={value.modo}
          onValueChange={(v) => onChange({ ...value, modo: v as ModoGrupo })}
          className="space-y-2"
        >
          {MODOS_GRUPO.map((m) => (
            <label key={m.valor} className="flex items-start gap-2 text-sm">
              <RadioGroupItem value={m.valor} className="mt-0.5" />
              <span>
                <span className="font-medium">{m.etiqueta}</span>
                <span className="block text-muted-foreground">{m.ayuda}</span>
              </span>
            </label>
          ))}
        </RadioGroup>
        {value.modo === "MODERADO" && (
          <fieldset
            aria-describedby={moderadoSinPerfiles ? `${idPrefijo}-perfiles-error` : undefined}
            className="ml-6 flex flex-wrap gap-x-5 gap-y-2"
          >
            <legend className="sr-only">Perfiles que pueden escribir</legend>
            {PERFILES_ESCRITURA.map((p) => (
              <label key={p.valor} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={value.rolesEscritura.includes(p.valor)}
                  onCheckedChange={(v) =>
                    onChange({
                      ...value,
                      rolesEscritura: v
                        ? [...value.rolesEscritura, p.valor]
                        : value.rolesEscritura.filter((x: PerfilChat) => x !== p.valor),
                    })
                  }
                />
                {p.etiqueta}
              </label>
            ))}
            {moderadoSinPerfiles && (
              <p id={`${idPrefijo}-perfiles-error`} className="w-full text-xs text-red">
                Elige al menos un perfil que pueda escribir.
              </p>
            )}
          </fieldset>
        )}
      </fieldset>
    </div>
  )
}
