/**
 * Workouts 資料 Hook
 * 封裝訓練資料的訂閱與狀態管理，提供響應式資料流
 */

import { useState, useEffect } from 'react';
import { subscribeCompletedWorkouts } from '../services/calendarService';
import { listCalendarWorkouts, listCalendarWorkoutsByDateRange, listTodayWorkouts } from '../services/calendarService';

/**
 * 訂閱已完成的訓練紀錄（實時更新）
 * @returns {Object} { workouts, loading, error }
 */
export const useCompletedWorkouts = () => {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeCompletedWorkouts((data) => {
      setWorkouts(data);
      setLoading(false);
      setError(null);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return { workouts, loading, error };
};

/**
 * 取得所有訓練紀錄（一次性查詢）
 * @returns {Object} { workouts, loading, error, refetch }
 */
export const useAllWorkouts = () => {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWorkouts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listCalendarWorkouts();
      setWorkouts(data);
    } catch (err) {
      setError(err);
      console.error('Error fetching workouts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkouts();
  }, []);

  return { workouts, loading, error, refetch: fetchWorkouts };
};

/**
 * 取得指定日期範圍的訓練紀錄
 * @param {string} startDate - 起始日期 (YYYY-MM-DD)
 * @param {string|null} endDate - 結束日期 (YYYY-MM-DD)，可選
 * @returns {Object} { workouts, loading, error, refetch }
 */
export const useWorkoutsByDateRange = (startDate, endDate = null) => {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWorkouts = async () => {
    if (!startDate) {
      setWorkouts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await listCalendarWorkoutsByDateRange(startDate, endDate);
      setWorkouts(data);
    } catch (err) {
      setError(err);
      console.error('Error fetching workouts by date range:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkouts();
  }, [startDate, endDate]);

  return { workouts, loading, error, refetch: fetchWorkouts };
};

/**
 * 取得今日訓練課表
 * @returns {Object} { workouts, loading, error, refetch }
 */
export const useTodayWorkouts = () => {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTodayWorkouts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listTodayWorkouts();
      setWorkouts(data);
    } catch (err) {
      setError(err);
      console.error('Error fetching today workouts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayWorkouts();
  }, []);

  return { workouts, loading, error, refetch: fetchTodayWorkouts };
};
