import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function Section({
  index,
  title,
  hint,
  children,
}: {
  index: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-white/10 px-6 py-7">
      <header className="mb-1 flex items-baseline gap-3">
        <span className="font-sans text-[11px] font-semibold tracking-[0.24em] text-[#e8c478]">
          {index}
        </span>
        <h2 className="font-display text-2xl font-semibold text-white">{title}</h2>
      </header>
      {hint ? <p className="mb-5 mt-2 text-[13px] leading-relaxed text-[#9aa4bd]">{hint}</p> : null}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9aa4bd]"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs leading-snug text-[#ff9b8a]">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs leading-snug text-[#7f89a3]">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({ invalid, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      {...props}
      className={cx(
        "w-full rounded-lg border bg-white/[0.04] px-3 py-2.5 font-sans text-sm text-white outline-none transition",
        "placeholder:text-white/25 focus:bg-white/[0.07]",
        invalid
          ? "border-[#ff9b8a]/60 focus:border-[#ff9b8a]"
          : "border-white/12 focus:border-[#e8c478]/70",
        props.className,
      )}
    />
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cx(
              "rounded-lg border px-3 py-2.5 font-sans text-[13px] font-medium transition",
              selected
                ? "border-[#e8c478] bg-[#e8c478]/12 text-[#f6e7c6]"
                : "border-white/12 bg-white/[0.03] text-[#9aa4bd] hover:border-white/25 hover:text-white",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cx(
        "flex w-full items-start gap-3 rounded-lg border px-3.5 py-3 text-left transition",
        checked
          ? "border-[#e8c478]/45 bg-[#e8c478]/8"
          : "border-white/12 bg-white/[0.03] hover:border-white/25",
      )}
    >
      <span
        className={cx(
          "mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition",
          checked ? "bg-[#e8c478]" : "bg-white/20",
        )}
      >
        <span
          className={cx(
            "h-4 w-4 rounded-full bg-[#0b0d14] transition-transform",
            checked ? "translate-x-4" : "translate-x-0",
          )}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-white">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs leading-snug text-[#9aa4bd]">{hint}</span> : null}
      </span>
    </button>
  );
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "quiet" }) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-sans text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55",
        variant === "primary"
          ? "bg-[#e8c478] text-[#0b0d14] hover:bg-[#f0d295]"
          : "border border-white/15 bg-white/[0.03] text-[#c9cee0] hover:border-white/30 hover:text-white",
        className,
      )}
    />
  );
}

export function InlineNote({ tone = "info", children }: { tone?: "info" | "danger"; children: ReactNode }) {
  return (
    <p
      className={cx(
        "rounded-lg border px-3 py-2 text-xs leading-relaxed",
        tone === "danger"
          ? "border-[#ff9b8a]/40 bg-[#ff9b8a]/10 text-[#ffb9ad]"
          : "border-white/12 bg-white/[0.03] text-[#9aa4bd]",
      )}
    >
      {children}
    </p>
  );
}
