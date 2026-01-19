/**
 * 心率計算函數單元測試
 * 測試心率區間、最大心率等計算邏輯
 */

import { describe, it, expect } from 'vitest';
import { calculateHeartRateZones, calculateActiveMaxHR } from './heartRateCalculations';

describe('calculateHeartRateZones', () => {
  it('應正確計算最大心率 200 的區間', () => {
    const zones = calculateHeartRateZones(200);
    expect(zones).toHaveLength(5);
    
    // Z1: 50-60% = 100-120
    expect(zones[0].range).toBe('100 - 120');
    expect(zones[0].label).toContain('Z1');
    
    // Z2: 60-70% = 120-140
    expect(zones[1].range).toBe('120 - 140');
    expect(zones[1].label).toContain('Z2');
    
    // Z3: 70-80% = 140-160
    expect(zones[2].range).toBe('140 - 160');
    expect(zones[2].label).toContain('Z3');
    
    // Z4: 80-90% = 160-180
    expect(zones[3].range).toBe('160 - 180');
    expect(zones[3].label).toContain('Z4');
    
    // Z5: 90-100% = 180-200
    expect(zones[4].range).toBe('180 - 200');
    expect(zones[4].label).toContain('Z5');
  });

  it('應正確計算最大心率 190 的區間', () => {
    const zones = calculateHeartRateZones(190);
    expect(zones).toHaveLength(5);
    
    // Z1: 50-60% = 95-114
    expect(zones[0].range).toBe('95 - 114');
    
    // Z5: 90-100% = 171-190
    expect(zones[4].range).toBe('171 - 190');
  });

  it('應處理無效的最大心率（返回空陣列）', () => {
    expect(calculateHeartRateZones(0)).toEqual([]);
    expect(calculateHeartRateZones(-10)).toEqual([]);
    expect(calculateHeartRateZones(null)).toEqual([]);
    expect(calculateHeartRateZones(undefined)).toEqual([]);
  });

  it('應處理字串數字輸入', () => {
    const zones = calculateHeartRateZones('200');
    expect(zones).toHaveLength(5);
    expect(zones[0].range).toBe('100 - 120');
  });

  it('應包含正確的顏色和背景類別', () => {
    const zones = calculateHeartRateZones(200);
    zones.forEach(zone => {
      expect(zone).toHaveProperty('color');
      expect(zone).toHaveProperty('bg');
      expect(zone).toHaveProperty('label');
      expect(zone).toHaveProperty('range');
    });
  });
});

describe('calculateActiveMaxHR', () => {
  it('應優先使用手動輸入的最大心率', () => {
    const result = calculateActiveMaxHR(195, 30);
    expect(result).toBe(195);
  });

  it('應使用年齡估算最大心率（當手動值無效時）', () => {
    const result = calculateActiveMaxHR(0, 30);
    expect(result).toBe(190); // 220 - 30 = 190
  });

  it('應使用年齡估算最大心率（當手動值為 null 時）', () => {
    const result = calculateActiveMaxHR(null, 25);
    expect(result).toBe(195); // 220 - 25 = 195
  });

  it('應處理兩個參數都無效的情況（返回 0）', () => {
    expect(calculateActiveMaxHR(0, 0)).toBe(0);
    expect(calculateActiveMaxHR(null, null)).toBe(0);
    expect(calculateActiveMaxHR(undefined, undefined)).toBe(0);
    expect(calculateActiveMaxHR(-10, -5)).toBe(0);
  });

  it('應處理字串數字輸入', () => {
    expect(calculateActiveMaxHR('195', '30')).toBe(195);
    expect(calculateActiveMaxHR('0', '30')).toBe(190);
  });

  it('應處理極端年齡值', () => {
    // 極小年齡
    expect(calculateActiveMaxHR(0, 1)).toBe(219); // 220 - 1 = 219
    // 極大年齡
    expect(calculateActiveMaxHR(0, 100)).toBe(120); // 220 - 100 = 120
  });

  it('應拒絕負數手動最大心率', () => {
    const result = calculateActiveMaxHR(-10, 30);
    expect(result).toBe(190); // 應使用年齡估算
  });
});
