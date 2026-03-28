import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Tag, Clock, ArrowLeft, Package, ExternalLink, AlertCircle, Plus, Minus, Trash2, X, Send } from 'lucide-react';
import { supabase } from '../supabase';
import { Product, CartItem } from '../types';

interface ShopSectionProps {
  onBack: () => void;
}

export const ShopSection = ({ onBack }: ShopSectionProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
    // Load cart from localStorage if exists
    const savedCart = localStorage.getItem('charlitron_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Error parsing saved cart', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('charlitron_cart', JSON.stringify(cart));
  }, [cart]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) setProducts(data);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;

    const message = `*¡Hola Charlitron! Me interesan los siguientes productos de tu Baúl de los Recuerdos:*%0A%0A` +
      cart.map(item => `• ${item.product.title} (x${item.quantity}) - $${(item.product.price * item.quantity).toLocaleString()}`).join('%0A') +
      `%0A%0A*Total del Pedido: $${cartTotal.toLocaleString()}*%0A%0A_Quedo atento para coordinar el trato directo._`;

    const whatsappUrl = `https://wa.me/5214444237092?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const categories = ['Todos', ...Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[]];
  const filteredProducts = selectedCategory === 'Todos' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  return (
    <div className="min-h-screen bg-sepia-50 pt-32 pb-24 px-6 relative">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="space-y-4">
            <button 
              onClick={onBack}
              className="flex items-center gap-2 text-sepia-600 hover:text-sepia-950 transition-colors group relative z-50"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs font-bold uppercase tracking-widest">Volver al inicio</span>
            </button>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-sepia-950 text-sepia-100 rounded-2xl flex items-center justify-center shadow-xl">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h1 className="text-4xl md:text-6xl font-serif text-sepia-950">La Tienda del Tiempo</h1>
            </div>
            <p className="text-sepia-700 font-serif italic text-xl max-w-2xl">
              "Aquí encontrarás las novedades y productos del Viajero del Tiempo. Tesoros rescatados de épocas lejanas y souvenirs de mis travesías."
            </p>
          </div>
        </div>

        {/* Categories */}
        {products.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-12">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-sepia-950 text-sepia-100 shadow-lg' : 'bg-sepia-200 text-sepia-700 hover:bg-sepia-300'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Products Grid */}
        {isLoading ? (
          <div className="py-24 text-center">
            <div className="inline-block w-8 h-8 border-4 border-sepia-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sepia-600 font-serif italic">Buscando tesoros en el baúl del tiempo...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-32 bg-white/50 rounded-[3rem] border-2 border-dashed border-sepia-200">
            <Clock className="w-16 h-16 text-sepia-300 mx-auto mb-6 animate-pulse" />
            <h2 className="text-3xl font-serif text-sepia-950 mb-4">Productos por llegar en el tiempo</h2>
            <p className="text-sepia-600 max-w-md mx-auto italic">
              Mis viajes actuales me han llevado a una época donde los suministros son escasos. Vuelve pronto para ver qué maravillas traigo de mi próxima travesía.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group bg-white rounded-[2.5rem] overflow-hidden shadow-xl border border-sepia-100 hover:shadow-2xl transition-all duration-500 flex flex-col"
                >
                  {/* Image Container */}
                  <div className="relative aspect-square overflow-hidden bg-sepia-100">
                    <img 
                      src={product.image_url} 
                      alt={product.title}
                      className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${product.is_sold_out ? 'grayscale opacity-60' : ''}`}
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Badges */}
                    <div className="absolute top-6 left-6 flex flex-col gap-2">
                      {product.category && (
                        <span className="bg-white/90 backdrop-blur-md text-sepia-950 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm">
                          {product.category}
                        </span>
                      )}
                      {product.is_sold_out && (
                        <span className="bg-red-500 text-white px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg flex items-center gap-1.5">
                          <AlertCircle className="w-3 h-3" /> AGOTADO
                        </span>
                      )}
                    </div>

                    {/* Price Tag */}
                    {!product.is_sold_out && (
                      <div className="absolute bottom-6 right-6 bg-sepia-950 text-sepia-100 px-6 py-2 rounded-2xl shadow-2xl transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                        <span className="text-lg font-serif">${Number(product.price).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-8 flex flex-col flex-grow">
                    <h3 className="text-2xl font-serif text-sepia-950 mb-3 group-hover:text-sepia-600 transition-colors">
                      {product.title}
                    </h3>
                    <p className="text-sepia-600 text-sm leading-relaxed mb-6 flex-grow italic">
                      {product.description || 'Una pieza única rescatada de las brumas del tiempo.'}
                    </p>
                    
                    <div className="flex items-center justify-between pt-6 border-t border-sepia-50">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-sepia-400 uppercase tracking-widest font-bold">Inversión</span>
                        <span className="text-xl font-serif text-sepia-950">${Number(product.price).toLocaleString()}</span>
                      </div>
                      
                      <button 
                        onClick={() => addToCart(product)}
                        disabled={product.is_sold_out}
                        className={`px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all flex items-center gap-2 ${
                          product.is_sold_out 
                            ? 'bg-sepia-100 text-sepia-400 cursor-not-allowed' 
                            : 'bg-sepia-950 text-sepia-100 hover:bg-sepia-800 shadow-lg hover:shadow-sepia-950/20'
                        }`}
                      >
                        {product.is_sold_out ? 'No Disponible' : 'Añadir al Carrito'}
                        {!product.is_sold_out && <Plus className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsCartOpen(true)}
        className="fixed bottom-24 right-8 z-[60] bg-sepia-950 text-sepia-100 p-5 rounded-full shadow-2xl flex items-center justify-center group"
      >
        <ShoppingBag className="w-8 h-8" />
        {cartCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-sepia-500 text-sepia-950 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shadow-lg border-2 border-sepia-950">
            {cartCount}
          </span>
        )}
      </motion.button>

      {/* Cart Drawer Overlay */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-sepia-950/60 backdrop-blur-sm z-[70]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-sepia-50 z-[80] shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-sepia-200 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-sepia-950 text-sepia-100 rounded-xl flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-serif text-sepia-950">Tu Pedido</h2>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 hover:bg-sepia-100 rounded-full transition-colors text-sepia-500"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-8 space-y-6">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                    <Package className="w-16 h-16 text-sepia-300" />
                    <p className="font-serif italic text-lg">Tu baúl de compras está vacío...</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.product.id} className="flex gap-4 bg-white p-4 rounded-2xl border border-sepia-100 shadow-sm">
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-sepia-100 flex-shrink-0">
                        <img 
                          src={item.product.image_url} 
                          alt={item.product.title} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-grow min-w-0">
                        <h4 className="text-sepia-950 font-medium truncate">{item.product.title}</h4>
                        <p className="text-sepia-500 text-sm font-serif">${item.product.price.toLocaleString()}</p>
                        
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-3 bg-sepia-50 rounded-lg p-1 border border-sepia-100">
                            <button 
                              onClick={() => updateQuantity(item.product.id, -1)}
                              className="p-1 hover:bg-sepia-200 rounded transition-colors text-sepia-600"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold text-sepia-950 w-4 text-center">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.product.id, 1)}
                              className="p-1 hover:bg-sepia-200 rounded transition-colors text-sepia-600"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <button 
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-red-400 hover:text-red-600 p-1 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-8 bg-white border-t border-sepia-200 space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sepia-500 uppercase tracking-widest text-xs font-bold">Total Estimado</span>
                    <span className="text-3xl font-serif text-sepia-950">${cartTotal.toLocaleString()}</span>
                  </div>
                  
                  <div className="space-y-3">
                    <button 
                      onClick={handleCheckout}
                      className="w-full bg-sepia-950 text-sepia-100 py-5 rounded-2xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-3 hover:bg-sepia-800 transition-all shadow-xl shadow-sepia-950/20"
                    >
                      <Send className="w-5 h-5" />
                      Finalizar por WhatsApp
                    </button>
                    <button 
                      onClick={clearCart}
                      className="w-full py-3 text-sepia-400 hover:text-red-400 text-xs font-bold uppercase tracking-widest transition-colors"
                    >
                      Vaciar Carrito
                    </button>
                  </div>
                  
                  <p className="text-[10px] text-sepia-400 text-center leading-relaxed">
                    Al finalizar, se abrirá un chat de WhatsApp con el detalle de tu pedido para coordinar el pago y la entrega directamente.
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
