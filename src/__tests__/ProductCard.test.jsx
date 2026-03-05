import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProductCard from '../components/ProductCard';

const sampleProduct = {
  id: 1,
  name: 'Test Headphones',
  price: 79.99,
  category: 'Electronics',
  description: 'A great pair of headphones.',
  image: 'https://example.com/headphones.jpg',
  rating: 4.5,
};

describe('ProductCard', () => {
  it('renders the product name', () => {
    render(<ProductCard product={sampleProduct} />);
    expect(screen.getByText('Test Headphones')).toBeInTheDocument();
  });

  it('renders the product price', () => {
    render(<ProductCard product={sampleProduct} />);
    expect(screen.getByText('$79.99')).toBeInTheDocument();
  });

  it('renders the product category badge', () => {
    render(<ProductCard product={sampleProduct} />);
    expect(screen.getByText('Electronics')).toBeInTheDocument();
  });

  it('renders the product description', () => {
    render(<ProductCard product={sampleProduct} />);
    expect(screen.getByText('A great pair of headphones.')).toBeInTheDocument();
  });

  it('renders the product image with correct alt text', () => {
    render(<ProductCard product={sampleProduct} />);
    const img = screen.getByAltText('Test Headphones');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', sampleProduct.image);
  });

  it('renders an "Add to Cart" button', () => {
    render(<ProductCard product={sampleProduct} />);
    expect(screen.getByRole('button', { name: /add test headphones to cart/i })).toBeInTheDocument();
  });

  it('renders the star rating', () => {
    render(<ProductCard product={sampleProduct} />);
    expect(screen.getByLabelText(/rating: 4.5 out of 5/i)).toBeInTheDocument();
  });
});
