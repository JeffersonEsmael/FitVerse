import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart } from 'lucide-react';
import { useNavigationStore } from '../../stores/navigationStore';

const categories = ['Wellness', 'Art', 'Sport', 'Home', 'Music'];

const products = [
  {
    id: 1,
    name: 'Smart Watch WH22-6 Fitness Tracker',
    price: 48.99,
    image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&q=80&w=400',
    isTop: true,
    inCart: true,
  },
  {
    id: 2,
    name: 'Club Kit 1 Recurve Archery Set',
    price: 89.99,
    image: 'https://images.unsplash.com/photo-1511688878353-3a2f5be94cd7?auto=format&fit=crop&q=80&w=400',
    isTop: false,
    inCart: false,
  },
  {
    id: 3,
    name: 'Nike Air Vapormax Plus Light Blue',
    price: 154.97,
    oldPrice: 220.00,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400',
    isTop: false,
    inCart: false,
  },
  {
    id: 4,
    name: 'Pullover Hoodie - Unisex Casual',
    price: 34.99,
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=400',
    isTop: true,
    inCart: true,
  },
  {
    id: 5,
    name: 'Premium Boxing Gloves',
    price: 65.00,
    image: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&q=80&w=400',
    isTop: false,
    inCart: false,
  }
];

export default function StoreView() {
  const [activeCategory, setActiveCategory] = useState('Sport');
  const navigate = useNavigationStore((s) => s.navigate);

  return (
    <div style={styles.container}>
      {/* Categories */}
      <div style={styles.categoriesWrapper}>
        <div style={styles.categories}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                ...styles.categoryBtn,
                ...(activeCategory === cat ? styles.categoryActive : {}),
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div style={styles.grid}>
        {products.map((product) => (
          <motion.div
            key={product.id}
            style={styles.card}
            whileHover={{ y: -5 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => navigate('product_details')}
            role="button"
            tabIndex={0}
          >
            <button style={styles.heartBtn} onClick={(e) => e.stopPropagation()}>
              <Heart size={16} color="#6C6C88" />
            </button>
            
            <div style={styles.imageContainer}>
              <img src={product.image} alt={product.name} style={styles.image} />
            </div>

            {product.isTop && (
              <div style={styles.badge}>Top item</div>
            )}

            <div style={styles.info}>
              <h4 style={styles.name}>{product.name}</h4>
              {product.oldPrice && <span style={styles.oldPrice}>${product.oldPrice.toFixed(2)}</span>}
              <div style={styles.actionRow}>
                <button 
                  style={{ ...styles.cartBtn, ...(product.inCart ? styles.cartBtnActive : {}) }}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Toggle cart logic here
                  }}
                >
                  {product.inCart ? 'In cart' : (
                    <>
                      <ShoppingCart size={14} style={{ marginRight: 6 }} />
                      ${product.price.toFixed(2)}
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute',
    top: 'max(env(safe-area-inset-top, 0px), 60px)',
    left: 0,
    right: 0,
    bottom: '70px',
    background: '#000',
    overflowY: 'auto',
    padding: '16px',
    paddingTop: '20px',
  },
  categoriesWrapper: {
    margin: '0 -16px 20px',
    padding: '0 16px',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
  },
  categories: {
    display: 'flex',
    gap: '12px',
    width: 'max-content',
  },
  categoryBtn: {
    padding: '8px 20px',
    borderRadius: '20px',
    border: 'none',
    background: 'rgba(255,255,255,0.05)',
    color: '#6C6C88',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  categoryActive: {
    background: 'linear-gradient(135deg, #A855F7, #6366F1)',
    color: '#fff',
    boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    paddingBottom: '24px',
  },
  card: {
    position: 'relative',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '20px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid rgba(255,255,255,0.05)',
    cursor: 'pointer',
  },
  heartBtn: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: 'rgba(0,0,0,0.5)',
    border: 'none',
    borderRadius: '50%',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 2,
    backdropFilter: 'blur(4px)',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: '1',
    borderRadius: '12px',
    overflow: 'hidden',
    marginBottom: '12px',
    background: 'rgba(255,255,255,0.02)',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  badge: {
    position: 'absolute',
    top: '135px',
    left: '12px',
    background: '#FFD700',
    color: '#000',
    fontSize: '10px',
    fontWeight: 800,
    padding: '4px 8px',
    borderRadius: '8px',
    zIndex: 2,
    fontFamily: "'Inter', sans-serif",
  },
  info: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#fff',
    margin: '0 0 4px',
    fontFamily: "'Inter', sans-serif",
    lineHeight: '1.4',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  oldPrice: {
    fontSize: '11px',
    color: '#6C6C88',
    textDecoration: 'line-through',
    marginBottom: '8px',
  },
  actionRow: {
    marginTop: 'auto',
    paddingTop: '8px',
  },
  cartBtn: {
    width: '100%',
    padding: '8px 0',
    borderRadius: '12px',
    border: '1px solid rgba(99,102,241,0.5)',
    background: 'transparent',
    color: '#A855F7',
    fontSize: '13px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  },
  cartBtnActive: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#6C6C88',
  }
};
