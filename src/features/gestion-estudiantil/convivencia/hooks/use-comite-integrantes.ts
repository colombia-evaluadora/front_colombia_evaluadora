import { useMemo, useState } from "react"

import { queueNotice, useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

import type { ComiteDetalle, PeriodoComite } from "@/features/gestion-estudiantil/convivencia/api/comite-types"
import {
  useAgregarIntegranteMutation,
  useCrearComiteMutation,
  useQuitarIntegranteMutation,
} from "@/features/gestion-estudiantil/convivencia/api/mutations/comite"
import { useCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/convivencia/api/validaciones"
import { useComiteNavegacion } from "@/features/gestion-estudiantil/convivencia/hooks/use-comite-navegacion"
import {
  datoDelCargo,
  dia,
  filaConError,
  filaDeCargoVacio,
  filaDeIntegrante,
  filaIntegranteVacia,
  integranteInput,
  validarFilaIntegrante,
  type DatoCargo,
  type ErrorFilaIntegrante,
  type FilaIntegrante,
} from "@/features/gestion-estudiantil/convivencia/utils/comite"

/** Código del cargo del Rector en CARGO_COMITE_CONVIVENCIA: se precarga con el rector previsto y no se cambia. */
export const CARGO_RECTOR = "RECTOR"

/** Dato que pide cada cargo: el de los cargos vacíos y, para los ya ocupados, el que se deduce de su integrante. */
function cargosConocidos(comite: ComiteDetalle): Map<string, DatoCargo> {
  const m = new Map<string, DatoCargo>()
  for (const i of comite.integrantes)
    m.set(String(i.fk_tlv_cargo), i.fk_funcionario != null ? "FUNCIONARIO" : i.fk_matricula != null ? "ESTUDIANTE" : "NOMBRE")
  for (const c of comite.cargos_vacios) m.set(String(c.fk_tlv_cargo), c.dato)
  return m
}

const hoy = () => new Date().toISOString().slice(0, 10)

/** Todos los cargos que se conocen del Comité, para elegirlos al agregar o avisar los que faltan. */
function cargosDelComite(comite: ComiteDetalle, conocidos: Map<string, DatoCargo>) {
  const m = new Map<string, { fk_tlv_cargo: number; cargo_codigo: string; cargo_nombre: string; dato: DatoCargo }>()
  for (const i of comite.integrantes)
    m.set(String(i.fk_tlv_cargo), {
      fk_tlv_cargo: i.fk_tlv_cargo,
      cargo_codigo: i.cargo_codigo,
      cargo_nombre: i.cargo_nombre,
      dato: datoDelCargo(conocidos, String(i.fk_tlv_cargo)) as DatoCargo,
    })
  for (const c of comite.cargos_vacios) m.set(String(c.fk_tlv_cargo), c)
  return [...m.values()]
}

interface Params {
  periodo: PeriodoComite
  comite: ComiteDetalle
  periodos: PeriodoComite[]
}

/** Estado, validación y envío de «Integrantes del Comité» (G.2.COM.INT.1): crear el Comité o completar el existente. */
export function useComiteIntegrantes({ periodo, comite, periodos }: Params) {
  const existe = comite.fk_comite != null
  const inicio = dia(periodo.fecha_inicio)
  const fin = dia(periodo.fecha_fin)
  const { notify } = useNotify()
  const nav = useComiteNavegacion()
  const conocidos = useMemo(() => cargosConocidos(comite), [comite])

  const rector = comite.rector_previsto
  // Orden de la Lista de Valores «Cargo en el Comité de Convivencia»; un cargo sin elegir va al final.
  const catalogoCargos = useCatalogo("CARGO_COMITE_CONVIVENCIA")
  const ordenDe = (fkCargo: string | number) => {
    const i = catalogoCargos.findIndex((c) => c.value === String(fkCargo))
    return i < 0 ? catalogoCargos.length : i
  }
  const cargos = [...cargosDelComite(comite, conocidos)].sort((a, b) => ordenDe(a.fk_tlv_cargo) - ordenDe(b.fk_tlv_cargo))
  // Un integrante vigente por cargo: los reemplazados son historia de las actas, no se editan aquí.
  const [filas, setFilas] = useState<FilaIntegrante[]>(() => [
    ...comite.integrantes.filter((i) => !i.hasta || dia(i.hasta) >= hoy()).map((i) => filaDeIntegrante(i, datoDelCargo(conocidos, String(i.fk_tlv_cargo)))),
    ...comite.cargos_vacios.map((c) => {
      const fila = filaDeCargoVacio(c, inicio)
      return c.cargo_codigo === CARGO_RECTOR && rector
        ? { ...fila, fk_funcionario: rector.fk_funcionario, nombre: rector.nombre }
        : fila
    }),
  ])
  const [quitados, setQuitados] = useState<number[]>([])
  const [copiarDe, setCopiarDe] = useState("")
  const [intento, setIntento] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const crear = useCrearComiteMutation()
  const agregar = useAgregarIntegranteMutation()
  const quitar = useQuitarIntegranteMutation()

  const periodosCopiables = periodos.filter((p) => p.fk_comite != null && p.fk_periodo !== periodo.fk_periodo)

  const conPersona = (f: FilaIntegrante) => f.fk_funcionario != null || f.fk_matricula != null || f.nombre.trim() !== ""
  const nuevas = filas.filter((f) => f.id == null)
  /** Filas nuevas sin persona se ignoran: el aviso de cargos sin integrante ya las señala. */
  const aEnviar = nuevas.filter(conPersona)

  const errores = useMemo(() => {
    const e: Record<string, ErrorFilaIntegrante> = {}
    if (!intento) return e
    for (const f of aEnviar) {
      const err = validarFilaIntegrante(f, inicio, fin)
      if (filaConError(err)) e[f.key] = err
    }
    return e
  }, [intento, aEnviar, inicio, fin])

  /** Cargos que el Comité exige y aún no tienen una persona (ni guardada ni en el constructor). */
  const cargosSinIntegrante = cargos.filter(
    (c) => !filas.some((f) => String(c.fk_tlv_cargo) === f.fk_tlv_cargo && (f.id != null || conPersona(f))),
  )

  const esRectorBloqueado = (f: FilaIntegrante) =>
    f.id == null && f.codigo === CARGO_RECTOR && rector != null && f.fk_funcionario === rector.fk_funcionario

  const cambiar = (key: string, patch: Partial<FilaIntegrante>) =>
    setFilas((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)))

  /** Cargos que una fila puede tomar: los que no ocupa otra fila. */
  const opcionesCargo = (f: FilaIntegrante) =>
    cargos
      .filter((c) => String(c.fk_tlv_cargo) === f.fk_tlv_cargo || !filas.some((x) => x.fk_tlv_cargo === String(c.fk_tlv_cargo)))
      .map((c) => ({ value: String(c.fk_tlv_cargo), label: c.cargo_nombre }))
  const puedeAgregar = cargos.some((c) => !filas.some((x) => x.fk_tlv_cargo === String(c.fk_tlv_cargo)))
  const agregarFila = () => setFilas((prev) => [...prev, filaIntegranteVacia(inicio)])
  const elegirCargo = (key: string, valor: string) => {
    const c = cargos.find((x) => String(x.fk_tlv_cargo) === valor)
    const esRector = c?.cargo_codigo === CARGO_RECTOR && rector != null
    cambiar(key, {
      fk_tlv_cargo: valor,
      dato: c?.dato ?? null,
      codigo: c?.cargo_codigo ?? "",
      cargo_nombre: c?.cargo_nombre ?? "",
      fk_funcionario: esRector ? rector.fk_funcionario : null,
      fk_matricula: null,
      nombre: esRector ? rector.nombre : "",
    })
  }

  const quitarFila = (f: FilaIntegrante) => {
    if (f.id != null) setQuitados((q) => [...q, f.id as number])
    setFilas((prev) => prev.filter((x) => x.key !== f.key))
  }

  async function guardar() {
    setIntento(true)
    const invalidas = aEnviar.some((f) => filaConError(validarFilaIntegrante(f, inicio, fin)))
    if (invalidas) {
      notify("Revise los campos marcados.", { variant: "error" })
      enfocarPrimerError()
      return
    }
    if (!existe && aEnviar.length === 0 && !copiarDe) {
      notify("Registre al menos un integrante o copie los de otro período.", { variant: "error" })
      return
    }
    if (existe && aEnviar.length === 0 && quitados.length === 0) {
      notify("No hay cambios por guardar.", { variant: "info" })
      return
    }
    setGuardando(true)
    try {
      if (!existe) {
        await crear.mutateAsync({
          FK_PERIODO: periodo.fk_periodo,
          ...(copiarDe && { COPIAR_DE_PERIODO: Number(copiarDe) }),
          INTEGRANTES: aEnviar.map(integranteInput),
        })
      } else {
        // Primero se agrega y luego se quita, para no dejar un cargo vacío entre un paso y otro.
        for (const f of aEnviar) {
          const i = integranteInput(f)
          await agregar.mutateAsync({
            comiteId: comite.fk_comite as number,
            FK_TLV_CARGO: i.fk_tlv_cargo,
            FK_FUNCIONARIO: i.fk_funcionario,
            FK_MATRICULA: i.fk_matricula,
            NOMBRE: i.nombre,
            DESDE: i.desde,
          })
        }
        for (const id of quitados) await quitar.mutateAsync({ integranteId: id })
      }
      queueNotice(existe ? "Integrantes del Comité actualizados." : "Comité registrado.", { variant: "success" })
      nav.aPestana(periodo.fk_periodo)
    } catch (error) {
      // 409 si el integrante ya asistió a una sesión: el mensaje del backend lo explica.
      notify(getErrorMessage(error), { variant: "error" })
    } finally {
      setGuardando(false)
    }
  }

  return {
    existe,
    inicio,
    fin,
    filas: [...filas].sort((a, b) => ordenDe(a.fk_tlv_cargo) - ordenDe(b.fk_tlv_cargo)),
    errores,
    intento,
    guardando,
    copiarDe,
    setCopiarDe,
    periodosCopiables,
    cargosSinIntegrante,
    esRectorBloqueado,
    cambiar,
    quitarFila,
    opcionesCargo,
    puedeAgregar,
    agregarFila,
    elegirCargo,
    guardar,
    volver: () => nav.aPestana(periodo.fk_periodo),
  }
}

export type ComiteIntegrantesState = ReturnType<typeof useComiteIntegrantes>
