'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Badge } from '@/shared/ui/badge';
import { ButtonGroup } from '@/shared/ui/button-group';
import { IconButton } from '@/shared/ui/icon-button';
import { EntityRow } from '@/shared/ui/entity-management';
import type { User } from '@/entities/user';
import {
  UserIcon,
  EditIcon,
  HideIcon,
  CheckIcon,
  MailIcon,
  PhoneIcon,
  GlobeIcon
} from '@/shared/ui/icons';
import { getLocaleFlag, getUserDisplayName } from '../lib/userFormUtils';

interface UserListItemProps {
  user: User;
  onEdit: (user: User) => void;
  onToggleBlock?: (user: User) => void;
}

const statusConfig: Record<number, { key: string; variant: 'success' | 'secondary' | 'destructive' | 'default' }> = {
  0: { key: 'deleted', variant: 'secondary' },
  1: { key: 'blocked', variant: 'destructive' },
  2: { key: 'pending', variant: 'secondary' },
  3: { key: 'active', variant: 'success' },
  4: { key: 'moderator', variant: 'secondary' },
  5: { key: 'manager', variant: 'secondary' },
  6: { key: 'admin', variant: 'default' },
  7: { key: 'owner', variant: 'default' },
  8: { key: 'owner', variant: 'default' },
};

export function UserListItem({ user, onEdit, onToggleBlock }: UserListItemProps) {
  const t = useTranslations('admin.users');
  const tSystem = useTranslations('system');

  const name = getUserDisplayName(user, t('titleFallback', { id: user.id }));
  const isBlocked = user.status === 1;

  const status = user.status !== undefined && user.status !== null
    ? statusConfig[user.status] || null
    : null;

  const badges = [
    status ? (
      <Badge key="status" variant={status.variant}>
        {t(`status.${status.key}`)}
      </Badge>
    ) : (
      <Badge key="status-unknown" variant="secondary">
        {t('status.unknown')}
      </Badge>
    ),
  ];

  if (typeof user.balance === 'number') {
    badges.push(
      <Badge key="balance" variant="outline">
        {t('balance.badge', { value: user.balance })}
      </Badge>
    );
  }

  const localeLabel = getLocaleFlag(user.locale);
  const loginLabel = user.login ? `@${user.login}` : null;

  const secondRowItems = [
    user.mail ? (
      {
        icon: <MailIcon size={12} />,
        keyLabel: t('fields.mail'),
        value: user.mail,
      }
    ) : null,
    user.phone ? (
      {
        icon: <PhoneIcon size={12} />,
        keyLabel: t('fields.phone'),
        value: user.phone,
      }
    ) : null,
    loginLabel ? (
      {
        icon: <UserIcon size={12} />,
        keyLabel: t('fields.login'),
        value: loginLabel,
      }
    ) : null,
    localeLabel ? (
      {
        icon: <GlobeIcon size={12} />,
        keyLabel: t('fields.locale'),
        value: localeLabel,
      }
    ) : null,
  ].filter(Boolean) as {
    icon: React.ReactNode;
    keyLabel?: string;
    value: React.ReactNode;
  }[];

  return (
    <EntityRow
      id={user.id}
      title={name}
      badges={badges}
      secondRowItems={secondRowItems}
      leftSlot={
        <div className="relative w-12 h-12 rounded-[0.75rem] bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
          {user.image ? (
            <Image
              src={user.image}
              alt={name}
              fill
              sizes="48px"
              className="object-cover"
            />
          ) : (
            <UserIcon size={16} className="text-muted-foreground" />
          )}
        </div>
      }
      rightActions={
        <ButtonGroup>
          <IconButton
            variant="outline"
            size="sm"
            icon={<EditIcon size={12} />}
            onClick={() => onEdit(user)}
            responsive
          >
            {tSystem('edit')}
          </IconButton>
          {onToggleBlock ? (
            <IconButton
              variant={isBlocked ? 'success' : 'destructive'}
              size="sm"
              icon={isBlocked ? <CheckIcon size={12} /> : <HideIcon size={12} />}
              onClick={() => onToggleBlock(user)}
              responsive
            >
              {isBlocked ? t('actions.unban') : t('actions.ban')}
            </IconButton>
          ) : null}
        </ButtonGroup>
      }
    />
  );
}
