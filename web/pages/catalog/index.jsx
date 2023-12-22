import React, { useState } from 'react';
import { connect } from 'react-redux';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

import { toastAdd } from '../../redux/actions/system';
import api from '../../lib/api';
import List from '../../components/Product/List';

export const Products = ({
  productsLoaded = [],
}) => {
  const { t } = useTranslation('common');
  // eslint-disable-next-line
  const [products, setProducts] = useState(productsLoaded);

  const title = `${t('structure.posts')} | ${process.env.NEXT_PUBLIC_NAME}`;

  return (
    <>
      <Head>
        {/* SEO */}
        <title>{ title }</title>
        <meta name="title" content={title} />
        <meta name="og:title" content={title} />
        <meta property="og:type" content="website" />
      </Head>

      <div className="title">
        <div className="icon green">
          <i className="fa-solid fa-newspaper" />
        </div>
        <div className="title_body">
          <h1>{ t('structure.catalog') }</h1>
        </div>

        <div className="tools">
          <div>
            <a href="/catalog/add" aria-label="Create">
              <i className="fa-solid fa-plus" />
            </a>
          </div>
        </div>
      </div>

      <List products={products} />
    </>
  );
};

export default connect(state => state, { toastAdd })(Products);

export const getServerSideProps = async ({ locale }) => {
  const res = await api(null, 'products.get', {}, false, true);

  return {
    props: {
      ...await serverSideTranslations(locale, ['common']),
      productsLoaded: res.products || [],
    },
  };
};
