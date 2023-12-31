// import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Link from 'next/link';

import api from '../lib/api';
import Grid from '../components/Post/Grid';

// eslint-disable-next-line
export default ({ posts }) => {
  // const router = useRouter();
  // useEffect(() => {
  //   if (main.token && profile.status < 6) {
  //     router.push('/');
  //   }
  // }, [main.token]);

  // const { t } = useTranslation('common');

  return (
    <>
      <div className="banner">
        <div className="banner_body">
          <h1>template web app</h1>
          <h2>FullStack 100% code web site</h2>
          <Link href="https://github.com/chilleco/web">
            <button
              type="button"
              id="black"
            >
              Check code →
            </button>
          </Link>
        </div>
        <div className="banner_side">
          FastAPI
          <br />
          React
          <br />
          NextJS
          <br />
          Docker
          <br />
          Telegram Bot
        </div>
      </div>

      <div className="tetra">
        <div>
          <font>15 locales</font>
          {' '}
          internationalisation
        </div>
        <div>
          <font>WebSockets</font>
          {' '}
          online users
        </div>
        <div>
          <font>SEO & SSR</font>
          , auto generated sitemaps
        </div>
        <div>
          <font>monitoring</font>
          {' '}
          & health metrics
        </div>
      </div>

      <div className="scroll">
        <i className="fa-solid fa-chevron-down" />
      </div>

      <div id="cases">
        <div className="title">
          <div className="icon red">
            <i className="fa-solid fa-paperclip" />
          </div>
          <div className="title_body">
            <h2>Cases</h2>
          </div>
        </div>
        <Grid posts={posts} />
      </div>

      <br />

      <div id="contacts">
        <div className="title">
          <div className="icon red">
            <i className="fa-solid fa-address-card" />
          </div>
          <div className="title_body">
            <h2>Contacts</h2>
          </div>
        </div>
        <div className="main">
          <div className="text">
            <div className="icon">
              <h3>Alex Poloz</h3>
            </div>
            <br />
            <Link href="https://t.me/kosyachniy/">
              <div className="icon">
                <i className="fa-brands fa-telegram tg" />
                <div className="icon_link">@kosyachniy</div>
              </div>
            </Link>
            <br />
            <Link href="mailto:alexypoloz@gmail.com">
              <div className="icon">
                <i className="fa-brands fa-google g" />
                <div className="icon_link">alexypoloz@gmail.com</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export const getServerSideProps = async ({ locale }) => {
  const res = await api(null, 'posts.get', {
    locale,
    limit: 6,
  }, false, true);

  return {
    props: {
      ...await serverSideTranslations(locale, ['common']),
      posts: res.posts || [],
    },
  };
};
