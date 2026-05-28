import React from 'react';

const Logo = ({ className = 'h-10 w-auto', alt = 'AMET University' }) => {
  // Use the color-accurate logo placed under public/static
  // Primary: /static/Logo.png (existing), fallback to legacy /logo.png
  const [src, setSrc] = React.useState('/static/Logo.png');

  return (
    <div className={className} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <img
        src={src}
        alt={alt}
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        onError={() => setSrc('/logo.png')}
      />
    </div>
  );
};

export default Logo;
