/**
 * Feature content, grouped. Source: README.md "What it does", the press text
 * (site-assets/press/texts/en.md) and docs/release-notes/v1.5.0.md / v1.5.1.md.
 * Only shipped, documented behaviour belongs here.
 */
import type { CharacterName } from './media';

export interface FeatureGroup {
  id: string;
  title: string;
  summary: string;
  /** A built-in character that stands next to the group on the homepage. */
  mascot: CharacterName;
  points: string[];
}

export const featureGroups: FeatureGroup[] = [
  {
    id: 'pictures',
    title: 'Any picture comes alive',
    summary: 'Drop a PNG, GIF, WebP or a short MP4 on the screen, or paste a picture: it becomes a character.',
    mascot: 'ghost',
    points: [
      'PNG, animated PNG, GIF, WebP, JPEG and H.264 MP4, with per-frame delays kept',
      'Sprite sheets sliced by grid, and folders of numbered PNG frames',
      'Ten built-in characters that walk, fall, dangle when picked up and fall asleep',
      'Six easing curves that reshape a loop’s timing without changing its length',
    ],
  },
  {
    id: 'life',
    title: 'A life of their own',
    summary: 'Walking, wandering, bouncing, following the cursor or each other, playing tag — or a small script you write.',
    mascot: 'cat',
    points: [
      'Tap one, even outside edit mode: it hops, says a line and plays its sound',
      'Characters greet each other, bump into each other and land on each other’s heads',
      'Behaviours in sandboxed Rhai scripts: no files, no network, capped operations',
      'Hours of their own, livelier in the morning and slower at night',
    ],
  },
  {
    id: 'out-of-the-way',
    title: 'Out of your way',
    summary: 'Clicks pass through. They step aside for full-screen games and films, and hold still while you are away.',
    mascot: 'cloud',
    points: [
      'Click-through by default: only the ⚙ button catches input, and it can be hidden',
      'Over your windows, or — one switch — on the desktop beneath them',
      'Hide or pause while a game, a video or a presentation fills the screen',
      'Pause on battery, or after you have been away for a while',
    ],
  },
  {
    id: 'your-day',
    title: 'Around your day',
    summary: 'Reminders to take a break or drink water, a focus timer, bedtime, and a welcome back when you return.',
    mascot: 'star',
    points: [
      'Reminders at intervals or at a set time, said in a speech bubble',
      'Optional desktop notifications with a sound',
      'Snooze for 15 minutes, an hour or until morning',
      'They doze while you are away and greet you when you come back',
    ],
  },
];

export interface FeatureFact {
  title: string;
  text: string;
  icon: 'scenes' | 'people' | 'lock';
}

export const featureFacts: FeatureFact[] = [
  {
    title: 'Scenes to share',
    text: 'Save what is on screen under a name, switch by the time of day, and share a scene or a character as one file.',
    icon: 'scenes',
  },
  {
    title: 'For everyone',
    text: 'Ten languages, screen readers over AT-SPI, every action from the keyboard, and high-contrast themes.',
    icon: 'people',
  },
  {
    title: 'Private by design',
    text: 'The app makes no network connection at all. Nothing about you or your desktop leaves your computer.',
    icon: 'lock',
  },
];

/** The long-form features page: every section is a heading plus details. */
export interface FeatureSection {
  id: string;
  title: string;
  intro: string;
  items: { title: string; text: string }[];
}

export const featureSections: FeatureSection[] = [
  {
    id: 'characters',
    title: 'Characters and animation',
    intro: 'Anything you can draw or record can live on your desktop.',
    items: [
      { title: 'Drop, paste or pick a file', text: 'Drag a picture or a short video onto the overlay, paste one copied in any app with Ctrl+V, or choose it with Add file… through the desktop’s file chooser.' },
      { title: 'The formats you already have', text: 'Static PNG and JPEG, animated GIF and WebP with their frame delays, animated PNG, folders of numbered PNG frames, grid-sliced sprite sheets, and H.264 video up to about twenty seconds.' },
      { title: 'Ten built-in characters', text: 'A ghost, a slime, a heart, a star, a cat, a bunny, a frog, a robot, a cloud and a mushroom, each with its own drawings for walking, falling, being picked up and sleeping.' },
      { title: 'Animation curves', text: 'Linear, ease in, ease out, ease in-out, sine and bounce-out reshape per-frame timing while keeping the loop’s total duration.' },
      { title: 'Asset library', text: 'A searchable grid of everything in your asset folder; adding from it goes through the same validation as a drop.' },
    ],
  },
  {
    id: 'behaviour',
    title: 'Behaviour',
    intro: 'Characters can stand still, or do a lot more — as much as you want.',
    items: [
      { title: 'Built-in behaviours', text: 'Idle, walk around, wander inside bounds, bounce, follow the cursor, follow another character, or play tag with one.' },
      { title: 'Taps and greetings', text: 'With “Characters can be tapped” on, a click on a character makes it hop and speak while clicks elsewhere still reach your windows. Two characters who meet say hello.' },
      { title: 'Physics', text: 'Optional gravity: throw a character by letting go mid-swing; characters can bump into each other and land on each other’s heads.' },
      { title: 'Scripted behaviours', text: 'A character’s motion can be a small Rhai script from your library — sandboxed, with no file or network access and capped operations. Scripts can play sounds panned to the character’s position and react to overall machine load.' },
      { title: 'Moods and hours', text: 'Characters fade in and out, keep hours of their own, and can be livelier in the morning and slower at night.' },
    ],
  },
  {
    id: 'editing',
    title: 'Editing',
    intro: 'Edit mode turns the overlay into a workspace; outside it, clicks go straight through.',
    items: [
      { title: 'A tabbed settings panel', text: 'Inspector, Scene, Library, Appearance and Keybindings, with sliders for every field and collapsible sections.' },
      { title: 'Several at once', text: 'Shift+click or drag a rectangle to select several characters, then move, change, duplicate, align or space them evenly. Drags snap to screen edges and to other characters.' },
      { title: 'Groups', text: 'Ctrl+G binds the selection into a named group that is selected and moved as one.' },
      { title: 'Undo and redo', text: 'Every edit — a move, a delete, a changed property, a preset’s Replace — can be undone with Ctrl+Z.' },
      { title: 'Command palette', text: 'Ctrl+K searches every action, theme and preset, and runs it in one keystroke.' },
    ],
  },
  {
    id: 'scenes',
    title: 'Scenes and sharing',
    intro: 'Arrangements you like can be kept, scheduled and passed on.',
    items: [
      { title: 'Named scenes', text: 'Save what is on screen under a name, with a picture, and switch from the Scene tab, the command palette, the tray, or at set times of day.' },
      { title: 'One file to share', text: 'A scene travels as a single `.animascene` file with its pictures; one character as `.animachar` or as a GIF; a `.animabackup` carries everything to another machine.' },
      { title: 'Presets', text: 'Ready-made scenes such as Cozy Companion, Productivity Zen and Halloween Party, appended or replacing what is there.' },
    ],
  },
  {
    id: 'day',
    title: 'Around your day',
    intro: 'Optional, and off until you turn it on.',
    items: [
      { title: 'Speech bubbles and reminders', text: 'Lines of their own, reminders of a break or a glass of water at intervals or at a set time; `{time}`, `{day}`, `{date}` and `{name}` are filled in, and screen readers hear what is said.' },
      { title: 'Focus timer and bedtime', text: 'A focus timer from the tray, the palette or the Scene tab, a bedtime, and snoozing for 15 minutes, an hour or until morning.' },
      { title: 'Away and back', text: 'While you are away the characters doze; when you return they welcome you back.' },
      { title: 'Sounds at your volume', text: 'One volume for everything, one for each character, quiet at bedtime, and mute from the tray, a shortcut or D-Bus.' },
    ],
  },
  {
    id: 'desktop',
    title: 'Desktop integration',
    intro: 'It behaves like a well-mannered part of your desktop.',
    items: [
      { title: 'Stays out of the way', text: 'Hides or pauses while a full-screen app or one you choose is in front, and can hold still on battery.' },
      { title: 'Multi-monitor', text: 'Characters per monitor, spanning all of them or on one; drag them across screens and pin one to a monitor.' },
      { title: 'Tray, shortcuts and D-Bus', text: 'A tray icon, rebindable global shortcuts (through the desktop’s portal on GNOME and KDE), a single instance, and start at login.' },
      { title: 'Shortcuts on any layout', text: 'Shortcuts work on AZERTY, QWERTZ, Cyrillic and other layouts and are shown the way your keyboard labels them.' },
      { title: 'Hot reload', text: 'Edit `~/.config/animaengine/config.toml` while the app runs; it picks the change up within two seconds.' },
    ],
  },
  {
    id: 'access',
    title: 'Accessibility and languages',
    intro: 'Built to be used by everyone, with or without a mouse.',
    items: [
      { title: 'Screen readers', text: 'Orca and other AT-SPI screen readers can read and operate the settings on both Linux backends.' },
      { title: 'Without a mouse', text: 'Shift+F10 or the Menu key opens a character’s menu, Ctrl+A selects every character, N steps through them, and Tab moves through the panel.' },
      { title: 'Themes', text: 'Dark and Light, plus high-contrast versions of both that meet WCAG AAA, switchable without a restart.' },
      { title: 'Ten languages', text: 'English, Română, Español, Deutsch, Français, Italiano, Português (BR), Polski, Nederlands and 日本語, detected from LANG and switchable in Appearance.' },
    ],
  },
  {
    id: 'trust',
    title: 'Privacy and safety',
    intro: 'A program that runs from login to shutdown should be trustworthy.',
    items: [
      { title: 'Zero network calls', text: 'No telemetry, no crash reporting, no update checks, no accounts. The diagnostic report goes only to your clipboard.' },
      { title: 'Bounded loaders', text: 'Files are refused above 4096 pixels a side or 256 MB once decoded, and video is kept to its first 600 frames, so a malicious file cannot exhaust memory.' },
      { title: 'Atomic writes', text: 'Config and cache are written atomically, so a crash cannot corrupt either; after one, `anima-engine --recover` restores the last scene.' },
      { title: 'Stable formats', text: 'Configs written by any 1.x release keep every value, and the stability policy lists what stays put across releases.' },
    ],
  },
];

/** README.md, "Supported assets". */
export const supportedAssets: { type: string; extensions: string; notes: string }[] = [
  { type: 'Static image', extensions: '.png, .jpg, .jpeg', notes: 'Single frame' },
  { type: 'Animated PNG', extensions: '.png', notes: 'Plays every frame for as long as it asks (since 1.5.1)' },
  { type: 'Animated GIF', extensions: '.gif', notes: 'Per-frame delays preserved' },
  { type: 'WebP', extensions: '.webp', notes: 'Animated and static' },
  { type: 'PNG sequence', extensions: 'folder of frame_*.png', notes: 'Decoded in parallel' },
  { type: 'Sprite sheet', extensions: '.png with columns × rows', notes: 'Grid sliced automatically' },
  { type: 'Video', extensions: '.mp4, .m4v, .mov', notes: 'H.264 only, audio ignored, about 20 seconds at most' },
];
