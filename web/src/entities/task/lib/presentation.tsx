import type { ReactNode } from 'react';
import type { LocalizedText, Task, TaskColor } from '../model/task';
import { CheckCircleIcon } from '@/shared/ui/icons';

export type TaskColorStyles = {
  iconContainer: string;
  rewardText: string;
};

const taskColorStyles: Record<string, TaskColorStyles> = {
  green: {
    iconContainer: 'bg-green-500/15 text-green-600 dark:bg-green-500/20 dark:text-green-400',
    rewardText: 'text-green-600 dark:text-green-400',
  },
  violet: {
    iconContainer: 'bg-purple-500/15 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
    rewardText: 'text-purple-600 dark:text-purple-400',
  },
  blue: {
    iconContainer: 'bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    rewardText: 'text-blue-600 dark:text-blue-400',
  },
  orange: {
    iconContainer: 'bg-orange-500/15 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400',
    rewardText: 'text-orange-600 dark:text-orange-400',
  },
};

const defaultTaskColorStyles: TaskColorStyles = {
  iconContainer: 'bg-muted text-muted-foreground',
  rewardText: 'text-muted-foreground',
};

export const resolveTaskColorStyles = (color?: TaskColor): TaskColorStyles => {
  if (!color) return defaultTaskColorStyles;
  return taskColorStyles[color] ?? defaultTaskColorStyles;
};

const FONT_AWESOME_STYLE_TOKENS = new Set([
  'fa-solid',
  'fa-regular',
  'fa-brands',
  'fa-light',
  'fa-thin',
  'fa-duotone',
  'fa-sharp',
  'fa-sharp-solid',
  'fa-sharp-regular',
  'fa-sharp-light',
  'fa-sharp-thin',
  'fa-sharp-duotone',
  'fas',
  'far',
  'fab',
]);

const normalizeFontAwesomeKey = (value?: string) => {
  const tokens = (value ?? '').trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return '';

  const faToken = [...tokens]
    .reverse()
    .find((token) => token.startsWith('fa-') && !FONT_AWESOME_STYLE_TOKENS.has(token));

  const candidate = faToken ?? tokens[tokens.length - 1];
  const rawKey = candidate.startsWith('fa-') ? candidate.slice(3) : candidate;
  return rawKey.toLowerCase().replace(/[^a-z0-9-]/g, '');
};

export const resolveTaskIcon = (icon?: string, size: number = 22): ReactNode => {
  const key = normalizeFontAwesomeKey(icon);
  if (!key) return <CheckCircleIcon size={size} />;
  return (
    <i
      className={`fa-solid fa-${key}`}
      style={{ fontSize: size, lineHeight: 1 }}
      aria-hidden="true"
    />
  );
};

export const resolveLocalizedText = (value: LocalizedText | undefined, locale: string) => {
  if (!value) return '';
  if (value[locale]) return value[locale];
  if (value.en) return value.en;
  const first = Object.values(value).find((item) => typeof item === 'string' && item.trim().length > 0);
  return first ?? '';
};

export const resolveTaskTitle = (task: Pick<Task, 'title' | 'id'>, locale: string) =>
  resolveLocalizedText(task.title, locale) || `Task #${task.id}`;
