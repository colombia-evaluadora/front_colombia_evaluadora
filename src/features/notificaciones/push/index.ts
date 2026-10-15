// Punto de entrada de Web Push para `features/notificaciones` (campana,
// página, preferencias): montan `<PushToggle/>` en su slot y usan
// `onSwPushMessage` / `closeSystemNotification` para el leído entre pestañas.
export { PushToggle } from "@/features/notificaciones/push/components/push-toggle"
export { PushDevicesList } from "@/features/notificaciones/push/components/push-devices-list"
export {
  closeSystemNotification,
  onSwPushMessage,
  SW_PUSH_MESSAGES,
  type SwPushMessage,
} from "@/features/notificaciones/push/lib/push-client"
