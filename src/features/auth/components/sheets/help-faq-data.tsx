import type { ReactNode } from "react"
import type { Icon } from "@/components/ui/icons"
import { Link } from "@tanstack/react-router"
import {
  BookOpenIcon,
  EnvelopeIcon,
  HeadsetIcon,
  PasswordIcon,
  PersonIcon,
  ShieldOffIcon,
  VideoIcon,
} from "@/components/ui/icons"

import { paths } from "@/config/paths"

export interface HelpLink {
  title: string
  description: string
  icon: Icon
  to?: string
}

export interface HelpFaq {
  id: string
  title: string
  description: string
  icon: Icon
  /**
   * Cuerpo del FAQ cuando se expande. `ReactNode` (no string) para poder
   * anidar `<Link>`, `<strong>`, `<br />`, etc. directo desde el data.
   */
  body: ReactNode
}

export interface HelpSection {
  title: string
  items: HelpLink[]
}

export interface HelpSupport {
  title: string
  icon: Icon
  email: string
  phone: string
  hours: string
}

export interface HelpSheetData {
  title: string
  description: string
  faqs: HelpFaq[]
  sections: HelpSection[]
  support: HelpSupport
}

const supportLinkClass =
  "text-primary mt-3 inline-flex items-center gap-1 font-medium underline underline-offset-3 hover:text-primary/80"

export const defaultHelpData: HelpSheetData = {
  title: "¿Necesitas ayuda?",
  description: "Estamos aquí para ayudarte.",
  faqs: [
    {
      id: "forgot-password",
      title: "Olvidé mi contraseña",
      description: "Restablece tu contraseña de forma segura.",
      icon: PasswordIcon,
      body: (
        <p>
          Si olvidaste tu contraseña, selecciona{" "}
          <strong>"Recuperar contraseña"</strong>, ingresa tu correo
          institucional y sigue las instrucciones que recibirás para crear
          una nueva.
          <br />
          <Link
            to={paths.auth.forgotPassword.path}
            className={supportLinkClass}
          >
            Ir a recuperar contraseña →
          </Link>
        </p>
      ),
    },
    {
      id: "forgot-username",
      title: "No recuerdo mi correo",
      description: "Recupera tu correo con tu número de documento.",
      icon: PersonIcon,
      body: (
        <p>
          Ingresas con el correo que registraste. Si no lo recuerdas,
          selecciona "Recuperar correo" e ingresa tu número de documento para
          consultarlo.
          <br />
          <Link
            to={paths.auth.forgotUsername.path}
            className={supportLinkClass}
          >
            Recuperar correo →
          </Link>
        </p>
      ),
    },
    {
      id: "blocked-account",
      title: "Mi cuenta está bloqueada",
      description: "Conoce por qué ocurre y cómo solicitar el desbloqueo.",
      icon: ShieldOffIcon,
      body: (
        <p>
          Tu cuenta ha sido bloqueada por disposición administrativa del
          establecimiento educativo. Para gestionar el desbloqueo,
          acércate al encargado del sistema en tu institución y presenta
          la solicitud correspondiente. Recuerda que el acceso solo será
          restablecido una vez validada la autorización por parte del
          área administrativa.
        </p>
      ),
    },
    {
      id: "no-recovery-email",
      title: "No recibí el correo de recuperación",
      description: "Revisa las posibles causas y solicita un nuevo envío.",
      icon: EnvelopeIcon,
      body: (
        <div className="space-y-3">
          <p>Verifica la carpeta de Spam o Correo no deseado.</p>
          <p>
            Si después de unos minutos no lo encuentras, acércate primero
            al encargado del sistema en tu establecimiento educativo para
            validar el estado de tu cuenta y solicitar el desbloqueo o
            nuevo envío.
          </p>
          <p>
            Solo en caso de requerir soporte adicional, podrás ser
            remitido a la mesa de ayuda.
          </p>
        </div>
      ),
    },
  ],
  sections: [
    {
      title: "Recursos",
      items: [
        {
          title: "Manual de usuario",
          description: "Guía paso a paso para usar la plataforma.",
          icon: BookOpenIcon,
          to: "/",
        },
        {
          title: "Video: ¿Cómo ingresar por primera vez?",
          description: "Mira el tutorial en menos de 3 minutos.",
          icon: VideoIcon,
          to: "/",
        },
      ],
    },
  ],
  support: {
    title: "Mesa de ayuda",
    icon: HeadsetIcon,
    email: "soporte@colombiaevaluadora.edu.co",
    phone: "+57 (601) 123 4567",
    hours: "Lunes a viernes · 8:00 a. m. a 6:00 p. m.",
  },
}
