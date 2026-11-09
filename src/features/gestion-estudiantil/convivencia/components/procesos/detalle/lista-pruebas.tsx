import type { PruebaDTO } from "@/features/gestion-estudiantil/convivencia/api/procesos-detalle-types"
import { Dato } from "@/features/gestion-estudiantil/convivencia/components/detalle/dato"
import { ChipArchivo } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/chip-archivo"

/** Pruebas con su descripción y el archivo como chip; «Ninguna» si no hay. */
export function ListaPruebas({ pruebas }: { pruebas: PruebaDTO[] | undefined }) {
  return (
    <Dato label="Pruebas">
      {pruebas?.length ? (
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
      )}
    </Dato>
  )
}
