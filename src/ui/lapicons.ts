// The OS's icons (M10-58): one small line drawing per app, ice blue, and the tray's battery.
const svg = (d: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

export const ICONS: Record<string, string> = {
  map: svg('<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>'),
  status: svg('<path d="M3 12h4l2-5 4 10 2-5h6"/>'),
  scan: svg('<path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3"/><circle cx="12" cy="12" r="3"/>'),
  notes: svg('<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 11h7M9 15h7M9 19h4"/>'),
  drone: svg('<circle cx="5" cy="5" r="2.5"/><circle cx="19" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="M7 7l3 3M17 7l-3 3M7 17l3-3M17 17l-3-3"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/>'),
  cams: svg('<rect x="3" y="7" width="13" height="10" rx="1.5"/><path d="M16 11l5-3v8l-5-3"/>'),
  logs: svg('<circle cx="7" cy="15" r="4"/><circle cx="17" cy="15" r="4"/><path d="M7 11V6h3l1 4M17 11V6h-3l-1 4M11 14h2"/>'),
  songs: svg('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'),
  training: svg('<path d="M3 9a2 2 0 012-2h14a2 2 0 012 2v6a2 2 0 01-2 2h-4l-2-3h-2l-2 3H5a2 2 0 01-2-2z"/>'),
};

/** The tray's battery, filled to its charge (0..1). */
export const battery = (v: number) => `<svg viewBox="0 0 26 14" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="1" y="1.5" width="21" height="11" rx="2"/><path d="M24 5v4"/><rect x="3" y="3.5" width="${(17 * Math.max(0, Math.min(1, v))).toFixed(1)}" height="7" rx="0.8" fill="currentColor" stroke="none"/></svg>`;
