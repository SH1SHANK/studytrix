import { CommandItem } from "./command.types";

export const BUILT_IN_COMMANDS: CommandItem[] = [
  {
    id: "go-back",
    title: "Go Back",
    group: "navigation",
    scope: "folder",
  },
  {
    id: "open-settings",
    title: "Open Settings",
    group: "system",
    scope: "global",
  },
  {
    id: "toggle-view",
    title: "Toggle View Mode",
    group: "actions",
    scope: "global",
  },
  {
    id: "mark-offline",
    title: "Mark Item Offline",
    group: "actions",
    scope: "folder",
  },
];
