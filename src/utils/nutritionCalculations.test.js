/**
 * 營養計算函數單元測試
 * 測試 BMR、TDEE、目標卡路里等計算邏輯
 */

import { describe, it, expect } from 'vitest';
import { calculateBMR, calculateTDEE, getTargetCalories } from './nutritionCalculations';

describe('calculateBMR', () => {
  it('應正確計算 70kg 175cm 30歲 男性 BMR', () => {
    const result = calculateBMR(70, 175, 30, 'male');
    // BMR = (10 * 70) + (6.25 * 175) - (5 * 30) + 5 = 700 + 1093.75 - 150 + 5 = 1648.75
    expect(result).toBeCloseTo(1648.75, 1);
  });

  it('應正確計算 60kg 165cm 25歲 女性 BMR', () => {
    const result = calculateBMR(60, 165, 25, 'female');
    // BMR = (10 * 60) + (6.25 * 165) - (5 * 25) - 161 = 600 + 1031.25 - 125 - 161 = 1345.25
    expect(result).toBeCloseTo(1345.25, 1);
  });

  it('應處理缺失參數（返回 0）', () => {
    expect(calculateBMR(0, 175, 30, 'male')).toBe(0);
    expect(calculateBMR(70, 0, 30, 'male')).toBe(0);
    expect(calculateBMR(70, 175, 0, 'male')).toBe(0);
    expect(calculateBMR(null, 175, 30, 'male')).toBe(0);
    expect(calculateBMR(70, undefined, 30, 'male')).toBe(0);
  });

  it('應處理字串數字輸入', () => {
    const result = calculateBMR('70', '175', '30', 'male');
    expect(result).toBeCloseTo(1648.75, 1);
  });

  it('應處理極端值', () => {
    // 極小值
    expect(calculateBMR(1, 50, 1, 'male')).toBeGreaterThan(0);
    // 極大值
    expect(calculateBMR(200, 250, 100, 'male')).toBeGreaterThan(0);
  });
});

describe('calculateTDEE', () => {
  it('應正確計算高活動量 TDEE（使用計算的 BMR）', () => {
    const bmr = calculateBMR(70, 175, 30, 'male');
    const tdee = calculateTDEE({
      weight: 70,
      height: 175,
      age: 30,
      gender: 'male',
      activity: 1.725 // 高活動量
    });
    expect(tdee).toBeCloseTo(bmr * 1.725, 0);
  });

  it('應優先使用手動輸入的 BMR', () => {
    const manualBmr = 1700;
    const tdee = calculateTDEE({
      weight: 70,
      height: 175,
      age: 30,
      gender: 'male',
      activity: 1.5,
      manualBmr: manualBmr
    });
    expect(tdee).toBe(2550); // 1700 * 1.5 = 2550
  });

  it('應處理缺失活動係數（返回 0）', () => {
    expect(calculateTDEE({
      weight: 70,
      height: 175,
      age: 30,
      gender: 'male',
      activity: 0
    })).toBe(0);

    expect(calculateTDEE({
      weight: 70,
      height: 175,
      age: 30,
      gender: 'male',
      activity: null
    })).toBe(0);
  });

  it('應處理不同活動係數', () => {
    const bmr = calculateBMR(70, 175, 30, 'male');
    
    const sedentary = calculateTDEE({ weight: 70, height: 175, age: 30, gender: 'male', activity: 1.2 });
    const moderate = calculateTDEE({ weight: 70, height: 175, age: 30, gender: 'male', activity: 1.55 });
    const veryActive = calculateTDEE({ weight: 70, height: 175, age: 30, gender: 'male', activity: 1.725 });

    expect(sedentary).toBeLessThan(moderate);
    expect(moderate).toBeLessThan(veryActive);
    expect(sedentary).toBeCloseTo(bmr * 1.2, 0);
    expect(veryActive).toBeCloseTo(bmr * 1.725, 0);
  });
});

describe('getTargetCalories', () => {
  it('應正確計算增肌目標卡路里（TDEE + 300）', () => {
    const tdee = 2000;
    const result = getTargetCalories(tdee, '增肌');
    expect(result).toBe(2300);
  });

  it('應正確計算減脂目標卡路里（TDEE - 400）', () => {
    const tdee = 2000;
    const result = getTargetCalories(tdee, '減脂');
    expect(result).toBe(1600);
  });

  it('應正確計算維持目標卡路里（等於 TDEE）', () => {
    const tdee = 2000;
    const result = getTargetCalories(tdee, '維持');
    expect(result).toBe(2000);
  });

  it('應處理未知目標（返回 TDEE）', () => {
    const tdee = 2000;
    expect(getTargetCalories(tdee, '未知目標')).toBe(2000);
    expect(getTargetCalories(tdee, null)).toBe(2000);
    expect(getTargetCalories(tdee, undefined)).toBe(2000);
  });

  it('應處理缺失 TDEE（返回 0）', () => {
    expect(getTargetCalories(0, '增肌')).toBe(0);
    expect(getTargetCalories(null, '減脂')).toBe(0);
    expect(getTargetCalories(undefined, '維持')).toBe(0);
  });
});
