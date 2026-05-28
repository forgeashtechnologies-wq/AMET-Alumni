import React, { useState, useEffect } from 'react';

export default function ImageWithFallback({
  src,
  alt,
  className = '',
  style = {},
  placeholderSrc = '/default-avatar.svg',
  emptyMessage = 'Image to be uploaded',
  imgProps = {},
  imgClassName,
}) {
  const [currentSrc, setCurrentSrc] = useState(src || '');
  const [errored, setErrored] = useState(!src);

  useEffect(() => {
    setCurrentSrc(src || '');
    setErrored(!src);
  }, [src]);

  const onError = () => {
    if (!errored) {
      setErrored(true);
      setCurrentSrc('');
    }
  };

  return (
    <div className={`relative overflow-hidden flex items-center justify-center ${className}`.trim()} style={style}>
      {currentSrc && !errored ? (
        <img
          src={currentSrc}
          alt={alt}
          onError={onError}
          className={imgClassName || 'w-full h-full object-cover'}
          {...imgProps}
        />
      ) : (
        <>
          {placeholderSrc ? (
            <img
              src={placeholderSrc}
              alt={alt || 'placeholder'}
              className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
          ) : null}
          <div className="relative z-10 text-xs sm:text-sm text-gray-600 text-center px-2">
            {emptyMessage}
          </div>
        </>
      )}
    </div>
  );
}
