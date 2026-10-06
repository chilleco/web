'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Logo, ThemeSwitcher } from '@/shared/components/layout';
import LanguageSwitcher from '@/features/navigation/components/LanguageSwitcher';
import { Link } from '@/i18n/routing';
import { Button } from '@/shared/ui/button';
import {
  CatalogIcon,
  FeedbackIcon,
  FaqIcon,
  HubIcon,
  LocationIcon,
  PostsIcon,
  TasksIcon,
} from '@/shared/ui/icons';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { FeedbackForm } from '@/features/feedback';

const currentYear = new Date().getFullYear();

const navigationItems = [
  { key: 'catalog', href: '/catalog', icon: CatalogIcon },
  { key: 'posts', href: '/posts', icon: PostsIcon },
  { key: 'hub', href: '/hub', icon: HubIcon },
  { key: 'tasks', href: '/tasks', icon: TasksIcon },
] as const;

export function Footer() {
  const tFooter = useTranslations('footer');
  const tBrand = useTranslations('brand');
  const tFeedback = useTranslations('feedback');
  const tNavigation = useTranslations('navigation');
  const tSystem = useTranslations('system');
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  return (
    <footer className="bg-background/95 shadow-[0_-0.25rem_1rem_rgba(0,0,0,0.08)]">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <Logo />
            <p className="max-w-md text-sm text-muted-foreground">
              {tBrand('description')}
            </p>
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-[0.75rem] bg-orange-500/15 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
                <LocationIcon size={14} />
              </div>
              <div className="space-y-1">
                <div className="font-medium text-foreground">{tFooter('location')}</div>
                <div>{tBrand('address')}</div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              © {currentYear} {tFooter('rights')}
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              {tNavigation('sections')}
            </div>
            <nav className="space-y-2">
              {navigationItems.map(({ key, href, icon: Icon }) => (
                <Link
                  key={key}
                  href={href}
                  className="flex items-center gap-3 rounded-[0.75rem] px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground cursor-pointer"
                >
                  <Icon size={16} />
                  <span>{tNavigation(key)}</span>
                </Link>
              ))}
            </nav>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {tFooter('support')}
              </div>
              <div className="space-y-2">
                <Link
                  href={{ pathname: '/', hash: 'faq' }}
                  className="flex items-center gap-3 rounded-[0.75rem] px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground cursor-pointer"
                >
                  <FaqIcon size={16} />
                  <span>{tFooter('faq')}</span>
                </Link>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setIsFeedbackOpen(true)}
                >
                  <FeedbackIcon size={16} />
                  <span>{tFooter('feedback')}</span>
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {tSystem('settings')}
              </div>
              <ThemeSwitcher className="w-full" />
              <LanguageSwitcher className="w-full" />
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tFeedback('title')}</DialogTitle>
            <DialogDescription>{tFeedback('description')}</DialogDescription>
          </DialogHeader>
          <FeedbackForm
            initialType="bug"
            source="footer"
            onSubmitted={() => setIsFeedbackOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </footer>
  );
}
