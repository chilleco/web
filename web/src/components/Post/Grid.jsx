import Card from './Card';

export default ({ posts }) => (
  <div className="cards">
    {posts.map((el, num) => (
      <Card post={el} key={num} />
    ))}
  </div>
);
