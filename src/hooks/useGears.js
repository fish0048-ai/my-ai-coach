/**
 * Gears 資料 Hook
 * 封裝裝備管理的訂閱與狀態管理
 */

import { useState, useEffect } from 'react';
import { subscribeGears } from '../services/calendarService';

/**
 * 訂閱裝備清單（實時更新）
 * @returns {Object} { gears, loading, error }
 */
export const useGears = () => {
  const [gears, setGears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeGears((gearData) => {
      setGears(gearData);
      setLoading(false);
      setError(null);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return { gears, loading, error };
};
