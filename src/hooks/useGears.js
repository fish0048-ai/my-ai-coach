/**
 * Gears 資料 Hook
 * 封裝裝備管理的訂閱與狀態管理
 * 
 * 已改為透過 API 層 (`api/gears.js`) 訂閱裝備資料。
 */

import { useState, useEffect } from 'react';
import { subscribeGearsStream } from '../api/gears';

/**
 * 訂閱裝備清單（實時更新）
 * @returns {Object} { gears, loading, error }
 */
export const useGears = () => {
  const [gears, setGears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeGearsStream((gearData) => {
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
