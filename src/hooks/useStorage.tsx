import { useState, useEffect } from 'react';
import { User, Merchant, Deal } from '@/types';

const USERS_KEY = 'dine_deals_users';
const MERCHANTS_KEY = 'dine_deals_merchants';

export const useStorage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);

  useEffect(() => {
    const storedUsers = localStorage.getItem(USERS_KEY);
    const storedMerchants = localStorage.getItem(MERCHANTS_KEY);
    
    if (storedUsers) {
      try {
        setUsers(JSON.parse(storedUsers));
      } catch (e) {
        console.error('Error parsing users:', e);
      }
    }
    
    if (storedMerchants) {
      try {
        setMerchants(JSON.parse(storedMerchants));
      } catch (e) {
        console.error('Error parsing merchants:', e);
      }
    }
  }, []);

  const saveUsers = (newUsers: User[]) => {
    setUsers(newUsers);
    localStorage.setItem(USERS_KEY, JSON.stringify(newUsers));
  };

  const saveMerchants = (newMerchants: Merchant[]) => {
    setMerchants(newMerchants);
    localStorage.setItem(MERCHANTS_KEY, JSON.stringify(newMerchants));
  };

  const addUser = (user: User) => {
    const newUsers = [...users, user];
    saveUsers(newUsers);
  };

  const addMerchant = (merchant: Merchant) => {
    const newMerchants = [...merchants, merchant];
    saveMerchants(newMerchants);
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    const newUsers = users.map(user => 
      user.id === id ? { ...user, ...updates } : user
    );
    saveUsers(newUsers);
  };

  const updateMerchant = (id: string, updates: Partial<Merchant>) => {
    const newMerchants = merchants.map(merchant => {
      if (merchant.id === id) {
        const updated = { ...merchant, ...updates };
        // Trigger auth state update and event
        const authData = localStorage.getItem('dine_deals_auth');
        if (authData) {
          try {
            const auth = JSON.parse(authData);
            if (auth.merchant && auth.merchant.id === id) {
              auth.merchant = updated;
              localStorage.setItem('dine_deals_auth', JSON.stringify(auth));
              // Dispatch event to notify components
              window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: auth }));
            }
          } catch (e) {
            console.error('Error updating auth merchant:', e);
          }
        }
        return updated;
      }
      return merchant;
    });
    saveMerchants(newMerchants);
  };

  const findUserByEmail = (email: string) => {
    return users.find(user => user.email === email);
  };

  const findMerchantByEmail = (email: string) => {
    return merchants.find(merchant => merchant.email === email);
  };

  const addDealToMerchant = (merchantId: string, deal: Deal) => {
    const newMerchants = merchants.map(merchant => {
      if (merchant.id === merchantId) {
        const updated = {
          ...merchant,
          deals: [...(merchant.deals || []), deal]
        };
        // Update auth state if this is the current merchant
        const authData = localStorage.getItem('dine_deals_auth');
        if (authData) {
          try {
            const auth = JSON.parse(authData);
            if (auth.merchant && auth.merchant.id === merchantId) {
              auth.merchant = updated;
              localStorage.setItem('dine_deals_auth', JSON.stringify(auth));
              // Dispatch event to notify components
              window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: auth }));
            }
          } catch (e) {
            console.error('Error updating auth merchant deals:', e);
          }
        }
        return updated;
      }
      return merchant;
    });
    saveMerchants(newMerchants);
  };

  return {
    users,
    merchants,
    addUser,
    addMerchant,
    updateUser,
    updateMerchant,
    findUserByEmail,
    findMerchantByEmail,
    addDealToMerchant
  };
};