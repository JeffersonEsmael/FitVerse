import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, Home, Package, ShoppingCart, Star } from 'lucide-react';
import { useNavigationStore } from '../stores/navigationStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';

export default function ProductDetailsScreen() {
  const navigate = useNavigationStore((s) => s.navigate);
  const [activeTab, setActiveTab] = useState('details');
  const [selectedSize, setSelectedSize] = useState(7.5);
  const [selectedColor, setSelectedColor] = useState(0);

  const product = {
    name: "Men's Sneakers AeroStep",
    description: "Lightweight and stylish sneakers for everyday wear. Available in three colors: white, red, and black.",
    price: 119.99,
    oldPrice: 139.99,
    rating: 5,
    reviewsCount: 84,
    questionsCount: 6,
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600',
    ],
    colors: ['#E2E8F0', '#EF4444', '#1E293B'],
    sizes: [6.5, 7, 7.5, 8, 8.5],
  };

  return (
    <ScreenWrapper screenKey="product_details">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.iconBtn} onClick={() => navigate('feed')}>
            <ArrowLeft size={24} color="#fff" />
          </button>
          <span style={styles.headerTitle}>Details</span>
          <button style={styles.iconBtn}>
            <Heart size={24} color="#A855F7" fill="#A855F7" />
          </button>
        </div>

        <div style={styles.content}>
          {/* Tabs */}
          <div style={styles.tabsRow}>
            <button
              style={{ ...styles.tab, ...(activeTab === 'details' ? styles.tabActive : {}) }}
              onClick={() => setActiveTab('details')}
            >
              Details
            </button>
            <button
              style={{ ...styles.tab, ...(activeTab === 'reviews' ? styles.tabActive : {}) }}
              onClick={() => setActiveTab('reviews')}
            >
              Reviews <span style={styles.tabBadge}>{product.reviewsCount}</span>
            </button>
            <button
              style={{ ...styles.tab, ...(activeTab === 'questions' ? styles.tabActive : {}) }}
              onClick={() => setActiveTab('questions')}
            >
              Questions <span style={styles.tabBadge}>{product.questionsCount}</span>
            </button>
          </div>

          {/* Product Image */}
          <div style={styles.imageContainer}>
            <div style={styles.topBadge}>Top item</div>
            <img src={product.images[0]} alt="Product" style={styles.mainImage} />
            <div style={styles.dots}>
              <div style={{...styles.dot, ...styles.dotActive}} />
              <div style={styles.dot} />
              <div style={styles.dot} />
            </div>
          </div>

          {/* Info */}
          <div style={styles.infoSection}>
            <h1 style={styles.title}>{product.name}</h1>
            <p style={styles.description}>{product.description}</p>

            {/* Colors */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Color <span style={styles.sectionValue}>White</span></h3>
              <div style={styles.optionsRow}>
                {product.colors.map((color, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedColor(index)}
                    style={{
                      ...styles.colorOption,
                      ...(selectedColor === index ? styles.colorOptionActive : {}),
                    }}
                  >
                    <div style={{ ...styles.colorCircle, background: color }} />
                  </button>
                ))}
              </div>
            </div>

            {/* Sizes */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Size <span style={styles.sectionValue}>{selectedSize}</span></h3>
              <div style={styles.optionsRow}>
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    style={{
                      ...styles.sizeOption,
                      ...(selectedSize === size ? styles.sizeOptionActive : {}),
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Reviews summary */}
            <div style={styles.reviewsSummary}>
              <div style={styles.reviewerAvatars}>
                <img src="https://i.pravatar.cc/100?u=1" alt="" style={styles.reviewerAvatar} />
                <img src="https://i.pravatar.cc/100?u=2" alt="" style={{...styles.reviewerAvatar, marginLeft: '-10px'}} />
                <img src="https://i.pravatar.cc/100?u=3" alt="" style={{...styles.reviewerAvatar, marginLeft: '-10px'}} />
              </div>
              <span style={styles.reviewsText}>+ {product.reviewsCount} reviews</span>
              
              <div style={{ flex: 1 }} />
              
              <div style={styles.priceCol}>
                <span style={styles.oldPrice}>${product.oldPrice}</span>
                <div style={styles.ratingBox}>
                  <span style={styles.currentPrice}>${product.price}</span>
                  <div style={styles.ratingScore}>
                    {product.rating}/5 <Star size={12} color="#FFD700" fill="#FFD700" style={{marginLeft: 4}} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={styles.bottomBar}>
          <button style={styles.bottomIconBtn} onClick={() => navigate('feed')}><Home size={24} color="#6C6C88" /></button>
          <button style={styles.bottomIconBtn}><Heart size={24} color="#6C6C88" /></button>
          <button style={styles.bottomIconBtn}><Package size={24} color="#6C6C88" /></button>
          
          <button style={styles.addToCartBtn}>
            <div style={styles.cartIconWrapper}>
              <ShoppingCart size={18} color="#fff" />
              <span style={styles.cartBadge}>4</span>
            </div>
            <span>Cart</span>
          </button>
        </div>
      </div>
    </ScreenWrapper>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#0A0A0F', // Dark mode to fit the app
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)',
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
  },
  headerTitle: {
    color: '#fff',
    fontSize: '18px',
    fontWeight: 700,
    fontFamily: "'Outfit', sans-serif",
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 16px',
    paddingBottom: '100px', // Space for bottom bar
  },
  tabsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  tab: {
    background: 'none',
    border: 'none',
    color: '#6C6C88',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 0',
    fontFamily: "'Inter', sans-serif",
  },
  tabActive: {
    color: '#fff',
    borderBottom: '2px solid #fff',
  },
  tabBadge: {
    background: 'rgba(255,255,255,0.1)',
    padding: '2px 6px',
    borderRadius: '10px',
    fontSize: '11px',
    color: '#fff',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: '1',
    borderRadius: '24px',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '24px',
    overflow: 'hidden',
  },
  topBadge: {
    position: 'absolute',
    top: '16px',
    left: '16px',
    background: '#FFD700',
    color: '#000',
    fontSize: '12px',
    fontWeight: 800,
    padding: '6px 12px',
    borderRadius: '12px',
    fontFamily: "'Inter', sans-serif",
    zIndex: 2,
  },
  mainImage: {
    width: '90%',
    height: '90%',
    objectFit: 'contain',
    zIndex: 1,
    transform: 'rotate(-10deg)', // Add some dynamic flair
  },
  dots: {
    position: 'absolute',
    bottom: '16px',
    left: '0',
    right: '0',
    display: 'flex',
    justifyContent: 'center',
    gap: '6px',
    zIndex: 2,
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    background: '#A855F7',
    width: '18px',
    borderRadius: '3px',
  },
  infoSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#fff',
    margin: 0,
    fontFamily: "'Outfit', sans-serif",
    lineHeight: '1.2',
  },
  description: {
    fontSize: '14px',
    color: '#B0B0C8',
    lineHeight: '1.5',
    margin: 0,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#fff',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sectionValue: {
    fontSize: '14px',
    color: '#6C6C88',
    fontWeight: 500,
  },
  optionsRow: {
    display: 'flex',
    gap: '12px',
  },
  colorOption: {
    width: '60px',
    height: '40px',
    borderRadius: '20px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  colorOptionActive: {
    border: '1px solid #A855F7',
    background: 'rgba(168, 85, 247, 0.1)',
  },
  colorCircle: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.2)',
  },
  sizeOption: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid transparent',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  sizeOptionActive: {
    background: '#A855F7',
    color: '#fff',
    boxShadow: '0 4px 15px rgba(168,85,247,0.4)',
  },
  reviewsSummary: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '10px',
    padding: '16px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '16px',
  },
  reviewerAvatars: {
    display: 'flex',
  },
  reviewerAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: '2px solid #0A0A0F',
  },
  reviewsText: {
    fontSize: '12px',
    color: '#6C6C88',
  },
  priceCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  oldPrice: {
    fontSize: '12px',
    color: '#6C6C88',
    textDecoration: 'line-through',
  },
  currentPrice: {
    fontSize: '18px',
    fontWeight: 800,
    color: '#A855F7',
    marginRight: '8px',
  },
  ratingBox: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '12px',
    color: '#fff',
    fontWeight: 600,
  },
  ratingScore: {
    display: 'flex',
    alignItems: 'center',
    color: '#FFD700',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '80px',
    background: 'rgba(10, 10, 15, 0.95)',
    backdropFilter: 'blur(20px)',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
  },
  bottomIconBtn: {
    background: 'none',
    border: 'none',
    padding: '8px',
    cursor: 'pointer',
  },
  addToCartBtn: {
    background: 'linear-gradient(135deg, #A855F7, #6366F1)',
    borderRadius: '24px',
    padding: '12px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    border: 'none',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 700,
    fontFamily: "'Inter', sans-serif",
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(168,85,247,0.4)',
  },
  cartIconWrapper: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: '-6px',
    right: '-8px',
    background: '#FF2D55',
    color: '#fff',
    fontSize: '10px',
    fontWeight: 800,
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
