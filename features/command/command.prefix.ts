export type PrefixMode = "folders" | "tags" | "domains" | "actions" | "recents";

export type PrefixParseResult = {
  mode: PrefixMode | null;
  query: string;
  hadPrefix: boolean;
  consumedPrefix: string | null;
};

const PREFIX_TO_MODE: Record<string, PrefixMode> = {
  "/": "folders",
  "#": "tags",
  ":": "domains",
  ">": "actions",
  "@": "recents",
};

const MODE_TO_PREFIX: Record<PrefixMode, "/" | "#" | ":" | ">" | "@"> = {
  folders: "/",
  tags: "#",
  domains: ":",
  actions: ">",
  recents: "@",
};

function isPrefixToken(value: string): boolean {
  return Object.hasOwn(PREFIX_TO_MODE, value);
}

export function parseLeadingPrefixInput(rawInput: string): PrefixParseResult {
  if (!rawInput) {
    return {
      mode: null,
      query: "",
      hadPrefix: false,
      consumedPrefix: null,
    };
  }

  let cursor = 0;
  let latestPrefix: string | null = null;

  while (cursor < rawInput.length) {
    const token = rawInput[cursor];
    if (!isPrefixToken(token)) {
      break;
    }

    latestPrefix = token;
    cursor += 1;
  }

  if (!latestPrefix) {
    return {
      mode: null,
      query: rawInput,
      hadPrefix: false,
      consumedPrefix: null,
    };
  }

  return {
    mode: PREFIX_TO_MODE[latestPrefix],
    query: rawInput.slice(cursor),
    hadPrefix: true,
    consumedPrefix: latestPrefix,
  };
}

export function normalizeStickyPrefixInput(
  rawInput: string,
  activeMode: PrefixMode | null,
): {
  mode: PrefixMode | null;
  query: string;
  changedByPrefix: boolean;
} {
  const parsed = parseLeadingPrefixInput(rawInput);
  if (parsed.mode) {
    return {
      mode: parsed.mode,
      query: parsed.query,
      changedByPrefix: true,
    };
  }

  if (activeMode) {
    return {
      mode: activeMode,
      query: rawInput,
      changedByPrefix: false,
    };
  }

  return {
    mode: null,
    query: rawInput,
    changedByPrefix: false,
  };
}

export function prefixForMode(mode: PrefixMode): "/" | "#" | ":" | ">" | "@" {
  return MODE_TO_PREFIX[mode];
}
