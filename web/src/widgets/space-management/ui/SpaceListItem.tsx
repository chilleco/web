'use client';

import Image from 'next/image';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/shared/ui/badge';
import { IconButton } from '@/shared/ui/icon-button';
import { ButtonGroup } from '@/shared/ui/button-group';
import { EntityRow } from '@/shared/ui/entity-management';
import { Link } from '@/i18n/routing';
import { Space } from '@/entities/space';
import {
  BuildingIcon,
  EditIcon,
  DeleteIcon,
  PhoneIcon,
  MailIcon,
  GlobeIcon
} from '@/shared/ui/icons';

interface SpaceListItemProps {
  space: Space;
  onDelete: (space: Space) => void;
}

const formatMargin = (margin?: number | null) => {
  const parsed = typeof margin === 'number' ? margin : 0;
  return `${parsed.toFixed(1)}%`;
};

export function SpaceListItem({ space, onDelete }: SpaceListItemProps) {
  const t = useTranslations('admin.spaces');
  const entityLabels = useMemo(
    () => ({
      ooo: t('entities.ooo'),
      ip: t('entities.ip'),
      fl: t('entities.fl'),
      smz: t('entities.smz')
    }),
    [t]
  );
  const marginBadge = (
    <Badge key="margin" variant="outline" className="bg-[var(--bg-yellow)] text-[var(--font-yellow)]">
      {t('fields.marginBadge', { value: formatMargin(space.margin) })}
    </Badge>
  );

  const entity = space.entity
    ? entityLabels[space.entity as keyof typeof entityLabels] || space.entity
    : null;

  const secondRowItems = [
    entity
      ? {
          icon: <GlobeIcon size={12} />,
          keyLabel: t('fields.entity'),
          value: entity,
        }
      : null,
    space.phone
      ? {
          icon: <PhoneIcon size={12} />,
          keyLabel: t('fields.phone'),
          value: space.phone,
        }
      : null,
    space.mail
      ? {
          icon: <MailIcon size={12} />,
          keyLabel: t('fields.mail'),
          value: space.mail,
        }
      : null,
  ].filter(Boolean) as {
    icon: React.ReactNode;
    keyLabel?: string;
    value: React.ReactNode;
  }[];

  return (
    <EntityRow
      id={space.id}
      title={space.title}
      url={`spaces/${space.link}`}
      badges={[marginBadge]}
      secondRowItems={secondRowItems}
      leftSlot={
        <div className="relative w-12 h-12 rounded-[0.75rem] bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
          {space.logo ? (
            <Image
              src={space.logo}
              alt={space.title}
              fill
              sizes="48px"
              className="object-cover"
            />
          ) : (
            <BuildingIcon size={16} className="text-muted-foreground" />
          )}
        </div>
      }
      rightActions={
        <ButtonGroup>
          <IconButton asChild variant="outline" size="sm" icon={<EditIcon size={12} />} responsive>
            <Link
              href={{
                pathname: '/spaces/[link]',
                params: { link: space.link },
                query: { edit: '1' }
              }}
            >
              {t('actions.edit')}
            </Link>
          </IconButton>
          <IconButton
            variant="destructive"
            size="sm"
            icon={<DeleteIcon size={12} />}
            onClick={() => onDelete(space)}
            responsive
          >
            {t('actions.delete')}
          </IconButton>
        </ButtonGroup>
      }
    />
  );
}
