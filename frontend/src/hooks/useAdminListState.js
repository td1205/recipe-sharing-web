import { useSearchParams } from 'react-router-dom';

// Keep each list's state in the URL so reload/back/return from editing retains it.
export default function useAdminListState(defaults, allowed = {}) {
  const [params, setParams] = useSearchParams();
  const state = Object.fromEntries(
    Object.entries(defaults).map(([key, fallback]) => {
      const value = params.get(key) ?? fallback;
      if (key === 'page')
        return [
          key,
          /^\d+$/.test(String(value)) &&
          Number(value) >= 1 &&
          Number(value) <= 1000000
            ? Number(value)
            : fallback,
        ];
      return [
        key,
        allowed[key] && !allowed[key].includes(value)
          ? fallback
          : String(value).slice(0, 200),
      ];
    }),
  );
  const update = (changes, { replace = false } = {}) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        for (const [key, value] of Object.entries(changes)) {
          if (String(value) === String(defaults[key])) next.delete(key);
          else next.set(key, String(value));
        }
        if ('page' in defaults && !('page' in changes)) next.delete('page');
        return next;
      },
      { replace },
    );
  return [state, update];
}
