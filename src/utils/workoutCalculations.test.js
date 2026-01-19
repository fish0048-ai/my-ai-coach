/**
 * 訓練計算函數單元測試
 * 測試配速、容量、Training Load 等計算邏輯
 */

import { describe, it, expect } from 'vitest';
import { parsePaceToDecimal, calculateVolume, calculateTrainingLoad, calculateTSS } from './workoutCalculations';

describe('parsePaceToDecimal', () => {
  it('應正確解析配速字串 "5\'30""', () => {
    const result = parsePaceToDecimal("5'30\"");
    expect(result).toBe(5.5); // 5 + 30/60 = 5.5
  });

  it('應正確解析配速字串 "4\'15""', () => {
    const result = parsePaceToDecimal("4'15\"");
    expect(result).toBe(4.25); // 4 + 15/60 = 4.25
  });

  it('應處理無效格式（返回 0）', () => {
    expect(parsePaceToDecimal('')).toBe(0);
    expect(parsePaceToDecimal(null)).toBe(0);
    expect(parsePaceToDecimal('invalid')).toBe(0);
    expect(parsePaceToDecimal('5:30')).toBe(0);
  });
});

describe('calculateVolume', () => {
  it('應正確計算單一動作的訓練容量', () => {
    const exercises = [
      { weight: 60, sets: 3, reps: 10 }
    ];
    const result = calculateVolume(exercises);
    expect(result).toBe(1800); // 60 * 3 * 10 = 1800
  });

  it('應正確計算多個動作的總容量', () => {
    const exercises = [
      { weight: 60, sets: 3, reps: 10 },
      { weight: 80, sets: 4, reps: 8 }
    ];
    const result = calculateVolume(exercises);
    expect(result).toBe(4760); // (60*3*10) + (80*4*8) = 1800 + 2560 = 4360
  });

  it('應處理空陣列（返回 0）', () => {
    expect(calculateVolume([])).toBe(0);
  });

  it('應處理非陣列輸入（返回 0）', () => {
    expect(calculateVolume(null)).toBe(0);
    expect(calculateVolume(undefined)).toBe(0);
    expect(calculateVolume('invalid')).toBe(0);
  });

  it('應處理缺失或無效的數值', () => {
    const exercises = [
      { weight: 60, sets: 3, reps: 10 },
      { weight: null, sets: 4, reps: 8 },
      { weight: 80, sets: 'invalid', reps: 8 },
      { weight: 70, sets: 3, reps: undefined }
    ];
    const result = calculateVolume(exercises);
    // 只有第一個動作有效：60 * 3 * 10 = 1800
    expect(result).toBe(1800);
  });

  it('應處理小數重量', () => {
    const exercises = [
      { weight: 62.5, sets: 3, reps: 10 }
    ];
    const result = calculateVolume(exercises);
    expect(result).toBe(1875); // 62.5 * 3 * 10 = 1875
  });
});

describe('calculateTrainingLoad', () => {
  it('應正確計算 Training Load（RPE × 時間）', () => {
    const result = calculateTrainingLoad(7, 60); // RPE 7, 60分鐘
    expect(result).toBe(420); // 7 * 60 = 420
  });

  it('應處理 RPE 邊界值', () => {
    expect(calculateTrainingLoad(1, 30)).toBe(30); // 最小值
    expect(calculateTrainingLoad(10, 30)).toBe(300); // 最大值
  });

  it('應拒絕無效的 RPE 值（返回 0）', () => {
    expect(calculateTrainingLoad(0, 60)).toBe(0);
    expect(calculateTrainingLoad(11, 60)).toBe(0);
    expect(calculateTrainingLoad(-1, 60)).toBe(0);
  });

  it('應拒絕無效的時間值（返回 0）', () => {
    expect(calculateTrainingLoad(7, 0)).toBe(0);
    expect(calculateTrainingLoad(7, -10)).toBe(0);
  });

  it('應處理字串數字輸入', () => {
    const result = calculateTrainingLoad('7', '60');
    expect(result).toBe(420);
  });

  it('應處理小數 RPE 和時間', () => {
    const result = calculateTrainingLoad(7.5, 45.5);
    expect(result).toBe(341); // Math.round(7.5 * 45.5) = Math.round(341.25) = 341
  });

  it('應處理缺失參數（返回 0）', () => {
    expect(calculateTrainingLoad(null, 60)).toBe(0);
    expect(calculateTrainingLoad(7, null)).toBe(0);
    expect(calculateTrainingLoad(undefined, undefined)).toBe(0);
  });
});

describe('calculateTSS', () => {
  it('應正確計算 TSS（基於 RPE 的估算）', () => {
    // TSS = (RPE/10)² × 時間(小時) × 100
    // RPE 7, 60分鐘 = (0.7)² × 1 × 100 = 0.49 × 100 = 49
    const result = calculateTSS(7, 60);
    expect(result).toBe(49);
  });

  it('應正確計算高強度訓練的 TSS', () => {
    // RPE 9, 90分鐘 = (0.9)² × 1.5 × 100 = 0.81 × 150 = 121.5 ≈ 122
    const result = calculateTSS(9, 90);
    expect(result).toBe(122);
  });

  it('應正確計算低強度訓練的 TSS', () => {
    // RPE 3, 30分鐘 = (0.3)² × 0.5 × 100 = 0.09 × 50 = 4.5 ≈ 5
    const result = calculateTSS(3, 30);
    expect(result).toBe(5);
  });

  it('應處理邊界值', () => {
    expect(calculateTSS(1, 60)).toBe(1); // (0.1)² × 1 × 100 = 1
    expect(calculateTSS(10, 60)).toBe(100); // (1.0)² × 1 × 100 = 100
  });

  it('應拒絕無效的 RPE 值（返回 0）', () => {
    expect(calculateTSS(0, 60)).toBe(0);
    expect(calculateTSS(11, 60)).toBe(0);
  });

  it('應拒絕無效的時間值（返回 0）', () => {
    expect(calculateTSS(7, 0)).toBe(0);
    expect(calculateTSS(7, -10)).toBe(0);
  });

  it('應處理字串數字輸入', () => {
    const result = calculateTSS('7', '60');
    expect(result).toBe(49);
  });
});
