'use client';

import { useEffect, useMemo, useRef } from 'react';
import { buildDraftStorageKey, clearDraft, loadDraft, saveDraft, type DraftValue } from '@/lib/draft-persistence';

type UsePersistentFormDraftParams = {
  formRef: React.RefObject<HTMLFormElement | null>;
  pathname: string;
  templateId: string;
  userId?: string | null;
  debounceMs?: number;
};

function readFormValues(form: HTMLFormElement): Record<string, DraftValue> {
  const values: Record<string, DraftValue> = {};
  const elements = Array.from(form.elements) as Array<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | RadioNodeList
  >;

  for (const element of elements) {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) {
      continue;
    }

    const name = element.name;
    if (!name) continue;

    if (element instanceof HTMLInputElement && (element.type === 'button' || element.type === 'submit' || element.type === 'reset' || element.type === 'file')) {
      continue;
    }

    if (element instanceof HTMLInputElement && element.type === 'checkbox') {
      if (!values[name]) values[name] = [];
      const arr = Array.isArray(values[name]) ? (values[name] as string[]) : [];
      if (element.checked) arr.push(element.value || 'on');
      values[name] = arr;
      continue;
    }

    if (element instanceof HTMLInputElement && element.type === 'radio') {
      if (element.checked) values[name] = element.value;
      else if (!(name in values)) values[name] = '';
      continue;
    }

    values[name] = element.value ?? '';
  }

  return values;
}

function applyFormValues(form: HTMLFormElement, values: Record<string, DraftValue>) {
  const elements = Array.from(form.elements) as Array<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | RadioNodeList
  >;

  for (const element of elements) {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) {
      continue;
    }

    const name = element.name;
    if (!name) continue;
    if (!(name in values)) continue;

    const saved = values[name];

    if (element instanceof HTMLInputElement && element.type === 'checkbox') {
      const arr = Array.isArray(saved) ? saved.map(String) : [];
      element.checked = arr.includes(element.value || 'on');
      continue;
    }

    if (element instanceof HTMLInputElement && element.type === 'radio') {
      element.checked = String(saved ?? '') === element.value;
      continue;
    }

    element.value = String(saved ?? '');
  }

  form.dispatchEvent(new Event('input', { bubbles: true }));
  form.dispatchEvent(new Event('change', { bubbles: true }));
}

export function usePersistentFormDraft({
  formRef,
  pathname,
  templateId,
  userId,
  debounceMs = 600,
}: UsePersistentFormDraftParams) {
  const hydratedRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  const storageKey = useMemo(
    () => buildDraftStorageKey({ userId, pathname, templateId }),
    [userId, pathname, templateId],
  );

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const existing = loadDraft(storageKey);
    if (existing?.values) {
      applyFormValues(form, existing.values);
    }
    hydratedRef.current = true;
  }, [formRef, storageKey]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const persistNow = () => {
      if (!hydratedRef.current) return;
      const values = readFormValues(form);
      saveDraft(storageKey, values);
    };

    const schedulePersist = () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(persistNow, debounceMs);
    };

    form.addEventListener('input', schedulePersist);
    form.addEventListener('change', schedulePersist);

    return () => {
      form.removeEventListener('input', schedulePersist);
      form.removeEventListener('change', schedulePersist);
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [formRef, storageKey, debounceMs]);

  return {
    clearDraft: () => clearDraft(storageKey),
    storageKey,
  };
}
