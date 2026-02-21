import {
  IconColorSwatch,
  IconLayoutList,
  IconWand,
  IconDeviceMobileVibration,
  IconSortAscending,
  IconLayoutDashboard,
  IconTags,
  IconWindow,
  IconKeyboard,
  IconZoomInArea,
  IconListNumbers,
  IconDownload,
  IconFolder,
  IconDatabase,
  IconLayout,
  IconInfoCircle,
  IconFilter,
  IconBoxMultiple,
  IconBolt,
  IconBug,
  IconBrandGithub,
  IconMessageChatbot,
  IconAlertCircle,
  IconBulb,
  IconHeadset,
  IconTrash,
  IconRefresh,
  IconSettings,
  IconMoodSmile,
  IconBellRinging,
  IconWifi,
  IconShare2,
  IconLink,
  IconFlask2,
  IconSunHigh,
  IconUser,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
export function getSettingIcon(id: string): ReactNode {
  const props = { className: "size-[18px] text-muted-foreground shrink-0" };
  switch (id) {
    case "theme":
      return <IconColorSwatch {...props} />;
    case "userProfile":
      return <IconUser {...props} />;
    case "compact_mode":
      return <IconLayoutList {...props} />;
    case "animation_intensity":
      return <IconWand {...props} />;
    case "greetingPreferences":
      return <IconSunHigh {...props} />;
    case "enable_haptics":
      return <IconDeviceMobileVibration {...props} />;
    case "default_sort_order":
      return <IconSortAscending {...props} />;
    case "dashboard_default_view":
      return <IconLayoutDashboard {...props} />;
    case "show_dashboard_tags":
      return <IconTags {...props} />;
    case "show_header_motivation":
      return <IconMoodSmile {...props} />;
    case "show_version_update_banner":
      return <IconBellRinging {...props} />;
    case "disable_glass_effects":
      return <IconWindow {...props} />;
    case "search_debounce":
      return <IconKeyboard {...props} />;
    case "fuzzy_search_enabled":
      return <IconZoomInArea {...props} />;
    case "result_limit":
      return <IconListNumbers {...props} />;
    case "auto_prefetch":
      return <IconDownload {...props} />;
    case "storage_location":
      return <IconFolder {...props} />;
    case "storage_limit_mb":
      return <IconDatabase {...props} />;
    case "default_view_mode":
      return <IconLayout {...props} />;
    case "show_file_metadata":
      return <IconInfoCircle {...props} />;
    case "page_share_preference":
      return <IconShare2 {...props} />;
    case "share_include_academic_context":
      return <IconLink {...props} />;
    case "tag_filter_mode_default":
      return <IconFilter {...props} />;
    case "virtualized_lists":
      return <IconBoxMultiple {...props} />;
    case "cache_warmup_on_start":
      return <IconBolt {...props} />;
    case "debug_command_scoring":
      return <IconBug {...props} />;
    case "experimental_features_opt_in":
      return <IconFlask2 {...props} />;
    case "show_connectivity_banner":
      return <IconWifi {...props} />;
    case "github_source":
      return <IconBrandGithub {...props} />;
    case "give_feedback":
      return <IconMessageChatbot {...props} />;
    case "report_issue":
      return <IconAlertCircle {...props} />;
    case "suggest_feature":
      return <IconBulb {...props} />;
    case "contact_support":
      return <IconHeadset {...props} />;
    case "clear_offline_storage":
      return (
        <IconTrash className="size-[18px] text-rose-500 dark:text-rose-400 shrink-0" />
      );
    case "reset_all_settings":
      return (
        <IconRefresh className="size-[18px] text-rose-500 dark:text-rose-400 shrink-0" />
      );
    default:
      return <IconSettings {...props} />;
  }
}
