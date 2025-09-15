
import React from 'react';  
const Logo = ({ className, variant = 'solid' }) => {
  return (
    <div className={`font-logo font-extrabold tracking-tighter ${className}`}> {/* Added font-logo */}
      Ea
      {variant === 'gradient' ? (
        <span className="bg-gradient-to-r from-sage-700 to-brand-orange bg-clip-text text-transparent">
          Thentic
        </span>
      ) : (
        <span className="text-brand-orange">
          Thentic
        </span>
      )}
    </div>
  );
};

export default Logo;