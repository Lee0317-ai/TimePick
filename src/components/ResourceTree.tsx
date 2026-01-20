import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, ChevronDown, Globe, FileText, Image, Video, FolderPlus, FilePlus } from 'lucide-react';
import { Section, Module, TreeNode } from '@/types';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface ResourceTreeProps {
  viewMode: 'section' | 'module';
  onNodeSelect: (node: TreeNode) => void;
  onAddModule: () => void;
  onAddResource: () => void;
  refreshTrigger: number;
  isCollector?: boolean;
}

export function ResourceTree({ viewMode, onNodeSelect, onAddModule, onAddResource, refreshTrigger, isCollector = true }: ResourceTreeProps) {
  const { user } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

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
                <ContextMenuItem onClick={onAddModule}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  新增模块
                </ContextMenuItem>
                <ContextMenuItem onClick={onAddResource}>
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
                <div
                  key={module.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-accent rounded-md cursor-pointer text-sm"
                  onClick={() => onNodeSelect({ type: 'module', data: module, section })}
                >
                  <span>{module.name}</span>
                </div>
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
          <div
            className="flex items-center gap-2 px-3 py-2 hover:bg-accent rounded-md cursor-pointer"
            onClick={() => {
              toggleNode(module.id);
              onNodeSelect({ type: 'module', data: module });
            }}
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
    <div className="p-2 space-y-1">
      {viewMode === 'section' ? renderSectionView() : renderModuleView()}
    </div>
  );
}
