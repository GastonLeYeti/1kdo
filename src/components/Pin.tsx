import { useEffect, useRef } from 'react';
import { CODE_LENGTH } from '../../shared/types';

/** The six boxes of a code, filled with dots. */
export function PinDots({ length }: { length: number }) {
  return (
    <div className="pin" aria-hidden="true">
      {Array.from({ length: CODE_LENGTH }, (_, index) => <i key={index} className={index < length ? 'f' : ''} />)}
    </div>
  );
}

/** A 6-digit code field: dots on screen, the phone's number pad underneath. */
export function PinField({ label, value, onChange, autoFocus = false, focusNow = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  /** Moves the focus here when it turns true (e.g. once the previous code is complete). */
  focusNow?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (focusNow) input.current?.focus();
  }, [focusNow]);
  return (
    <label className="pinfield" onClick={() => input.current?.focus()}>
      <span className="label">{label}</span>
      <PinDots length={value.length} />
      <input
        ref={input}
        className="pin-input"
        type="password"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d*"
        maxLength={CODE_LENGTH}
        autoFocus={autoFocus}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
      />
    </label>
  );
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

/** On-screen number pad of the sign-in screen. */
export function Keypad({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  /** Applies one key press to the code. */
  function press(key: string): void {
    if (key === '⌫') onChange(value.slice(0, -1));
    else if (value.length < CODE_LENGTH) onChange(value + key);
  }
  return (
    <div className="keys">
      {KEYS.map((key, index) =>
        key ? (
          <button key={key} type="button" aria-label={key === '⌫' ? 'Effacer' : key} onClick={() => press(key)}>{key}</button>
        ) : (
          <span key={`blank-${index}`} className="none" />
        ),
      )}
    </div>
  );
}
