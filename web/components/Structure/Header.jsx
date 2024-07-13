import React, { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
// import { useRouter } from 'next/router';
import Link from 'next/link';
// import Image from 'next/image';
import { useTranslation } from 'next-i18next';

import { popupSet, toastAdd } from '../../redux/actions/system'; // searching
// import { changeTheme } from '../../redux/actions/main';
import { profileOut } from '../../redux/actions/profile';
import api from '../../lib/api';
import Hexagon from '../Hexagon';

// eslint-disable-next-line
const Logo = () => {
  // const main = useSelector(state => state.main);
  return (
    <Link href="/">
      <img
        src="/brand/logo_dark.svg"
        // src={`/brand/logo_${main.color}.svg`}
        alt={process.env.NEXT_PUBLIC_NAME}
      />
    </Link>
  );
};

const Navigation = ({ setExpanded }) => {
  const { t } = useTranslation('common');
  // const main = useSelector(state => state.main);
  // const categories = useSelector(state => state.categories);

  return (
    <div className="menu">
      {/* <li className="nav-item dropdown"> */}
      <Link
        href="/posts/"
        className="green"
        onClick={() => setExpanded(false)}
      >
        <i className="fa-solid fa-newspaper" />
        {t('structure.posts')}
      </Link>
      {/* <ul className={`${styles.menu} dropdown-menu dropdown-menu-${main.theme}`}>
          { categories && categories.map(category => (category.id && category.status ? (
            <Link
              href={`/posts/${category.url}/`}
              className="dropdown-item"
              key={category.id}
            >
              { category.title }
            </Link>
          ) : (
            <React.Fragment key={category.id} />
          ))) }
        </ul>
      </li> */}
      {/* { categories && categories.map(category => (category.id && category.status ? (
        <li className="nav-item dropdown">
          <Link href={`/posts/${category.url}/`} className="nav-link">
            { category.title }
          </Link>
          { category.categories && category.categories.length ? (
            <ul className={`${styles.menu} dropdown-menu dropdown-menu-${main.theme}`}>
              { category.categories.map(subcategory => (
                <Link
                  href={`/posts/${subcategory.url}/`}
                  className="dropdown-item"
                  key={subcategory.id}
                >
                  { subcategory.title }
                </Link>
              )) }
            </ul>
          ) : (<></>) }
        </li>
      ) : (
        <React.Fragment key={category.id} />
      ))) } */}
      <Link
        href="/space/"
        className="violet"
        onClick={() => setExpanded(false)}
      >
        <i className="fa-solid fa-paperclip" />
        {t('structure.space')}
      </Link>
      <Link
        href="/hub/"
        className="blue"
        onClick={() => setExpanded(false)}
      >
        <i className="fa-solid fa-quote-right" />
        {t('structure.hub')}
      </Link>
      <Link
        href="/catalog/"
        className="orange"
        onClick={() => setExpanded(false)}
      >
        <i className="fa-solid fa-folder-open" />
        {t('structure.catalog')}
      </Link>
      {/* Quiz */}
    </div>
  );
};

// const Search = () => {
//   const { t } = useTranslation('common');
//   const dispatch = useDispatch();
//   const router = useRouter();
//   const system = useSelector(state => state.system);

//   const search = value => {
//     dispatch(searching(value));
//     if (router.asPath !== '/posts') {
//       router.push('/posts/');
//     }
//   };

//   return (
//     <input
//       className={`${styles.search} form-control`}
//       type="search"
//       placeholder={t('system.search')}
//       value={system.search}
//       onChange={event => search(event.target.value)}
//     />
//   );
// };

const Profile = ({ setExpanded }) => {
  const { t } = useTranslation('common');
  const dispatch = useDispatch();
  const main = useSelector(state => state.main);
  const profile = useSelector(state => state.profile);

  const signOut = () => api(main, 'users.exit', {}).then(
    res => dispatch(profileOut(res)),
  ).catch(err => dispatch(toastAdd({
    header: t('system.error'),
    text: err,
    color: 'white',
    background: 'danger',
  })));

  const [isSubExpanded, setSubExpanded] = useState(false);
  const toggleExpand = () => setSubExpanded(!isSubExpanded);
  const blockRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (blockRef.current && !blockRef.current.contains(event.target)) {
        setSubExpanded(false);
      }
    };

    if (isSubExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSubExpanded]);

  if (!profile.id) {
    return (
      <button
        type="button"
        className="login"
        onClick={() => dispatch(popupSet('auth'))}
      >
        {t('system.sign_in')}
      </button>
    );
  }

  return (
    <div ref={blockRef} className="avatar" onClick={toggleExpand}>
      <Hexagon url={profile.image_optimize} />
      {isSubExpanded && (
        <div className="profile">
          <Link href="/profile/" onClick={() => setExpanded(false)}>
            <i className="bi bi-person-bounding-box" />
            {t('system.profile')}
          </Link>
          <Link href="/settings/" onClick={() => setExpanded(false)}>
            <i className="fa-solid fa-gear" />
            {t('system.settings')}
          </Link>
          {/* <Link href="/billing/" onClick={() => setExpanded(false)}>
            { t('system.billing') }
          </Link> */}
          {profile.status >= 6 && (
            <>
              <Link
                href={`https://docs.google.com/spreadsheets/d/${process.env.NEXT_PUBLIC_ANALYTICS_SHEET}/`}
                onClick={() => setExpanded(false)}
              >
                <i className="bi bi-funnel-fill" />
                {t('system.analytics')}
              </Link>
              <Link href="/eye/" onClick={() => setExpanded(false)}>
                <i className="bi bi-cone-striped" />
                {t('system.admin')}
              </Link>
            </>
          )}
          <div onClick={signOut}>
            <i className="bi bi-door-open-fill" />
            {t('system.sign_out')}
          </div>
        </div>
      )}
    </div>
  );
};

export default () => {
  // const router = useRouter();
  // const dispatch = useDispatch();
  // const main = useSelector(state => state.main);

  const [isExpanded, setExpanded] = useState(false);
  const toggleExpand = () => setExpanded(!isExpanded);

  return (
    <div className="header_cover">
      <nav className="header">
        <Logo />

        <div className="space" />
        <div className="burger" onClick={toggleExpand}>
          {isExpanded ? (
            <i className="fa-solid fa-xmark" />
          ) : (
            <i className="fa-solid fa-bars" />
          )}
        </div>

        <div className={`block ${isExpanded ? '' : 'hidden'}`}>
          <Navigation setExpanded={setExpanded} />
          {/* <Search /> */}
          {/* <ul className="nav navbar-nav navbar-right">
            <li className={`me-4 ${styles.custom}`}>
              <i
                className={`me-3 ms-1 ${
                  main.theme === 'dark'
                  ? 'bi bi-sun-fill'
                  : 'fa-solid fa-moon'
                }`}
                onClick={() => dispatch(changeTheme(
                  main.theme === 'dark'
                  ? 'light'
                  : 'dark'
                ))}
              />
              <Link href={router.query.url || `/locale?url=${router.asPath}`}>
                <Image
                  src={`/lang/${main.locale === 'ru' ? 'ru' : 'en'}.svg`}
                  alt={main.locale === 'ru' ? 'ru' : 'en'}
                  width={24}
                  height={24}
                />
              </Link> */}
          {/* <Link
                href={router.asPath}
                locale={main.locale === 'ru' ? 'en' : 'ru'}
              >
                <Image
                  src={`/lang/${main.locale}.svg`}
                  alt={main.locale}
                  width={24}
                  height={24}
                />
              </Link> */}
          <Profile setExpanded={setExpanded} />
        </div>
      </nav>
    </div>
  );
};
