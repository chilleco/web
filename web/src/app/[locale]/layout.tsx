import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import "@fortawesome/fontawesome-free/css/all.css";
import { ReduxProvider } from "@/providers";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { UserSettingsInitializer } from '@/features/user';
import { SessionInitializer } from '@/features/session';
import { TelegramAuthInitializer } from '@/features/auth';
import { ThemeProvider } from '@/providers';
import { PopupProvider } from '@/widgets/feedback-system';
import { ToastProvider } from '@/widgets/feedback-system';
import { StructuredData } from '@/shared/components/layout';
import { ThemeAwareContent } from '@/shared/components/layout';
import Script from "next/script";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: {
        default: "web",
        template: "%s | web"
    },
    description: "Template web app",
    keywords: ["web development"],
    authors: [{ name: "Alex Poloz <alexypoloz@gmail.com>" }],
    creator: "Alex Poloz <alexypoloz@gmail.com>",
    publisher: "Alex Poloz <alexypoloz@gmail.com>",
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    metadataBase: new URL(process.env.NEXT_PUBLIC_WEB || 'http://localhost:3000'),
    alternates: {
        canonical: '/',
        languages: {
            'en': '/en',
            'ru': '/ru',
            'zh': '/zh',
            'es': '/es',
            'ar': '/ar',
        },
    },
    openGraph: {
        title: "web",
        description: "Template web app",
        url: '/',
        siteName: 'web',
        images: [
            {
                url: '/logo.svg',
                width: 1200,
                height: 630,
                alt: 'web Logo',
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: "web",
        description: "Template web app",
        images: ['/logo.svg'],
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    manifest: '/manifest.json',
    icons: {
        icon: '/icon.svg',
        shortcut: '/icon.svg',
        apple: '/logo.svg',
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'web',
    },
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    themeColor: '#708E6C',
};

export function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const enableEruda = ["LOCAL", "DEV", "TEST"].includes(process.env.NEXT_PUBLIC_MODE ?? "");

    // Ensure that the incoming `locale` is valid
    if (!routing.locales.includes(locale as Locale)) {
        notFound();
    }

    // Providing all messages to the client
    // side is the easiest way to get started
    const messages = await getMessages();

    return (
        <>
            <StructuredData />

            {/* Telegram Mini Apps */}
            <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
            {enableEruda ? (
                <Script id="eruda-loader" strategy="afterInteractive">
                    {`
                        (function () {
                            if (window.eruda) {
                                window.eruda.init();
                                return;
                            }
                            var script = document.createElement('script');
                            script.src = 'https://cdn.jsdelivr.net/npm/eruda';
                            script.onload = function () {
                                if (window.eruda) {
                                    window.eruda.init();
                                }
                            };
                            document.head.appendChild(script);
                        })();
                    `}
                </Script>
            ) : null}

            <div
                lang={locale}
                dir={locale === 'ar' ? 'rtl' : 'ltr'}
                className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
            >
                <NextIntlClientProvider messages={messages}>
                    <ReduxProvider>
                        <ThemeProvider>
                            <PopupProvider>
                                <ToastProvider />
                                <SessionInitializer />
                                <TelegramAuthInitializer />
                                <UserSettingsInitializer />
                                <ThemeAwareContent>
                                    {children}
                                </ThemeAwareContent>
                            </PopupProvider>
                        </ThemeProvider>
                    </ReduxProvider>
                </NextIntlClientProvider>
            </div>
        </>
    );
}
