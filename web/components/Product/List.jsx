import Card from './Card';
import Search from '../Search';

export default ({ products }) => (
  <div className="units crmain">
    <Search />
    {products.map((el, num) => (
      <Card product={el} key={num} />
    ))}
  </div>
);
