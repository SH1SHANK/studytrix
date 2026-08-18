import {
  Palette as IconColorSwatch,
  Smartphone as IconDeviceMobileVibration,
  Download as IconDownload,
  Folder as IconFolder,
  Info as IconInfoCircle,
  Keyboard as IconKeyboard,
  Layout as IconLayout,
  LayoutList as IconLayoutList,
  ListOrdered as IconListNumbers,
  Settings as IconSettings,
  ArrowUpNarrowWide as IconSortAscending,
  SunMedium as IconSunHigh,
  Trash2 as IconTrash,
  User as IconUser,
  Wifi as IconWifi,
  Wand2 as IconWand,
  HardDrive as IconHardDrive,
  Sparkles as IconSparkles,
} from "lucide-react";
import type { ReactNode } from "react";

export function getSettingIcon(id: string): ReactNode {
  const props = { className: "size-[18px] text-muted-foreground shrink-0" };
  const dangerProps = { className: "size-[18px] text-rose-500 dark:text-rose-400 shrink-0" };

  switch (id) {
    case "userProfile":
      return <IconUser {...props} />;
    case "greetingPreferences":
      return <IconSunHigh {...props} />;
    case "theme":
      return <IconColorSwatch {...props} />;
    case "compact_mode":
      return <IconLayoutList {...props} />;
    case "animation_intensity":
      return <IconWand {...props} />;
    case "enable_haptics":
      return <IconDeviceMobileVibration {...props} />;
    case "default_sort_order":
      return <IconSortAscending {...props} />;
    case "default_view_mode":
      return <IconLayout {...props} />;
    case "show_file_metadata":
      return <IconInfoCircle {...props} />;
    case "recent_history_limit":
      return <IconListNumbers {...props} />;
    case "storage_location":
      return <IconFolder {...props} />;
    case "auto_prefetch":
      return <IconDownload {...props} />;
    case "show_connectivity_banner":
      return <IconWifi {...props} />;
    case "clear_offline_storage":
      return <IconTrash {...dangerProps} />;
    case "drive_sources_info":
      return <IconHardDrive {...props} />;
    case "keyboard_shortcuts_info":
      return <IconKeyboard {...props} />;
    case "about_studytrix":
      return <IconSparkles {...props} />;
    default:
      return <IconSettings {...props} />;
  }
}
