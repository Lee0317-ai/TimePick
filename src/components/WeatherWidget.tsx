import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Cloud, CloudRain, CloudSnow, Sun, CloudDrizzle, Wind, Loader2 } from 'lucide-react';

interface WeatherData {
  temperature: number;
  condition: string;
  location: string;
  icon: string;
}

export function WeatherWidget() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  // 更新时间（每秒）
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 获取天气
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // 获取用户位置
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });

        const { latitude, longitude } = position.coords;

        // 使用免费天气 API（wttr.in - 无需 API key）
        const response = await fetch(
          `https://wttr.in/${latitude},${longitude}?format=j1`
        );
        
        const data = await response.json();
        const current = data.current_condition[0];
        const area = data.nearest_area[0];

        setWeather({
          temperature: parseInt(current.temp_C),
          condition: getChineseWeatherDesc(current.weatherDesc[0].value),
          location: area.areaName[0].value || area.region[0].value,
          icon: current.weatherCode
        });
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch weather:', error);
        // 使用默认值
        setWeather({
          temperature: 20,
          condition: '晴朗',
          location: '当前位置',
          icon: '113'
        });
        setLoading(false);
      }
    };

    fetchWeather();
    // 每30分钟更新一次天气
    const weatherTimer = setInterval(fetchWeather, 30 * 60 * 1000);

    return () => clearInterval(weatherTimer);
  }, []);

  // 天气状况翻译
  const getChineseWeatherDesc = (desc: string): string => {
    const descMap: Record<string, string> = {
      'Clear': '晴朗',
      'Sunny': '晴天',
      'Partly cloudy': '多云',
      'Cloudy': '阴天',
      'Overcast': '阴沉',
      'Mist': '薄雾',
      'Fog': '雾',
      'Light rain': '小雨',
      'Moderate rain': '中雨',
      'Heavy rain': '大雨',
      'Light snow': '小雪',
      'Moderate snow': '中雪',
      'Heavy snow': '大雪',
      'Thunderstorm': '雷雨',
    };
    
    for (const [key, value] of Object.entries(descMap)) {
      if (desc.includes(key)) return value;
    }
    return desc;
  };

  // 根据天气代码返回图标
  const getWeatherIcon = (code: string) => {
    const codeNum = parseInt(code);
    
    if (codeNum === 113) return <Sun className="h-5 w-5 text-yellow-500" />;
    if ([116, 119, 122].includes(codeNum)) return <Cloud className="h-5 w-5 text-gray-500" />;
    if ([176, 263, 266, 293, 296].includes(codeNum)) return <CloudDrizzle className="h-5 w-5 text-blue-400" />;
    if ([299, 302, 305, 308, 311, 314, 317, 320, 323, 326, 329].includes(codeNum)) return <CloudRain className="h-5 w-5 text-blue-600" />;
    if ([179, 182, 185, 227, 230, 281, 284, 332, 335, 338, 350, 353, 356, 359, 362, 365, 368, 371, 374, 377, 392, 395].includes(codeNum)) return <CloudSnow className="h-5 w-5 text-blue-300" />;
    
    return <Wind className="h-5 w-5 text-gray-400" />;
  };

  // 格式化时间
  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  // 格式化日期
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdays[date.getDay()];
    return `${year}年${month}月${day}日 ${weekday}`;
  };

  if (loading) {
    return (
      <Card className="px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>加载天气中...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-none shadow-sm">
      <div className="flex items-center justify-between">
        {/* 左侧：时间 */}
        <div className="flex flex-col">
          <div className="text-2xl font-bold text-foreground">
            {formatTime(currentTime)}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {formatDate(currentTime)}
          </div>
        </div>

        {/* 右侧：天气 */}
        {weather && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm text-muted-foreground">{weather.location}</div>
              <div className="flex items-center gap-1 justify-end mt-0.5">
                <span className="text-sm text-muted-foreground">{weather.condition}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getWeatherIcon(weather.icon)}
              <span className="text-2xl font-semibold text-foreground">
                {weather.temperature}°C
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
