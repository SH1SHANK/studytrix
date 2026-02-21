import {
  type GreetingTheme,
} from "@/features/dashboard/greeting.preferences";

export interface UserGreetingMessageStruct {
  primaryMessage: string;
  secondaryMessage: string;
}

type TimePeriod =
  | "early_morning"
  | "morning"
  | "midday"
  | "afternoon"
  | "evening"
  | "night";

type WeatherCondition =
  | "default"
  | "clear"
  | "partly_cloudy"
  | "cloudy"
  | "foggy"
  | "rainy"
  | "snowy"
  | "stormy";

const OPEN_METEO_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const OPEN_METEO_LATITUDE = 12.9716;
const OPEN_METEO_LONGITUDE = 77.5946;
const OPEN_METEO_TIMEOUT_MS = 3000;

const STUDY_SECONDARY_MESSAGES: Record<TimePeriod, string[]> = {
  early_morning: [
    "Most people are still asleep - your notes already aren't. 📚",
    "Silence is a study superpower. You've got it right now. 🌅",
    "Early sessions build the discipline that exam season can't shake. 💪",
    "Morning calm is perfect for solving one hard concept end-to-end. 🧠",
    "Use this quiet hour for the chapter you've been postponing. ✅",
    "A focused sunrise revision sticks longer than late-night cramming. 🌤️",
    "Start with active recall before notifications start competing. ⚡",
    "This is prime deep-work time; pick one topic and finish it. 🎯",
    "Before the day gets loud, lock in your highest-priority module. 🔒",
    "One early chapter now can save three stressed hours later. ⏱️",
  ],
  morning: [
    "Peak focus window - make it count. 🧠",
    "Fresh mind, fresh material. Perfect combo. ☀️",
    "Your brain is sharpest right now - use it wisely. 🎯",
    "Do one difficult problem set now while attention is highest. 📘",
    "Morning retention is strong; summarize each page in one line. ✍️",
    "Start with your toughest subject, then coast into lighter work. 🚀",
    "Use a 50-10 rhythm and finish one full chapter before noon. ⏳",
    "Clarity is high this hour; map the topic before memorizing it. 🗺️",
    "Batch similar questions now to train exam-style thinking. 🧩",
    "One high-quality morning session beats scattered study all day. 🏁",
  ],
  midday: [
    "Switch subjects if you've been on one too long. Variety helps retention. 🔄",
    "Active recall beats re-reading. Quiz yourself on something. ⚡",
    "Halfway through - how's the study streak holding up? 🔥",
    "Take five minutes to review errors before starting the next block. 📝",
    "Midday is ideal for practice questions, not passive scrolling. 🎯",
    "Reset your desk, refill water, and run one focused revision sprint. 💧",
    "If attention dips, study standing for one short session. 🧍",
    "Convert one long note page into flashcards right now. 🗂️",
    "Use lunchtime momentum to close one pending topic. ✅",
    "Check understanding by explaining a concept out loud in 60 seconds. 🎙️",
  ],
  afternoon: [
    "Spaced repetition works best in the afternoon. Open those flashcards. 🗂️",
    "A focused 25-minute session resets the afternoon slump. ⏱️",
    "Review beats new material right now - consolidate what you know. 🔁",
    "Solve mixed problems to simulate exam switching pressure. 🧠",
    "Refine your weak areas now while the day still has usable energy. 🔧",
    "Revisit yesterday's notes and mark gaps before they compound. 📌",
    "Short, deliberate practice blocks beat one distracted marathon. 🧭",
    "Use past-paper questions to sharpen timing in this slot. 📄",
    "Afternoon fatigue is normal; structure is your advantage. 🏗️",
    "Close one backlog item before evening revision starts. ✅",
  ],
  evening: [
    "Summarise today's learning in 3 bullet points - it works. ✍️",
    "Organise your notes before tomorrow's sessions. 🗒️",
    "Evening revision locks in what you absorbed today. 🌙",
    "Review mistakes now so tomorrow starts cleaner. 🧽",
    "Turn today's class content into quick self-test prompts. ❓",
    "Use evening calm to stitch disconnected topics together. 🧵",
    "One recap pass now can cut tomorrow's revision time in half. ⌛",
    "Highlight what still feels unclear and schedule it first tomorrow. 📅",
    "Close the day with retrieval practice, not passive reading. 🧠",
    "Archive completed tasks and plan the next focused block. 📋",
  ],
  night: [
    "Sleep is when your brain files everything you studied today. Don't skip it. 🌙",
    "One last review, then rest. Tomorrow you start sharper. ⭐",
    "Quick recap before sleep - your memory consolidates it overnight. 🧠",
    "Night study works best for light revision, not heavy new topics. 📘",
    "Write tomorrow's first task now so you can start without friction. 📝",
    "Keep this session short and precise; protect sleep quality. 🛌",
    "Close with formulas, definitions, or flashcards for better carryover. 🔁",
    "Stop at a clear checkpoint so restart is easy in the morning. 🧭",
    "A calm wind-down routine improves recall more than one extra hour. 🌌",
    "Finish strong, then unplug - recovery is part of performance. 🔋",
  ],
};

const MOTIVATIONAL_SECONDARY_MESSAGES: Record<TimePeriod, string[]> = {
  early_morning: [
    "Progress compounds when you show up consistently.",
    "Small wins this morning become big results later.",
    "Discipline today reduces stress tomorrow.",
    "Effort beats mood; start and momentum follows.",
    "You do not need perfect conditions to make progress.",
    "Focus on execution, not overthinking.",
    "One intentional session can shift your whole day.",
    "Consistency is your strongest advantage.",
    "Do the next right step and keep moving.",
    "Progress over perfection, every single time.",
  ],
  morning: [
    "Your best results come from steady repetition.",
    "Clarity grows when you commit to focused work.",
    "Strong habits are built in ordinary moments.",
    "A good start creates a productive chain reaction.",
    "Keep showing up; mastery is cumulative.",
    "Let your schedule lead, not your impulses.",
    "Momentum is earned one session at a time.",
    "Reliable effort always outlasts bursts of motivation.",
    "Make this block count, then build on it.",
    "The work you do now pays forward later.",
  ],
  midday: [
    "Reset and continue; consistency matters more than speed.",
    "A focused restart is better than a distracted marathon.",
    "Every session completed is evidence of progress.",
    "The middle of the day is where discipline shows.",
    "Protect your attention and the results will follow.",
    "You are closer than you were this morning.",
    "Keep the promise you made to your goals.",
    "Refocus, execute, and stack another win.",
    "Sustained effort beats sporadic intensity.",
    "Do what future you will thank you for.",
  ],
  afternoon: [
    "Push through the dip; this is where growth happens.",
    "Structure turns low energy into real output.",
    "One quality block can recover the whole afternoon.",
    "Stay process-driven and results will catch up.",
    "Your routine is stronger than temporary fatigue.",
    "Keep going; disciplined reps build confidence.",
    "Finish this block with intention and clarity.",
    "Progress is built in these quieter grind hours.",
    "Hold the line and complete the next task.",
    "Focused execution now creates a calmer evening.",
  ],
  evening: [
    "Close the day with deliberate progress.",
    "A strong finish builds tomorrow's confidence.",
    "Reflect, refine, and keep your streak alive.",
    "Steady effort tonight supports better outcomes later.",
    "Wrap up with intention, not randomness.",
    "Your consistency is becoming your identity.",
    "End the day one step stronger than you began.",
    "A clear review tonight reduces tomorrow's load.",
    "Finishing well is a skill - practice it daily.",
    "Make this final session count.",
  ],
  night: [
    "Rest is not a break from progress; it supports it.",
    "Finish calmly and recover for tomorrow's effort.",
    "Sustainable routines outlast short-term overwork.",
    "Protect your energy to protect your performance.",
    "A measured close today sets up a better start tomorrow.",
    "You have done enough to move forward - now recover well.",
    "Consistency includes proper recovery.",
    "Discipline means knowing when to stop and reset.",
    "End with clarity and begin tomorrow with momentum.",
    "Strong outcomes come from balanced effort and rest.",
  ],
};

const WEATHER_STUDY_NUDGES: Record<Exclude<WeatherCondition, "default">, string> = {
  clear: "Clear skies, clear mind - ideal for a focused study block. ☀️",
  partly_cloudy: "A calm sky is perfect for steady revision pace. ⛅",
  cloudy: "Cloudy weather helps reduce distractions - use it well. ☁️",
  foggy: "Low-visibility weather, high-clarity notes. Stay locked in. 🌫️",
  rainy: "Rainy days are statistically the best study days. 🌧️",
  snowy: "Snow outside, deep focus inside. Great time for revision. ❄️",
  stormy: "Storm outside means fewer interruptions - strong study window. ⛈️",
};

const PRIMARY_TEMPLATES: Record<
  TimePeriod,
  { message: string; emoji: string }
> = {
  early_morning: { message: "Good early morning", emoji: "🌅" },
  morning: { message: "Good morning", emoji: "☀️" },
  midday: { message: "Good midday", emoji: "🌤️" },
  afternoon: { message: "Good afternoon", emoji: "📘" },
  evening: { message: "Good evening", emoji: "🌙" },
  night: { message: "Good night", emoji: "🌌" },
};

function getDayOfYear(value: Date): number {
  const start = new Date(value.getFullYear(), 0, 0);
  const diff = value.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getTimePeriod(value: Date): TimePeriod {
  const hour = value.getHours();

  if (hour >= 5 && hour < 8) {
    return "early_morning";
  }
  if (hour >= 8 && hour < 12) {
    return "morning";
  }
  if (hour >= 12 && hour < 14) {
    return "midday";
  }
  if (hour >= 14 && hour < 18) {
    return "afternoon";
  }
  if (hour >= 18 && hour < 22) {
    return "evening";
  }
  return "night";
}

function normalizeName(userName: string): string {
  const trimmed = userName.trim();
  if (!trimmed) {
    return "there";
  }

  return trimmed.split(/\s+/)[0] ?? "there";
}

function hashKey(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function pickBySeed(values: string[], seed: number): string {
  if (values.length === 0) {
    return "";
  }

  return values[seed % values.length] ?? values[0] ?? "";
}

function mapWeatherCodeToCondition(code: number): WeatherCondition {
  if (code === 0) {
    return "clear";
  }
  if (code === 1 || code === 2) {
    return "partly_cloudy";
  }
  if (code === 3) {
    return "cloudy";
  }
  if (code === 45 || code === 48) {
    return "foggy";
  }
  if (
    code === 51
    || code === 53
    || code === 55
    || code === 56
    || code === 57
    || code === 61
    || code === 63
    || code === 65
    || code === 66
    || code === 67
    || code === 80
    || code === 81
    || code === 82
  ) {
    return "rainy";
  }
  if (
    code === 71
    || code === 73
    || code === 75
    || code === 77
    || code === 85
    || code === 86
  ) {
    return "snowy";
  }
  if (code === 95 || code === 96 || code === 99) {
    return "stormy";
  }

  return "default";
}

async function resolveWeatherCondition(includeWeather: boolean): Promise<WeatherCondition> {
  if (!includeWeather) {
    return "default";
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, OPEN_METEO_TIMEOUT_MS);

  try {
    const url = new URL(OPEN_METEO_ENDPOINT);
    url.searchParams.set("latitude", String(OPEN_METEO_LATITUDE));
    url.searchParams.set("longitude", String(OPEN_METEO_LONGITUDE));
    url.searchParams.set("current_weather", "true");

    const response = await fetch(url.toString(), {
      signal: controller.signal,
    });
    if (!response.ok) {
      return "default";
    }

    const payload = await response.json() as {
      current_weather?: {
        weathercode?: number;
      };
    };

    const weatherCode = payload.current_weather?.weathercode;
    if (typeof weatherCode !== "number" || !Number.isFinite(weatherCode)) {
      return "default";
    }

    return mapWeatherCodeToCondition(weatherCode);
  } catch {
    return "default";
  } finally {
    clearTimeout(timeout);
  }
}

function resolveSecondaryMessagePool(theme: GreetingTheme, period: TimePeriod): string[] {
  if (theme === "study") {
    return STUDY_SECONDARY_MESSAGES[period];
  }

  if (theme === "motivational") {
    return MOTIVATIONAL_SECONDARY_MESSAGES[period];
  }

  return [];
}

function buildPrimaryMessage(period: TimePeriod, name: string): string {
  const template = PRIMARY_TEMPLATES[period];
  const hasName = name.trim().toLowerCase() !== "there";

  if (!template) {
    return hasName ? `Hello, ${name}!` : "Hello!";
  }

  if (hasName) {
    return `${template.message}, ${name}! ${template.emoji}`;
  }

  return `${template.message}! ${template.emoji}`;
}

export async function generateGreetingMessage(
  userName: string,
  includeWeather: boolean,
  greetingTheme: GreetingTheme,
): Promise<UserGreetingMessageStruct> {
  const now = new Date();
  const period = getTimePeriod(now);
  const normalizedName = normalizeName(userName);
  const daySeed = getDayOfYear(now);

  const primaryMessage = buildPrimaryMessage(period, normalizedName);

  if (greetingTheme === "minimal") {
    return {
      primaryMessage,
      secondaryMessage: "",
    };
  }

  const weatherCondition = await resolveWeatherCondition(includeWeather);
  const pool = resolveSecondaryMessagePool(greetingTheme, period);
  const secondarySeed = daySeed + hashKey(`${period}:${greetingTheme}`);
  let secondaryMessage = pickBySeed(pool, secondarySeed);

  if (weatherCondition !== "default") {
    const nudge = WEATHER_STUDY_NUDGES[weatherCondition];
    if (nudge) {
      secondaryMessage = secondaryMessage
        ? `${secondaryMessage} ${nudge}`
        : nudge;
    }
  }

  return {
    primaryMessage,
    secondaryMessage,
  };
}
