import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';

import { toastAdd } from '../../redux/actions/system';
import api from '../../lib/api';
import Upload from '../Forms/Upload';
import Locale from '../Forms/Locale';
import Editor from '../Forms/Editor';

export const Edit = ({ product, setEdit, setProduct }) => {
  const { t } = useTranslation('common');
  const dispatch = useDispatch();
  const router = useRouter();
  const main = useSelector(state => state.main);
  const [title, setTitle] = useState(product ? product.title : '');
  const [description, setDescription] = useState(product ? product.description : '');
  const [data, setData] = useState(product ? product.data : '');
  const [image, setImage] = useState(product ? product.image : null);
  const [locale, setLocale] = useState(product ? product.locale : main.locale);
  const [editorLoaded, setEditorLoaded] = useState(false);

  const editProduct = () => {
    const req = {
      title, description, data, image, locale,
    };

    if (product) {
      req.id = product.id;
    }

    api(main, 'products.save', req).then(res => {
      if (product) {
        setProduct(null);
        setEdit(false);
      } else {
        router.push(`/catalog/${res.product.url}`);
      }
      dispatch(toastAdd({
        header: t('system.success'),
        text: t('system.saved'),
        color: 'white',
        background: 'success',
      }));
    }).catch(err => {
      if (product) {
        setEdit(false);
      }
      dispatch(toastAdd({
        header: t('system.error'),
        text: err,
        color: 'white',
        background: 'danger',
      }));
    });
  };

  useEffect(() => {
    setEditorLoaded(true);
  }, []);

  return (
    <div>
      <br />

      <input
        type="text"
        placeholder={t('posts.title')}
        value={title}
        onChange={event => setTitle(event.target.value)}
      />
      <div>
        <div className="half_medium">
          <Upload image={image} setImage={setImage} />
        </div>
        <div className="half_medium">
          <Locale locale={locale} setLocale={setLocale} />
          <textarea
            placeholder={`${t('posts.description')} (SEO)`}
            value={description}
            onChange={event => setDescription(event.target.value)}
            style={{ height: '146px' }}
          />
        </div>
      </div>

      <Editor
        editorLoaded={editorLoaded}
        data={data}
        updatePost={text => setData(text)}
      />

      <br />
      <br />

      <button
        type="button"
        className="btn btn-success"
        style={{ width: '100%' }}
        onClick={editProduct}
        aria-label="Save"
      >
        <i className="fa-regular fa-floppy-disk" />
      </button>
    </div>
  );
};

export default ({ product }) => { // setProduct
  const profile = useSelector(state => state.profile);
  const [edit, setEdit] = useState(false);

  if (!product) {
    return (
      <></>
    );
  }

  let canonical = process.env.NEXT_PUBLIC_WEB;
  if (product.locale && product.locale !== process.env.NEXT_PUBLIC_LOCALE) {
    canonical += `${product.locale}/`;
  }
  canonical += `catalog/${product.url}`;

  return (
    <div>
      <Head>
        {/* SEO */}
        <title>{`${product.title} | ${process.env.NEXT_PUBLIC_NAME}`}</title>
        <meta name="title" content={`${product.title} | ${process.env.NEXT_PUBLIC_NAME}`} />
        <meta name="og:title" content={`${product.title} | ${process.env.NEXT_PUBLIC_NAME}`} />
        <meta name="description" content={product.description} />
        <meta name="og:description" content={product.description} />
        {product.image && (
          <meta name="og:image" content={product.image} />
        )}
        <meta property="og:url" content={`${process.env.NEXT_PUBLIC_WEB}catalog/${product.url}`} />
        <meta property="og:type" content="article" />
        <link rel="canonical" href={canonical} />
      </Head>

      <div className="title">
        <div className="title_body">
          <h1>{product.title}</h1>
        </div>

        <div className="tools">
          <div>
            {profile.status >= 2 && (
              <>
                <button
                  type="button"
                  onClick={() => setEdit(!edit)}
                  aria-label="Edit"
                >
                  <i className={edit ? 'fa-regular fa-eye' : 'fa-solid fa-pencil'} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
