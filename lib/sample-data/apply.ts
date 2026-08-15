import type { SampleData } from './datasets';

type NativeValueElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function isNativeValueElement(element: Element | null): element is NativeValueElement {
  return (
    element !== null &&
    (element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement)
  );
}

/**
 * Assign a value to a React-controlled form element the same way typing into it
 * would, so React's onChange runs and state stays in sync. Directly assigning
 * `element.value = ...` is ignored by React's controlled components, which is
 * why we must use the native value setter and dispatch bubbling events.
 */
function setNativeValue(element: NativeValueElement, value: string): void {
  let prototype: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  if (element instanceof HTMLSelectElement) {
    prototype = HTMLSelectElement.prototype;
  } else if (element instanceof HTMLTextAreaElement) {
    prototype = HTMLTextAreaElement.prototype;
  } else {
    prototype = HTMLInputElement.prototype;
  }

  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  const setter = descriptor?.set as ((this: typeof element, nextValue: string) => void) | undefined;
  setter?.call(element, value);
}

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function sendInput(element: NativeValueElement, value: string): void {
  setNativeValue(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

function sendChange(element: HTMLSelectElement, value: string): void {
  setNativeValue(element, value);
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function applyPlainField(element: NativeValueElement, value: string): void {
  if (element instanceof HTMLSelectElement) {
    // Radix Select renders a hidden native <select name="...">; native
    // <select> fields work the same way. Only commit when the option exists
    // (API-backed selects may not have loaded their options yet).
    const hasMatchingOption = Array.from(element.options).some((option) => option.value === value);
    if (!hasMatchingOption) return;
    sendChange(element, value);
    return;
  }

  sendInput(element, value);
}

/**
 * AddressAutocompleteField keeps its value as a controlled parent state string
 * ("line 1, town, postcode") but renders three visible sub-inputs plus a hidden
 * input with the field `name`. Each sub-input update goes through `updateParts`,
 * which merges against the parts derived from the *current* state string, so we
 * must step through one field per tick and let React flush between them.
 */
async function applyAddressField(container: Element, value: string): Promise<void> {
  const [line1, town, postcode] = value.split(',').map((part) => part.trim());

  const line1Input = container.querySelector<HTMLInputElement>('[aria-label="Address line 1"]');
  const townInput = container.querySelector<HTMLInputElement>('[aria-label="Town"]');
  const postcodeInput = container.querySelector<HTMLInputElement>('[aria-label="Postcode"]');

  if (line1Input) {
    sendInput(line1Input, line1);
    await tick();
  }
  if (townInput && town) {
    sendInput(townInput, town);
    await tick();
  }
  if (postcodeInput && postcode) {
    sendInput(postcodeInput, postcode);
    await tick();
  }

  // Belt and braces: ensure the hidden form input that carries the field name
  // holds the exact composed value regardless of any state re-derivation.
  const hidden = container.querySelector<HTMLInputElement>('input[type="hidden"][readonly]');
  if (hidden) {
    setNativeValue(hidden, [line1, town, postcode].filter(Boolean).join(', '));
  }
}

function escapedNameSelector(name: string): string {
  return `[name="${CSS.escape(name)}"]`;
}

/**
 * Populates a certificate form with sample data. Text/textarea/select fields
 * are matched by their `name` attribute (dataset keys prefixed with `address:`
 * target AddressAutocompleteField inputs), radio groups are set by the element
 * id (keys in `sample.radioIds`), and checkbox groups by name.
 */
export async function fillFormWithSampleData(
  form: HTMLFormElement,
  sample: SampleData,
): Promise<void> {
  for (const [key, value] of Object.entries(sample.fields)) {
    if (key.startsWith('address:')) {
      const name = key.slice('address:'.length);
      const hidden = form.querySelector<HTMLInputElement>(escapedNameSelector(name));
      if (!hidden) continue;

      const container = hidden.closest('.relative');
      if (container) {
        await applyAddressField(container, value);
      } else {
        setNativeValue(hidden, value);
      }
      continue;
    }

    const field = form.querySelector<NativeValueElement>(escapedNameSelector(key));
    if (!isNativeValueElement(field)) continue;
    applyPlainField(field, value);
  }

  for (const id of sample.radioIds ?? []) {
    const radio = document.getElementById(id);
    if (radio && radio.getAttribute('role') === 'radio' && radio instanceof HTMLElement) {
      radio.click();
    }
  }

  for (const name of sample.checkboxNames ?? []) {
    const checkbox = form.querySelector<HTMLInputElement>(
      `input[type="checkbox"]${escapedNameSelector(name)}`,
    );
    if (checkbox && !checkbox.checked) {
      checkbox.click();
    }
  }
}
