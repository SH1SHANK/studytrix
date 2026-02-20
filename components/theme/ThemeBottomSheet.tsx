"use client"; import { useMemo } from "react";
import { useTheme } from "next-themes"; import { DEFAULT_THEME_ID, type ThemeId, THEMES,
} from "@/features/theme/theme.constants";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
import { ThemeGrid } from "@/components/theme/ThemeGrid"; interface ThemeBottomSheetProps { open: boolean; onOpenChange: (open: boolean) => void;
} export function ThemeBottomSheet({ open, onOpenChange }: ThemeBottomSheetProps) { const { theme, setTheme } = useTheme(); const currentTheme = useMemo(() => { if (THEMES.some((themeOption) => themeOption.id === theme)) { return theme as ThemeId; } return DEFAULT_THEME_ID; }, [theme]); return ( <Drawer open={open} onOpenChange={onOpenChange}> <DrawerContent> <DrawerHeader> <DrawerTitle>Choose Theme</DrawerTitle> </DrawerHeader> <ThemeGrid currentTheme={currentTheme} onSelect={(id) => { setTheme(id); onOpenChange(false); }} /> </DrawerContent> </Drawer> );
}
