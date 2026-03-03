/**
 * 环境变量加密工具
 * 用于简单加密/解密敏感的环境变量
 */

// 简单的 XOR 加密（用于基础混淆，不是高强度加密）
function xorEncrypt(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
}

function xorDecrypt(encoded: string, key: string): string {
  try {
    const text = atob(encoded);
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch {
    return '';
  }
}

// 生成随机密钥
export function generateKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = '';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

// 加密环境变量值
export function encryptEnvValue(value: string, key: string): string {
  return xorEncrypt(value, key);
}

// 解密环境变量值
export function decryptEnvValue(encrypted: string, key: string): string {
  return xorDecrypt(encrypted, key);
}

// 获取环境变量（支持加密值）
export function getSecureEnv(key: string, encryptedValue?: string, decryptKey?: string): string | undefined {
  // 优先使用明文环境变量（开发环境）
  const plainValue = import.meta.env[key];
  if (plainValue) {
    return plainValue;
  }

  // 解密加密的值（生产环境）
  if (encryptedValue && decryptKey) {
    return decryptEnvValue(encryptedValue, decryptKey);
  }

  return undefined;
}

// 防调试检测
export function detectDevTools(): boolean {
  const threshold = 160;
  let devToolsOpen = false;

  const check = () => {
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;
    devToolsOpen = widthThreshold || heightThreshold;
  };

  check();
  return devToolsOpen;
}

// 初始化安全检测
export function initSecurityMeasures(): void {
  // 禁用右键菜单
  document.addEventListener('contextmenu', (e) => {
    if (process.env.NODE_ENV === 'production') {
      e.preventDefault();
    }
  });

  // 禁用特定快捷键
  document.addEventListener('keydown', (e) => {
    if (process.env.NODE_ENV !== 'production') return;

    // 禁用 F12
    if (e.key === 'F12') {
      e.preventDefault();
    }

    // 禁用 Ctrl+Shift+I/J/C
    if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) {
      e.preventDefault();
    }

    // 禁用 Ctrl+U（查看源码）
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
    }
  });

  // 定期检测开发者工具
  let checkInterval: number;
  if (typeof window !== 'undefined') {
    checkInterval = window.setInterval(() => {
      if (detectDevTools()) {
        console.clear();
        // 可以在这里添加更多反制措施
      }
    }, 1000);
  }

  // 清理函数
  return () => {
    if (checkInterval) {
      clearInterval(checkInterval);
    }
  };
}
