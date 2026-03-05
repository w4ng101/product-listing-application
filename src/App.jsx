import ProductList from './components/ProductList';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <h1 className="app-title">🛍️ Product Listing</h1>
          <p className="app-subtitle">Browse our curated collection</p>
        </div>
      </header>
      <main className="app-main">
        <ProductList />
      </main>
      <footer className="app-footer">
        <p>© 2026 Product Listing Application</p>
      </footer>
    </div>
  );
}

export default App;
