import { useState, useRef, useEffect, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ResizableSidebarProps {
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  children: ReactNode;
  className?: string;
}

export function ResizableSidebar({
  defaultWidth = 280,
  minWidth = 200,
  maxWidth = 500,
  children,
  className
}: ResizableSidebarProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 从 localStorage 恢复侧边栏宽度
    const savedWidth = localStorage.getItem('sidebarWidth');
    if (savedWidth) {
      const parsedWidth = parseInt(savedWidth, 10);
      if (parsedWidth >= minWidth && parsedWidth <= maxWidth) {
        setWidth(parsedWidth);
      }
    }
  }, [minWidth, maxWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setWidth(newWidth);
        localStorage.setItem('sidebarWidth', newWidth.toString());
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth]);

  const handleMouseDown = () => {
    setIsResizing(true);
  };

  return (
    <div
      ref={sidebarRef}
      className={cn('relative border-r bg-card', className)}
      style={{ width: `${width}px`, flexShrink: 0 }}
    >
      {children}
      
      {/* 拖拽手柄 */}
      <div
        className={cn(
          'absolute right-0 top-0 h-full w-1 cursor-col-resize',
          'hover:bg-primary/50 transition-colors',
          'group'
        )}
        onMouseDown={handleMouseDown}
      >
        <div className={cn(
          'absolute right-0 top-1/2 -translate-y-1/2 h-12 w-1.5',
          'bg-primary/20 rounded-full opacity-0 group-hover:opacity-100',
          'transition-opacity',
          isResizing && 'opacity-100 bg-primary'
        )} />
      </div>
    </div>
  );
}
