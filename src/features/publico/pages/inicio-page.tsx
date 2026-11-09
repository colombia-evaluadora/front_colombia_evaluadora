import { useState, type ComponentType } from "react"
import { Link, useNavigate } from "@tanstack/react-router"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ClockCountdownIcon,
  EnvelopeIcon,
  ListChecksIcon,
  MagnifyingGlassIcon,
  PersonAddIcon,
  ShieldCheckIcon,
  ShieldLockIcon,
  ChalkboardTeacherIcon,
  UsersIcon,
  EyeSlashIcon,
} from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { paths } from "@/config/paths"

type Icon = ComponentType<{ className?: string; "aria-hidden"?: boolean }>

const SERVICIOS: { icon: Icon; title: string; text: string; cta: string; to: string }[] = [
  {
    icon: PersonAddIcon,
    title: "Inscribir",
    text: "Inscripciones abiertas, con hasta 3 opciones de cupo en orden de preferencia, de uno o de varios establecimientos.",
    cta: "Inscribir",
    to: paths.publico.inscribir.getHref(),
  },
  {
    icon: MagnifyingGlassIcon,
    title: "Consultar inscripción",
    text: "Vea el estado de cada opción, su posición en el orden de admisión y su número de sorteo. Elija una opción o anule la inscripción.",
    cta: "Consultar mi inscripción",
    to: paths.publico.consultarInscripcion.getHref(),
  },
  {
    icon: ShieldCheckIcon,
    title: "Verificar un documento",
    text: "Compruebe con el código o el QR que un boletín, certificado, constancia o carné es auténtico, y si fue reemplazado o anulado.",
    cta: "Verificar un documento",
    to: paths.publico.verificar.getHref(),
  },
]

const PASOS = [
  { title: "Datos", text: "Del aspirante y de su acudiente." },
  { title: "Opciones de cupo", text: "Grado y hasta 3 opciones." },
  { title: "Código al correo", text: "Válido por 15 minutos." },
  { title: "Comprobante", text: "Con el número de inscripción." },
]

const PROTECCION: { icon: Icon; title: string; text: string }[] = [
  { icon: EnvelopeIcon, title: "Verificación por correo", text: "Cada trámite se confirma con un código que vence en 15 minutos." },
  { icon: EyeSlashIcon, title: "Sin exponer datos", text: "No mostramos datos de personas antes de verificar." },
  { icon: ClockCountdownIcon, title: "Intentos limitados", text: "5 intentos por código y bloqueo de 15 minutos." },
  { icon: ListChecksIcon, title: "Con trazabilidad", text: "Las acciones importantes quedan en la Bitácora." },
]

// El prototipo no trae el texto de las preguntas: redactadas con los datos de
// los informes (Cobertura §3.3, Adm. §12.4 y §13). Pendientes de validar.
const PREGUNTAS = [
  {
    q: "¿Necesito una cuenta para inscribir a un aspirante?",
    a: "No. La inscripción se confirma con un código que enviamos al correo del acudiente y vale 15 minutos. Al terminar recibe el comprobante con el número de inscripción.",
  },
  {
    q: "¿Cuántas opciones de cupo puedo elegir?",
    a: "Hasta 3, en orden de preferencia, de uno o de varios establecimientos.",
  },
  {
    q: "¿Cómo sé si un documento es auténtico?",
    a: "Escriba el código que aparece junto al código QR del documento, o escanee el QR. Verá si el documento es auténtico, si fue reemplazado por una versión más reciente o si fue anulado.",
  },
  {
    q: "Olvidé mi contraseña, ¿qué hago?",
    a: "Use ¿Olvidó su contraseña? con su número de documento. Si corresponde a una cuenta activa, le enviamos un enlace al correo registrado que vale 1 hora.",
  },
  {
    q: "¿Qué pasa si me equivoco varias veces?",
    a: "Después de 5 intentos fallidos el acceso se bloquea 15 minutos por seguridad.",
  },
]

/** U.1.INI.1 Página de inicio pública. No muestra datos de ninguna persona (Regla 31). */
export function InicioPage() {
  return (
    <>
      <Hero />
      <Section title="Sin crear una cuenta" subtitle="Tres servicios abiertos a cualquier persona, protegidos con un código que llega al correo.">
        <div className="grid gap-4 md:grid-cols-3">
          {SERVICIOS.map((s) => (
            <article key={s.title} className="bg-card flex flex-col gap-3 rounded-xl border p-6">
              <IconTile icon={s.icon} />
              <h3 className="text-lg leading-snug font-bold">{s.title}</h3>
              <p className="text-muted-foreground flex-1 text-sm">{s.text}</p>
              <Button variant="outline" color="primary" className="self-start" nativeButton={false} render={<Link to={s.to} />}>
                {s.cta}
              </Button>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Cómo se inscribe un aspirante" muted>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PASOS.map((p, i) => (
            <li key={p.title} className="flex gap-3">
              <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full font-bold">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold">{p.title}</p>
                <p className="text-muted-foreground text-sm">{p.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Si ya tiene cuenta" subtitle="El mismo ingreso para todos; la plataforma muestra lo que corresponde a cada perfil.">
        <div className="grid gap-4 md:grid-cols-2">
          <article className="bg-card flex gap-4 rounded-xl border p-6">
            <IconTile icon={UsersIcon} />
            <div>
              <h3 className="text-base leading-snug font-bold">Acudientes y estudiantes</h3>
              <p className="text-muted-foreground text-sm">
                Consulte el avance académico, la matrícula, el seguimiento y las comunicaciones, y mantenga sus datos al día en Mi cuenta.
              </p>
            </div>
          </article>
          <article className="bg-card flex gap-4 rounded-xl border p-6">
            <IconTile icon={ChalkboardTeacherIcon} />
            <div>
              <h3 className="text-base leading-snug font-bold">Funcionarios de los establecimientos</h3>
              <p className="text-muted-foreground text-sm">
                Cobertura, gestión académica y estudiantil, comunicaciones y reportes, según el rol de cada persona.
              </p>
            </div>
          </article>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button color="primary" nativeButton={false} render={<Link to={paths.auth.login.getHref()} />}>
            Iniciar sesión
          </Button>
          <Link to={paths.auth.forgotPassword.getHref()} className="text-primary text-sm hover:underline">
            ¿Olvidó su contraseña?
          </Link>
        </div>
      </Section>

      <Section title="Su información está protegida" muted>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PROTECCION.map((p) => (
            <li key={p.title} className="flex flex-col gap-2">
              <IconTile icon={p.icon} />
              <p className="font-semibold">{p.title}</p>
              <p className="text-muted-foreground text-sm">{p.text}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Preguntas frecuentes">
        <Accordion className="bg-card rounded-xl border px-4">
          {PREGUNTAS.map((p) => (
            <AccordionItem key={p.q} value={p.q}>
              <AccordionTrigger>{p.q}</AccordionTrigger>
              <AccordionContent>{p.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Section>
    </>
  )
}

function Hero() {
  return (
    <section className="bg-primary/10">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-8 lg:grid-cols-[1.3fr_1fr] lg:py-16">
        <div className="flex flex-col items-start gap-5">
          <Badge variant="soft" color="info">Plataforma de control escolar</Badge>
          <h1 className="text-navy dark:text-foreground text-4xl font-extrabold text-balance sm:text-5xl">
            La vida escolar de su establecimiento, en un solo lugar
          </h1>
          <p className="text-muted-foreground text-lg">
            Inscriba a un aspirante, consulte el estado de su inscripción y verifique documentos oficiales sin crear una cuenta.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" color="primary" nativeButton={false} render={<Link to={paths.publico.inscribir.getHref()} />}>
              <PersonAddIcon data-icon="inline-start" />
              Inscribir
            </Button>
            <Button size="lg" variant="outline" color="neutral" className="bg-background" nativeButton={false} render={<Link to={paths.publico.consultarInscripcion.getHref()} />}>
              <MagnifyingGlassIcon data-icon="inline-start" />
              Consultar mi inscripción
            </Button>
          </div>
          <p className="text-sm">
            ¿Ya tiene cuenta?{" "}
            <Link to={paths.auth.login.getHref()} className="text-primary hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </div>
        <VerificarCard />
      </div>
    </section>
  )
}

function VerificarCard() {
  const navigate = useNavigate()
  const [codigo, setCodigo] = useState("")
  const limpio = codigo.trim()

  return (
    <form
      className="bg-card flex flex-col gap-4 rounded-xl border p-6 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault()
        if (limpio) navigate({ to: paths.verificarBoletin.getHref(limpio) })
      }}
    >
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <ShieldLockIcon className="text-primary size-5" aria-hidden="true" />
        Verificar un documento
      </h2>
      <label htmlFor="inicio-codigo" className="text-muted-foreground text-sm">
        Escriba el código que aparece junto al código QR del documento.
      </label>
      <Input
        id="inicio-codigo"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        placeholder="K7QM-4XPA-9TRB"
        autoComplete="off"
        spellCheck={false}
      />
      <Button type="submit" color="primary" disabled={!limpio}>
        Verificar
      </Button>
    </form>
  )
}

function Section({ title, subtitle, muted, children }: { title: string; subtitle?: string; muted?: boolean; children: React.ReactNode }) {
  return (
    <section className={muted ? "bg-muted/40" : undefined}>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
        <h2 className="text-navy dark:text-foreground text-2xl font-bold">{title}</h2>
        {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </section>
  )
}

function IconTile({ icon: Icon }: { icon: Icon }) {
  return (
    <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-lg">
      <Icon className="size-5" aria-hidden />
    </span>
  )
}
