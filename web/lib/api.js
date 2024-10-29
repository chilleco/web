const serverRequest = async (method = '', data = {}, external = true) => {
  let url = external ? process.env.NEXT_PUBLIC_API : 'http://api:5000/';
  url += method.replace('.', '/') + (method ? '/' : '');
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // TODO: ssr get cookie
    },
    body: JSON.stringify(data),
  });
};

const api = (
  main,
  method,
  data = {},
  external = true,
  setted = false,
) => new Promise((resolve, reject) => {
  // TODO: reject errors
  const requestData = {
    locale: main ? main.locale : 'en',
    ...data,
  };

  serverRequest(method, requestData, external).then(async (response) => {
    if (!response.ok) {
      if (response.status === 401 && !setted) {
        // TODO: auto request on token creation
        await api(main, 'users.token', {
          token: main.token,
          network: 'web',
          utm: main.utm,
          extra: {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            languages: navigator.languages,
          },
        }, external, true);
        resolve(await api(main, method, requestData, external, true));
      } else {
        let res = await response.text();
        try {
          res = JSON.parse(res);
        } catch { };

        if (typeof res.detail === 'object') {
          res.message = res.detail[0].msg;
          res.type = res.detail[0].loc[res.detail[0].loc.length - 1];
        }

        console.log('! Error', response.status, res.message);
        reject(res.detail);
      }
    } else {
      resolve(await response.json());
    }
  });
});

export default api;
