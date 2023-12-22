import Card from './Card';

export default ({ products }) => (
  <div className="cards">
    { products.map((el, num) => (
      <Card product={el} key={num} />
    )) }
  </div>
);
