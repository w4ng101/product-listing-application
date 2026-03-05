function StarRating({ rating }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <span className="star-rating" aria-label={`Rating: ${rating} out of 5`}>
      {'★'.repeat(full)}
      {half ? '½' : ''}
      {'☆'.repeat(empty)}
      <span className="rating-value">{rating.toFixed(1)}</span>
    </span>
  );
}

function ProductCard({ product }) {
  const { name, price, category, description, image, rating } = product;

  return (
    <article className="product-card">
      <div className="product-image-wrapper">
        <img src={image} alt={name} className="product-image" loading="lazy" />
        <span className="product-category">{category}</span>
      </div>
      <div className="product-info">
        <h2 className="product-name">{name}</h2>
        <StarRating rating={rating} />
        <p className="product-description">{description}</p>
        <div className="product-footer">
          <span className="product-price">${price.toFixed(2)}</span>
          <button className="add-to-cart-btn" aria-label={`Add ${name} to cart`}>
            Add to Cart
          </button>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
