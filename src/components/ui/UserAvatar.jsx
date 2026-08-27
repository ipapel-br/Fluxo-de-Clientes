import { useState, useEffect } from 'react';
import { getAvatar, getAvatarColor, getInitials, subscribeAvatars } from '@/lib/avatarService';

const SIZES = {
  xs: 'h-[18px] w-[18px] text-[9px]',
  sm: 'h-[22px] w-[22px] text-[10px]',
  md: 'h-7 w-7 text-xs',
  lg: 'h-9 w-9 text-sm',
  xl: 'h-12 w-12 text-base',
};

export default function UserAvatar({
  name,
  src,
  size = 'sm',
  className = '',
  showTooltip = false,
}) {
  const [avatarUrl, setAvatarUrl] = useState(() => src || getAvatar(name));

  useEffect(() => {
    if (src) {
      setAvatarUrl(src);
      return;
    }
    setAvatarUrl(getAvatar(name));
    const unsubscribe = subscribeAvatars(() => {
      setAvatarUrl(getAvatar(name));
    });
    return unsubscribe;
  }, [name, src]);

  const sizeClasses = SIZES[size] || SIZES.sm;
  const color = getAvatarColor(name);
  const initials = getInitials(name);

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'Avatar'}
        title={showTooltip ? name : undefined}
        className={`inline-block rounded-full object-cover shrink-0 border border-border/70 shadow-2xs ${sizeClasses} ${className}`}
      />
    );
  }

  return (
    <span
      title={showTooltip ? name : undefined}
      style={{
        backgroundColor: color.bg,
        color: color.text,
        borderColor: color.border,
      }}
      className={`inline-flex items-center justify-center rounded-full font-bold uppercase tracking-tight shrink-0 border select-none shadow-2xs ${sizeClasses} ${className}`}
    >
      {initials}
    </span>
  );
}
