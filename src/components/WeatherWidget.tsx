import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Cloud, CloudRain, CloudSnow, Sun, CloudDrizzle, Wind, Loader2, RefreshCw, MapPin } from 'lucide-react';
import { toast } from 'sonner';

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
  const [refreshing, setRefreshing] = useState(false);
  const [customCity, setCustomCity] = useState('');
  const [savedCity, setSavedCity] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);

  // 更新时间（每秒）
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 从 localStorage 读取保存的城市
  useEffect(() => {
    const saved = localStorage.getItem('weatherCity');
    if (saved) {
      setSavedCity(saved);
    } else {
      // 如果没有保存的城市，使用默认城市（北京）
      setSavedCity('北京');
    }
  }, []);

  // 获取天气
  const fetchWeather = useCallback(async (cityName?: string) => {
    try {
      setRefreshing(true);
      let location = '';

      if (cityName) {
        // 使用自定义城市
        location = cityName;
      } else if (savedCity) {
        // 使用保存的城市
        location = savedCity;
      } else {
        // 默认使用北京
        location = '北京';
      }

      console.log('Fetching weather for:', location);

      // 使用 wttr.in API
      const response = await fetch(
        `https://wttr.in/${encodeURIComponent(location)}?format=j1&lang=zh`
      );
        
      if (!response.ok) {
        throw new Error('天气服务请求失败');
      }

      const data = await response.json();
      const current = data.current_condition[0];
      const area = data.nearest_area[0];

      // 获取中文城市名
      let cityDisplayName = '';
      if (cityName) {
        cityDisplayName = cityName;
      } else if (area.areaName && area.areaName[0]) {
        // 优先使用中文名称
        if (area.region && area.region[0] && area.region[0].value) {
          cityDisplayName = area.region[0].value;
        } else {
          cityDisplayName = area.areaName[0].value;
        }
      } else {
        cityDisplayName = location;
      }

      setWeather({
        temperature: parseInt(current.temp_C),
        condition: getChineseWeatherDesc(current.weatherDesc[0].value),
        location: cityDisplayName,
        icon: current.weatherCode
      });
      setLoading(false);
    } catch (error) {
      // 静默失败，不显示错误提示
      console.warn('Weather fetch failed:', error);
      
      // 使用默认值
      if (!weather) {
        setWeather({
          temperature: 20,
          condition: '晴朗',
          location: savedCity || '北京',
          icon: '113'
        });
      }
      setLoading(false);
    } finally {
      // 确保无论成功或失败，都停止刷新动画
      setRefreshing(false);
    }
  }, [savedCity, weather]);

    useEffect(() => {
      fetchWeather();
      // 每30分钟更新一次天气
      const weatherTimer = setInterval(() => fetchWeather(), 30 * 60 * 1000);

      return () => clearInterval(weatherTimer);
    }, [savedCity, fetchWeather]);

    // 手动刷新
    const handleRefresh = () => {
      fetchWeather();
    };

    // 保存自定义城市
    const handleSaveCity = () => {
      if (!customCity.trim()) {
        toast.error('请输入城市名称');
        return;
      }

      localStorage.setItem('weatherCity', customCity.trim());
      setSavedCity(customCity.trim());
      fetchWeather(customCity.trim());
      setDialogOpen(false);
      setCustomCity('');
      toast.success(`已切换到 ${customCity.trim()}`);
    };

    // 使用当前位置（尝试获取地理位置）
    const handleUseLocation = async () => {
      try {
        // 尝试获取地理位置
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000
          });
        });

        const { latitude, longitude } = position.coords;
        const location = `${latitude},${longitude}`;
        
        localStorage.removeItem('weatherCity');
        setSavedCity('');
        fetchWeather(location);
        setDialogOpen(false);
        toast.success('已切换到当前位置');
      } catch (error) {
        console.error('Geolocation failed:', error);
        toast.error('无法获取当前位置，请手动输入城市名称');
      }
    };

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
        'Patchy rain possible': '可能有雨',
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

          {/* 右侧：天气和操作按钮 */}
          <div className="flex items-center gap-2">
            {weather && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-foreground">{weather.location}</div>
                  <div className="flex items-center gap-1 justify-end mt-0.5">
                    <span className="text-xs text-muted-foreground">{weather.condition}</span>
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
            
            {/* 操作按钮 */}
            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MapPin className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>设置城市</DialogTitle>
                    <DialogDescription>
                      输入城市名称查看天气（支持中文、拼音或英文）
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Input
                        placeholder="例如：上海、广州、深圳"
                        value={customCity}
                        onChange={(e) => setCustomCity(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveCity()}
                      />
                      {savedCity && (
                        <p className="text-sm text-muted-foreground">
                          当前：{savedCity}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveCity} className="flex-1">
                        保存城市
                      </Button>
                      <Button onClick={handleUseLocation} variant="outline" className="flex-1">
                        使用当前位置
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </Card>
    );
  }

