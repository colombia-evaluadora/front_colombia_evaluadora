import type { ReactElement } from "react"
import type { IconBaseProps, IconType } from "react-icons"
import { GoShieldLock } from "react-icons/go"
import {
  MdAccessTime,
  MdAccountCircle,
  MdAdd,
  MdAddCircleOutline,
  MdArrowBack,
  MdArrowDownward,
  MdArrowForward,
  MdArrowUpward,
  MdAttachFile,
  MdAttachMoney,
  MdAutorenew,
  MdBackspace,
  MdBadge,
  MdBolt,
  MdCalendarMonth,
  MdCancel,
  MdCancelPresentation,
  MdChat,
  MdChatBubbleOutline,
  MdCheck,
  MdCheckCircle,
  MdCircle,
  MdClose,
  MdContrast,
  MdDarkMode,
  MdDelete,
  MdDescription,
  MdDownload,
  MdEdit,
  MdOutlineChromeReaderMode,
  MdOutlineEmail,
  MdErrorOutline,
  MdFilterAlt,
  MdFolderOpen,
  MdFormatBold,
  MdFormatItalic,
  MdFormatUnderlined,
  MdGroup,
  MdHelpOutline,
  MdHome,
  MdInfoOutline,
  MdKey,
  MdKeyboardArrowDown,
  MdKeyboardArrowLeft,
  MdKeyboardArrowRight,
  MdKeyboardArrowUp,
  MdLightMode,
  MdLinkOff,
  MdLockOutline,
  MdLogin,
  MdLogout,
  MdManageSearch,
  MdMoreHoriz,
  MdOutlinePassword,
  MdOutlineShield,
  MdPalette,
  MdPictureAsPdf,
  MdPersonOutline,
  MdRadioButtonUnchecked,
  MdRefresh,
  MdRemove,
  MdOutlineRemoveModerator,
  MdSchool,
  MdSearch,
  MdOutlineSend,
  MdSettings,
  MdOutlineSmartDisplay,
  MdSupportAgent,
  MdTableChart,
  MdTimelapse,
  MdUnfoldMore,
  MdVerifiedUser,
  MdViewColumn,
  MdViewSidebar,
  MdVisibility,
  MdVisibilityOff,
  MdWarningAmber,
} from "react-icons/md"

/**
 * Props de un ícono. Extiende las de `react-icons` (className, style, size,
 * data-*, aria-*, etc.) y tolera `weight` por compatibilidad con la API de
 * Phosphor — Material Icons no tiene pesos, así que se acepta pero se ignora.
 */
export type IconProps = IconBaseProps & {
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone"
}

/** Tipo de un componente de ícono (reemplaza al `Icon` de Phosphor). */
export type Icon = (props: IconProps) => ReactElement

// Envuelve un ícono de react-icons para descartar `weight` (Phosphor) y dejar
// pasar el resto de props al `<svg>`. Mantiene el tree-shaking: solo se
// incluyen en el bundle los `Md*` realmente importados arriba.
function makeIcon(Base: IconType): Icon {
  return function IconWrapper({ weight: _weight, ...props }: IconProps) {
    return <Base {...props} />
  }
}

export const ArrowCounterClockwiseIcon = makeIcon(MdRefresh)
export const ArrowDownIcon = makeIcon(MdArrowDownward)
export const ArrowLeftIcon = makeIcon(MdArrowBack)
export const ArrowRightIcon = makeIcon(MdArrowForward)
export const ArrowUpIcon = makeIcon(MdArrowUpward)
export const BookOpenIcon = makeIcon(MdOutlineChromeReaderMode)
export const CalendarIcon = makeIcon(MdCalendarMonth)
export const CaretDownIcon = makeIcon(MdKeyboardArrowDown)
export const CaretLeftIcon = makeIcon(MdKeyboardArrowLeft)
export const CaretRightIcon = makeIcon(MdKeyboardArrowRight)
export const CaretUpDownIcon = makeIcon(MdUnfoldMore)
export const CaretUpIcon = makeIcon(MdKeyboardArrowUp)
export const ChatCircleDotsIcon = makeIcon(MdChatBubbleOutline)
export const ChatCircleTextIcon = makeIcon(MdChat)
export const CheckCircleIcon = makeIcon(MdCheckCircle)
export const CheckIcon = makeIcon(MdCheck)
export const CircleDashedIcon = makeIcon(MdRadioButtonUnchecked)
export const CircleHalfIcon = makeIcon(MdContrast)
export const CircleIcon = makeIcon(MdCircle)
export const ClockCountdownIcon = makeIcon(MdTimelapse)
export const ClockIcon = makeIcon(MdAccessTime)
export const ColumnsIcon = makeIcon(MdViewColumn)
export const CurrencyDollarIcon = makeIcon(MdAttachMoney)
export const DotsThreeIcon = makeIcon(MdMoreHoriz)
export const DownloadSimpleIcon = makeIcon(MdDownload)
export const EnvelopeIcon = makeIcon(MdOutlineEmail)
export const EraserIcon = makeIcon(MdBackspace)
export const EyeIcon = makeIcon(MdVisibility)
export const EyeSlashIcon = makeIcon(MdVisibilityOff)
export const FilePdfIcon = makeIcon(MdPictureAsPdf)
export const FileTextIcon = makeIcon(MdDescription)
export const FileXlsIcon = makeIcon(MdTableChart)
export const FolderOpenIcon = makeIcon(MdFolderOpen)
export const FunnelIcon = makeIcon(MdFilterAlt)
export const GearIcon = makeIcon(MdSettings)
export const GraduationCapIcon = makeIcon(MdSchool)
export const HeadsetIcon = makeIcon(MdSupportAgent)
export const HouseIcon = makeIcon(MdHome)
export const IdentificationCardIcon = makeIcon(MdBadge)
export const InfoIcon = makeIcon(MdInfoOutline)
export const KeyIcon = makeIcon(MdKey)
export const LightningIcon = makeIcon(MdBolt)
export const LockIcon = makeIcon(MdLockOutline)
export const LinkBreakIcon = makeIcon(MdLinkOff)
export const ListMagnifyingGlassIcon = makeIcon(MdManageSearch)
export const MagnifyingGlassIcon = makeIcon(MdSearch)
export const MinusIcon = makeIcon(MdRemove)
export const MoonIcon = makeIcon(MdDarkMode)
export const PaletteIcon = makeIcon(MdPalette)
export const PasswordIcon = makeIcon(MdOutlinePassword)
export const PaperPlaneTiltIcon = makeIcon(MdOutlineSend)
export const PaperclipIcon = makeIcon(MdAttachFile)
export const PencilIcon = makeIcon(MdEdit)
export const PlusCircleIcon = makeIcon(MdAddCircleOutline)
export const PlusIcon = makeIcon(MdAdd)
export const QuestionIcon = makeIcon(MdHelpOutline)
export const ShieldCheckIcon = makeIcon(MdVerifiedUser)
export const ShieldIcon = makeIcon(MdOutlineShield)
export const ShieldOffIcon = makeIcon(MdOutlineRemoveModerator)
export const ShieldLockIcon = makeIcon(GoShieldLock)
export const SidebarIcon = makeIcon(MdViewSidebar)
export const SignInIcon = makeIcon(MdLogin)
export const SignOutIcon = makeIcon(MdLogout)
export const SpinnerIcon = makeIcon(MdAutorenew)
export const SunIcon = makeIcon(MdLightMode)
export const TextBIcon = makeIcon(MdFormatBold)
export const TextItalicIcon = makeIcon(MdFormatItalic)
export const TextUnderlineIcon = makeIcon(MdFormatUnderlined)
export const TrashIcon = makeIcon(MdDelete)
export const VideoIcon = makeIcon(MdOutlineSmartDisplay)
export const PersonIcon = makeIcon(MdPersonOutline)
export const UserCircleIcon = makeIcon(MdAccountCircle)
export const UsersIcon = makeIcon(MdGroup)
export const WarningCircleIcon = makeIcon(MdErrorOutline)
export const WarningIcon = makeIcon(MdWarningAmber)
export const XCircleIcon = makeIcon(MdCancel)
export const XIcon = makeIcon(MdClose)
export const XSquareIcon = makeIcon(MdCancelPresentation)
