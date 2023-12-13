import React, { useState, useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

import styles from '../../styles/post.module.css';
import { toastAdd } from '../../redux/actions/system';
import api from '../../lib/api';
import Grid from '../../components/Post/Grid';
import Paginator from '../../components/Paginator';

const getPage = count => Math.floor(count / 18) + Boolean(count % 18);

export const Posts = ({
  system, main, // profile,
  toastAdd,
  category = null, page = 1,
  postsLoaded = [], count = null, subcategories = [],
}) => {
  const { t } = useTranslation('common');
  const mounted = useRef(true);
  const router = useRouter();
  const [posts, setPosts] = useState(postsLoaded);
  const [lastPage, setLastPage] = useState(count ? getPage(count) : page);

  // useEffect(() => {
  //   if (main.token && profile.status < 2) {
  //     router.push('/');
  //   }
  // }, [main.token, profile.status]);

  const title = `${category ? category.title : t('structure.posts')} | ${process.env.NEXT_PUBLIC_NAME}`;
  let canonical = process.env.NEXT_PUBLIC_WEB;
  if (category) {
    if (category.locale && category.locale !== process.env.NEXT_PUBLIC_LOCALE) {
      canonical += `${category.locale}/`;
    }
  } else if (router.locale && router.locale !== process.env.NEXT_PUBLIC_LOCALE) {
    canonical += `${router.locale}/`;
  }
  if (category && category.url) {
    canonical += `posts/${category.url}`;
  } else {
    canonical = canonical.slice(0, -1);
  }

  const getPost = (data = {}) => api(main, 'posts.get', data).then(res => {
    if (res.posts) {
      setPosts(res.posts);
      if (res.count) {
        setLastPage(getPage(res.count));
      }
    }
  }).catch(err => toastAdd({
    header: t('system.error'),
    text: err,
    color: 'white',
    background: 'danger',
  }));

  useEffect(() => {
    if (!mounted.current || !posts) {
      getPost({
        category: category && category.id,
        locale: main.locale,
        search: system.search && system.search.length >= 3 ? system.search : '',
        limit: 18,
        offset: (page - 1) * 18,
      });
    }
    mounted.current = false;
  }, [
    system.search && system.search.length >= 3 ? system.search : false,
    main.locale,
    category,
    page,
  ]);

  return (
    <>
      <Head>
        {/* SEO */}
        <title>{ title }</title>
        <meta name="title" content={title} />
        <meta name="og:title" content={title} />
        { category && (
          <>
            { category.description && (
              <>
                <meta name="description" content={category.description} />
                <meta name="og:description" content={category.description} />
              </>
            ) }
            { category.image && (
              <meta name="og:image" content={category.image} />
            ) }
          </>
        ) }
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={canonical} />
      </Head>

      <div className="title">
        <div className="icon green">
          <i className="fa-solid fa-newspaper" />
        </div>
        <div className="title_body">
          { category
            ? <h1>{category.title}</h1>
            : <h1>{ t('structure.posts') }</h1>}

          { category ? (
            <ul
              role="navigation"
              aria-label="breadcrumb"
              itemScope="itemscope"
              itemType="http://schema.org/BreadcrumbList"
              className={styles.navigation}
            >
              <li
                itemProp="itemListElement"
                itemScope="itemscope"
                itemType="http://schema.org/ListItem"
              >
                <meta content="0" itemProp="position" />
                <Link
                  href="/posts"
                  style={{ textDecoration: 'underline dotted' }}
                  title={t('system.main')}
                  itemID="/posts"
                  itemScope="itemscope"
                  itemProp="item"
                  itemType="http://schema.org/Thing"
                >
                  <span itemProp="name">{ t('system.main') }</span>
                </Link>
                { category.parents.length
                  ? <div className="breadcrumb">/</div>
                  : <></>}
              </li>
              { category.parents && category.parents.map((parent, i) => (
                <li
                  itemProp="itemListElement"
                  itemScope="itemscope"
                  itemType="http://schema.org/ListItem"
                  key={parent.id}
                >
                  <meta content={i + 1} itemProp="position" />
                  <Link
                    href={`/posts/${parent.url}`}
                    style={{ textDecoration: 'underline dotted' }}
                    title={parent.title}
                    itemID={`/posts/${parent.url}`}
                    itemScope="itemscope"
                    itemProp="item"
                    itemType="http://schema.org/Thing"
                  >
                    <span itemProp="name">
                      {parent.title}
                    </span>
                  </Link>
                  { i < category.parents.length - 1
                    ? <div className="breadcrumb">/</div>
                    : <></>}
                </li>
              )) }
            </ul>
          ) : (<></>) }
        </div>

        <div className="tools">
          <div>
            <a href="/posts/add" aria-label="Create">
              <i className="fa-solid fa-plus" />
            </a>
          </div>
        </div>
      </div>

      <div className="categories">
        { subcategories.map(subcategory => (subcategory.status ? (
          <Link
            href={`/posts/${subcategory.url}/`}
            key={subcategory.id}
          >
            { subcategory.title }
          </Link>
        ) : (
          <React.Fragment key={subcategory.id} />
        ))) }
      </div>

      { category && (
        <>
          { category.image && (
            <>
              <img
                src={category.image}
                alt={category.title}
                className={styles.image}
              />
              <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                  __html: JSON.stringify({
                    '@context': 'http://schema.org/',
                    '@type': 'ImageObject',
                    contentUrl: category.image,
                    name: category.title,
                    description: category.description,
                  }),
                }}
              />
            </>
          ) }
          <div dangerouslySetInnerHTML={{ __html: category.data }} />
        </>
      ) }

      <Grid posts={posts} />
      <Paginator page={page} lastPage={lastPage} prefix={category ? `/posts/${category.url}` : ''} />
    </>
  );
};

export default connect(state => state, { toastAdd })(Posts);

export const getServerSideProps = async ({ query, locale }) => {
  const page = !Number.isNaN(Number(query.page)) ? (+query.page || 1) : 1;
  const res = await api(null, 'posts.get', {
    locale,
    limit: 18,
    offset: (page - 1) * 18,
  }, false, true);
  const subres = await api(null, 'categories.get', { locale }, false, true);

  return {
    props: {
      ...await serverSideTranslations(locale, ['common']),
      page,
      postsLoaded: res.posts || [],
      count: res.count,
      subcategories: subres.categories || [],
    },
  };
};
