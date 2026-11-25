import type { DatoFicha } from "@/components/ficha-datos"

import type { PruebaDTO } from "@/features/gestion-estudiantil/convivencia/api/procesos-detalle-types"
import { ChipArchivo } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/chip-archivo"

/** Fila «Pruebas» de la `FichaDatos` de una etapa: descripción y archivo como chip; «Ninguna» si no hay. */
export function datoPruebas(pruebas: PruebaDTO[] | undefined): DatoFicha {
  return {
    etiqueta: "Pruebas",
    ancho: true,
    valor: pruebas?.length ? (
      <ul className="flex flex-col gap-2">
        {pruebas.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-2">
            <span>{p.descripcion}</span>
            {p.archivo && <ChipArchivo archivo={p.archivo} />}
          </li>
        ))}
      </ul>
    ) : (
      "Ninguna"
    ),
  }
}
