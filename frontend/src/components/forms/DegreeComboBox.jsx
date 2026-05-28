import logger from '../../utils/logger';
import React, { useEffect, useMemo, useRef, useState, forwardRef } from 'react';
import { supabase } from '../../utils/supabase';

const FALLBACK_CODES = ['BBA','BCA','BE','BSC','BTECH','MBA','MCA','ME','MSC','MTECH','PHD'];

const DegreeComboBox = forwardRef(function DegreeComboBox(
  {
    value,
    onChange,
    disabled = false,
    required = false,
    label = 'Degree',
    placeholder = 'Select your degree',
    onCodesLoaded,
    inputId = 'degree-combobox',
  },
  ref
) {
  const [codes, setCodes] = useState(FALLBACK_CODES); // optimistic fallback
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const innerInputRef = useRef(null);
  const listRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Allow parent to control focus
  useEffect(() => {
    if (!ref) return;
    if (typeof ref === 'function') {
      ref(innerInputRef.current);
    } else {
      ref.current = innerInputRef.current;
    }
  }, [ref]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    // 2s timeout fallback: if network is flaky, keep fallback and unblock UI
    const timeout = setTimeout(() => {
      if (!isMounted) return;
      setLoading(false);
      onCodesLoaded?.(FALLBACK_CODES);
    }, 2000);

    (async () => {
      try {
        const { data, error } = await supabase
          .from('degree_programs')
          .select('code')
          .order('code', { ascending: true });
        if (!isMounted) return;
        if (!error && Array.isArray(data) && data.length) {
          const loaded = data.map((d) => String(d.code).toUpperCase());
          setCodes(loaded);
          onCodesLoaded?.(loaded);
        } else {
          onCodesLoaded?.(FALLBACK_CODES);
        }
      } catch (_) {
        onCodesLoaded?.(FALLBACK_CODES);
      } finally {
        if (isMounted) {
          clearTimeout(timeout);
          setLoading(false);
        }
      }
    })();

    return () => { isMounted = false; clearTimeout(timeout); };
  }, [onCodesLoaded]);

  const filtered = useMemo(() => {
    const q = (query || '').trim().toUpperCase();
    if (!q) return codes;
    return codes.filter((c) => c.includes(q));
  }, [codes, query]);

  function handleInputFocus() {
    if (disabled) return;
    setOpen(true);
  }

  function handleSelect(code) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[DegreeComboBox] selected', code);
    }
    onChange?.(code);
    setQuery(code);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleBlur() {
    // Strict: If typed text is not valid, revert to last selected value
    setTimeout(() => {
      const current = (query || '').trim().toUpperCase();
      const isValid = codes.includes(current);
      if (!isValid) {
        setQuery(value || '');
      }
      setOpen(false);
    }, 120);
  }

  function onKeyDown(e) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      e.preventDefault();
      return;
    }
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = filtered[activeIndex] ?? filtered[0];
      if (pick) handleSelect(pick);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  const busy = disabled; // do not disable while loading, only when explicitly disabled by parent

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          id={inputId}
          ref={innerInputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls="degree-options"
          aria-autocomplete="list"
          className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-ocean-500 ${busy ? 'opacity-60 cursor-not-allowed' : ''}`}
          placeholder={placeholder}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={handleInputFocus}
          onKeyDown={onKeyDown}
          onBlur={handleBlur}
          disabled={busy}
          autoComplete="off"
        />

        {/* Toggle dropdown button */}
        <button
          type="button"
          className="absolute inset-y-0 right-2 my-auto text-gray-400 hover:text-gray-600"
          aria-label="Toggle degree options"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setOpen((o) => !o)}
          tabIndex={-1}
        >
          ▾
        </button>

        {/* Clear button only when not required */}
        {!required && (value || query) && (
          <button
            type="button"
            className="absolute inset-y-0 right-2 my-auto text-gray-400 hover:text-gray-600"
            aria-label="Clear selection"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setQuery('');
              onChange?.(null);
            }}
          >
            ×
          </button>
        )}

        {open && (
          <ul
            id="degree-options"
            ref={listRef}
            className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-300 bg-white shadow-lg"
            role="listbox"
          >
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500">No matches</li>
            )}
            {filtered.map((code, idx) => (
              <li
                key={code}
                role="option"
                aria-selected={value === code}
                className={`px-3 py-2 cursor-pointer ${idx === activeIndex ? 'bg-gray-100' : 'bg-white'} hover:bg-gray-100`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(code)}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                {code}
              </li>
            ))}
          </ul>
        )}
      </div>
      {loading && (
        <p className="mt-1 text-xs text-gray-500">Loading degree list… using offline list if slow</p>
      )}
      {!loading && codes.length === FALLBACK_CODES.length && codes.every((c, i) => c === FALLBACK_CODES[i]) && (
        <p className="mt-1 text-xs text-gray-500">Using offline degree list</p>
      )}
    </div>
  );
});

export default DegreeComboBox;
export { FALLBACK_CODES };
