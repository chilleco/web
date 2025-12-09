import type { User } from '@/entities/user';

export interface UserFormState {
  login: string;
  name: string;
  surname: string;
  mail: string;
  phone: string;
  image: string;
  balance: string;
  status: string;
}

export const buildUserFormState = (source: Partial<User> | null): UserFormState => {
  const toString = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return '';
    return String(value);
  };

  return {
    login: toString(source?.login),
    name: toString(source?.name),
    surname: toString(source?.surname),
    mail: toString(source?.mail ?? source?.email),
    phone: toString(source?.phone),
    image: toString(source?.image),
    balance: toString(source?.balance),
    status: toString(source?.status),
  };
};

export const sanitizePhoneValue = (value: string) => value.replace(/\D/g, '');

export const getUserDisplayName = (user: Partial<User> | null | undefined, fallback: string) => {
  if (!user) return fallback;

  const fullName = [user.name, user.surname].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  if (user.login) return user.login;
  if (user.mail) return user.mail;
  if (user.email) return user.email;

  return fallback;
};

export const getLocaleFlag = (locale?: string | null) => {
  if (!locale) return '';
  const normalized = locale.toLowerCase();
  const mapped: Record<string, string> = {
    en: '🇺🇸',
    ru: '🇷🇺',
    es: '🇪🇸',
    ar: '🇦🇪',
    zh: '🇨🇳',
  };

  if (mapped[normalized]) return mapped[normalized];

  if (normalized.length === 2) {
    const codePoints = [...normalized.toUpperCase()].map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }

  return normalized;
};
