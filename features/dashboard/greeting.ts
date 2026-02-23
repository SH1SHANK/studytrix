import { type GreetingTheme } from "@/features/dashboard/greeting.preferences";

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
const OPEN_METEO_LATITUDE = 11.317259602205409;
const OPEN_METEO_LONGITUDE = 75.93866390581275;
const OPEN_METEO_TIMEOUT_MS = 3000;

// ---------------------------------------------------------------------------
// Core type: every entry is a [primary, secondary] pair written together so
// the two lines form a single coherent thought rather than two independent
// fragments. {name} is substituted at runtime.
// ---------------------------------------------------------------------------
type GreetingPair = [primary: string, secondary: string];
type WeatherPool = Partial<Record<WeatherCondition, GreetingPair[]>>;
type GreetingPool = Record<TimePeriod, WeatherPool>;

// ---------------------------------------------------------------------------
// STUDY theme
// ---------------------------------------------------------------------------
const STUDY_GREETINGS: GreetingPool = {
  early_morning: {
    default: [
      [
        "Up before the world, {name} — the quiet is all yours. 🌅",
        "This is prime time to tackle the chapter you've been postponing; silence is the rarest study aid there is. 📚",
      ],
      [
        "Most people are still asleep, {name}, and your notes already aren't. 🌙",
        "Use this undistracted hour for active recall — the morning calm turns review into long-term memory. 🧠",
      ],
      [
        "Early sessions like this one build the discipline that exam season can't shake, {name}. 💪",
        "Pick your hardest concept, work it end-to-end, and you'll own the rest of the day. 🎯",
      ],
      [
        "Sunrise study mode, {name} — your brain is fresh and the world hasn't started competing for your attention yet. ✨",
        "Start with active recall before notifications kick in; whatever sticks now will stick for weeks. ⚡",
      ],
      [
        "One focused early session is worth three stressed late-night ones, {name}. 🌤️",
        "Lock in your highest-priority module right now while mental energy is at its daily peak. 🔒",
      ],
    ],
    clear: [
      [
        "Clear skies and a clear head this morning, {name} — a rare alignment. ☀️",
        "Let the clean light set the tone: open your notes, pick one topic, and finish it before the day gets loud. 📖",
      ],
      [
        "Sunrise hitting crisp and clean out there, {name} — perfect backdrop for a sharp revision session. 🌅",
        "Your focus is at its daily high right now; use it for the material that needs the most from you. 🎯",
      ],
      [
        "Bright morning outside, {name}, and your best study window is wide open to match. ☀️",
        "Do one difficult problem set before the world wakes up — that early win compounds all day. 🧠",
      ],
    ],
    partly_cloudy: [
      [
        "Soft morning light filtering through the clouds, {name} — a calm start. ⛅",
        "This gentle atmosphere is ideal for steady revision; map out your topic before diving into the detail. 🗺️",
      ],
      [
        "The sky's taking it easy this morning, {name} — a good cue to settle in and work steadily. 🌤️",
        "Run one focused session on your toughest subject while the day is still quiet. 📘",
      ],
    ],
    cloudy: [
      [
        "Grey skies outside, {name}, but that just means fewer distractions pulling your eyes to the window. ☁️",
        "Lean into the low-stimulus morning and push through the chapter you've been avoiding. 📚",
      ],
      [
        "Overcast and quiet — practically made for deep work, {name}. ☁️",
        "Low ambient light is a natural focus aid; use this window for your hardest concept. 🧠",
      ],
    ],
    foggy: [
      [
        "Fog rolling in outside, {name} — the world's muffled, and that works in your favour. 🌫️",
        "Zero visibility out there, crystal-clear notes in here; lock in your revision before the fog lifts. 📖",
      ],
      [
        "Misty morning, {name} — a cosy bubble that's perfect for uninterrupted study. 🌫️",
        "Use the hazy calm to work through dense material that demands full attention. 🎯",
      ],
    ],
    rainy: [
      [
        "Rain at sunrise, {name} — statistically the best study weather, and you're already up for it. 🌧️",
        "Let the rhythm on the roof be your soundtrack; one solid early session sets the whole day's tone. 📚",
      ],
      [
        "The rain has sealed off distractions for you, {name}. 🌧️",
        "Use this quiet, grey morning to tackle the chapter that needs the most of your attention. 🧠",
      ],
      [
        "Drizzle outside, deep focus inside, {name}. 🌦️",
        "Morning rain and fresh coffee are practically a study-mode invitation — take it. ☕",
      ],
    ],
    snowy: [
      [
        "Snow falling quietly outside, {name} — the world is still and so is your study environment. ❄️",
        "Rare atmospheric calm like this is worth converting into a long, unbroken revision session. 📖",
      ],
      [
        "A white, silent morning, {name} — nature has done the soundproofing for you. ❄️",
        "Settle in with your flashcards or a practice paper; there's nowhere better to be right now. 🗂️",
      ],
    ],
    stormy: [
      [
        "Storm raging outside, {name}, which means zero temptation to go anywhere. ⛈️",
        "Turn that sealed-in energy into a power revision session — you've got the whole morning. 📚",
      ],
      [
        "Wild weather outside, {name}, calm and focused in here. ⛈️",
        "Fewer interruptions than you'll get all week — use the storm window to close a backlog topic. ✅",
      ],
    ],
  },

  morning: {
    default: [
      [
        "Morning, {name} — your sharpest focus window is open right now. 🧠",
        "Start with your toughest subject and coast into lighter material; the hardest work deserves your best hours. 📘",
      ],
      [
        "Fresh start, fresh material, {name} — a near-perfect combination. ☀️",
        "Run a 50-10 rhythm and finish one full chapter before noon; morning retention is your strongest asset. ⏳",
      ],
      [
        "Good morning, {name} — your brain is primed and the day hasn't claimed your attention yet. 🌤️",
        "Map out the topic before you memorise it; clarity at this hour turns into recall that lasts. 🗺️",
      ],
      [
        "The morning's yours, {name}, and so is peak cognitive performance. ☀️",
        "Batch similar questions now to train exam-style thinking before fatigue sets in later. 🧩",
      ],
      [
        "One quality morning session beats scattered study all day, {name}. 🏁",
        "Commit to a single, specific goal for this block — finish it, then build from there. 🎯",
      ],
    ],
    clear: [
      [
        "Brilliant morning out there, {name}, and your focus is just as sharp. ☀️",
        "Clear-sky energy is real — channel it into your hardest problem set before the afternoon dip arrives. 🎯",
      ],
      [
        "Sun's out, brain's on, {name}. ☀️",
        "Use the natural light boost to power through a dense revision block — this is your peak window. 📖",
      ],
      [
        "Crisp, clear morning, {name} — one of those sessions where everything just clicks. 🌞",
        "Don't waste it on passive reading; do active recall and let the sunshine do the rest. ⚡",
      ],
    ],
    partly_cloudy: [
      [
        "Nice calm morning, {name} — the sky and the study session are both looking good. ⛅",
        "Steady conditions call for steady revision; summarise each page in one line as you go. ✍️",
      ],
      [
        "Soft morning light, {name}, soft start — but make it count. ⛅",
        "Ease in with a quick review of yesterday, then push into new material with the momentum. 📘",
      ],
    ],
    cloudy: [
      [
        "Overcast morning, {name} — lower ambient stimulus, higher study depth. ☁️",
        "Cloudy skies are a free focus boost; use them to work through the module you've been avoiding. 📚",
      ],
      [
        "Grey out there, {name}, but your study session doesn't have to be. ☁️",
        "Inject energy into the morning with a timed practice-question sprint before settling into notes. 🏃",
      ],
    ],
    foggy: [
      [
        "Foggy morning outside, {name} — visibility low, concentration high. 🌫️",
        "The muffled world is ideal for deep reading; pick a dense topic and stay with it until the fog lifts. 📖",
      ],
    ],
    rainy: [
      [
        "Rainy morning, {name} — the classic study-day weather has arrived right on schedule. 🌧️",
        "Let the sound of rain set the pace for a long, unbroken revision session; no better excuse to stay in and focus. 📚",
      ],
      [
        "Morning rain outside, {name}, notebook open inside. 🌦️",
        "Retention is strong this hour and the weather's keeping distractions at bay — a near-perfect setup. 🧠",
      ],
    ],
    snowy: [
      [
        "Snow softening the morning sounds, {name} — your study environment just got a natural upgrade. ❄️",
        "Deep focus thrives in this kind of stillness; tackle the most demanding material on your list. 📘",
      ],
    ],
    stormy: [
      [
        "Storm locked in the outdoors and you in here with your books, {name} — an ideal morning. ⛈️",
        "Use the involuntary quiet for a high-intensity revision sprint; no one's interrupting you today. 🧠",
      ],
    ],
  },

  midday: {
    default: [
      [
        "Halfway through the day, {name} — time to check in on that study streak. 🔥",
        "Switch subjects if you've been on one too long; variety is one of the most underrated retention tools. 🔄",
      ],
      [
        "Midday, {name} — the perfect moment to quiz yourself instead of re-reading the same page. ⚡",
        "Active recall right now is worth three passive review sessions; pick a topic and test yourself cold. 🧠",
      ],
      [
        "Good midday, {name} — reset your desk, refill your water, and fire up one focused sprint. 💧",
        "Convert your longest note page into flashcards before the afternoon; spaced repetition starts here. 🗂️",
      ],
      [
        "Noon check-in, {name} — how many topics can you explain out loud in 60 seconds? 🎙️",
        "If the answer is uncertain, that's your next revision target; midday is built for consolidation. 📝",
      ],
      [
        "Lunchtime lull, {name} — but you can use it to close one pending topic before the afternoon. ✅",
        "A short, sharp practice-question block now beats scrolling and pays off in the next session. 🎯",
      ],
    ],
    clear: [
      [
        "Clear midday sun, {name} — a good energy cue for a focused revision reset. ☀️",
        "Step outside for five minutes to reset, then come back and run one sharp question sprint. 🏃",
      ],
    ],
    partly_cloudy: [
      [
        "Mild midday outside, {name} — nothing pulling you away, everything pointing you back to the notes. ⛅",
        "Use the neutral weather to focus inward; consolidate what you've covered this morning before moving on. 📖",
      ],
    ],
    cloudy: [
      [
        "Grey noon, {name} — no glare, no distractions, just you and the material. ☁️",
        "Overcast midday light is genuinely easier to study in; run an uninterrupted flashcard session. 🗂️",
      ],
    ],
    foggy: [
      [
        "Hazy midday, {name} — the outside world is blurred so you can sharpen the inside one. 🌫️",
        "Use the muted atmosphere for concept mapping; connect the topics you've covered this morning. 🗺️",
      ],
    ],
    rainy: [
      [
        "Rain at noon, {name} — cancels lunch plans and opens a study slot simultaneously. 🌧️",
        "Convert that reclaimed time into a focused practice-paper block; it's one of the best swaps you can make. 📄",
      ],
      [
        "Midday rain keeping you in, {name}. 🌦️",
        "Lean into it — quiz yourself on this morning's material while retention is still warm. ⚡",
      ],
    ],
    snowy: [
      [
        "Snow at midday, {name} — everything outside has slowed down so you don't have to stop. ❄️",
        "Use the wintry stillness to tackle a mixed-question set and simulate exam pressure. 📄",
      ],
    ],
    stormy: [
      [
        "Storm rolling through midday, {name} — you're not going anywhere and neither is your focus. ⛈️",
        "Treat the forced calm as a bonus study window; close a backlog chapter before the afternoon. ✅",
      ],
    ],
  },

  afternoon: {
    default: [
      [
        "Afternoon check-in, {name} — spaced repetition works best in this window. 🗂️",
        "Open your flashcards and revisit yesterday's material; the afternoon slump is no match for active recall. 🔁",
      ],
      [
        "Good afternoon, {name} — a focused 25-minute sprint can reset the whole second half of the day. ⏱️",
        "Revisit your weakest areas while energy is still usable; small targeted sessions beat one distracted marathon. 🔧",
      ],
      [
        "Afternoon mode, {name} — review beats new material right now. 📘",
        "Consolidate what you know before adding more; use past-paper questions to sharpen timing in this slot. 📄",
      ],
      [
        "The afternoon dip is real, {name}, but structure is your advantage over it. 🏗️",
        "Short, deliberate practice blocks are the move right now — finish one before planning the next. 🧭",
      ],
      [
        "Closing in on evening, {name} — one cleared backlog item before the session ends. ✅",
        "Revisit yesterday's notes, mark the gaps, and schedule them first tomorrow before they compound. 📌",
      ],
    ],
    clear: [
      [
        "Bright afternoon sunshine, {name} — the light's doing its best to help you focus. ☀️",
        "Use the energy lift for a review sprint; clear-sky afternoons are made for spaced repetition. 🗂️",
      ],
    ],
    partly_cloudy: [
      [
        "Nice and mild out there this afternoon, {name} — steady weather, steady revision pace. ⛅",
        "Work through a practice set and mark errors immediately; calm conditions make self-assessment easier. 📝",
      ],
    ],
    cloudy: [
      [
        "Overcast afternoon, {name} — a built-in low-distraction study environment. ☁️",
        "Run a focused flashcard session and close one topic before the evening review kicks in. 🗂️",
      ],
    ],
    foggy: [
      [
        "Misty afternoon, {name} — a good excuse to stay in and push through the session. 🌫️",
        "Use the hazy backdrop for slow, deliberate reading; difficult passages deserve this kind of focused time. 📖",
      ],
    ],
    rainy: [
      [
        "Afternoon rain sealing you in, {name} — treat it as a productivity gift. 🌧️",
        "Run a timed past-paper question block while the rain handles the soundproofing. 📄",
      ],
      [
        "Rainy afternoon, {name} — conditions are better for studying than they look. 🌦️",
        "Spaced repetition thrives in this window; revisit this morning's material before it fades. 🔁",
      ],
    ],
    snowy: [
      [
        "Snow in the afternoon, {name} — no reason to move, every reason to revise. ❄️",
        "Let the winter quiet do the work of blocking distractions while you run a thorough review session. 📚",
      ],
    ],
    stormy: [
      [
        "Storm in full swing this afternoon, {name} — you've got a natural bubble around your study session. ⛈️",
        "Use the enforced stillness for the review work that usually gets squeezed out of busier afternoons. 📋",
      ],
    ],
  },

  evening: {
    default: [
      [
        "Evening, {name} — a great time to lock in what you absorbed today. 🌙",
        "Summarise your key learnings in three bullet points; writing it out is the fastest way to reveal the gaps. ✍️",
      ],
      [
        "Good evening, {name} — close the day deliberately before you close the books. 🗒️",
        "Organise your notes, highlight anything still unclear, and schedule it first for tomorrow. 📅",
      ],
      [
        "Evening review window, {name} — one recap pass now can cut tomorrow's revision time in half. ⌛",
        "Turn today's material into quick self-test prompts so tomorrow starts with retrieval instead of rereading. ❓",
      ],
      [
        "Winding down the study day, {name} — use the evening calm to stitch disconnected topics together. 🧵",
        "Close with retrieval practice rather than passive reading; your memory will thank you in the morning. 🧠",
      ],
      [
        "Last block of the day, {name} — review mistakes now so tomorrow starts cleaner. 🧽",
        "Archive what you've finished and plan the next focused block; a clear end makes for an easier start. 📋",
      ],
    ],
    clear: [
      [
        "Clear evening sky, {name} — a calm backdrop for closing the study day well. ☀️",
        "Use the settled atmosphere to review and consolidate; clean night air and a reviewed chapter make a good pair. 📖",
      ],
    ],
    partly_cloudy: [
      [
        "Quiet evening outside, {name} — the day's winding down at just the right pace for a final review. ⛅",
        "Summarise today's notes and mark what still feels unclear before you sign off. ✍️",
      ],
    ],
    cloudy: [
      [
        "Overcast evening, {name} — low light, low noise, ideal for a calm end-of-day recap. ☁️",
        "Close the chapter open on your desk and review your errors before they become tomorrow's confusion. 📝",
      ],
    ],
    foggy: [
      [
        "Foggy evening settling in, {name} — the world outside has gone quiet. 🌫️",
        "Use that stillness for a final retrieval-practice session; what you recall now will carry into tomorrow. 🧠",
      ],
    ],
    rainy: [
      [
        "Rainy evening, {name} — the perfect low-key setting for a thoughtful final review. 🌧️",
        "Let the rain pace the session; slow and deliberate is the right gear for evening consolidation. 🔁",
      ],
      [
        "Quiet rain outside, {name} — a natural close-out cue for the study day. 🌦️",
        "Stitch today's topics together in your notes while the evening light holds; clarity now saves time tomorrow. 🧵",
      ],
    ],
    snowy: [
      [
        "Snow falling quietly outside, {name} — a peaceful frame for closing the day. ❄️",
        "Review by soft light, consolidate your notes, and let the overnight memory process do the heavy lifting. 🧠",
      ],
    ],
    stormy: [
      [
        "Storm evening, {name} — cosy inside, productive to the end. ⛈️",
        "Use the last burst of available energy for your final retrieval pass; close the day stronger than you started it. 💪",
      ],
    ],
  },

  night: {
    default: [
      [
        "Late night, {name} — your brain is ready to file everything you studied today while you sleep. 🌙",
        "One quick recap pass, then rest; sleep is when memory consolidates, and you need both to perform. 🌌",
      ],
      [
        "Night session winding down, {name} — keep this one short and precise. ⭐",
        "Close with formulas, definitions, or flashcards for better overnight carryover, then protect your sleep quality. 🛌",
      ],
      [
        "Almost time to close the books, {name} — write tomorrow's first task now so you start without friction. 📝",
        "A calm wind-down improves recall more than one extra hour of tired reading; rest is part of the performance. 🔋",
      ],
      [
        "Night study works best for light revision, not heavy new topics, {name}. 📘",
        "Stop at a clean checkpoint so the restart in the morning is easy; the next session will thank you for it. 🧭",
      ],
      [
        "Finishing strong tonight, {name} — the kind of consistency that quietly builds an edge. 🌌",
        "Unplug after this session; recovery is not a break from progress, it's the other half of it. 🔋",
      ],
    ],
    clear: [
      [
        "Clear night sky out there, {name} — a calm close to a productive day. ⭐",
        "Wrap up with a light review, then let sleep do what it does best: consolidate everything you studied. 🌙",
      ],
    ],
    partly_cloudy: [
      [
        "Quiet night, {name} — a good signal that the day is genuinely winding down. 🌤️",
        "One final retrieval pass on today's key concepts, then close the books and rest properly. ✅",
      ],
    ],
    cloudy: [
      [
        "Dark, overcast night, {name} — the universe is telling you to rest soon. ☁️",
        "Run a brief flashcard pass, write tomorrow's opener, then step away; quality sleep is a study strategy. 🛌",
      ],
    ],
    foggy: [
      [
        "Foggy night settling in, {name} — the world has gone quiet so you can too, soon. 🌫️",
        "End with light retrieval practice, set tomorrow's priority, and protect your recovery. 🧭",
      ],
    ],
    rainy: [
      [
        "Rain against the window at night, {name} — a classic wind-down soundtrack. 🌧️",
        "Let it close the session naturally; one short review, then rest before tomorrow needs you sharp. 🌙",
      ],
    ],
    snowy: [
      [
        "Snow outside and silence everywhere, {name} — the perfect late-night bookmark. ❄️",
        "Close with a brief recap, note tomorrow's priority, and let the overnight consolidation take over. 🧠",
      ],
    ],
    stormy: [
      [
        "Storm raging outside, {name} — but your study day ends on your terms, not the weather's. ⛈️",
        "Finish the session cleanly and get proper rest; tomorrow needs you recharged, not worn down. 🔋",
      ],
    ],
  },
};

// ---------------------------------------------------------------------------
// MOTIVATIONAL theme
// ---------------------------------------------------------------------------
const MOTIVATIONAL_GREETINGS: GreetingPool = {
  early_morning: {
    default: [
      [
        "Up before the alarm, {name} — that says everything about your standards. 🌅",
        "Progress compounds when you show up consistently; this early start is a deposit into that account. 💪",
      ],
      [
        "While the world waits for motivation, {name}, you're already building momentum. 🌤️",
        "Effort beats mood every single time; start the first task and the rest will follow naturally. ⚡",
      ],
      [
        "Discipline showed up for you this morning, {name} — now return the favour. 🌅",
        "One intentional early session can shift the trajectory of your entire day; begin. 🎯",
      ],
      [
        "Consistency doesn't wait for perfect conditions, {name} — and neither do you. 💫",
        "Do the next right step; momentum is built one early morning at a time, exactly like this one. 🔒",
      ],
      [
        "Good early morning, {name} — the head start you're giving yourself right now is real. ⭐",
        "Small wins in the quiet hours become big results later; keep showing up like this. 🏁",
      ],
    ],
    clear: [
      [
        "Clear sunrise, clear intention, {name} — a morning aligned in your favour. ☀️",
        "Channel the clean energy of a bright start: commit to one goal and execute it before the day gets complicated. 🎯",
      ],
      [
        "Bright morning and an early start, {name} — you've already made two great decisions. ☀️",
        "Let the clarity of the day mirror the clarity of your effort; focus on execution, not outcomes. 💪",
      ],
    ],
    partly_cloudy: [
      [
        "Soft morning light, {name} — calm, measured, and moving forward. ⛅",
        "Progress doesn't need perfect conditions, just steady execution; start and let the momentum build. 🔄",
      ],
    ],
    cloudy: [
      [
        "Overcast morning, {name} — the kind of day where quiet determination shows its value most. ☁️",
        "You don't need sunshine to make progress; you just need to start and keep going. 💪",
      ],
    ],
    foggy: [
      [
        "Foggy morning, {name} — unclear outside, focused inside. 🌫️",
        "Consistency in low-visibility conditions is the truest test of discipline; you're passing it right now. ✅",
      ],
    ],
    rainy: [
      [
        "Rain at sunrise, {name} — the world's telling you to stay in and get to work. 🌧️",
        "Discipline doesn't care about the weather; the people who show up on hard mornings are the ones who improve. 💪",
      ],
    ],
    snowy: [
      [
        "Snow and silence this early morning, {name} — a stillness that matches focused intention. ❄️",
        "The most consistent performers show up on days like this one; let that be your standard. ⭐",
      ],
    ],
    stormy: [
      [
        "Storm outside at sunrise, {name} — and you're already up and moving. ⛈️",
        "That early-morning discipline in rough conditions is exactly what separates progress from potential. 🔥",
      ],
    ],
  },

  morning: {
    default: [
      [
        "Morning, {name} — your best results come from steady repetition, not occasional intensity. ☀️",
        "A good start creates a productive chain reaction; commit to this block and let it set the tone. 🏁",
      ],
      [
        "Good morning, {name} — strong habits are built in ordinary moments, exactly like this one. 🌤️",
        "Let your schedule lead, not your impulses; momentum is earned one focused session at a time. 📋",
      ],
      [
        "The morning is yours, {name}, and so is the advantage of starting before doubt settles in. ☀️",
        "Reliable effort always outlasts bursts of motivation; make this block count and build on it. 💪",
      ],
      [
        "Morning clarity, {name} — when execution is clean, results follow. 🧠",
        "Keep showing up; mastery is cumulative, and today's session is part of the total. ⚡",
      ],
      [
        "Fresh start, {name} — the work you do now pays forward later in ways that are hard to predict. 🌅",
        "Clarity grows when you commit to focused work; close everything else and begin. 🎯",
      ],
    ],
    clear: [
      [
        "Bright morning sunshine, {name} — the right energy for clear-headed, decisive action. ☀️",
        "Channel the clarity of a clean sky into equally clean execution; commit to one goal and see it through. 💡",
      ],
      [
        "Crisp, sunny morning, {name} — a natural confidence boost for the session ahead. 🌞",
        "Your best work happens when you align environment with intention; the conditions are right, now bring the effort. 💪",
      ],
    ],
    partly_cloudy: [
      [
        "Nice mild morning, {name} — steady conditions are underrated for building good streaks. ⛅",
        "Reliable effort in unremarkable conditions is what separates consistent progress from wishful thinking. 🏗️",
      ],
    ],
    cloudy: [
      [
        "Overcast morning, {name} — all the more reason to build your own energy today. ☁️",
        "The most durable motivation comes from within, not the weather; show up the same regardless. 🔋",
      ],
    ],
    foggy: [
      [
        "Foggy morning, {name} — keep your direction clear even when visibility is low. 🌫️",
        "Focus on the next step, not the full picture; progress is built one deliberate action at a time. 🧭",
      ],
    ],
    rainy: [
      [
        "Rainy morning, {name} — the kind of day where your commitment is tested and proven. 🌧️",
        "Show up the same way you would on your best day; that consistency is what compounds into results. 💪",
      ],
    ],
    snowy: [
      [
        "Snow softening the morning, {name} — a serene backdrop for focused, deliberate effort. ❄️",
        "Quiet conditions like this are where deep work happens; use the stillness productively. 🧠",
      ],
    ],
    stormy: [
      [
        "Storm this morning, {name} — the kind of conditions that reveal genuine discipline. ⛈️",
        "The people who execute on mornings like this are the ones whose results are hard to explain otherwise. 🔥",
      ],
    ],
  },

  midday: {
    default: [
      [
        "Midday, {name} — this is exactly where discipline separates from intention. 💡",
        "Reset and continue; consistency matters more than speed, and you still have the whole afternoon. 🔄",
      ],
      [
        "Halfway through, {name} — every session completed is evidence of real progress. ✅",
        "Protect your attention and the results will follow; refocus, execute, and stack another win. 🏆",
      ],
      [
        "Noon check-in, {name} — you're closer to your goals than you were this morning. 📈",
        "Keep the promise you made to yourself; sustained effort beats sporadic intensity every time. 💪",
      ],
      [
        "Midday momentum, {name} — a focused restart is always better than a distracted marathon. 🧭",
        "Do what future you will thank you for; one solid block now pays off in ways that are hard to overstate. ⚡",
      ],
      [
        "Good midday, {name} — refocus, execute, and build on what you've already started. 🎯",
        "The middle of the day is where discipline shows; keep the streak alive and close something meaningful. 🔒",
      ],
    ],
    clear: [
      [
        "Clear skies at noon, {name} — a midday reset with some genuine natural momentum behind it. ☀️",
        "Let the clarity outside mirror your execution inside; pick the next task and finish it cleanly. 🎯",
      ],
    ],
    rainy: [
      [
        "Midday rain, {name} — a built-in reason to stay focused and push through the second half. 🌧️",
        "Sustained effort in uninspiring conditions is what real consistency looks like; keep going. 💪",
      ],
    ],
    cloudy: [
      [
        "Grey midday, {name} — the conditions aren't exciting and neither is discipline supposed to be. ☁️",
        "Do the work anyway; the unglamorous sessions are often the ones that move the needle most. 🔧",
      ],
    ],
    snowy: [
      [
        "Snow at midday, {name} — sealed in and focused, exactly as planned. ❄️",
        "Use the weather's gift of forced stillness to execute on something you've been putting off. ✅",
      ],
    ],
    stormy: [
      [
        "Storm at noon, {name} — nowhere to be, everything to gain from this session. ⛈️",
        "Treat the closed-in afternoon as extra allocated time; finish the block you started this morning. 🏁",
      ],
    ],
    foggy: [
      [
        "Hazy midday, {name} — keep your goals sharp even when the horizon isn't. 🌫️",
        "Clarity of direction is more important than perfect conditions; refocus and execute. 🧭",
      ],
    ],
    partly_cloudy: [
      [
        "Mild midday, {name} — a calm reset point halfway through the day. ⛅",
        "Steady execution in neutral conditions is the foundation of every good streak; keep building yours. 🏗️",
      ],
    ],
  },

  afternoon: {
    default: [
      [
        "Good afternoon, {name} — push through the dip; this is where real growth happens. 💪",
        "Structure turns low energy into real output; stay process-driven and results will catch up. 🏗️",
      ],
      [
        "Afternoon check-in, {name} — your routine is stronger than temporary fatigue. 🔋",
        "One quality block now can recover the whole second half; hold the line and finish the next task. ✅",
      ],
      [
        "The afternoon dip is real, {name}, but you've trained for this. 🧠",
        "Focused execution now creates a calmer evening; keep going, disciplined reps build confidence. 💪",
      ],
      [
        "Progress is built in the quieter grind hours, {name} — this is one of them. 🛠️",
        "Finish this block with intention and clarity; strong follow-through is what good results are made of. 🎯",
      ],
      [
        "Afternoon, {name} — the people who win in the long run execute here too, not just in the mornings. 📈",
        "Stay process-driven and let the results catch up; your consistency is becoming your identity. 🔥",
      ],
    ],
    clear: [
      [
        "Bright afternoon, {name} — let the sunshine be a cue to push through the fatigue. ☀️",
        "Natural light boosts alertness; use the remaining daylight for a focused, intentional block. 💡",
      ],
    ],
    rainy: [
      [
        "Rainy afternoon, {name} — the kind of session where showing up is already the win. 🌧️",
        "Execute on what you planned this morning; effort in low-energy conditions is what builds character. 💪",
      ],
    ],
    cloudy: [
      [
        "Overcast afternoon, {name} — no glamour, just execution. ☁️",
        "The most reliable performers work the same in grey conditions as gold ones; be that person today. 🏆",
      ],
    ],
    foggy: [
      [
        "Foggy afternoon, {name} — stay the course even when clarity is hard to find. 🌫️",
        "Trust your process; discipline doesn't depend on visibility or motivation, just action. 🧭",
      ],
    ],
    snowy: [
      [
        "Snow slowing the world down this afternoon, {name} — but not you. ❄️",
        "Let the stillness sharpen your focus; strong execution in quiet conditions compounds quietly. 🏁",
      ],
    ],
    stormy: [
      [
        "Storm in the afternoon, {name} — the closed-in feeling is actually a productivity asset. ⛈️",
        "Nowhere to go, no distractions arriving — finish the block you planned and close the day strong. ✅",
      ],
    ],
    partly_cloudy: [
      [
        "Mild afternoon, {name} — no excuses, no obstacles, just the work. ⛅",
        "Show up the same way you would on your best day; that's what consistent progress looks like. 💪",
      ],
    ],
  },

  evening: {
    default: [
      [
        "Good evening, {name} — a strong finish builds tomorrow's confidence. 🌙",
        "Close the day with deliberate progress; reflect, refine, and keep your streak alive. 📈",
      ],
      [
        "Evening wind-down, {name} — your consistency today is becoming your identity over time. 🔥",
        "Wrap up with intention, not randomness; a clear review now reduces tomorrow's load significantly. 📋",
      ],
      [
        "Almost done for the day, {name} — end it one step stronger than you began it. 🌙",
        "Finishing well is a skill; practice it every day and it becomes part of how you operate. 💪",
      ],
      [
        "Evening, {name} — steady effort tonight supports better outcomes later in ways that are easy to underestimate. ⭐",
        "Make this final session count; what you close today removes friction from tomorrow's start. ✅",
      ],
      [
        "Last stretch of the day, {name} — the ones who close deliberately are the ones who start confidently. 🌅",
        "Review your progress, anchor what you've done, and plan the first step for tomorrow. 🗺️",
      ],
    ],
    clear: [
      [
        "Clear evening, {name} — a clean close to a well-worked day. ☀️",
        "Finish with the same intention you started with; consistent ends build the confidence to keep showing up. 🏁",
      ],
    ],
    rainy: [
      [
        "Rainy evening, {name} — the kind of close that rewards the effort you put in earlier. 🌧️",
        "Wrap up with a deliberate review; the rain outside and progress inside is a good combination. 🌙",
      ],
    ],
    cloudy: [
      [
        "Overcast evening, {name} — a calm, unhurried close to the day. ☁️",
        "End with clarity and purpose; tomorrow's confidence is built on how well you close today. 💪",
      ],
    ],
    snowy: [
      [
        "Snow settling the evening, {name} — a peaceful bookend to a productive day. ❄️",
        "Close deliberately, rest well, and trust the process; tomorrow needs you recovered and ready. 🔋",
      ],
    ],
    stormy: [
      [
        "Storm closing the day, {name} — your consistency through it says something real. ⛈️",
        "Finish strong; the discipline to end well is the same discipline that makes starting easy. 🔥",
      ],
    ],
    foggy: [
      [
        "Foggy evening, {name} — end the day with clarity even if the sky doesn't have it. 🌫️",
        "Reflect on what moved forward today, set tomorrow's direction, and close with intention. 🧭",
      ],
    ],
    partly_cloudy: [
      [
        "Quiet evening, {name} — a calm close on a steady day of effort. ⛅",
        "The unglamorous consistent closes are what long-term progress is actually made of; this is one of them. 🏗️",
      ],
    ],
  },

  night: {
    default: [
      [
        "Night winding down, {name} — rest is not a break from progress; it actively supports it. 🌙",
        "Sustainable routines outlast short-term overwork; finish calmly and recover for tomorrow's effort. 🔋",
      ],
      [
        "Late night, {name} — a measured close today sets up a better start tomorrow. ⭐",
        "Discipline means knowing when to stop and reset; you've done enough to move forward — now recover well. 🌌",
      ],
      [
        "Night session, {name} — protect your energy to protect your performance. 🌙",
        "End with clarity and begin tomorrow with momentum; strong outcomes come from balanced effort and rest. 💪",
      ],
      [
        "Almost time, {name} — consistency includes proper recovery, not just consistent effort. 🛌",
        "Close the day with intention: note tomorrow's first task, then unplug and let the recovery happen. 📝",
      ],
      [
        "Night close, {name} — the version of you that shows up tomorrow is shaped by how you rest tonight. ⭐",
        "Finish calmly, sleep properly, and trust that today's effort is compounding even while you rest. 🔋",
      ],
    ],
    clear: [
      [
        "Clear night, {name} — a quiet, starlit close to a day of real effort. ⭐",
        "Rest well; the work you've done today is still working, and tomorrow needs you sharp. 🌙",
      ],
    ],
    rainy: [
      [
        "Rain at night, {name} — the perfect natural signal to slow down and recover. 🌧️",
        "Let the sound of it close the day; rest is a performance strategy, not a concession. 🛌",
      ],
    ],
    cloudy: [
      [
        "Dark, overcast night, {name} — a quiet invitation to close the day and recharge. ☁️",
        "Sustainable effort requires real recovery; protect tomorrow's performance by resting tonight. 🔋",
      ],
    ],
    snowy: [
      [
        "Snowfall closing the night, {name} — still and quiet, exactly the right conditions for recovery. ❄️",
        "Let the peace outside carry into your rest; tomorrow's effort starts with tonight's recovery. 🌙",
      ],
    ],
    stormy: [
      [
        "Storm at night, {name} — close the day on your own terms regardless of the weather outside. ⛈️",
        "Rest properly; resilience is built in recovery, not in grinding past the point of diminishing returns. 💪",
      ],
    ],
    foggy: [
      [
        "Foggy night settling in, {name} — end the day with a clear head even when the air isn't. 🌫️",
        "Anchor what you accomplished, plan tomorrow, then unplug; rest is the final productive act of the day. 🧭",
      ],
    ],
    partly_cloudy: [
      [
        "Quiet night, {name} — a gentle close to a day of steady effort. ⛅",
        "Rest well; tomorrow's version of you is a direct product of tonight's recovery. 🌙",
      ],
    ],
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getDayOfYear(value: Date): number {
  const start = new Date(value.getFullYear(), 0, 0);
  const diff = value.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getTimePeriod(value: Date): TimePeriod {
  const hour = value.getHours();
  if (hour >= 5 && hour < 8) return "early_morning";
  if (hour >= 8 && hour < 12) return "morning";
  if (hour >= 12 && hour < 14) return "midday";
  if (hour >= 14 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}

function normalizeName(userName: string): string {
  const trimmed = userName.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0] ?? "there";
}

function hashKey(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickBySeed<T>(values: T[], seed: number): T {
  return values[seed % values.length] as T;
}

function mapWeatherCodeToCondition(code: number): WeatherCondition {
  if (code === 0) return "clear";
  if (code === 1 || code === 2) return "partly_cloudy";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "foggy";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code))
    return "rainy";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snowy";
  if ([95, 96, 99].includes(code)) return "stormy";
  return "default";
}

async function resolveWeatherCondition(
  includeWeather: boolean,
): Promise<WeatherCondition> {
  if (!includeWeather) return "default";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPEN_METEO_TIMEOUT_MS);

  try {
    const url = new URL(OPEN_METEO_ENDPOINT);
    url.searchParams.set("latitude", String(OPEN_METEO_LATITUDE));
    url.searchParams.set("longitude", String(OPEN_METEO_LONGITUDE));
    url.searchParams.set("current_weather", "true");

    const response = await fetch(url.toString(), { signal: controller.signal });
    if (!response.ok) return "default";

    const payload = (await response.json()) as {
      current_weather?: { weathercode?: number };
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

// ---------------------------------------------------------------------------
// Core resolver: picks a co-authored [primary, secondary] pair, falling back
// from the specific weather condition → "default" if no weather-specific pool
// exists for this (theme × period × weather) combination.
// ---------------------------------------------------------------------------
function resolveGreetingPair(
  theme: "study" | "motivational",
  period: TimePeriod,
  weather: WeatherCondition,
  seed: number,
  name: string,
): GreetingPair {
  const pool = theme === "study" ? STUDY_GREETINGS : MOTIVATIONAL_GREETINGS;
  const periodPool = pool[period];

  // Prefer the weather-specific pool; fall back to "default".
  const candidates: GreetingPair[] =
    (weather !== "default" && periodPool[weather]?.length
      ? periodPool[weather]
      : undefined) ??
    periodPool["default"] ??
    [];

  if (candidates.length === 0) {
    return [`Hello, ${name}!`, ""];
  }

  const [rawPrimary, rawSecondary] = pickBySeed(candidates, seed);
  const inject = (s: string) => s.replace(/\{name\}/g, name);
  return [inject(rawPrimary ?? ""), inject(rawSecondary ?? "")];
}

// ---------------------------------------------------------------------------
// Public API — interface is unchanged, internals are fully redesigned.
// ---------------------------------------------------------------------------
export async function generateGreetingMessage(
  userName: string,
  includeWeather: boolean,
  greetingTheme: GreetingTheme,
): Promise<UserGreetingMessageStruct> {
  const now = new Date();
  const period = getTimePeriod(now);
  const normalizedName = normalizeName(userName);

  if (greetingTheme === "minimal") {
    const MINIMAL_TEMPLATES: Record<
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
    const tmpl = MINIMAL_TEMPLATES[period];
    const hasName = normalizedName.toLowerCase() !== "there";
    return {
      primaryMessage: hasName
        ? `${tmpl.message}, ${normalizedName}! ${tmpl.emoji}`
        : `${tmpl.message}! ${tmpl.emoji}`,
      secondaryMessage: "",
    };
  }

  const weatherCondition = await resolveWeatherCondition(includeWeather);
  const daySeed = getDayOfYear(now);
  const seed =
    daySeed + hashKey(`${period}:${greetingTheme}:${weatherCondition}`);
  const [primaryMessage, secondaryMessage] = resolveGreetingPair(
    greetingTheme,
    period,
    weatherCondition,
    seed,
    normalizedName,
  );

  return { primaryMessage, secondaryMessage };
}
