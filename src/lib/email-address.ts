/**
 * Regla única de formato de correo para crear o editar cuentas y personas.
 *
 * La parte local (antes de la @) solo admite ASCII: letras sin tilde, números
 * y los signos de RFC 5322. Es la misma regla que `EmailAddressPolicy` del SSO
 * (auth-center / sso-admin): el `@Email` de Java deja pasar tildes y ñ, pero
 * los proveedores de correo no entregan a esas direcciones y casi siempre son
 * un error de tipeo ("nacale.uninorte.edú@gmail.com"). El dominio sigue tan
 * permisivo como antes.
 */
export const CORREO_REGEX = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[^\s@]+\.[^\s@]+$/

export const MENSAJE_CORREO_INVALIDO =
  "Ingresa un correo electrónico válido: antes de la @ solo letras sin tilde, números y . _ - +, sin ñ ni espacios."
