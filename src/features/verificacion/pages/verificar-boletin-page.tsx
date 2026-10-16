import { useEffect, useState } from "react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

import logo from "@/assets/logo.svg"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  CheckCircleIcon,
  FileDownloadOutlinedIcon,
  WarningIcon,
  XCircleIcon,
} from "@/components/ui/icons"
import { toDigitsOnly } from "@/lib/text-input"
import { cn } from "@/lib/utils"
import { verificarBoletinRoute } from "@/router"
import {
  isOfflineVerificationError,
  pdfErrorMessage,
  useBoletinPdf,
  useBoletinVerificacion,
  type BoletinVerificacion,
} from "@/features/verificacion/api/boletin-verificacion"

const fecha = (iso: string | null) => {
  if (!iso) return "—"
  try {
    return format(parseISO(iso), "d 'de' MMMM 'de' yyyy, h:mm a", { locale: es })
  } catch {
    return iso
  }
}

function StatusCard({ data }: { data: BoletinVerificacion }) {
  const config = {
    VIGENTE: {
      tone: "green",
      Icon: CheckCircleIcon,
      title: "Boletín auténtico y vigente",
      text: `Emitido el ${fecha(data.emitidoEn)}, sin cambios desde entonces.`,
    },
    ACTUALIZADO: {
      tone: "yellow",
      Icon: WarningIcon,
      title: "Boletín auténtico, pero actualizado",
      text: `Emitido el ${fecha(data.emitidoEn)}; la información cambió el ${fecha(data.actualizadoEn)}. Abajo puedes ver la versión vigente.`,
    },
    REEMPLAZADO: {
      tone: "yellow",
      Icon: WarningIcon,
      title: "Este boletín fue reemplazado por una versión posterior",
      text: "Abajo puedes ver la versión vigente.",
    },
    NO_VALIDO: {
      tone: "red",
      Icon: XCircleIcon,
      title: "Código no válido",
      text: "No encontramos un boletín con este código. Verifica que el código esté completo o contacta a la institución.",
    },
  }[data.estado]
  const { Icon } = config
  return (
    <section
      role="status"
      className={cn(
        "flex gap-3 rounded-xl border p-4 sm:p-5",
        config.tone === "green" && "border-green-stroke bg-green-22",
        config.tone === "yellow" && "border-yellow-stroke bg-yellow-22",
        config.tone === "red" && "border-red-stroke bg-red-22",
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "mt-0.5 size-7 shrink-0",
          config.tone === "green" && "text-green",
          config.tone === "yellow" && "text-yellow",
          config.tone === "red" && "text-red",
        )}
      />
      <div className="space-y-1">
        <h2 className="text-lg leading-snug font-semibold">{config.title}</h2>
        <p className="text-sm text-muted-foreground">{config.text}</p>
      </div>
    </section>
  )
}

function Detalles({ data }: { data: BoletinVerificacion }) {
  const items: [string, string | null][] = [
    ["Institución", data.institucion],
    ["Sede", data.sede],
    ["Periodo", data.periodo],
    ["Fecha de emisión", data.emitidoEn ? fecha(data.emitidoEn) : null],
  ]
  const visibles = items.filter(([, v]) => v)
  if (visibles.length === 0) return null
  return (
    <section className="rounded-xl border bg-card p-4 sm:p-5">
      <h2 className="mb-3 text-base font-semibold">Datos del boletín</h2>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {visibles.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="text-sm font-medium break-words">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/**
 * Segundo factor: los últimos 4 dígitos del documento del estudiante. Viven
 * solo en el estado local del input (ni URL ni storage) y se limpian al
 * obtener el PDF.
 */
function PdfVigente({ codigo }: { codigo: string }) {
  const [digitos, setDigitos] = useState("")
  const pdf = useBoletinPdf()
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!pdf.data) return
    const u = URL.createObjectURL(pdf.data)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [pdf.data])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (digitos.length !== 4 || pdf.isPending) return
    pdf.mutate({ codigo, ultimos4: digitos }, { onSuccess: () => setDigitos("") })
  }

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Versión vigente</h2>
        {url && (
          <Button nativeButton={false} render={<a href={url} download={`boletin-${codigo}.pdf`} />}>
            <FileDownloadOutlinedIcon data-icon="inline-start" />
            Descargar PDF
          </Button>
        )}
      </div>

      {!url && (
        <form onSubmit={onSubmit} className="space-y-3" noValidate>
          <label htmlFor="ultimos4" className="block text-sm">
            Para ver el boletín, escribe los últimos 4 dígitos del documento del estudiante.
          </label>
          <div className="flex gap-2">
            <Input
              id="ultimos4"
              inputMode="numeric"
              autoComplete="off"
              placeholder="0000"
              maxLength={4}
              value={digitos}
              onChange={(e) => setDigitos(toDigitsOnly(e.target.value, 4))}
              aria-invalid={pdf.isError || undefined}
              aria-describedby={pdf.isError ? "ultimos4-error" : undefined}
              className="w-28 text-center tracking-[0.4em]"
            />
            <Button type="submit" disabled={digitos.length !== 4 || pdf.isPending}>
              {pdf.isPending && <Spinner data-icon="inline-start" />}
              Ver boletín
            </Button>
          </div>
          {pdf.isError && (
            <p id="ultimos4-error" role="alert" className="text-sm text-red">
              {pdfErrorMessage(pdf.error)}
            </p>
          )}
        </form>
      )}

      {url && (
        <object
          data={url}
          type="application/pdf"
          aria-label="Boletín en PDF"
          className="h-[70vh] min-h-96 w-full rounded-md border"
        >
          <p className="p-4 text-sm text-muted-foreground">
            Tu navegador no puede mostrar el PDF aquí. Usa “Descargar PDF”.
          </p>
        </object>
      )}
    </section>
  )
}

export function VerificarBoletinPage() {
  const { codigo } = verificarBoletinRoute.useParams()
  const query = useBoletinVerificacion(codigo)

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <img src={logo} alt="Colombia Evaluadora" className="h-9 w-auto" />
          <div className="min-w-0">
            <p className="text-sm leading-tight font-semibold">Colombia Evaluadora</p>
            <p className="text-xs text-muted-foreground">Verificación de boletín</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        {query.isPending && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Spinner /> Verificando boletín…
          </div>
        )}
        {query.isError && (
          <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-6 text-center">
            <p className="text-sm">
              {isOfflineVerificationError(query.error)
                ? "No pudimos verificar el boletín porque no hay conexión. Intenta de nuevo cuando tengas internet."
                : "No pudimos verificar el boletín en este momento. Intenta de nuevo en unos minutos."}
            </p>
            <Button variant="outline" onClick={() => query.refetch()}>
              Reintentar
            </Button>
          </div>
        )}
        {query.data && (
          <>
            <StatusCard data={query.data} />
            {query.data.estado !== "NO_VALIDO" && (
              <>
                <Detalles data={query.data} />
                <PdfVigente codigo={codigo} />
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
