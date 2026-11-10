import { SoportesUpload } from "@/features/gestion-estudiantil/commons/components/soportes-upload"

interface Props {
  label: string
  archivos: File[]
  onChange: (archivos: File[]) => void
  error?: string
}

/** Un archivo (PDF, JPG o PNG, 10 MB) con su error de validación debajo. */
export function CampoArchivo({ label, archivos, onChange, error }: Props) {
  return (
    <div className="flex flex-col gap-1" data-invalid={Boolean(error) || undefined}>
      <SoportesUpload label={label} max={1} archivos={archivos} onChange={onChange} />
      {error && (
        <p role="alert" className="text-xs text-red">
          {error}
        </p>
      )}
    </div>
  )
}
