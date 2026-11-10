import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import { queueNotice, useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { paths } from "@/config/paths"

import { useActualizarCaso, useCrearCaso } from "@/features/gestion-estudiantil/convivencia/api/mutations/casos"
import { useGestorPrevistoQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-casos-query"
import { codigoDe, useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { esGrave } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import type { CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"
import type { InvolucradoFila } from "@/features/gestion-estudiantil/convivencia/api/form-types"
import { campoDeMensaje, erroresInvolucrado, useSecuelasHabilitadas, type CampoCaso } from "@/features/gestion-estudiantil/convivencia/api/validaciones"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import {
  actualizarCasoInput,
  CAMPOS_SIUCE,
  crearCasoInput,
  desdeCaso,
  fechasDe,
  validarCaso,
  type ErroresCaso,
  type ValoresCaso,
} from "@/features/gestion-estudiantil/convivencia/utils/caso-form"

/** Estado, validación y envío del formulario de Nuevo caso / Modificar caso (3.1, G.2.CAS.GES.3). */
export function useCasoForm(caso: CasoDetalle | undefined) {
  const editar = caso != null
  const navigate = useNavigate()
  const { notify } = useNotify()
  const [v, setValores] = useState<ValoresCaso>(() => desdeCaso(caso))
  // Error del backend que nombra un campo (22023 de V209): se marca en él además del banner, hasta el siguiente cambio.
  const [errorServidor, setErrorServidor] = useState<{ campo: CampoCaso; mensaje: string } | null>(null)
  const setV = (next: ValoresCaso) => {
    setValores(next)
    setErrorServidor(null)
  }
  const set = (patch: Partial<ValoresCaso>) => setV({ ...v, ...patch })
  const [inicial] = useState(() => fechasDe(desdeCaso(caso)))
  const [intento, setIntento] = useState(false)
  // Plegado al abrir (G.2.CAS.NUE.3); se abre solo en Tipo II/III, donde sus campos son obligatorios.
  const [siuceAbierto, setSiuceAbierto] = useState(() => esGrave(caso?.tipo_codigo))

  const tipos = useCatalogo("TIPO_SITUACION")
  const tipoCodigo = codigoDe(tipos, v.tipo)
  const grave = esGrave(tipoCodigo)
  const secuelas = useSecuelasHabilitadas(v.siuce)
  const fechasCambiaron = editar && fechasDe(v) !== inicial

  const matriculas = v.estudiantes.map((e) => e.fk_matricula)
  const previsto = useGestorPrevistoQuery(!editar && v.tipo ? Number(v.tipo) : null, editar ? [] : matriculas)

  const tiposInv = useCatalogo("TIPO_INVOLUCRADO")
  const rolesSit = useCatalogo("ROL_SITUACION")
  const involucradoConError = (i: InvolucradoFila) =>
    erroresInvolucrado(i, codigoDe(tiposInv, i.tipo), codigoDe(rolesSit, i.rol), v.involucrados) != null
  const validarTodo = () =>
    validarCaso(v, { grave, tipoI: tipoCodigo === "TIPO_I", secuelas, fechasCambiaron, involucradoConError })
  const errores: ErroresCaso = intento ? validarTodo() : {}
  if (errorServidor && !errores[errorServidor.campo]) errores[errorServidor.campo] = errorServidor.mensaje

  const volver = () =>
    navigate({ to: editar ? paths.app.convivenciaCaso.getHref(caso.id) : paths.app.convivencia.getHref() })
  const onError = (error: Error) => {
    const mensaje = getErrorMessage(error)
    notify(mensaje, { variant: "error" })
    const campo = campoDeMensaje(mensaje)
    if (campo) {
      setErrorServidor({ campo, mensaje })
      if ((CAMPOS_SIUCE as readonly string[]).includes(campo)) setSiuceAbierto(true)
      enfocarPrimerError()
    }
  }

  const crear = useCrearCaso({
    mutationConfig: {
      onSuccess: () => {
        const p = previsto.data
        queueNotice(
          p && !p.sin_gestor && p.nombre
            ? `Caso de convivencia creado y asignado a ${p.nombre}.`
            : "Caso de convivencia creado.",
          { variant: "success" },
        )
        navigate({ to: paths.app.convivencia.getHref() })
      },
      onError,
    },
  })
  const actualizar = useActualizarCaso({
    mutationConfig: {
      onSuccess: () => {
        queueNotice("Caso de convivencia modificado.", { variant: "success" })
        volver()
      },
      onError,
    },
  })
  const guardando = crear.isPending || actualizar.isPending

  function guardar() {
    setIntento(true)
    setErrorServidor(null)
    const e = validarTodo()
    if (Object.keys(e).length) {
      if (CAMPOS_SIUCE.some((c) => e[c])) setSiuceAbierto(true)
      notify("Revise los campos marcados.", { variant: "error" })
      enfocarPrimerError()
      return
    }
    if (!editar) {
      crear.mutate(crearCasoInput(v, secuelas))
      return
    }
    actualizar.mutate(actualizarCasoInput(caso, v, secuelas, fechasCambiaron))
  }

  /** El tipo abre el bloque SIUCE si pasa a Tipo II/III. */
  function cambiarTipo(tipo: string) {
    set({ tipo })
    if (esGrave(codigoDe(tipos, tipo))) setSiuceAbierto(true)
  }

  return {
    editar,
    v,
    set,
    errores,
    intento,
    grave,
    fechasCambiaron,
    tipos,
    tipoLabel: tipos.find((t) => t.value === v.tipo)?.label,
    cambiarTipo,
    siuceAbierto,
    setSiuceAbierto,
    /** Gestor que asignará el backend; solo al crear, con tipo y estudiantes. */
    gestorPrevisto: !editar && v.tipo && matriculas.length > 0 ? previsto.data : undefined,
    guardando,
    guardar,
    volver,
  }
}

export type CasoFormState = ReturnType<typeof useCasoForm>
