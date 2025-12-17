'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/shared/ui/badge';
import { IconButton } from '@/shared/ui/icon-button';
import { ButtonGroup } from '@/shared/ui/button-group';
import { EntityRow } from '@/shared/ui/entity-management';
import {
  ClockIcon,
  CoinsIcon,
  EditIcon,
  EyeIcon,
  HideIcon,
  TagIcon,
  TrendingIcon,
} from '@/shared/ui/icons';
import { resolveLocalizedText, resolveTaskColorStyles, resolveTaskIcon } from '@/entities/task/lib/presentation';
import type { Task } from '@/entities/task/model/task';

interface TaskListItemProps {
  task: Task;
  locale: string;
  onEdit: (task: Task) => void;
  onToggleStatus: (task: Task) => void;
}

const formatDate = (timestamp?: number) => {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
};

export function TaskListItem({ task, locale, onEdit, onToggleStatus }: TaskListItemProps) {
  const t = useTranslations('admin.tasks');
  const tSystem = useTranslations('system');
  const title = resolveLocalizedText(task.title, locale) || resolveLocalizedText(task.title, 'en') || `#${task.id}`;
  const { iconContainer } = resolveTaskColorStyles(task.color);

  const statusLabel = task.status === 0 ? t('status.inactive') : t('status.active');
  const statusVariant = task.status === 0 ? 'destructive' : 'secondary';
  const verifyLabel = task.verify ? t('verify.value', { value: task.verify }) : t('verify.empty');

  const rewardLabel = useMemo(() => {
    if (typeof task.reward !== 'number') return null;
    return `+${task.reward}`;
  }, [task.reward]);

  const expiredLabel = useMemo(() => {
    if (!task.expired) return null;
    return formatDate(task.expired);
  }, [task.expired]);

  return (
    <EntityRow
      id={task.id}
      title={title}
      leftSlot={
        <div className={`flex items-center justify-center w-12 h-12 rounded-[0.75rem] shrink-0 ${iconContainer}`}>
          {resolveTaskIcon(task.icon, 18)}
        </div>
      }
      badges={[
        <Badge key="status" variant={statusVariant}>{statusLabel}</Badge>,
        <Badge key="verify" variant="outline">{verifyLabel}</Badge>,
      ]}
      secondRowItems={
        [
          typeof task.priority === 'number'
            ? {
                icon: <TrendingIcon size={12} />,
                keyLabel: t('fields.priority'),
                value: task.priority,
              }
            : null,
          rewardLabel
            ? {
                icon: <CoinsIcon size={12} />,
                keyLabel: t('fields.reward'),
                value: rewardLabel,
              }
            : null,
          task.color
            ? {
                icon: <TagIcon size={12} />,
                keyLabel: t('fields.color'),
                value: task.color,
              }
            : null,
          expiredLabel
            ? {
                icon: <ClockIcon size={12} />,
                keyLabel: t('fields.expired'),
                value: expiredLabel,
              }
            : null,
        ].filter(Boolean) as {
          icon: React.ReactNode;
          keyLabel?: string;
          value: React.ReactNode;
        }[]
      }
      rightActions={
        <ButtonGroup>
          <IconButton
            variant="outline"
            size="sm"
            icon={<EditIcon size={12} />}
            onClick={() => onEdit(task)}
            responsive
          >
            {tSystem('edit')}
          </IconButton>
          <IconButton
            variant={task.status === 0 ? 'success' : 'destructive'}
            size="sm"
            icon={task.status === 0 ? <EyeIcon size={12} /> : <HideIcon size={12} />}
            onClick={() => onToggleStatus(task)}
            responsive
          >
            {task.status === 0 ? t('actions.enable') : t('actions.disable')}
          </IconButton>
        </ButtonGroup>
      }
    />
  );
}

