import { useCallback, useId, type KeyboardEvent } from "react";

export interface RadioGroupProps {
  role: "radiogroup";
  "data-radiogroup": string;
  "aria-label"?: string;
}

export interface RadioItemProps {
  role: "radio";
  tabIndex: 0 | -1;
  onKeyDown: (event: KeyboardEvent) => void;
  "data-radio-index": string;
}

/**
 * Navegación con teclado para `role="radiogroup"` (roving tabindex, patrón
 * WAI-ARIA): flechas mueven el foco **y** seleccionan dentro del propio grupo,
 * Home/End saltan a los extremos. Actúa solo sobre este grupo, nunca en el
 * `document` entero.
 */
export function useRovingRadioGroup(
  count: number,
  activeIndex: number,
  onSelect: (index: number) => void,
  ariaLabel?: string,
): { groupProps: RadioGroupProps; itemProps: (i: number) => RadioItemProps } {
  const groupId = useId();

  const focusAndSelect = useCallback(
    (next: number) => {
      const clamped = (next + count) % count;
      const button = document.querySelector<HTMLButtonElement>(
        `[data-radiogroup="${groupId}"] [role='radio'][data-radio-index="${clamped}"]`,
      );
      button?.focus();
      onSelect(clamped);
    },
    [count, groupId, onSelect],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent, i: number) => {
      const moves: Record<string, number> = {
        ArrowRight: 1,
        ArrowDown: 1,
        ArrowLeft: -1,
        ArrowUp: -1,
      };
      if (event.key in moves) {
        event.preventDefault();
        focusAndSelect(i + moves[event.key]);
      } else if (event.key === "Home") {
        event.preventDefault();
        focusAndSelect(0);
      } else if (event.key === "End") {
        event.preventDefault();
        focusAndSelect(count - 1);
      }
    },
    [focusAndSelect, count],
  );

  const itemProps = useCallback(
    (i: number): RadioItemProps => ({
      role: "radio",
      tabIndex: i === activeIndex ? 0 : -1,
      onKeyDown: (event: KeyboardEvent) => onKeyDown(event, i),
      "data-radio-index": String(i),
    }),
    [activeIndex, onKeyDown],
  );

  const groupProps: RadioGroupProps = {
    role: "radiogroup",
    "data-radiogroup": groupId,
    "aria-label": ariaLabel,
  };

  return { groupProps, itemProps };
}
