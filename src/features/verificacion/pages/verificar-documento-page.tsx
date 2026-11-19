import { Navigate } from "@tanstack/react-router"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

import { PublicBreadcrumb } from "@/components/public/public-page"
import { Button } from "@/components/ui/button"
import { CheckCircleIcon, WarningIcon, XCircleIcon } from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { paths } from "@/config/paths"
import { cn } from "@/lib/utils"
import { verificarDocumentoRoute } from "@/router"
import { isOfflineVerificationError } from "@/features/verificacion/api/boletin-verificacion"
import {
  useDocumentoVerificacion,
  type CarneVerificacion,
} from "@/features/verificacion/api/documento-verificacion"

const fecha = (iso: string | null) => {
  if (!iso) return "—"
  try {
    return format(parseISO(iso), "d 'de' MMMM 'de' yyyy", { locale: es })
  } catch {
    return iso
  }
}

type Tono = "green" | "yellow" | "red"

function Resultado({ tono, titulo, texto }: { tono: Tono; titulo: string; texto: string }) {
  const Icon = tono === "green" ? CheckCircleIcon : tono === "yellow" ? WarningIcon : XCircleIcon
  return (
    <section
      role="status"
      className={cn(
        "flex gap-3 rounded-xl border p-4 sm:p-5",
        tono === "green" && "border-green-stroke bg-green-22",
        tono === "yellow" && "border-yellow-stroke bg-yellow-22",
        tono === "red" && "border-red-stroke bg-red-22",
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "mt-0.5 size-7 shrink-0",
          tono === "green" && "text-green",
          tono === "yellow" && "text-yellow",
          tono === "red" && "text-red",
        )}
      />
      <div className="space-y-1">
        <h2 className="text-base font-semibold">{titulo}</h2>
        <p className="text-sm">{texto}</p>
      </div>
    </section>
  )
}

const NO_ENCONTRADO = {
  tono: "red" as const,
  titulo: "No encontrado",
  texto: "No encontramos un documento con este código. Verifique que esté completo o contacte al establecimiento.",
}

/** Resultado del carné (Cobertura Educativa, Sección 2.18): el documento y si la matrícula sigue Cursando. */
function Carne({ c }: { c: CarneVerificacion }) {
  const resultado =
    c.estado === "VIGENTE"
      ? { tono: "green" as const, titulo: "Documento auténtico", texto: `Carné estudiantil emitido el ${fecha(c.emitidoEn)}.` }
      : c.estado === "REEMPLAZADO"
        ? {
            tono: "yellow" as const,
            titulo: "Reemplazado",
            texto: `Este carné es auténtico, pero se generó uno más reciente${c.reemplazadoEn ? ` el ${fecha(c.reemplazadoEn)}` : ""}.`,
          }
        : c.estado === "ANULADO"
          ? { tono: "red" as const, titulo: "Anulado", texto: "La matrícula de este carné fue anulada: el documento ya no es válido." }
          : NO_ENCONTRADO
  if (c.estado === "NO_VALIDO") return <Resultado {...resultado} />

  const filas: [string, string][] = [
    ["Tipo de documento", "Carné estudiantil"],
    ["Establecimiento", [c.institucion, c.dane ? `DANE ${c.dane}` : null].filter(Boolean).join(" · ") || "—"],
    ["Titular", [c.titular, c.documentoUltimos4 ? `documento terminado en ${c.documentoUltimos4}` : null].filter(Boolean).join(" · ") || "—"],
    ["Grado y grupo", c.gradoGrupo ?? "—"],
    ["Sede y jornada", [c.sede, c.jornada].filter(Boolean).join(" · ") || "—"],
    ["Vigencia", c.vigencia ? `Hasta el ${fecha(c.vigencia)}` : c.anio ?? "—"],
  ]
  return (
    <>
      <Resultado {...resultado} />
      {c.estado !== "ANULADO" ? (
        <Resultado
          tono={c.matriculaVigente ? "green" : "yellow"}
          titulo={c.matriculaVigente ? "Carné vigente" : "El estudiante ya no tiene matrícula vigente"}
          texto={
            c.matriculaVigente
              ? "El estudiante sigue con matrícula Cursando en el establecimiento."
              : "A la fecha de esta consulta, el estudiante no tiene matrícula Cursando en el establecimiento."
          }
        />
      ) : null}
      <dl className="grid overflow-hidden rounded-xl border bg-card text-sm sm:grid-cols-[auto_1fr]">
        {filas.map(([t, v]) => (
          <div key={t} className="contents">
            <dt className="border-b bg-muted/40 px-4 py-2.5 text-muted-foreground">{t}</dt>
            <dd className="border-b px-4 py-2.5">{v}</dd>
          </div>
        ))}
      </dl>
    </>
  )
}

/**
 * Verificación pública por código (Administración del Sistema, Sección 12.4):
 * `/verificar/<código>`, a donde apunta el QR. El boletín sigue en su página
 * (`/verificar/b/<código>`, con el PDF y el segundo factor): aquí solo se redirige.
 */
export function VerificarDocumentoPage() {
  const { codigo } = verificarDocumentoRoute.useParams()
  const query = useDocumentoVerificacion(codigo)

  if (query.data?.tipo === "BOLETIN") return <Navigate to={paths.verificarBoletin.getHref(codigo)} replace />

  return (
    // El encabezado y el pie los pone PublicLayout.
    <div className="text-foreground">
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <PublicBreadcrumb items={["Verificar un documento", "Resultado"]} className="text-muted-foreground" />
        <h1 className="text-navy dark:text-foreground text-2xl font-bold">Verificación de documento</h1>
        <p className="text-sm text-muted-foreground">
          Código <span className="font-mono font-semibold text-foreground">{codigo}</span>
        </p>
        {query.isPending && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Spinner /> Verificando documento…
          </div>
        )}
        {query.isError && (
          <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-6 text-center">
            <p className="text-sm">
              {isOfflineVerificationError(query.error)
                ? "No pudimos verificar el documento porque no hay conexión. Intente de nuevo cuando tenga internet."
                : "No pudimos verificar el documento en este momento. Intente de nuevo en unos minutos."}
            </p>
            <Button variant="outline" onClick={() => query.refetch()}>
              Reintentar
            </Button>
          </div>
        )}
        {query.data?.tipo === "CARNE" ? <Carne c={query.data.carne} /> : null}
        {query.data?.tipo === null ? <Resultado {...NO_ENCONTRADO} /> : null}
      </div>
    </div>
  )
}
