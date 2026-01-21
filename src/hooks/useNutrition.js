/**
 * Nutrition 資料 Hook
 * 封裝營養紀錄的訂閱、summary 計算與狀態管理
 */

import { useState, useEffect } from 'react';
import { subscribeFoodLogsByDate } from '../services/nutritionService';
import { formatDate } from '../utils/date';

/**
 * 訂閱指定日期的營養紀錄（實時更新）
 * @param {string|Date} date - 日期（YYYY-MM-DD 或 Date 物件）
 * @returns {Object} { logs, summary, loading, error }
 */
export const useNutrition = (date = null) => {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({ cal: 0, protein: 0, carbs: 0, fat: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const targetDate = date
      ? typeof date === 'string'
        ? date
        : formatDate(date)
      : formatDate(new Date());

    const unsubscribe = subscribeFoodLogsByDate(
      targetDate,
      (data) => {
        // 按建立時間排序（最新的在前）
        const sorted = data.sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
        );
        setLogs(sorted);

        // 計算總和
        const sum = sorted.reduce(
          (acc, curr) => ({
            cal: acc.cal + (parseFloat(curr.calories) || 0),
            protein: acc.protein + (parseFloat(curr.protein) || 0),
            carbs: acc.carbs + (parseFloat(curr.carbs) || 0),
            fat: acc.fat + (parseFloat(curr.fat) || 0),
          }),
          { cal: 0, protein: 0, carbs: 0, fat: 0 },
        );
        setSummary(sum);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Firestore read error:', err);
        setError(err);
        setLoading(false);
      },
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [date]);

  return { logs, summary, loading, error };
};
