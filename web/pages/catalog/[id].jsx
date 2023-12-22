import { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

import { toastAdd } from '../../redux/actions/system';
import api from '../../lib/api';
import Product from '../../components/Product';

const Container = ({
  main,
  toastAdd,
  id, productLoaded,
}) => {
  const { t } = useTranslation('common');
  const [product, setProduct] = useState(productLoaded);
  const [viewed, setViewed] = useState(false);

  const getProduct = (data = {}) => api(main, 'products.get', data).then(
    res => res.products && setProduct(res.products),
  ).catch(err => toastAdd({
    header: t('system.error'),
    text: err,
    color: 'white',
    background: 'danger',
  }));

  useEffect(() => {
    if (main.token && (!viewed || !product || +id !== product.id)) {
      setProduct(null);
      getProduct({ id, utm: main.utm });
      setViewed(true);
    }
  }, [main.token, product, id]);

  return (
    <Product product={product} setProduct={setProduct} />
  );
};

export default connect(state => state, { toastAdd })(Container);

export const getServerSideProps = async ({ query, locale }) => {
  let { id } = query;
  id = +id.split('-').pop();
  const res = await api(null, 'products.get', { id }, false, true);
  const productLoaded = res.products || null;

  return {
    props: {
      ...await serverSideTranslations(locale, ['common']),
      id,
      productLoaded,
    },
  };
};
