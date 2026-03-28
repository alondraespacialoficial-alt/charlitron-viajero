import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FamilyTreeAccess } from './FamilyTreeAccess';
import { FamilyTreePanel } from './FamilyTreePanel';
import { FamilyTreeView } from './FamilyTreeView';
import { supabase } from '../supabase';
import { ArrowLeft, Key, Users, Clock, ShieldCheck, Lock } from 'lucide-react';

interface FamilyTreeManagerProps {
  onBack: () => void;
}

export const FamilyTreeManager = ({ onBack }: FamilyTreeManagerProps) => {
  const [accessKeyId, setAccessKeyId] = useState<string | null>(null);
  const [treeId, setTreeId] = useState<string | null>(null);
  const [view, setView] = useState<'access' | 'panel' | 'view'>('access');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if there's a saved access key in session storage
    const savedKeyId = sessionStorage.getItem('charlitron_ft_key');
    const savedTreeId = sessionStorage.getItem('charlitron_ft_tree');
    
    if (savedKeyId) {
      setAccessKeyId(savedKeyId);
      setTreeId(savedTreeId);
      setView('panel');
    }
    setLoading(false);
  }, []);

  const handleAccess = async (keyId: string, existingTreeId: string | null) => {
    setAccessKeyId(keyId);
    sessionStorage.setItem('charlitron_ft_key', keyId);
    
    if (existingTreeId) {
      setTreeId(existingTreeId);
      sessionStorage.setItem('charlitron_ft_tree', existingTreeId);
      setView('panel');
    } else {
      // Create a new tree for this key
      try {
        const { data, error } = await supabase
          .from('family_trees')
          .insert([{ access_key_id: keyId, name: 'Mi Árbol Familiar' }])
          .select()
          .single();
        
        if (error) throw error;
        setTreeId(data.id);
        sessionStorage.setItem('charlitron_ft_tree', data.id);
        setView('panel');
      } catch (err) {
        console.error('Error creating tree:', err);
      }
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('charlitron_ft_key');
    sessionStorage.removeItem('charlitron_ft_tree');
    setAccessKeyId(null);
    setTreeId(null);
    setView('access');
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-sepia-50">
      <AnimatePresence mode="wait">
        {view === 'access' && (
          <motion.div 
            key="access"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="pt-32 px-6 max-w-7xl mx-auto">
              <button 
                onClick={onBack}
                className="flex items-center gap-2 text-sepia-600 hover:text-sepia-950 transition-colors mb-12 group"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span className="uppercase tracking-widest text-sm font-bold">Volver al Baúl</span>
              </button>
            </div>
            <FamilyTreeAccess onAccess={handleAccess} />
          </motion.div>
        )}

        {view === 'panel' && treeId && (
          <motion.div 
            key="panel"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <FamilyTreePanel 
              treeId={treeId} 
              onBack={handleLogout} 
              onView={() => setView('view')} 
            />
          </motion.div>
        )}

        {view === 'view' && treeId && (
          <motion.div 
            key="view"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <FamilyTreeView 
              treeId={treeId} 
              onBack={() => setView('panel')} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
