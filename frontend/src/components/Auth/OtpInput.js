import React, { useRef, useEffect } from 'react';

// 6-digit OTP input with auto-advance and backspace handling
export default function OtpInput({ value = '', length = 6, onChange }) {
  const inputsRef = useRef([]);

  useEffect(() => {
    inputsRef.current = inputsRef.current.slice(0, length);
  }, [length]);

  const handleChange = (idx, e) => {
    const v = e.target.value.replace(/\D/g, '').slice(-1); // keep last digit only
    const chars = value.split('');
    chars[idx] = v;
    const next = (chars.join('').padEnd(length, ''));
    onChange && onChange(next.slice(0, length));
    if (v && idx < length - 1) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && idx > 0) inputsRef.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < length - 1) inputsRef.current[idx + 1]?.focus();
  };

  return (
    <div className="flex items-center gap-2">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          className="w-10 h-12 text-center border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={(value[i] || '')}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
        />
      ))}
    </div>
  );
}
