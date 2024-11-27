import { useEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { appWithTranslation, useTranslation } from 'next-i18next';
import 'breezu';

import '../styles/main.scss';
import '../styles/main.css';
import wrapper from '../redux/store';
import { toastAdd } from '../redux/actions/system';
import { changeNetwork, changeLang, setToken, setAuth, setUtm, changeTheme } from '../redux/actions/main';
import { profileIn } from '../redux/actions/profile';
import { onlineAdd, onlineDelete, onlineReset } from '../redux/actions/online';
import { categoriesGet, categoriesClear } from '../redux/actions/categories';
import api from '../lib/api';
import generate from '../lib/generate';
import socketIO from '../lib/sockets';

import Header from '../components/Structure/Header';
import Footer from '../components/Structure/Footer';
import Auth from '../components/Auth';
import AuthMail from '../components/Auth/Mail';
import Online from '../components/Online';
import Toasts from '../components/Toast';

const Body = ({
  system, main, profile, online, categories,
  toastAdd,
  changeNetwork, changeLang, setToken, setAuth, setUtm, changeTheme,
  profileIn,
  onlineAdd, onlineDelete, onlineReset,
  categoriesGet, categoriesClear,
  Component, pageProps,
}) => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const rehydrated = useSelector(state => state._persist.rehydrated); /* eslint-disable-line */

  useEffect(() => {
    // Telegram
    const telegramApi = window?.Telegram?.WebApp;
    if (telegramApi) {
      telegramApi.expand();
      telegramApi.disableVerticalSwipes();
      changeNetwork('tg');
    }

    // // Bootstrap
    // window.bootstrap = require('bootstrap/dist/js/bootstrap');

    // Define color theme
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      changeTheme('dark');
    }
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      changeTheme(e.matches ? 'dark' : 'light');
    });
  }, []);

  // Telegram auth
  useEffect(() => {
    if (main.token && !profile.id) {
      const telegramApi = window?.Telegram?.WebApp;
      if (telegramApi && telegramApi?.initDataUnsafe?.user) {
        if (telegramApi && telegramApi.initData) {
          api(main, 'users.app.tg', {
            url: telegramApi.initData,
            // utm: main.utm,
          }).then(res => {
            profileIn(res);
            setAuth(res.token);
          }).catch(err => {
            toastAdd({
              header: t('system.error'),
              text: err,
              color: 'white',
              background: 'danger',
            });
            // onModal('failed', 'Oops! It seems you have an unstable internet connection (we recommend disconnecting from weak networks or VPNs). Try to log in again. If the problem repeats - write us in the chat.');
          });
        } else {
          // onModal('failed', 'Not use direct link, open telegram mini app: @...');
        }
      }
    }
  }, [main.token, profile.id]);

  // Online
  useEffect(() => {
    if (main.token && !online.count) {
      socketIO.emit('online', { token: main.token });
      socketIO.on('online_add', x => onlineAdd(x));
      socketIO.on('online_del', x => onlineDelete(x));
      socketIO.on('disconnect', () => onlineReset());
    }
  }, [router.asPath, main.token]);

  useEffect(() => {
    if (rehydrated && router.isReady) {
      // UTM
      let { utm } = main;
      if (router.query.utm && !utm) {
        utm = router.query.utm;
        setUtm(utm);
      }

      // Generate token
      if (!main.token) {
        const token = generate();
        api(main, 'users.token', {
          token,
          network: main?.network ? main.network : 'web',
          utm,
          extra: {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            languages: navigator.languages,
          },
        }, true).then((res) => {
          setToken(token);
          setAuth(res.token);
        });
      }
    }
  }, [rehydrated, router.isReady, router.query]);

  useEffect(() => {
    categoriesClear();
  }, [main.locale]);

  useEffect(() => {
    if (main.token && categories === null) {
      api(main, 'categories.get', { locale: main.locale }).then(
        res => categoriesGet(res.categories),
      );
    }
  }, [main.token, categories]);

  useEffect(() => {
    changeLang(router.locale);
  }, [router.locale]);

  return (
    <div className="all">
      <Head>
        {/* SEO */}
        <title>{process.env.NEXT_PUBLIC_NAME}</title>
        <meta name="title" content={process.env.NEXT_PUBLIC_NAME} />
        <meta name="og:title" content={process.env.NEXT_PUBLIC_NAME} />
        <meta name="description" content={t('brand.description')} />
        <meta name="og:description" content={t('brand.description')} />
        <meta name="og:image" content={`${process.env.NEXT_PUBLIC_WEB}brand/logo_min.png`} />

        {/* Zoom */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
      </Head>

      <Header />

      <div className="body">
        <Component {...pageProps} />
      </div>

      {system.popup === 'auth' && (
        <Auth />
      )}
      {system.popup === 'mail' && (
        <AuthMail />
      )}
      {system.popup === 'online' && (
        <Online />
      )}

      <Toasts toasts={system.toasts} />

      <Footer />
    </div>
  );
};

export default wrapper.withRedux(appWithTranslation(connect(state => state, {
  toastAdd,
  changeNetwork,
  changeLang,
  setToken,
  setAuth,
  setUtm,
  changeTheme,
  profileIn,
  onlineAdd,
  onlineDelete,
  onlineReset,
  categoriesGet,
  categoriesClear,
})(Body)));
