import Card from './Card';

export default ({ products }) => (
  <div className="units">
    {products.map((el, num) => (
      <Card product={el} key={num} />
    ))}
  </div>
);
