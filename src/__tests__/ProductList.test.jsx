import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductList from '../components/ProductList';

describe('ProductList', () => {
  it('renders the search input', () => {
    render(<ProductList />);
    expect(screen.getByRole('searchbox', { name: /search products/i })).toBeInTheDocument();
  });

  it('renders the category filter', () => {
    render(<ProductList />);
    expect(screen.getByRole('combobox', { name: /category/i })).toBeInTheDocument();
  });

  it('renders the sort dropdown', () => {
    render(<ProductList />);
    expect(screen.getByRole('combobox', { name: /sort by/i })).toBeInTheDocument();
  });

  it('renders a result count', () => {
    render(<ProductList />);
    expect(screen.getByText(/products? found/i)).toBeInTheDocument();
  });

  it('renders all product cards initially', () => {
    render(<ProductList />);
    const cards = screen.getAllByRole('article');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('filters products by search term', async () => {
    render(<ProductList />);
    const user = userEvent.setup();
    const searchInput = screen.getByRole('searchbox');

    await user.type(searchInput, 'keyboard');

    expect(screen.getByText('Mechanical Keyboard')).toBeInTheDocument();
    // Products not matching should not be visible
    expect(screen.queryByText('Coffee Maker')).not.toBeInTheDocument();
  });

  it('shows no results message when search has no matches', async () => {
    render(<ProductList />);
    const user = userEvent.setup();
    const searchInput = screen.getByRole('searchbox');

    await user.type(searchInput, 'xyznonexistentproduct12345');

    expect(screen.getByText(/no products match/i)).toBeInTheDocument();
  });

  it('filters products by category', async () => {
    render(<ProductList />);
    const user = userEvent.setup();
    const categorySelect = screen.getByRole('combobox', { name: /category/i });

    await user.selectOptions(categorySelect, 'Electronics');

    const cards = screen.getAllByRole('article');
    // All visible cards should be Electronics
    for (const card of cards) {
      expect(within(card).getByText('Electronics')).toBeInTheDocument();
    }
  });

  it('sorts products by price ascending', async () => {
    render(<ProductList />);
    const user = userEvent.setup();
    const sortSelect = screen.getByRole('combobox', { name: /sort by/i });

    await user.selectOptions(sortSelect, 'price-asc');

    const prices = screen
      .getAllByText(/^\$\d+\.\d{2}$/)
      .map((el) => parseFloat(el.textContent.slice(1)));

    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  });

  it('sorts products by price descending', async () => {
    render(<ProductList />);
    const user = userEvent.setup();
    const sortSelect = screen.getByRole('combobox', { name: /sort by/i });

    await user.selectOptions(sortSelect, 'price-desc');

    const prices = screen
      .getAllByText(/^\$\d+\.\d{2}$/)
      .map((el) => parseFloat(el.textContent.slice(1)));

    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeLessThanOrEqual(prices[i - 1]);
    }
  });
});
