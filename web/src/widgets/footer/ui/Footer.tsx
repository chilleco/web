'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Logo } from '@/shared/components/layout';
import { ThemeSwitcher } from '@/shared/components/layout';
import LanguageSwitcher from '@/features/navigation/components/LanguageSwitcher';
import { Link } from '@/i18n/routing';
import {
  TelegramIcon,
  TiktokIcon,
  YoutubeIcon,
  InstagramIcon,
  VkIcon,
  TwitterXIcon,
  FacebookIcon,
  LinkedinIcon,
  RedditIcon,
  LegalIcon,
  FaqIcon,
  CompanyIcon,
  MailIcon,
  HandshakeIcon,
  CookieIcon,
  AboutIcon,
  FeedbackIcon,
  NewsIcon,
  RefundIcon,
  RatesIcon,
  LocationIcon
} from '@/shared/ui/icons';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { FeedbackForm } from '@/features/feedback';

const currentYear = new Date().getFullYear();

const socialLinks = [
  { name: 'Telegram', icon: TelegramIcon, url: '#', hoverColor: 'hover:bg-[var(--bg-blue)] hover:text-[var(--font-blue)]' },
  { name: 'X', icon: TwitterXIcon, url: '#', hoverColor: 'hover:bg-gray-900/15 hover:text-gray-900 dark:hover:bg-gray-100/20 dark:hover:text-gray-100' },
  { name: 'Instagram', icon: InstagramIcon, url: '#', hoverColor: 'hover:bg-gradient-to-br hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 hover:text-white' },
  { name: 'TikTok', icon: TiktokIcon, url: '#', hoverColor: 'hover:bg-[var(--bg-red)] hover:text-[var(--font-red)]' },
  { name: 'YouTube', icon: YoutubeIcon, url: '#', hoverColor: 'hover:bg-[var(--bg-red)] hover:text-[var(--font-red)]' },
  { name: 'VK', icon: VkIcon, url: '#', hoverColor: 'hover:bg-[var(--bg-blue)] hover:text-[var(--font-blue)]' },
  { name: 'Reddit', icon: RedditIcon, url: '#', hoverColor: 'hover:bg-[var(--bg-orange)] hover:text-[var(--font-orange)]' },
  { name: 'Facebook', icon: FacebookIcon, url: '#', hoverColor: 'hover:bg-[var(--bg-blue)] hover:text-[var(--font-blue)]' },
  { name: 'LinkedIn', icon: LinkedinIcon, url: '#', hoverColor: 'hover:bg-[var(--bg-blue)] hover:text-[var(--font-blue)]' },
];

export function Footer() {
  const t = useTranslations('footer');
  const tBrand = useTranslations('brand');
  const tFeedback = useTranslations('feedback');
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  return (
    <footer className="bg-background border-t">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Main Footer Content - All integrated */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-8">

          {/* Brand & Rights Column */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Logo />
            </div>
            <p className="text-sm text-muted-foreground">
              {tBrand('description')}
            </p>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>©</span>
              <span>{currentYear} {t('rights')}</span>
            </div>
            <div className="pt-2 border-t border-border/40">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <div className="bg-[var(--bg-orange)] text-[var(--font-orange)] w-6 h-6 rounded-[0.75rem] flex items-center justify-center">
                  <LocationIcon size={14} />
                </div>
                {t('location')}
              </h4>
              <p className="text-sm text-muted-foreground">{tBrand('address')}</p>
            </div>
          </div>

          {/* Legal Documents Column */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <div className="bg-[var(--bg-red)] text-[var(--font-red)] w-6 h-6 rounded-[0.75rem] flex items-center justify-center">
                <LegalIcon size={14} />
              </div>
              {t('legal')}
            </h3>
            <nav className="flex flex-col space-y-2">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-2">
                <LegalIcon size={12} />
                {t('privacy')}
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-2">
                <HandshakeIcon size={12} />
                {t('offer')}
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-2">
                <LegalIcon size={12} />
                {t('userAgreement')}
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-2">
                <CookieIcon size={12} />
                {t('cookies')}
              </a>
            </nav>
          </div>

          {/* Company Info Column */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <div className="bg-[var(--bg-blue)] text-[var(--font-blue)] w-6 h-6 rounded-[0.75rem] flex items-center justify-center">
                <CompanyIcon size={14} />
              </div>
              {t('company')}
            </h3>
            <nav className="flex flex-col space-y-2">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-2">
                <AboutIcon size={12} />
                {t('about')}
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-2">
                <MailIcon size={12} />
                {t('contacts')}
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-2">
                <HandshakeIcon size={12} />
                {t('partners')}
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-2">
                <CompanyIcon size={12} />
                {t('jobs')}
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-2">
                <NewsIcon size={12} />
                {t('white_paper')}
              </a>
            </nav>
          </div>

          {/* FAQ & Support Column */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <div className="bg-[var(--bg-green)] text-[var(--font-green)] w-6 h-6 rounded-[0.75rem] flex items-center justify-center">
                <FaqIcon size={14} />
              </div>
              {t('support')}
            </h3>
            <nav className="flex flex-col space-y-2">
              <Link
                href={{ pathname: '/', hash: 'faq' }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-2"
              >
                <FaqIcon size={12} />
                {t('faq')}
              </Link>
              <button
                type="button"
                onClick={() => setIsFeedbackOpen(true)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-2 text-left"
              >
                <FeedbackIcon size={12} />
                {t('feedback')}
              </button>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-2">
                <RatesIcon size={12} />
                {t('rates')}
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-2">
                <RefundIcon size={12} />
                {t('refund')}
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-2">
                <NewsIcon size={12} />
                {t('news')}
              </a>
            </nav>
          </div>

          {/* Social & Controls Column */}
          <div className="space-y-6 xl:col-span-1 lg:col-span-4 md:col-span-2">
            {/* Social Icons */}
            <div className="flex items-center gap-2 flex-wrap">
              {socialLinks.map(({ name, icon: IconComponent, url, hoverColor }) => (
                <a
                  key={name}
                  href={url}
                  className={`bg-muted text-muted-foreground w-9 h-9 rounded-[0.75rem] flex items-center justify-center transition-all duration-200 hover:scale-110 cursor-pointer ${hoverColor}`}
                  title={name}
                >
                  <IconComponent size={16} />
                </a>
              ))}
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-2">
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
