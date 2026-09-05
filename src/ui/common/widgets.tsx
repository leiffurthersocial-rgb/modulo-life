import type { ReactNode } from 'react';

export function Panel({
  title,
  icon,
  onClose,
  children,
  footer,
  width = 'default',
  tabs,
}: {
  title: string;
  icon?: string;
  onClose?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'default' | 'narrow' | 'wide';
  tabs?: ReactNode;
}) {
  return (
    <div className={`panel ${width === 'narrow' ? 'narrow' : width === 'wide' ? 'wide' : ''}`} role="dialog" aria-label={title}>
      <div className="panel-head">
        <span className="accent-bar" aria-hidden />
        {icon && <span aria-hidden>{icon}</span>}
        <h2>{title}</h2>
        {onClose && (
          <button className="close-x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        )}
      </div>
      {tabs}
      <div className="panel-body">{children}</div>
      {footer && <div className="panel-foot">{footer}</div>}
    </div>
  );
}

export function Bar({ value, max = 100, color, thick }: { value: number; max?: number; color: string; thick?: boolean }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`bar ${thick ? 'thick' : ''}`} role="meter" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={max}>
      <span style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="field">
      <label>
        <span>{label}</span>
        <button
          type="button"
          className={`switch ${on ? 'on' : ''}`}
          role="switch"
          aria-checked={on}
          aria-label={label}
          onClick={() => onChange(!on)}
        />
      </label>
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div className="field">
      <label>
        <span>{label}</span>
        <span className="muted mono">{format ? format(value) : value}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
  hint?: string;
}) {
  return (
    <div className="field">
      <label>
        <span>{label}</span>
      </label>
      <div className="seg" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            className={o.value === value ? 'on' : ''}
            aria-pressed={o.value === value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function Avatar({ name, color, className = 'avatar' }: { name: string; color: string; className?: string }) {
  return (
    <span className={className} style={{ background: color }} aria-hidden>
      {name.charAt(0)}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>;
}
