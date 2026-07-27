'use client';

import { ReactNode } from 'react';

interface CharacterCounterProps {
  value: string | undefined;
  maxLength: number;
  className?: string;
  children: React.ReactNode;
}

export function CharacterCounter({ value, maxLength, className, children }: CharacterCounterProps) {
  const count = value?.length || 0;

  const isOverLimit = count > maxLength;

  return (
    <div className={className}>
      {children}
      <span
        className={`text-xs font-normal ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}
      >
        {count}/{maxLength}
      </span>
    </div>
  );
}
