import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, ChevronDown, Globe, FileText, Image, Video, FolderPlus, FilePlus, Trash2, Layers } from 'lucide-react';
import { Section, Module, TreeNode } from '@/types';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface ResourceTreeProps {
  viewMode: 'section' | 'module';
  onNodeSelect: (node: TreeNode) => void;
  onAddModule: () => void;
  onAddResource: () => void;
  refreshTrigger: number;
  isCollector?: boolean;
  onResourceMove?: () => void;
}

export function ResourceTree({ viewMode, onNodeSelect, onAddModule, onAddResource, refreshTrigger, isCollector = true, onResourceMove }: ResourceTreeProps) {
  const { user } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [moduleToDelete, setModuleToDelete] = useState<Module | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const loadModules = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('modules')
      .select(`
        *,
        module_sections(section_id)
      `)
      .eq('user_id', user.id)
      .order('sort_order');

    if (data) {
      setModules(data as Module[]);
    }
  }, [user]);

  const handleDeleteModule = async () => {
    if (!moduleToDelete) return;

    const { error } = await supabase
      .from('modules')
      .delete()
      .eq('id', moduleToDelete.id);

    if (error) {
      toast.error('删除模块失败');
    } else {
      toast.success('模块已删除');
      loadModules();
    }

    setShowDeleteDialog(false);
    setModuleToDelete(null);
  };

  const confirmDeleteModule = (module: Module) => {
    setModuleToDelete(module);
    setShowDeleteDialog(true);
  };

  useEffect(() => {
    loadSections();
    loadModules();
  }, [user, refreshTrigger, loadModules]);

  const loadSections = async () => {
    const { data } = await supabase
      .from('sections')
      .select('*')
      .order('sort_order');

    if (data) {
      setSections(data as Section[]);
      // 默认展开所有板块
      setExpandedNodes(new Set(data.map(s => s.id)));
    }
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'webpage':
        return <Globe className="h-4 w-4" />;
      case 'document':
        return <FileText className="h-4 w-4" />;
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-accent/50');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-accent/50');
  };

  const handleDrop = async (e: React.DragEvent, targetModuleId: string, targetSectionId?: string) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-accent/50');
    
    const resourceId = e.dataTransfer.getData('resourceId');
    if (!resourceId) return;

    try {
      const updateData: { module_id: string; section_id?: string } = { module_id: targetModuleId };
      if (targetSectionId) {
        updateData.section_id = targetSectionId;
      }

      const { error } = await supabase
        .from('resources')
        .update(updateData)
        .eq('id', resourceId);

      if (error) throw error;
      
      toast.success('资源移动成功');
      onResourceMove?.();
    } catch (error) {
      toast.error('移动失败');
    }
  };



  const renderSectionView = () => {
    return sections.map(section => {
      const isExpanded = expandedNodes.has(section.id);
      const sectionModules = modules.filter(m =>
        m.module_sections?.some((ms) => ms.section_id === section.id)
      );

      return (
        <div key={section.id}>
          {isCollector ? (
            <ContextMenu>
              <ContextMenuTrigger>
                <div
                  className="flex items-center gap-2 px-3 py-2 hover:bg-accent rounded-md cursor-pointer"
                  onClick={() => {
                    toggleNode(section.id);
                    onNodeSelect({ type: 'section', data: section });
                  }}
                >
                  <button onClick={(e) => {
                    e.stopPropagation();
                    toggleNode(section.id);
                  }}>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  {getSectionIcon(section.type)}
                  <span className="flex-1">{section.name}</span>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => {
                  onNodeSelect({ type: 'section', data: section });
                  onAddModule();
                }}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  新增模块
                </ContextMenuItem>
                <ContextMenuItem onClick={() => {
                  onNodeSelect({ type: 'section', data: section });
                  onAddResource();
                }}>
                  <FilePlus className="h-4 w-4 mr-2" />
                  新增资料
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ) : (
            <div
              className="flex items-center gap-2 px-3 py-2 hover:bg-accent rounded-md cursor-pointer"
              onClick={() => {
                toggleNode(section.id);
                onNodeSelect({ type: 'section', data: section });
              }}
            >
              <button onClick={(e) => {
                e.stopPropagation();
                toggleNode(section.id);
              }}>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              {getSectionIcon(section.type)}
              <span className="flex-1">{section.name}</span>
            </div>
          )}

          {isExpanded && sectionModules.length > 0 && (
            <div className="ml-6 mt-1 space-y-1">
              {sectionModules.map(module => (
                isCollector ? (
                  <ContextMenu key={module.id}>
                    <ContextMenuTrigger>
                      <div
                        className="flex items-center gap-2 px-3 py-2 hover:bg-accent rounded-md cursor-pointer text-sm transition-colors"
                        onClick={() => onNodeSelect({ type: 'module', data: module, section })}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, module.id, section.id)}
                      >
                        <span>{module.name}</span>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => {
                        onNodeSelect({ type: 'module', data: module, section });
                        onAddResource();
                      }}>
                        <FilePlus className="h-4 w-4 mr-2" />
                        新增资料
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => confirmDeleteModule(module)} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        删除模块
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ) : (
                  <div
                    key={module.id}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-accent rounded-md cursor-pointer text-sm transition-colors"
                    onClick={() => onNodeSelect({ type: 'module', data: module, section })}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, module.id, section.id)}
                  >
                    <span>{module.name}</span>
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  const renderModuleView = () => {
    return modules.map(module => {
      const isExpanded = expandedNodes.has(module.id);
      const moduleSections = sections.filter(s =>
        module.module_sections?.some((ms) => ms.section_id === s.id)
      );

      return (
        <div key={module.id}>
          {isCollector ? (
            <ContextMenu>
              <ContextMenuTrigger>
                <div
                  className="flex items-center gap-2 px-3 py-2 hover:bg-accent rounded-md cursor-pointer transition-colors"
                  onClick={() => {
                    toggleNode(module.id);
                    onNodeSelect({ type: 'module', data: module });
                  }}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, module.id)}
                >
                  <button onClick={(e) => {
                    e.stopPropagation();
                    toggleNode(module.id);
                  }}>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  <span className="flex-1">{module.name}</span>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => {
                  onNodeSelect({ type: 'module', data: module });
                  onAddResource();
                }}>
                  <FilePlus className="h-4 w-4 mr-2" />
                  新增资料
                </ContextMenuItem>
                <ContextMenuItem onClick={() => confirmDeleteModule(module)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除模块
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ) : (
            <div
              className="flex items-center gap-2 px-3 py-2 hover:bg-accent rounded-md cursor-pointer transition-colors"
              onClick={() => {
                toggleNode(module.id);
                onNodeSelect({ type: 'module', data: module });
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, module.id)}
            >
              <button onClick={(e) => {
                e.stopPropagation();
                toggleNode(module.id);
              }}>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              <span className="flex-1">{module.name}</span>
            </div>
          )}

          {isExpanded && moduleSections.length > 0 && (
            <div className="ml-6 mt-1 space-y-1">
              {moduleSections.map(section => (
                <div
                  key={section.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-accent rounded-md cursor-pointer text-sm"
                  onClick={() => onNodeSelect({ type: 'section', data: section, module })}
                >
                  {getSectionIcon(section.type)}
                  <span>{section.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <>
      <div className="p-2 space-y-1">
        <div
          className="flex items-center gap-2 px-3 py-2 hover:bg-accent rounded-md cursor-pointer mb-2"
          onClick={() => onNodeSelect({ type: 'all', data: { id: 'all', name: '全部资源' } })}
        >
          <Layers className="h-4 w-4" />
          <span className="font-medium">全部资源</span>
        </div>
        {viewMode === 'section' ? renderSectionView() : renderModuleView()}
      </div>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除模块</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除模块 "{moduleToDelete?.name}" 吗？此操作无法撤销。
              该模块下的资源将不再关联到此模块。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteModule} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
