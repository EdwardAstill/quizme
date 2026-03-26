import { useState, useRef, useEffect } from "react";
import type { Theme, FontSize, Settings as SettingsType } from "../hooks/useSettings";
import "./Settings.css";

interface SettingsProps {
  settings: SettingsType;
  onUpdate: (patch: Partial<SettingsType>) => void;
}

const themes: { value: Theme; label: string; swatch: string }[] = [
  { value: "dark", label: "Dark", swatch: "#0a0a0a" },
  { value: "light", label: "Light", swatch: "#f4f1eb" },
  { value: "midnight", label: "Midnight", swatch: "#0a1628" },
  { value: "forest", label: "Forest", swatch: "#0c1a0e" },
];

const fontSizes: { value: FontSize; label: string }[] = [
  { value: "small", label: "S" },
  { value: "medium", label: "M" },
  { value: "large", label: "L" },
];


export function Settings({ settings, onUpdate }: SettingsProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div className="settings" ref={ref}>
      <button
        className="settings__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-label="Settings"
        title="Settings"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>

      {open && (
        <div className="settings__panel">
          <div className="settings__section">
            <span className="settings__label">Theme</span>
            <div className="settings__themes">
              {themes.map((t) => (
                <button
                  key={t.value}
                  className={`settings__swatch ${settings.theme === t.value ? "settings__swatch--active" : ""}`}
                  onClick={() => onUpdate({ theme: t.value })}
                  title={t.label}
                >
                  <span
                    className="settings__swatch-color"
                    style={{ background: t.swatch }}
                  />
                  <span className="settings__swatch-label">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="settings__section">
            <span className="settings__label">Font size</span>
            <div className="settings__font-sizes">
              {fontSizes.map((f) => (
                <button
                  key={f.value}
                  className={`settings__font-btn ${settings.fontSize === f.value ? "settings__font-btn--active" : ""}`}
                  onClick={() => onUpdate({ fontSize: f.value })}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="settings__section">
            <span className="settings__label">Content width — {settings.contentWidth}%</span>
            <input
              className="settings__range"
              type="range"
              min={20}
              max={100}
              step={5}
              value={settings.contentWidth}
              onChange={(e) => onUpdate({ contentWidth: Number(e.target.value) })}
            />
          </div>

          <div className="settings__section">
            <span className="settings__label">Line spacing — {settings.lineSpacing.toFixed(1)}</span>
            <input
              className="settings__range"
              type="range"
              min={1.0}
              max={2.5}
              step={0.1}
              value={settings.lineSpacing}
              onChange={(e) => onUpdate({ lineSpacing: Number(e.target.value) })}
            />
          </div>

          <div className="settings__section">
            <label className="settings__toggle-row">
              <span className="settings__label">Show sidebar</span>
              <button
                className={`settings__switch ${settings.showSidebar ? "settings__switch--on" : ""}`}
                onClick={() => onUpdate({ showSidebar: !settings.showSidebar })}
                role="switch"
                aria-checked={settings.showSidebar}
              >
                <span className="settings__switch-thumb" />
              </button>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
