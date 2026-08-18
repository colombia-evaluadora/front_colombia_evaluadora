import { useEffect, useState, type ReactNode } from "react"

import {
    Attachment,
    AttachmentAction,
    AttachmentActions,
    AttachmentMedia,
} from "@/components/ui/attachment"
import { FileUpload, FileUploadDropzone } from "@/components/ui/file-upload"
import { ImageIcon, XIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

interface ImageUploadFieldProps {
    value: File | null
    onValueChange: (file: File | null) => void
    /** MIME types aceptados; debe coincidir con lo que diga `hint`. */
    accept?: string
    /** Tamaño máximo en bytes; debe coincidir con lo que diga `hint`. */
    maxSize?: number
    /** Segunda línea del dropzone: qué se está cargando. */
    description: ReactNode
    /** Tercera línea: formatos y tamaño permitidos. */
    hint?: ReactNode
    /** Etiqueta accesible del botón de borrado. */
    deleteLabel?: string
    /**
     * Imagen YA guardada en el servidor, para el modo edición. Ocupa la caja
     * entera mientras no se elija un archivo nuevo —igual que la vista previa
     * de uno recién cargado—, y el área sigue sirviendo para reemplazarla.
     *
     * Llega como nodo y no como id/URL para que este componente siga siendo
     * genérico: quién sabe resolver un `pk_tarchivo` es la capa de features,
     * no `components/`.
     */
    existingPreview?: ReactNode
    /** Se aplica a la caja exterior: es por acá que se le cambia el alto. */
    className?: string
}

/**
 * Carga de una sola imagen: dropzone con arrastrar-y-soltar mientras está
 * vacío y, una vez hay archivo, la vista previa sola —sin nombre ni peso—
 * ocupando la misma caja.
 *
 * El campo **nunca crece con su contenido**: por dentro es una caja vacía con
 * todo posicionado encima, así que una imagen grande, un skeleton o el texto
 * del dropzone no pueden estirar la fila del grid donde esté. Quien lo usa
 * solo decide el alto —`row-span`, `h-*` o el `min-h` por defecto— y no tiene
 * que envolverlo en nada.
 */
export function ImageUploadField({
    value,
    onValueChange,
    accept = "image/jpeg,image/png,image/svg+xml",
    maxSize = 2 * 1024 * 1024,
    description,
    hint = "JPG, PNG o SVG · Máximo 2 MB",
    deleteLabel = "Eliminar imagen",
    existingPreview,
    className,
}: ImageUploadFieldProps) {
    // La vista previa necesita una URL: se revoca al cambiar de archivo o al
    // desmontar para no filtrar el blob.
    const [preview, setPreview] = useState<string | null>(null)
    useEffect(() => {
        if (!value) {
            setPreview(null)
            return
        }

        const url = URL.createObjectURL(value)
        setPreview(url)

        return () => URL.revokeObjectURL(url)
    }, [value])

    return (
        // Esta caja es lo único que mide: se estira al alto que le dé quien la
        // ponga (una celda con `row-span`, por ejemplo) y, si no le dan
        // ninguno, cae en el `min-h`. Va `relative` para ser el marco del
        // contenido, que va absoluto y por eso no aporta altura propia.
        <div className={cn("relative h-full min-h-28 w-full", className)}>
            <FileUpload
                value={value ? [value] : []}
                onValueChange={(files) => onValueChange(files[0] ?? null)}
                accept={accept}
                maxFiles={1}
                maxSize={maxSize}
                // `overflow-hidden`: lo que no quepa se recorta en vez de
                // desbordarse sobre los campos vecinos.
                className="absolute inset-0 overflow-hidden"
            >
                {value ? (
                    // La tarjeta llena la misma caja que ocupaba el dropzone en vez
                    // de quedar en el ancho fijo de `orientation="vertical"`
                    // (`w-24`), de ahí el `w-full`.
                    <Attachment
                        orientation="vertical"
                        // `flex-nowrap` porque la variante trae `flex-wrap`, y en
                        // columna con alto fijo eso parte el contenido en dos.
                        className="h-full w-full flex-nowrap"
                    >
                        {/*
                            El alto lo pone la fila, no la imagen: la vista previa va
                            posicionada sobre el medio (que ya es `relative
                            overflow-hidden`) para que su tamaño natural no empuje la
                            caja y termine estirando las filas del grid.

                            Siempre `object-contain`: se ve el archivo completo, que
                            es lo que el usuario acaba de elegir, sin recortes.
                        */}
                        <AttachmentMedia
                            variant="image"
                            className="aspect-auto min-h-0 w-full flex-1 *:[img]:absolute *:[img]:inset-0 *:[img]:aspect-auto *:[img]:size-full *:[img]:object-contain"
                        >
                            {preview ? <img src={preview} alt={value.name} /> : null}
                        </AttachmentMedia>
                        <AttachmentActions>
                            {/* Neutral: borrar la imagen no es la acción principal
                                de la tarjeta, y en primario competía con el resto
                                del formulario. */}
                            <AttachmentAction
                                color="neutral"
                                aria-label={deleteLabel}
                                onClick={() => onValueChange(null)}
                            >
                                <XIcon />
                            </AttachmentAction>
                        </AttachmentActions>
                    </Attachment>
                ) : existingPreview ? (
                    // Con imagen ya guardada se ve igual que la vista previa de un
                    // archivo recién elegido —la imagen sola, contenida, sin ícono
                    // ni textos—, pero encima sigue siendo el dropzone: el mismo
                    // click que antes cargaba, ahora reemplaza.
                    <FileUploadDropzone className="h-full w-full overflow-hidden rounded-lg border-solid bg-muted/20 p-2">
                        {/*
                            Absoluto y con la imagen forzada a `size-full
                            object-contain`: el tamaño natural del archivo no
                            interviene, así que ni empuja la caja ni se recorta.
                        */}
                        <div className="absolute inset-2 *:size-full *:object-contain">
                            {existingPreview}
                        </div>
                    </FileUploadDropzone>
                ) : (
                    // El área completa dispara el selector de archivos (el propio
                    // `FileUploadDropzone` maneja click, drop y Enter/Espacio), así
                    // que acá no va un botón aparte: el "clic aquí" del título es
                    // solo la señal visual de esa afordancia.
                    // `overflow-hidden` + contenido compacto: la caja la dimensiona
                    // la fila del grid, no el dropzone, así que si el espacio queda
                    // justo el contenido se recorta en vez de estirar la fila.
                    <FileUploadDropzone className="h-full w-full gap-1 overflow-hidden rounded-lg bg-muted/20 px-3 py-3">
                        <ImageIcon className="size-8 shrink-0 text-muted-foreground" />
                        {/*
                            Los tres textos van en un bloque propio: el `gap` del
                            dropzone separa el ícono del texto, y acá adentro no va
                            `space-y` —solo el interlineado— para que se lean como
                            un único párrafo centrado y quepan en la caja.
                        */}
                        <div>
                            <p className="m-0! text-xs leading-snug font-semibold text-balance">
                                Arrastra y suelta o <span className="text-primary">haz clic aquí</span>
                            </p>
                            <p className="m-0! text-[11px] leading-snug font-medium text-balance">
                                {description}
                            </p>
                            {hint ? (
                                <p className="m-0! text-[10px] leading-snug text-muted-foreground">
                                    {hint}
                                </p>
                            ) : null}
                        </div>
                    </FileUploadDropzone>
                )}
            </FileUpload>
        </div>
    )
}
