import Link from 'next/link';

export default ({ post }) => (
  <Link href={`/posts/${post.url || post.id}`} key={post.id}>
    <div className="card">
      { post.image && (
      <div
        className="card_image"
        style={{ backgroundImage: `url(${post.image})` }}
      />
      ) }
      <div className="card_body">
        { !post.status && (
        <>
          <i className="fa-solid fa-lock me-2" />
          &nbsp;
        </>
        ) }
        { post.title }
      </div>
    </div>
  </Link>
);
