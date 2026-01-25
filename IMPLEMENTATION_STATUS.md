# 拾光 2.1 功能优化实施状态

## ✅ 已完成的工作

### 阶段1：基础架构调整 (100%)

1. **数据库迁移** ✅
   - `inspirations` 表添加字段：
     - `status`: 'active' | 'converted' | 'archived'
     - `converted_to_resource_id`: 关联转换后的资源
   - `resources` 表添加字段：
     - `source_inspiration_id`: 记录灵感来源
   - 创建 `tag_groups` 表用于标签分组
   - 添加数据库函数：
     - `get_user_tag_stats()`: 获取标签统计
     - `get_folder_resource_count()`: 递归计算文件夹资源数
     - `rename_tag()`: 批量重命名标签
     - `delete_tag()`: 批量删除标签

2. **类型定义更新** ✅
   - 添加 `ViewType = 'grid' | 'list' | 'thumbnail'`
   - 更新 `Inspiration` 接口（添加 status 字段）
   - 更新 `Resource` 接口（添加 source_inspiration_id）
   - 添加 `TagGroup`, `TagStat`, `ResourceInitData` 接口
   - 更新 `TreeNode` 类型支持 'tags' 维度

3. **自定义 Hooks** ✅
   - 创建 `useViewPreference` Hook 用于视图偏好持久化

### 阶段2：新组件创建 (100%)

4. **TagTree.tsx** ✅
   - 标签树组件，按使用频率分组
   - 支持多选标签
   - 显示标签使用次数
   - 集成标签管理功能

5. **TagManageDialog.tsx** ✅
   - 标签管理对话框
   - 支持重命名标签（批量更新所有资源）
   - 支持删除标签（批量从资源中移除）
   - 显示每个标签的使用次数

6. **RecentInspirations.tsx** ✅
   - 最近灵感预览组件
   - 显示最近3条活跃灵感
   - 支持快速转换为资源

### 阶段3：现有代码优化 (70%)

7. **Home.tsx 部分优化** ✅
   - 添加 TagTree 和 ResourceInitData 导入
   - 添加 `resourceInitData` 状态
   - viewMode 支持 'tags' 类型
   - 隐藏角色切换UI（保留代码）
   - 更新移动端底部导航布局：[分类][灵感][+][搜索][我的]
   - 修改角色检查逻辑（默认 collector，跳过角色选择）

## 🔧 需要继续完成的工作

### Home.tsx 剩余修改

1. **添加标签维度按钮到侧边栏** (未完成)
   ```typescript
   // 在侧边栏按钮组中添加：
   <Button
     variant={viewMode === 'tags' ? 'default' : 'outline'}
     size="sm"
     onClick={() => setViewMode('tags')}
     title="标签"
   >
     <Tag className="h-4 w-4" />
   </Button>
   ```

2. **渲染 TagTree 组件** (未完成)
   ```typescript
   // 在 ScrollArea 中添加条件渲染：
   {viewMode === 'tags' && (
     <TagTree
       selectedTags={selectedTags}
       onTagSelect={setSelectedTags}
       onNodeSelect={handleNodeSelect}
     />
   )}
   ```

3. **灵感转资源功能集成** (未完成)
   ```typescript
   // 添加处理函数：
   const handleConvertToResource = (data: ResourceInitData) => {
     setResourceInitData(data);
     setShowResourceDialog(true);
     setShowInspirationDrawer(false);
   };
   
   // 传递给 InspirationDrawer：
   <InspirationDrawer
     open={showInspirationDrawer}
     onOpenChange={setShowInspirationDrawer}
     onConvertToResource={handleConvertToResource}
   />
   ```

4. **移动端侧边栏添加标签入口** (未完成)
   ```typescript
   // 在移动端 Sheet 侧边栏顶部添加：
   <div className="p-4 border-b space-y-2">
     <Button
       variant="outline"
       className="w-full justify-start"
       onClick={() => {
         setShowTagCloud(true);
         setIsSidebarOpen(false);
       }}
     >
       <Tag className="h-4 w-4 mr-2" />
       标签管理
     </Button>
   </div>
   ```

### ResourceDialog.tsx 修改

5. **支持从 ResourceInitData 初始化** (未完成)
   ```typescript
   // 修改 props 接口：
   interface ResourceDialogProps {
     open: boolean;
     onOpenChange: (open: boolean) => void;
     onSuccess?: () => void;
     initialData?: ResourceInitData; // 新增
   }
   
   // 在 useEffect 中处理：
   useEffect(() => {
     if (open && initialData) {
       setName(initialData.name);
       setNotes(initialData.notes || '');
       // ... 其他字段
     }
   }, [open, initialData]);
   
   // 保存时关联灵感：
   if (initialData?.inspirationId) {
     resourceData.source_inspiration_id = initialData.inspirationId;
     
     // 标记灵感为已转换
     await supabase
       .from('inspirations')
       .update({ 
         status: 'converted',
         converted_to_resource_id: newResource.id
       })
       .eq('id', initialData.inspirationId);
   }
   ```

### InspirationDrawer.tsx 修改

6. **添加灵感转资源功能** (未完成)
   ```typescript
   // 添加 props：
   interface InspirationDrawerProps {
     open: boolean;
     onOpenChange: (open: boolean) => void;
     onConvertToResource?: (data: ResourceInitData) => void;
   }
   
   // 添加状态过滤：
   const [showConverted, setShowConverted] = useState(false);
   
   // 添加转换按钮：
   {inspiration.status === 'active' && (
     <Button
       size="sm"
       variant="outline"
       onClick={() => handleConvertToResource(inspiration)}
     >
       <FileText className="h-3 w-3 mr-1" />
       转为资源
     </Button>
   )}
   
   // 显示已转换状态：
   {inspiration.status === 'converted' && (
     <Badge variant="secondary">✓ 已转换</Badge>
   )}
   ```

### ResourceList.tsx 修改

7. **添加视图切换功能** (未完成)
   ```typescript
   import { useViewPreference, ViewType } from '@/hooks/useViewPreference';
   import { LayoutGrid, List, Image } from 'lucide-react';
   
   const [resourceViewType, setResourceViewType] = useViewPreference('resources', 'grid');
   const [folderViewType, setFolderViewType] = useViewPreference('folders', 'grid');
   
   // 添加视图切换器UI（见详细代码方案）
   // 根据viewType调整grid布局
   ```

8. **集成最近灵感组件** (未完成)
   ```typescript
   import { RecentInspirations } from './RecentInspirations';
   
   // 在资源列表顶部添加：
   {!isMobile && (
     <RecentInspirations
       onConvertToResource={(data) => {
         // 传递给父组件
       }}
       onViewAll={() => {
         // 打开灵感抽屉
       }}
     />
   )}
   ```

### SubFolderCard.tsx 修改

9. **移动端紧凑布局** (未完成)
   ```typescript
   import { useIsMobile } from '@/hooks/use-mobile';
   
   const isMobile = useIsMobile();
   
   // 移动端显示紧凑横向布局
   if (isMobile) {
     return (
       <Card className="hover:shadow-md transition-shadow">
         <div className="flex items-center gap-3 p-3">
           <Folder className="h-8 w-8 text-primary shrink-0" />
           <div className="flex-1 min-w-0">
             <h3 className="font-medium truncate">{folder.name}</h3>
             <p className="text-xs text-muted-foreground">
               {resourceCount} 个资源
             </p>
           </div>
           <Button size="icon" variant="ghost" className="h-8 w-8">
             <MoreVertical className="h-4 w-4" />
           </Button>
         </div>
       </Card>
     );
   }
   ```

10. **添加递归资源计数** (未完成)
    ```typescript
    const [totalResourceCount, setTotalResourceCount] = useState(0);
    
    useEffect(() => {
      loadTotalResourceCount();
    }, [folder.id]);
    
    const loadTotalResourceCount = async () => {
      const { data, error } = await supabase
        .rpc('get_folder_resource_count', {
          folder_uuid: folder.id
        });
      
      if (!error && data !== null) {
        setTotalResourceCount(data);
      }
    };
    ```

### ResourceCard.tsx 修改

11. **支持不同视图类型** (未完成)
    ```typescript
    interface ResourceCardProps {
      resource: Resource;
      viewType?: ViewType;
      // ... 其他props
    }
    
    // List 视图
    if (viewType === 'list') {
      return (
        <Card className="flex items-center gap-4 p-4">
          <img src={getThumbnail()} className="w-24 h-24 object-cover" />
          <div className="flex-1">
            <h3>{resource.name}</h3>
            <p>{resource.content}</p>
            {/* 标签、按钮等 */}
          </div>
        </Card>
      );
    }
    
    // Thumbnail 视图
    if (viewType === 'thumbnail') {
      return (
        <Card className="aspect-square">
          <img src={getThumbnail()} className="w-full h-full" />
          <div className="p-2">
            <p className="text-xs truncate">{resource.name}</p>
          </div>
        </Card>
      );
    }
    
    // 默认 Grid 视图（当前）
    ```

## 📊 完成度统计

- **数据库迁移**: 100% ✅
- **类型定义**: 100% ✅
- **新组件**: 100% ✅
- **Home.tsx**: 70% (需要添加标签维度渲染和灵感集成)
- **ResourceDialog.tsx**: 0% (需要支持 initialData)
- **InspirationDrawer.tsx**: 0% (需要添加转换功能)
- **ResourceList.tsx**: 0% (需要视图切换和灵感预览)
- **SubFolderCard.tsx**: 0% (需要移动端优化)
- **ResourceCard.tsx**: 0% (需要支持多视图)

**总体完成度**: 约 60%

## 🎯 建议的实施顺序

### 优先级1 - 核心功能 (立即完成)
1. Home.tsx 完成标签维度集成
2. InspirationDrawer.tsx 添加转换功能
3. ResourceDialog.tsx 支持初始化数据

### 优先级2 - 用户体验 (本周完成)
4. SubFolderCard.tsx 移动端优化
5. ResourceList.tsx 视图切换
6. ResourceCard.tsx 多视图支持

### 优先级3 - 锦上添花 (下周完成)
7. ResourceList.tsx 集成灵感预览
8. 完善所有组件的错误处理
9. 添加加载状态和骨架屏

## 📝 测试清单

完成所有修改后，需要测试：

- [ ] 标签维度切换和筛选
- [ ] 灵感转资源流程
- [ ] 视图切换（3种）持久化
- [ ] 移动端底部导航
- [ ] 标签管理（重命名/删除）
- [ ] 文件夹资源计数
- [ ] 角色逻辑（虽然隐藏但保留）
- [ ] 最近灵感显示
- [ ] 移动端文件夹卡片
- [ ] 数据库迁移完整性

## 🔗 相关文件

### 已创建/修改的文件
- `supabase/migrations/migration_20260125_enhancements.sql` - 数据库迁移
- `src/hooks/useViewPreference.ts` - 视图偏好Hook
- `src/types/index.ts` - 类型定义（已更新）
- `src/components/TagTree.tsx` - 标签树
- `src/components/TagManageDialog.tsx` - 标签管理
- `src/components/RecentInspirations.tsx` - 最近灵感
- `src/pages/Home.tsx` - 主页（部分更新）

### 待修改的文件
- `src/pages/Home.tsx` - 完成剩余修改
- `src/components/ResourceDialog.tsx`
- `src/components/InspirationDrawer.tsx`
- `src/components/ResourceList.tsx`
- `src/components/SubFolderCard.tsx`
- `src/components/ResourceCard.tsx`

## 💡 实施建议

由于工具限制，建议采用以下方式完成剩余工作：

1. **方案A**: 我逐个生成完整的文件代码，您复制粘贴替换
2. **方案B**: 我提供每个文件的关键修改片段，您手动整合
3. **方案C**: 我提供详细的修改指南，您参考实施

请告诉我您希望采用哪种方案继续！🚀
