import { useState, useEffect } from 'react';

export type ViewType = 'grid' | 'list' | 'thumbnail';

/**
 * 视图偏好持久化 Hook
 * @param key 存储键名
 * @param defaultValue 默认视图类型
 */
export function useViewPreference(
  key: string,
  defaultValue: ViewType = 'grid'
): [ViewType, (value: ViewType) => void] {
  const storageKey = `viewType_${key}`;

  const [viewType, setViewType] = useState<ViewType>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return (saved as ViewType) || defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, viewType);
    } catch (error) {
      console.error('Failed to save view preference:', error);
    }
  }, [viewType, storageKey]);

  return [viewType, setViewType];
}
