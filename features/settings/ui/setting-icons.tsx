import {
  IconBook2,
  IconBolt,
  IconBrandGithub,
  IconBoxMultiple,
  IconBug,
  IconColorSwatch,
  IconDatabase,
  IconDeviceMobileVibration,
  IconDownload,
  IconEye,
  IconFilter,
  IconFlask2,
  IconFolder,
  IconFolderHeart,
  IconInfoCircle,
  IconKeyboard,
  IconLayout,
  IconLayoutDashboard,
  IconLayoutList,
  IconLink,
  IconListNumbers,
  IconMoodSmile,
  IconRefresh,
  IconSettings,
  IconShare2,
  IconSortAscending,
  IconSunHigh,
  IconTags,
  IconTrash,
  IconUser,
  IconWifi,
  IconWindow,
  IconWand,
} from "@tabler/icons-react";
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
    case "dashboard_default_view":
      return <IconLayoutDashboard {...props} />;
    case "show_dashboard_tags":
      return <IconTags {...props} />;
    case "tag_filter_mode_default":
      return <IconFilter {...props} />;
    case "show_header_motivation":
      return <IconMoodSmile {...props} />;
    case "show_version_update_banner":
      return <IconBrandGithub {...props} />;
    case "search_debounce":
      return <IconKeyboard {...props} />;
    case "fuzzy_search_enabled":
      return <IconFilter {...props} />;
    case "result_limit":
      return <IconListNumbers {...props} />;
    case "semantic_search_enabled":
      return <IconFlask2 {...props} />;
    case "semantic_search_show_in_commandcenter":
      return <IconLayoutDashboard {...props} />;
    case "semantic_search_index_status":
      return <IconDatabase {...props} />;
    case "semantic_search_rebuild_index":
      return <IconRefresh {...props} />;
    case "semantic_search_model_status":
      return <IconDatabase {...props} />;
    case "semantic_search_clear_index":
      return <IconTrash {...dangerProps} />;
    case "semantic_search_remove_model":
      return <IconTrash {...dangerProps} />;
    case "semantic_search_learn_more":
      return <IconBook2 {...props} />;
    case "semantic_search_experimental_notice":
      return <IconInfoCircle {...props} />;
    case "personal_repository_visible":
      return <IconEye {...props} />;
    case "personal_repository":
      return <IconFolderHeart {...props} />;
    case "personal_repository_local_folder_info":
      return <IconInfoCircle {...props} />;
    case "personal_repository_clear_all":
      return <IconTrash {...dangerProps} />;
    case "default_view_mode":
      return <IconLayout {...props} />;
    case "show_file_metadata":
      return <IconInfoCircle {...props} />;
    case "storage_location":
      return <IconFolder {...props} />;
    case "storage_limit_mb":
      return <IconDatabase {...props} />;
    case "auto_prefetch":
      return <IconDownload {...props} />;
    case "show_connectivity_banner":
      return <IconWifi {...props} />;
    case "clear_offline_storage":
      return <IconTrash {...dangerProps} />;
    case "page_share_preference":
      return <IconShare2 {...props} />;
    case "share_include_academic_context":
      return <IconLink {...props} />;
    case "disable_glass_effects":
      return <IconWindow {...props} />;
    case "virtualized_lists":
      return <IconBoxMultiple {...props} />;
    case "cache_warmup_on_start":
      return <IconBolt {...props} />;
    case "debug_command_scoring":
      return <IconBug {...props} />;
    case "experimental_features_opt_in":
      return <IconFlask2 {...props} />;
    case "semantic_search_notice_dismissed":
      return <IconInfoCircle {...props} />;
    default:
      return <IconSettings {...props} />;
  }
}
