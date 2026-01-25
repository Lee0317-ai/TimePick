import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Search, User, LayoutGrid, LayoutList, Menu, Sparkles, FileText, FolderTree as FolderTreeIcon } from 'lucide-react';
import { toast } from 'sonner';
import { ResourceTree } from '@/components/ResourceTree';
import { FolderTree } from '@/components/FolderTree';
import { ResourceList } from '@/components/ResourceList';
import { ModuleDialog } from '@/components/ModuleDialog';
import { FolderDialog } from '@/components/FolderDialog';
import { ResourceDialog } from '@/components/ResourceDialog';
import { WeatherWidget } from '@/components/WeatherWidget';
import { TreeNode, Folder } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { trackEvent } from '@/lib/analytics';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<'collector' | 'searcher'>('collector');
  const [viewMode, setViewMode] = useState<'section' | 'module' | 'folder'>('folder');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [showModuleDialog, setShowModuleDialog] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | undefined>(undefined);
  const [parentFolderId, setParentFolderId] = useState<string | undefined>(undefined);
  const [showResourceDialog, setShowResourceDialog] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showVersionDialog, setShowVersionDialog] = useState(false);

  useEffect(() => {
    document.title = '首页 - 拾光';
    trackEvent('home_page_expose');
    // 检查是否已选择角色
    const checkRole = async () => {
      if (!user) return;

      const savedRole = localStorage.getItem('userRole');
      if (savedRole) {
        setCurrentRole(savedRole as 'collector' | 'searcher');
        return;
      }

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.role) {
        localStorage.setItem('userRole', data.role);
        setCurrentRole(data.role as 'collector' | 'searcher');
      } else {
        navigate('/role-select');
      }
    };

    checkRole();
  }, [user, navigate]);

  // 当切换到文件夹视图且没有选中节点时，自动选中全部资源
  useEffect(() => {
    if (viewMode === 'folder' && !selectedNode) {
      setSelectedNode({ type: 'all', data: { id: 'all', name: '全部资源' } });
    }
  }, [viewMode, selectedNode]);

  const handleRoleChange = async (role: string) => {
    if (!user || (role !== 'collector' && role !== 'searcher')) return;

    const { error } = await supabase
      .from('user_roles')
      .upsert({ user_id: user.id, role }, { onConflict: 'user_id' });

    if (error) {
      toast.error('切换角色失败');
      return;
    }

    localStorage.setItem('userRole', role);
    setCurrentRole(role as 'collector' | 'searcher');
    setRefreshTrigger(prev => prev + 1);
    toast.success(`已切换到${role === 'collector' ? '收集者' : '查询者'}模式`);
  };

  const handleSearch = () => {
    trackEvent('home_search_click');
    if (!searchKeyword.trim()) {
      toast.error('请输入搜索关键词');
      return;
    }
    navigate(`/search?q=${encodeURIComponent(searchKeyword)}`);
  };

  const handleNodeSelect = (node: TreeNode) => {
    setSelectedNode(node);
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleAddFolder = (parentId?: string) => {
    setParentFolderId(parentId);
    setEditingFolder(undefined);
    setShowFolderDialog(true);
  };

  const handleEditFolder = (folder: Folder) => {
    setEditingFolder(folder);
    setParentFolderId(undefined);
    setShowFolderDialog(true);
  };

  const handleFolderDialogClose = () => {
    setShowFolderDialog(false);
    setEditingFolder(undefined);
    setParentFolderId(undefined);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* 顶部导航栏 */}
      <header className="border-b bg-card">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            {isMobile && (
              <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-64">
                  <SheetTitle className="sr-only">导航菜单</SheetTitle>
                  <SheetDescription className="sr-only">选择板块或模块查看资源</SheetDescription>
                  <div className="h-full flex flex-col bg-card">
                    <div className="p-4 border-b flex items-center justify-between">
                      <div className="flex gap-2">
                        <Button
                          variant={viewMode === 'folder' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setViewMode('folder');
                            trackEvent('dimension_switch_click', { mode: 'folder' });
                          }}
                          title="文件夹"
                        >
                          <FolderTreeIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={viewMode === 'section' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setViewMode('section');
                            trackEvent('dimension_switch_click', { mode: 'section' });
                          }}
                          title="板块"
                        >
                          <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={viewMode === 'module' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setViewMode('module');
                            trackEvent('dimension_switch_click', { mode: 'module' });
                          }}
                          title="模块"
                        >
                          <LayoutList className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <ScrollArea className="flex-1">
                      {viewMode === 'folder' ? (
                        <FolderTree
                          onNodeSelect={handleNodeSelect}
                          onAddFolder={handleAddFolder}
                          onEditFolder={handleEditFolder}
                          onAddResource={() => setShowResourceDialog(true)}
                          refreshTrigger={refreshTrigger}
                          isCollector={currentRole === 'collector'}
                          onResourceMove={handleRefresh}
                        />
                      ) : (
                        <ResourceTree
                          viewMode={viewMode as 'section' | 'module'}
                          onNodeSelect={handleNodeSelect}
                          onAddModule={() => setShowModuleDialog(true)}
                          onAddResource={() => setShowResourceDialog(true)}
                          refreshTrigger={refreshTrigger}
                          isCollector={currentRole === 'collector'}
                          onResourceMove={handleRefresh}
                        />
                      )}
                    </ScrollArea>
                  </div>
                </SheetContent>
              </Sheet>
            )}
            <h1 className="text-2xl font-bold">拾光</h1>
            <Tabs value={currentRole} onValueChange={handleRoleChange}>
              <TabsList>
                <TabsTrigger value="collector">收集者</TabsTrigger>
                <TabsTrigger value="searcher">查询者</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
              onClick={() => navigate('/fortune')}
            >
              <Sparkles className="h-4 w-4" />
              <span>算运势</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => setShowVersionDialog(true)}
            >
              <FileText className="h-4 w-4" />
              <span>更新</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/profile')}
            >
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* 天气和时间 */}
        <div className="px-4 pb-3">
          <WeatherWidget />
        </div>
        
        {/* 搜索栏 */}
        <div className="px-4 pb-4 flex gap-2">
          <Input
            placeholder="搜索资源..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch}>
            <Search className="h-4 w-4 mr-2" />
            搜索
          </Button>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧树形菜单 - 桌面端 */}
        {!isMobile && (
          <aside className="w-64 border-r bg-card">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'folder' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setViewMode('folder');
                    trackEvent('dimension_switch_click', { mode: 'folder' });
                  }}
                  title="文件夹"
                >
                  <FolderTreeIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'section' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setViewMode('section');
                    trackEvent('dimension_switch_click', { mode: 'section' });
                  }}
                  title="板块"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'module' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setViewMode('module');
                    trackEvent('dimension_switch_click', { mode: 'module' });
                  }}
                  title="模块"
                >
                  <LayoutList className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[calc(100vh-200px)]">
              {viewMode === 'folder' ? (
                <FolderTree
                  onNodeSelect={handleNodeSelect}
                  onAddFolder={handleAddFolder}
                  onEditFolder={handleEditFolder}
                  onAddResource={() => setShowResourceDialog(true)}
                  refreshTrigger={refreshTrigger}
                  isCollector={currentRole === 'collector'}
                  onResourceMove={handleRefresh}
                />
              ) : (
                <ResourceTree
                  viewMode={viewMode as 'section' | 'module'}
                  onNodeSelect={handleNodeSelect}
                  onAddModule={() => setShowModuleDialog(true)}
                  onAddResource={() => setShowResourceDialog(true)}
                  refreshTrigger={refreshTrigger}
                  isCollector={currentRole === 'collector'}
                  onResourceMove={handleRefresh}
                />
              )}
            </ScrollArea>
          </aside>
        )}

        {/* 中间资源列表 */}
        <main className="flex-1 overflow-hidden">
          <ResourceList
            selectedNode={selectedNode}
            refreshTrigger={refreshTrigger}
            onRefresh={handleRefresh}
            onNodeSelect={handleNodeSelect}
            onEditFolder={handleEditFolder}
          />
        </main>
      </div>

      {/* 悬浮录入按钮 */}
      {currentRole === 'collector' && (
        <>
          <Button
            className="fixed bottom-8 right-8 h-14 w-14 rounded-full shadow-lg"
            size="icon"
            onClick={() => {
              setShowResourceDialog(true);
              trackEvent('home_entry_click');
            }}
          >
            <Plus className="h-6 w-6" />
          </Button>
          
          {/* 新建文件夹按钮（仅在文件夹视图时显示） */}
          {viewMode === 'folder' && (
            <Button
              className="fixed bottom-24 right-8 h-12 w-12 rounded-full shadow-lg"
              size="icon"
              variant="secondary"
              onClick={() => {
                handleAddFolder();
                trackEvent('folder_add_click');
              }}
              title="新建文件夹"
            >
              <FolderTreeIcon className="h-5 w-5" />
            </Button>
          )}
        </>
      )}

      {/* 对话框 */}
      <ModuleDialog
        open={showModuleDialog}
        onOpenChange={setShowModuleDialog}
        onSuccess={handleRefresh}
      />
      <FolderDialog
        open={showFolderDialog}
        onOpenChange={handleFolderDialogClose}
        onSuccess={handleRefresh}
        editFolder={editingFolder}
        parentId={parentFolderId}
      />
      <ResourceDialog
        open={showResourceDialog}
        onOpenChange={setShowResourceDialog}
        onSuccess={handleRefresh}
        initialSectionId={selectedNode?.type === 'section' ? selectedNode.data.id : selectedNode?.section?.id}
        initialModuleId={selectedNode?.type === 'module' ? selectedNode.data.id : undefined}
        initialFolderId={selectedNode?.type === 'folder' ? selectedNode.data.id : undefined}
      />

      {/* 版本更新对话框 */}
      <Dialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>版本更新记录</DialogTitle>
          </DialogHeader>
          <div className="w-full h-[60vh] overflow-hidden rounded border">
            <iframe
              src="https://pcn6dg6krayk.feishu.cn/docx/R6YEdtX8JoImvJxd6kwc1irhn9b?from=from_copylink"
              className="w-full h-full border-0"
              title="版本更新记录"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              loading="lazy"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
