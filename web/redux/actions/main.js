export const changeNetwork = (network) => ({
  type: 'CHANGE_NETWORK',
  network,
});

export const changeTheme = (theme) => ({
  type: 'CHANGE_THEME',
  theme,
  color: theme === 'dark' ? 'light' : 'dark',
});

export const changeLang = (locale) => ({
  type: 'CHANGE_LANG',
  locale, // i18n.changeLanguage(locale)
});

export const setToken = (token) => ({
  type: 'SET_TOKEN',
  token,
});

export const setAuth = (token) => ({
  type: 'SET_AUTH',
  token,
});

export const setUtm = (utm) => ({
  type: 'SET_UTM',
  utm,
});
