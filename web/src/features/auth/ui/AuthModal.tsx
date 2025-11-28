'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import Popup from '@/widgets/feedback-system/ui/Popup';
import { Box } from '@/shared/ui/box';
import { IconButton } from '@/shared/ui/icon-button';
import { GoogleIcon, LoginIcon, TelegramIcon, MailIcon, CheckIcon, XIcon } from '@/shared/ui/icons';
import { useToastActions } from '@/shared/hooks/useToast';
import { useAppDispatch, useAppSelector } from '@/shared/stores/store';
import { loginWithCredentials, selectAuthStatus } from '../stores/authSlice';

type AuthMode = 'choose' | 'credentials';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const buildGoogleUrl = () => {
    if (!process.env.NEXT_PUBLIC_GOOGLE_ID || !process.env.NEXT_PUBLIC_WEB) return null;
    const redirect = `${process.env.NEXT_PUBLIC_WEB}callback`;
    const scope = encodeURIComponent('https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile');
    return `https://accounts.google.com/o/oauth2/auth?redirect_uri=${encodeURIComponent(redirect)}&response_type=code&client_id=${process.env.NEXT_PUBLIC_GOOGLE_ID}&scope=${scope}`;
};

const buildTelegramUrl = () => {
    if (!process.env.NEXT_PUBLIC_TG_BOT) return null;
    return `https://t.me/${process.env.NEXT_PUBLIC_TG_BOT}?start=auth`;
};

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const t = useTranslations('auth');
    const dispatch = useAppDispatch();
    const status = useAppSelector(selectAuthStatus);
    const utm = useAppSelector((state) => state.session.utm);
    const { success, error: showError } = useToastActions();

    const [mode, setMode] = useState<AuthMode>('choose');
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setMode('choose');
            setLogin('');
            setPassword('');
        }
    }, [isOpen]);

    const isPasswordLongEnough = password.length >= 6;
    const hasLettersAndNumbers = useMemo(() => {
        return /\d/.test(password) && /[A-Za-z]/.test(password);
    }, [password]);

    const handleCredentialsSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        try {
            await dispatch(loginWithCredentials({ login, password, utm })).unwrap();
            success(t('loginSuccess'));
            onClose();
        } catch (err) {
            const message = err instanceof Error ? err.message : t('loginFailed');
            showError(message);
        }
    };

    const goToProvider = (url: string | null) => {
        if (!url) {
            showError(t('providerUnavailable'));
            return;
        }
        if (typeof window !== 'undefined') {
            localStorage.setItem('previousPath', window.location.href);
            window.location.href = url;
        }
    };

    return (
        <Popup
            isOpen={isOpen}
            onClose={onClose}
            title={mode === 'choose' ? t('title') : t('login')}
            description={mode === 'choose' ? t('subtitle') : t('credentialsSubtitle')}
            size="md"
        >
            {mode === 'choose' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3">
                        <IconButton
                            icon={<MailIcon size={16} />}
                            onClick={() => setMode('credentials')}
                            className="w-full justify-center text-center whitespace-normal"
                        >
                            {t('continueWithEmail')}
                        </IconButton>
                        <IconButton
                            icon={<GoogleIcon size={16} />}
                            variant="outline"
                            onClick={() => goToProvider(buildGoogleUrl())}
                            className="w-full justify-center text-center whitespace-normal"
                        >
                            {t('continueWithGoogle')}
                        </IconButton>
                        <IconButton
                            icon={<TelegramIcon size={16} />}
                            variant="outline"
                            onClick={() => goToProvider(buildTelegramUrl())}
                            className="w-full justify-center text-center whitespace-normal"
                        >
                            {t('continueWithTelegram')}
                        </IconButton>
                    </div>
                </div>
            )}

            {mode === 'credentials' && (
                <form className="space-y-4" onSubmit={handleCredentialsSubmit}>
                    <div className="space-y-2">
                        <Label htmlFor="login">{t('loginLabel')}</Label>
                        <Input
                            id="login"
                            value={login}
                            onChange={(e) => setLogin(e.target.value)}
                            placeholder={t('loginPlaceholder')}
                            required
                            autoComplete="username"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">{t('passwordLabel')}</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t('passwordPlaceholder')}
                            required
                            autoComplete="current-password"
                        />
                        <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                {isPasswordLongEnough ? <CheckIcon className="text-green-600 dark:text-green-400" size={14} /> : <XIcon className="text-red-500" size={14} />}
                                <span>{t('passwordTipLength')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {hasLettersAndNumbers ? <CheckIcon className="text-green-600 dark:text-green-400" size={14} /> : <XIcon className="text-red-500" size={14} />}
                                <span>{t('passwordTipStrength')}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setMode('choose')}
                            className="w-full sm:w-auto"
                        >
                            <LoginIcon size={16} className="mr-2" />
                            {t('back')}
                        </Button>
                        <Button
                            type="submit"
                            className="w-full sm:w-auto"
                            disabled={status === 'loading'}
                        >
                            <LoginIcon size={16} className="mr-2" />
                            {status === 'loading' ? t('processing') : t('login')}
                        </Button>
                    </div>
                </form>
            )}
        </Popup>
    );
}
