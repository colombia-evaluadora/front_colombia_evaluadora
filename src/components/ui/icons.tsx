import type { ReactElement } from "react"
import type { IconBaseProps, IconType } from "react-icons"
import { GoShieldLock } from "react-icons/go"
import { IoMdCheckboxOutline } from "react-icons/io"
import {
  MdAddCircleOutline,
  MdAssignmentAdd,
  MdChatBubbleOutline,
  MdCheckCircle,
  MdCheckCircleOutline,
  MdCircle,
  MdErrorOutline,
  MdHelpOutline,
  MdInfoOutline,
  MdLockOutline,
  MdOutlineAccessTime,
  MdOutlineAccountBalance,
  MdOutlineAccountCircle,
  MdOutlineAdd,
  MdOutlineAdminPanelSettings,
  MdOutlineAlternateEmail,
  MdOutlineApartment,
  MdOutlineApps,
  MdOutlineArchive,
  MdOutlineArrowBack,
  MdOutlineArrowDownward,
  MdOutlineArrowDropDown,
  MdOutlineArrowDropUp,
  MdOutlineArrowForward,
  MdOutlineArrowUpward,
  MdOutlineAssignment,
  MdOutlineAssignmentTurnedIn,
  MdOutlineAttachFile,
  MdOutlineUpload,
  MdOutlineCallMerge,
  MdOutlineAttachMoney,
  MdOutlineAudiotrack,
  MdOutlineAutoAwesome,
  MdOutlineAutorenew,
  MdOutlineBackspace,
  MdOutlineBadge,
  MdOutlineBarChart,
  MdOutlineBlock,
  MdOutlineBolt,
  MdOutlineBorderColor,
  MdOutlineBrush,
  MdOutlineBubbleChart,
  MdOutlineCalendarMonth,
  MdOutlineCalendarToday,
  MdOutlineCampaign,
  MdOutlineCancel,
  MdOutlineCancelPresentation,
  MdOutlineChat,
  MdOutlineCheck,
  MdOutlineCheckBox,
  MdOutlineChromeReaderMode,
  MdOutlineClose,
  MdOutlineCloudDone,
  MdOutlineCloudOff,
  MdOutlineCloudQueue,
  MdOutlineCloudSync,
  MdOutlineCoPresent,
  MdOutlineCode,
  MdOutlineContacts,
  MdOutlineContentCopy,
  MdOutlineContentPaste,
  MdOutlineContrast,
  MdOutlineControlPoint,
  MdOutlineCreditCard,
  MdOutlineDarkMode,
  MdOutlineDataObject,
  MdOutlineDelete,
  MdOutlineDescription,
  MdOutlineDevices,
  MdOutlineDirectionsWalk,
  MdOutlineDoneAll,
  MdOutlineDragIndicator,
  MdOutlineEdit,
  MdOutlineEditCalendar,
  MdOutlineEmail,
  MdOutlineEmojiEmotions,
  MdOutlineEmojiEvents,
  MdOutlineEvent,
  MdOutlineEventSeat,
  MdOutlineExplore,
  MdOutlineFactCheck,
  MdOutlineFileDownload,
  MdOutlineFileUpload,
  MdOutlineFilterAltOff,
  MdOutlineFilterList,
  MdOutlineFolderOpen,
  MdOutlineFolderZip,
  MdOutlineFormatAlignCenter,
  MdOutlineFormatAlignJustify,
  MdOutlineFormatAlignLeft,
  MdOutlineFormatAlignRight,
  MdOutlineFormatBold,
  MdOutlineFormatClear,
  MdOutlineFormatColorText,
  MdOutlineFormatIndentDecrease,
  MdOutlineFormatIndentIncrease,
  MdOutlineFormatItalic,
  MdOutlineFormatLineSpacing,
  MdOutlineFormatListBulleted,
  MdOutlineFormatListNumbered,
  MdOutlineFormatQuote,
  MdOutlineFormatUnderlined,
  MdOutlineGavel,
  MdOutlineGroup,
  MdOutlineGroupAdd,
  MdOutlineGroups,
  MdOutlineHistory,
  MdOutlineHome,
  MdOutlineHomeWork,
  MdOutlineHourglassTop,
  MdOutlineHowToVote,
  MdOutlineImage,
  MdOutlineInbox,
  MdOutlineInsertDriveFile,
  MdOutlineInsertLink,
  MdOutlineKey,
  MdOutlineKeyboardArrowDown,
  MdOutlineKeyboardArrowLeft,
  MdOutlineKeyboardArrowRight,
  MdOutlineKeyboardArrowUp,
  MdOutlineLayers,
  MdOutlineLightMode,
  MdOutlineLink,
  MdOutlineLinkOff,
  MdOutlineLogin,
  MdOutlineLogout,
  MdOutlineManageSearch,
  MdOutlineMap,
  MdOutlineMarkChatRead,
  MdOutlineMarkChatUnread,
  MdOutlineMenu,
  MdOutlineMenuBook,
  MdOutlineMicNone,
  MdOutlineMilitaryTech,
  MdOutlineMoreHoriz,
  MdOutlineMoreVert,
  MdOutlineNearMe,
  MdOutlineNotes,
  MdOutlineNotifications,
  MdOutlineNotificationsActive,
  MdOutlineNotificationsOff,
  MdOutlinePalette,
  MdOutlinePark,
  MdOutlinePassword,
  MdOutlinePeople,
  MdOutlinePermMedia,
  MdOutlinePersonAddAlt,
  MdOutlinePersonRemove,
  MdOutlinePhotoLibrary,
  MdOutlinePictureAsPdf,
  MdOutlinePlace,
  MdOutlinePrint,
  MdOutlinePsychology,
  MdOutlinePublic,
  MdOutlinePushPin,
  MdOutlineRadioButtonChecked,
  MdOutlineRadioButtonUnchecked,
  MdOutlineRedo,
  MdOutlineRefresh,
  MdOutlineRemove,
  MdOutlineRemoveModerator,
  MdOutlineReply,
  MdOutlineRule,
  MdOutlineSave,
  MdOutlineSchool,
  MdOutlineSearch,
  MdOutlineSend,
  MdOutlineSettings,
  MdOutlineShield,
  MdOutlineShuffle,
  MdOutlineSmartDisplay,
  MdOutlineStop,
  MdOutlineStrikethroughS,
  MdOutlineSupportAgent,
  MdOutlineSwapHoriz,
  MdOutlineSwapVert,
  MdOutlineSwitchAccount,
  MdOutlineTableChart,
  MdOutlineTag,
  MdOutlineTerminal,
  MdOutlineTimelapse,
  MdOutlineTransgender,
  MdOutlineTrendingDown,
  MdOutlineTrendingUp,
  MdOutlineUnarchive,
  MdOutlineUndo,
  MdOutlineUnfoldMore,
  MdOutlineVerifiedUser,
  MdOutlineVideocam,
  MdOutlineViewColumn,
  MdOutlineViewHeadline,
  MdOutlineVisibility,
  MdOutlineVisibilityOff,
  MdOutlineVolumeUp,
  MdOutlineWarningAmber,
  MdPauseCircleOutline,
  MdPersonOutline,
  MdPlayCircleOutline,
  MdPushPin,
  MdRemoveCircleOutline,
  MdStar,
  MdStarBorder,
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

export const AddressBookIcon = makeIcon(MdOutlineContacts)
export const AdminPanelSettingsIcon = makeIcon(MdOutlineAdminPanelSettings)
export const ArrowCounterClockwiseIcon = makeIcon(MdOutlineRefresh)
export const ArrowDownIcon = makeIcon(MdOutlineArrowDownward)
export const ArrowLeftIcon = makeIcon(MdOutlineArrowBack)
export const ArrowRightIcon = makeIcon(MdOutlineArrowForward)
export const ArrowUpIcon = makeIcon(MdOutlineArrowUpward)
export const ArrowsDownUpIcon = makeIcon(MdOutlineSwapVert)
export const ArrowsLeftRightIcon = makeIcon(MdOutlineSwapHoriz)
export const AudioIcon = makeIcon(MdOutlineAudiotrack)
export const BankIcon = makeIcon(MdOutlineAccountBalance)
export const BellIcon = makeIcon(MdOutlineNotifications)
export const BookIcon = makeIcon(MdOutlineMenuBook)
export const BookOpenIcon = makeIcon(MdOutlineChromeReaderMode)
export const BrainIcon = makeIcon(MdOutlinePsychology)
export const BrushIcon = makeIcon(MdOutlineBrush)
export const BuildingsIcon = makeIcon(MdOutlineApartment)
export const CalendarBlankIcon = makeIcon(MdOutlineCalendarToday)
export const CalendarDotsIcon = makeIcon(MdOutlineEvent)
export const CalendarIcon = makeIcon(MdOutlineCalendarMonth)
export const CalendarPlusIcon = makeIcon(MdOutlineEditCalendar)
// Conectividad (banner offline). Material no tiene "cloud alert": se usa
// `MdCloudQueue` para el estado degradado.
export const CloudAlertIcon = makeIcon(MdOutlineCloudQueue)
export const CloudCheckIcon = makeIcon(MdOutlineCloudDone)
export const CloudOffIcon = makeIcon(MdOutlineCloudOff)
export const CloudSyncIcon = makeIcon(MdOutlineCloudSync)
export const ChalkboardTeacherIcon = makeIcon(MdOutlineCoPresent)
export const ChartBarIcon = makeIcon(MdOutlineBarChart)
export const ChartLineUpIcon = makeIcon(MdOutlineTrendingUp)
export const ChartLineDownIcon = makeIcon(MdOutlineTrendingDown)
export const CaretDownIcon = makeIcon(MdOutlineKeyboardArrowDown)
export const CaretLeftIcon = makeIcon(MdOutlineKeyboardArrowLeft)
export const CaretRightIcon = makeIcon(MdOutlineKeyboardArrowRight)
export const CaretUpDownIcon = makeIcon(MdOutlineUnfoldMore)
export const CaretUpIcon = makeIcon(MdOutlineKeyboardArrowUp)
export const ChatCircleDotsIcon = makeIcon(MdChatBubbleOutline)
export const ChatCircleTextIcon = makeIcon(MdOutlineChat)
export const CheckCircleIcon = makeIcon(MdCheckCircleOutline)
export const CheckCircleFillIcon = makeIcon(MdCheckCircle)
export const ProhibitIcon = makeIcon(MdOutlineBlock)
export const CheckIcon = makeIcon(MdOutlineCheck)
export const CircleDashedIcon = makeIcon(MdOutlineRadioButtonUnchecked)
export const CircleHalfIcon = makeIcon(MdOutlineContrast)
export const CircleIcon = makeIcon(MdCircle)
export const CirclesThreeIcon = makeIcon(MdOutlineBubbleChart)
export const ClipboardAddIcon = makeIcon(MdAssignmentAdd)
export const ClipboardCheckIcon = makeIcon(MdOutlineAssignmentTurnedIn)
export const ClipboardTextIcon = makeIcon(MdOutlineAssignment)
export const ClockCountdownIcon = makeIcon(MdOutlineTimelapse)
export const ClockIcon = makeIcon(MdOutlineAccessTime)
export const ColumnsIcon = makeIcon(MdOutlineViewColumn)
export const CompassIcon = makeIcon(MdOutlineExplore)
// Ícono de las acciones "Agregar" (crear un registro), para distinguirlas de
// `PlusIcon`/`PlusCircleIcon`, que se usan en sumas dentro de un formulario.
export const ControlPointIcon = makeIcon(MdOutlineControlPoint)
export const CreditCardIcon = makeIcon(MdOutlineCreditCard)
export const CurrencyDollarIcon = makeIcon(MdOutlineAttachMoney)
// Manija de arrastre (los seis puntitos): marca las filas que se reordenan.
export const DevicesIcon = makeIcon(MdOutlineDevices)
export const DotsSixVerticalIcon = makeIcon(MdOutlineDragIndicator)
export const DotsThreeIcon = makeIcon(MdOutlineMoreHoriz)
export const EnvelopeIcon = makeIcon(MdOutlineEmail)
export const EraserIcon = makeIcon(MdOutlineBackspace)
export const EyeIcon = makeIcon(MdOutlineVisibility)
export const EyeSlashIcon = makeIcon(MdOutlineVisibilityOff)
// `FileDownloadOutlined` de MUI: el de las acciones de exportar.
export const FileDownloadOutlinedIcon = makeIcon(MdOutlineFileDownload)
export const FileUploadOutlinedIcon = makeIcon(MdOutlineFileUpload)
export const FilePdfIcon = makeIcon(MdOutlinePictureAsPdf)
export const FileZipIcon = makeIcon(MdOutlineFolderZip)
export const FileTextIcon = makeIcon(MdOutlineDescription)
export const FileXlsIcon = makeIcon(MdOutlineTableChart)
export const FolderOpenIcon = makeIcon(MdOutlineFolderOpen)
export const FunnelIcon = makeIcon(MdOutlineFilterList)
// "Limpiar filtros".
export const FunnelXIcon = makeIcon(MdOutlineFilterAltOff)
export const GavelIcon = makeIcon(MdOutlineGavel)
export const GearIcon = makeIcon(MdOutlineSettings)
export const GenderIntersexIcon = makeIcon(MdOutlineTransgender)
export const GlobeIcon = makeIcon(MdOutlinePublic)
export const GraduationCapIcon = makeIcon(MdOutlineSchool)
export const HeadsetIcon = makeIcon(MdOutlineSupportAgent)
export const UserSwitchIcon = makeIcon(MdOutlineSwitchAccount)
export const HouseIcon = makeIcon(MdOutlineHome)
export const HouseLineIcon = makeIcon(MdOutlineHomeWork)
export const IdentificationCardIcon = makeIcon(MdOutlineBadge)
export const ImageIcon = makeIcon(MdOutlineImage)
export const InboxIcon = makeIcon(MdOutlineInbox)
export const InfoIcon = makeIcon(MdInfoOutline)
export const InsertLinkOutlinedIcon = makeIcon(MdOutlineInsertLink)
export const KeyIcon = makeIcon(MdOutlineKey)
export const LightningIcon = makeIcon(MdOutlineBolt)
export const LockIcon = makeIcon(MdLockOutline)
export const LinkBreakIcon = makeIcon(MdOutlineLinkOff)
export const ListMagnifyingGlassIcon = makeIcon(MdOutlineManageSearch)
export const ListNumbersIcon = makeIcon(MdOutlineFormatListNumbered)
export const MagnifyingGlassIcon = makeIcon(MdOutlineSearch)
export const MapPinIcon = makeIcon(MdOutlinePlace)
export const MapTrifoldIcon = makeIcon(MdOutlineMap)
export const MedalIcon = makeIcon(MdOutlineMilitaryTech)
export const MinusIcon = makeIcon(MdOutlineRemove)
export const MoonIcon = makeIcon(MdOutlineDarkMode)
export const NotebookIcon = makeIcon(MdOutlineMenuBook)
export const PaletteIcon = makeIcon(MdOutlinePalette)
export const PasswordIcon = makeIcon(MdOutlinePassword)
export const PaperPlaneTiltIcon = makeIcon(MdOutlineSend)
// Flecha de navegación: Orientar por traslados pendientes.
export const NavigationArrowIcon = makeIcon(MdOutlineNearMe)
export const PaperclipIcon = makeIcon(MdOutlineAttachFile)
export const GitMergeIcon = makeIcon(MdOutlineCallMerge)
export const UploadSimpleIcon = makeIcon(MdOutlineUpload)
// Equivalentes de `BorderColorOutlined`, `DeleteOutlined` y `PermMediaOutlined`
// de MUI: los tres vienen del mismo set (Material), así que `react-icons/md`
// los trae con el prefijo `MdOutline`. Se repunta acá y no en cada uso para
// que queden consistentes en toda la app (acciones de fila, diálogos, filtros).
export const PencilIcon = makeIcon(MdOutlineBorderColor)
export const PermMediaOutlinedIcon = makeIcon(MdOutlinePermMedia)
export const PlusCircleIcon = makeIcon(MdAddCircleOutline)
export const PlusIcon = makeIcon(MdOutlineAdd)
export const QuestionIcon = makeIcon(MdHelpOutline)
export const RemoveCircleOutlineIcon = makeIcon(MdRemoveCircleOutline)
export const ShieldCheckIcon = makeIcon(MdOutlineVerifiedUser)
export const ShieldIcon = makeIcon(MdOutlineShield)
export const ShieldOffIcon = makeIcon(MdOutlineRemoveModerator)
export const ShieldLockIcon = makeIcon(GoShieldLock)
export const SidebarIcon = makeIcon(MdOutlineMenu)
export const SignInIcon = makeIcon(MdOutlineLogin)
export const SignOutIcon = makeIcon(MdOutlineLogout)
export const SpinnerIcon = makeIcon(MdOutlineAutorenew)
export const SunIcon = makeIcon(MdOutlineLightMode)
export const TextBIcon = makeIcon(MdOutlineFormatBold)
export const TextItalicIcon = makeIcon(MdOutlineFormatItalic)
export const TextUnderlineIcon = makeIcon(MdOutlineFormatUnderlined)
export const TrashIcon = makeIcon(MdOutlineDelete)
export const TreeIcon = makeIcon(MdOutlinePark)
export const TrophyIcon = makeIcon(MdOutlineEmojiEvents)
export const VideoIcon = makeIcon(MdOutlineSmartDisplay)
export const PersonIcon = makeIcon(MdPersonOutline)
export const PersonAddIcon = makeIcon(MdOutlinePersonAddAlt)
export const PersonRemoveIcon = makeIcon(MdOutlinePersonRemove)
export const PersonWalkIcon = makeIcon(MdOutlineDirectionsWalk)
export const ArmchairIcon = makeIcon(MdOutlineEventSeat)
export const ShuffleIcon = makeIcon(MdOutlineShuffle)
export const UserCircleIcon = makeIcon(MdOutlineAccountCircle)
export const UserGroupAddIcon = makeIcon(MdOutlineGroupAdd)
export const UserIcon = makeIcon(MdPersonOutline)
export const UsersIcon = makeIcon(MdOutlineGroup)
export const UsersFourIcon = makeIcon(MdOutlinePeople)
export const UsersThreeIcon = makeIcon(MdOutlineGroups)
export const WarningCircleIcon = makeIcon(MdErrorOutline)
export const WarningIcon = makeIcon(MdOutlineWarningAmber)
export const XCircleIcon = makeIcon(MdOutlineCancel)
export const XIcon = makeIcon(MdOutlineClose)
export const XSquareIcon = makeIcon(MdOutlineCancelPresentation)

// Chat de comunicaciones
export const AtIcon = makeIcon(MdOutlineAlternateEmail)
export const StackIcon = makeIcon(MdOutlineLayers)
export const HashIcon = makeIcon(MdOutlineTag)
export const ChatTextIcon = makeIcon(MdOutlineChat)
export const BallotIcon = makeIcon(MdOutlineHowToVote)
export const ClipboardIcon = makeIcon(MdOutlineAssignment)
export const ListChecksIcon = makeIcon(MdOutlineFactCheck)
export const MegaphoneIcon = makeIcon(MdOutlineCampaign)
// "Aa" subrayado del botón de formato. Material no trae este ícono, así que se
// dibuja con texto SVG en la fuente de la app.
export const TextAaIcon = makeIcon(({ size = "1em", ...props }) => (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden
      {...props}
    >
      <text x="12" y="16" textAnchor="middle" fontSize="15" fontWeight="500" fontFamily="inherit">
        Aa
      </text>
      <rect x="3" y="19" width="18" height="1.6" rx="0.8" />
    </svg>
))
export const SmileyIcon = makeIcon(MdOutlineEmojiEmotions)
export const VideoCameraIcon = makeIcon(MdOutlineVideocam)
export const MicrophoneIcon = makeIcon(MdOutlineMicNone)
export const BellSlashIcon = makeIcon(MdOutlineNotificationsOff)
export const BellRingingIcon = makeIcon(MdOutlineNotificationsActive)
export const SpeakerHighIcon = makeIcon(MdOutlineVolumeUp)
export const ChatUnreadIcon = makeIcon(MdOutlineMarkChatUnread)
export const ChatReadIcon = makeIcon(MdOutlineMarkChatRead)
export const TerminalIcon = makeIcon(MdOutlineTerminal)
export const DotsThreeVerticalIcon = makeIcon(MdOutlineMoreVert)
export const CaretDownFillIcon = makeIcon(MdOutlineArrowDropDown)
export const CopyIcon = makeIcon(MdOutlineContentCopy)
export const ArchiveIcon = makeIcon(MdOutlineArchive)
export const UnarchiveIcon = makeIcon(MdOutlineUnarchive)
export const PencilSimpleIcon = makeIcon(MdOutlineEdit)
export const ListIcon = makeIcon(MdOutlineViewHeadline)
export const SquaresFourIcon = makeIcon(MdOutlineApps)
export const TextStrikethroughIcon = makeIcon(MdOutlineStrikethroughS)
export const LinkIcon = makeIcon(MdOutlineLink)
export const ListBulletsIcon = makeIcon(MdOutlineFormatListBulleted)
export const QuotesIcon = makeIcon(MdOutlineFormatQuote)
export const CodeIcon = makeIcon(MdOutlineCode)
export const CodeBlockIcon = makeIcon(MdOutlineDataObject)
export const PushPinIcon = makeIcon(MdOutlinePushPin)
export const PushPinFillIcon = makeIcon(MdPushPin)
export const FileIcon = makeIcon(MdOutlineInsertDriveFile)
export const ImagesIcon = makeIcon(MdOutlinePhotoLibrary)
export const CheckSquareIcon = makeIcon(MdOutlineCheckBox)
export const RadioButtonIcon = makeIcon(MdOutlineRadioButtonChecked)
export const TextAlignLeftIcon = makeIcon(MdOutlineNotes)
export const YesNoIcon = makeIcon(MdOutlineRule)
export const CaretUpFillIcon = makeIcon(MdOutlineArrowDropUp)
export const ArrowUUpLeftIcon = makeIcon(MdOutlineUndo)
export const ArrowBendUpLeftIcon = makeIcon(MdOutlineReply)
export const ArrowUUpRightIcon = makeIcon(MdOutlineRedo)
export const TextColorIcon = makeIcon(MdOutlineFormatColorText)
export const TextAlignLeftFillIcon = makeIcon(MdOutlineFormatAlignLeft)
export const TextAlignCenterIcon = makeIcon(MdOutlineFormatAlignCenter)
export const TextAlignRightIcon = makeIcon(MdOutlineFormatAlignRight)
export const TextAlignJustifyIcon = makeIcon(MdOutlineFormatAlignJustify)
export const LineSpacingIcon = makeIcon(MdOutlineFormatLineSpacing)
export const TextOutdentIcon = makeIcon(MdOutlineFormatIndentDecrease)
export const TextIndentIcon = makeIcon(MdOutlineFormatIndentIncrease)
export const TextClearIcon = makeIcon(MdOutlineFormatClear)
export const PrinterIcon = makeIcon(MdOutlinePrint)
export const FloppyDiskIcon = makeIcon(MdOutlineSave)
export const StopIcon = makeIcon(MdOutlineStop)
export const SparkleIcon = makeIcon(MdOutlineAutoAwesome)
export const ClockCounterClockwiseIcon = makeIcon(MdOutlineHistory)
export const CheckSquareOffsetIcon = makeIcon(IoMdCheckboxOutline)
export const ClipboardPasteIcon = makeIcon(MdOutlineContentPaste)
export const HourglassIcon = makeIcon(MdOutlineHourglassTop)
export const StarIcon = makeIcon(MdStarBorder)
export const StarFillIcon = makeIcon(MdStar)
export const ChecksIcon = makeIcon(MdOutlineDoneAll)
export const PauseCircleIcon = makeIcon(MdPauseCircleOutline)
export const PlayCircleIcon = makeIcon(MdPlayCircleOutline)
