import Link from 'next/link';
import { useSelector } from 'react-redux';

export default () => {
  const main = useSelector(state => state.main);

  return (
    <footer>
      <div className="footer_left">
        { process.env.NEXT_PUBLIC_NAME }
        {' '}
        &copy;
        {' '}
        { new Date().getFullYear() }
      </div>
      <div className="footer_center">
        <Link href="/">
          <img
            src="/brand/logo_dark.svg"
            // src={`/brand/logo_${main.color}.svg`}
            alt={process.env.NEXT_PUBLIC_NAME}
            style={{ height: '24px' }}
          />
        </Link>
      </div>
      <div className="footer_right">
        <Link href="https://t.me/hnklny">
          { main.locale === 'ru' ? 'Канал в Telegram' : 'Telegram Channel' }
        </Link>
      </div>
    </footer>
  );
};
