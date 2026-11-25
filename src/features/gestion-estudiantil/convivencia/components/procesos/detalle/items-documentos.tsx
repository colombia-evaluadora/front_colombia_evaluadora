import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { FilePdfIcon } from "@/components/ui/icons";
import { useNotify } from "@/components/notice/notice-context";

import {
  descargarDocumentoProceso,
  type DocumentoProceso,
} from "@/features/gestion-estudiantil/convivencia/api/descargar-reportes";
import type { ProcesoDetalle } from "@/features/gestion-estudiantil/convivencia/api/procesos-types";

const DOCUMENTOS: { clave: DocumentoProceso; etiqueta: string }[] = [
  { clave: "comunicacion_cargos", etiqueta: "Descargar comunicación de cargos" },
  { clave: "acta_descargos", etiqueta: "Generar acta de descargos" },
  { clave: "resolucion", etiqueta: "Generar resolución" },
];

/**
 * Entradas de documentos (G.2.PRD.DOC.1-3) para el menú ⋮ del encabezado. Cada PDF lo genera
 * reporting-service y solo se habilita si el backend lo marca disponible en `documentos`.
 */
export function ItemsDocumentos({ procesoId, documentos }: { procesoId: number; documentos: ProcesoDetalle["documentos"] }) {
  const { notify } = useNotify();
  const descargar = async (clave: DocumentoProceso) => {
    try {
      const r = await descargarDocumentoProceso(clave, procesoId);
      if (r.status === "error") notify(r.message, { variant: "error" });
    } catch {
      notify("No se pudo descargar el documento. Intente de nuevo.", { variant: "error" });
    }
  };
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuLabel>Documentos</DropdownMenuLabel>
        {DOCUMENTOS.map(({ clave, etiqueta }) => (
          <DropdownMenuItem key={clave} disabled={!documentos?.[clave]} onClick={() => void descargar(clave)}>
            <FilePdfIcon />
            {etiqueta}
          </DropdownMenuItem>
        ))}
      </DropdownMenuGroup>
    </>
  );
}
