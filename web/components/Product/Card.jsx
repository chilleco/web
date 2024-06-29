import Link from 'next/link';

export default ({ product }) => (
  <Link href={`/catalog/${product.url || product.id}`} key={product.id}>
    <div className="unit">
      {product.image && (
        <div
          className="unit_image"
          style={{ backgroundImage: `url(${product.image})` }}
        />
      )}
      <div className="unit_body">
        {!product.status && (
          <>
            <i className="fa-solid fa-lock me-2" />
            &nbsp;
          </>
        )}
        {product.title}
      </div>
    </div>
  </Link>
);
