'use client';

import type { ComponentProps, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/shared/lib/utils';
import { Input } from './input';
import { Label } from './label';

const DEFAULT_BROWSE_HREF = 'https://fontawesome.com/search?s=solid&ic=free&o=r';

type IconKeyInputProps = {
  label?: ReactNode;
  placeholder?: string;
  description?: ReactNode | null;
  browseHref?: string;
  browseLabel?: string;
  containerClassName?: string;
  descriptionClassName?: string;
  inputProps?: ComponentProps<typeof Input>;
};

export function IconKeyInput({
  label,
  placeholder,
  description,
  browseHref = DEFAULT_BROWSE_HREF,
  browseLabel,
  containerClassName,
  descriptionClassName,
  inputProps,
}: IconKeyInputProps) {
  const tSystem = useTranslations('system');
  const resolvedLabel = label ?? tSystem('iconKeyLabel');
  const resolvedPlaceholder = placeholder ?? inputProps?.placeholder ?? tSystem('iconKeyPlaceholder');
  const resolvedDescription = description === undefined ? tSystem('iconKeyDescription') : description;
  const resolvedBrowseLabel = browseLabel ?? tSystem('browseIcons');
  const shouldShowBrowse = Boolean(browseHref && resolvedBrowseLabel);
  const inputId = typeof inputProps?.id === 'string' ? inputProps.id : undefined;

  return (
    <div className={cn('space-y-2', containerClassName)}>
      <Label htmlFor={inputId}>{resolvedLabel}</Label>
      <Input {...inputProps} placeholder={resolvedPlaceholder} />
      {(resolvedDescription || shouldShowBrowse) && (
        <p className={cn('text-xs text-muted-foreground', descriptionClassName)}>
          {resolvedDescription}
          {shouldShowBrowse && (
            <>
              <br />
              <a
                href={browseHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline cursor-pointer"
              >
                {resolvedBrowseLabel} →
              </a>
            </>
          )}
        </p>
      )}
    </div>
  );
}
