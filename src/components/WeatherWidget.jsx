import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, Wind, MapPin, Thermometer, Loader, Droplets } from 'lucide-react';

export default function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 取得使用者位置
    if (!navigator.geolocation) {
      setError("瀏覽器不支援定位");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchWeatherData(position.coords.latitude, position.coords.longitude);
      },
      (err) => {
        console.error("Location access denied:", err);
        // 如果拒絕定位，預設顯示台北市座標 (25.033, 121.565) 作為範例
        fetchWeatherData(25.033, 121.565, true);
      }
    );
  }, []);

  const fetchWeatherData = async (lat, lon, isDefault = false) => {
    try {
      // 使用 Open-Meteo 免費 API
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`
      );
      const data = await response.json();
      
      setWeather({
        ...data.current_weather,
        isDefault // 標記是否為預設地點
      });
    } catch (err) {
      setError("無法取得天氣資訊");
    } finally {
      setLoading(false);
    }
  };

  // 天氣代碼轉換為圖示與文字
  const getWeatherInfo = (code) => {
    // WMO Weather interpretation codes (WW)
    if (code === 0) return { icon: Sun, text: "晴朗", color: "text-yellow-400" };
    if (code >= 1 && code <= 3) return { icon: Cloud, text: "多雲", color: "text-gray-400" };
    if (code >= 51 && code <= 67) return { icon: CloudRain, text: "下雨", color: "text-blue-400" };
    if (code >= 71 && code <= 77) return { icon: CloudSnow, text: "下雪", color: "text-white" };
    if (code >= 95) return { icon: Wind, text: "雷雨", color: "text-purple-400" };
    return { icon: Cloud, text: "陰天", color: "text-gray-400" };
  };

  // 根據溫度給予運動建議
  const getAdvice = (temp, code) => {
    const isRaining = code >= 51 && code <= 67 || code >= 80;
    
    if (isRaining) return "外面正在下雨，建議進行室內重訓或在跑步機上訓練，注意地面濕滑。";
    if (temp >= 30) return "氣溫較高，戶外運動請注意防曬並頻繁補充水分，預防熱衰竭。";
    if (temp >= 25) return "天氣溫暖，是流汗的好時機，別忘了帶毛巾與水壺！";
    if (temp <= 12) return "氣溫寒冷，請務必延長熱身時間至 15-20 分鐘，避免肌肉拉傷。";
    if (temp <= 18) return "天氣涼爽，非常適合長距離跑步 (LSD) 或高強度間歇訓練。";
    return "天氣舒適，保持規律訓練，享受運動的樂趣吧！";
  };

  if (loading) {
    return (
      <div className="card-base p-4 flex items-center justify-center h-24">
        <Loader className="animate-spin text-primary-500" />
        <span className="ml-2 text-gray-400 text-sm">正在載入氣象資訊...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-base p-4 flex items-center text-gray-400 text-sm">
        <MapPin className="mr-2 text-red-400" size={18} />
        {error} (請允許定位權限以獲取當地天氣)
      </div>
    );
  }

  const { temperature, weathercode } = weather;
  const { icon: WeatherIcon, text, color } = getWeatherInfo(weathercode);
  const advice = getAdvice(temperature, weathercode);

  return (
    <div className="card-base bg-gradient-to-r from-primary-800/40 to-surface-800 rounded-card p-5 border-primary-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in">
      
      {/* 左側：溫度與狀態 */}
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-full bg-gray-800 border border-gray-700 shadow-lg ${color}`}>
          <WeatherIcon size={32} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold text-white font-mono">{temperature}°C</h2>
            <span className="text-sm text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full border border-gray-700 flex items-center gap-1">
              {weather.isDefault && <MapPin size={10} />}
              {text}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
            <MapPin size={12} />
            {weather.isDefault ? "預設地區 (台北)" : "目前位置"}
          </div>
        </div>
      </div>

      {/* 右側：AI 建議 */}
      <div className="flex-1 bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
        <div className="flex items-start gap-2">
          <Droplets className="text-primary-400 mt-0.5 flex-shrink-0" size={16} />
          <div>
            <h4 className="text-primary-400 font-bold text-xs uppercase mb-1">今日運動提醒</h4>
            <p className="text-gray-300 text-sm leading-relaxed">
              {advice}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}