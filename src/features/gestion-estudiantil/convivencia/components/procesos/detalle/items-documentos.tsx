import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { FilePdfIcon } from "@/components/ui/icons";

/**
 * Entradas de documentos (G.2.PRD.DOC.1-3) para el menú ⋮ del encabezado. Los PDF los genera
 * reporting-service y aún no existen: las tres van deshabilitadas, sin importar los booleanos de `documentos`.
 */
export function ItemsDocumentos() {
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuLabel>Documentos</DropdownMenuLabel>
        <DropdownMenuItem disabled>
          <FilePdfIcon />
          Descargar comunicación de cargos
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <FilePdfIcon />
          Generar acta de descargos
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <FilePdfIcon />
          Generar resolución
        </DropdownMenuItem>
      </DropdownMenuGroup>
    </>
  );
}
