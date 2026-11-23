import { Button } from "@/components/ui/button"
import { CheckCircleFillIcon, EyeIcon, FileTextIcon, WarningCircleIcon, XCircleIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

import type { DocumentoVerificado } from "@/features/publico/verificar/datos-demo"

/** El estado del documento: qué significa y qué debe hacer quien lo verifica. */
export function EstadoDocumento({ documento }: { documento: DocumentoVerificado }) {
  const carne = documento.tipo === "CARNE"
  const ui = {
    VIGENTE: {
      tono: "green",
      Icono: CheckCircleFillIcon,
      titulo: carne ? "Carné vigente" : "Documento auténtico",
      texto: carne
        ? "Lo emitió la plataforma Control Escolar y el estudiante tiene matrícula vigente en el establecimiento."
        : "Lo emitió la plataforma Control Escolar y es la versión vigente.",
    },
    REEMPLAZADO: {
      tono: "yellow",
      Icono: WarningCircleIcon,
      titulo: "Documento reemplazado",
      texto: `Existe una versión más reciente, generada el ${documento.reemplazadoEl}. Pida el documento actualizado al establecimiento.`,
    },
    ANULADO: {
      tono: "red",
      Icono: XCircleIcon,
      titulo: "Documento anulado",
      texto: "Este documento ya no es válido. Pida al establecimiento un documento vigente.",
    },
  }[documento.estado]
  const { Icono } = ui

  return (
    <section
      role="status"
      className={cn(
        "flex gap-3 rounded-lg border p-4",
        ui.tono === "green" && "border-green-stroke bg-green-22",
        ui.tono === "yellow" && "border-yellow-stroke bg-yellow-22",
        ui.tono === "red" && "border-red-stroke bg-red-22",
      )}
    >
      <Icono
        aria-hidden
        className={cn(
          "mt-0.5 size-6 shrink-0",
          ui.tono === "green" && "text-green",
          ui.tono === "yellow" && "text-yellow",
          ui.tono === "red" && "text-red",
        )}
      />
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">{ui.titulo}</h2>
        <p className="text-sm">{ui.texto}</p>
      </div>
    </section>
  )
}

/** Datos del documento (sin exponer datos personales: nombre y documento enmascarados). */
export function DetalleDocumento({ documento }: { documento: DocumentoVerificado }) {
  return (
    <dl className="overflow-hidden rounded-lg border text-sm">
      {documento.detalle.map((d) => (
        <div key={d.etiqueta} className="grid grid-cols-[minmax(0,14rem)_1fr] border-b last:border-b-0">
          <dt className="bg-muted/40 text-muted-foreground border-r px-4 py-3">{d.etiqueta}</dt>
          <dd className="px-4 py-3">{d.valor}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Las dos formas de comprobar el contenido: con el PDF (que no fue alterado) o
 * con el impreso (ver el contenido original). Un documento anulado solo deja
 * comprobar el archivo; el carné no tiene contenido que ver.
 */
export function AccionesDocumento({
  documento,
  onVerContenido,
  onComprobar,
}: {
  documento: DocumentoVerificado
  onVerContenido: () => void
  onComprobar: () => void
}) {
  if (!documento.contenido) return null
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">¿Tiene el PDF?</p>
        <Button variant="outline" color="neutral" className="w-full" onClick={onComprobar}>
          <FileTextIcon data-icon="inline-start" />
          Comprobar el archivo
        </Button>
      </div>
      {documento.estado !== "ANULADO" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">¿Tiene el documento impreso?</p>
          <Button variant="outline" color="neutral" className="w-full" onClick={onVerContenido}>
            <EyeIcon data-icon="inline-start" />
            Ver el contenido
          </Button>
        </div>
      )}
    </div>
  )
}
