<template>
  <div class="workflows-page">
    <!-- Workflow List View -->
    <div v-if="!editingWorkflow" class="workflows-list">
      <el-card>
        <template #header>
          <div class="card-header">
            <div class="card-header__left">
              <el-icon :size="18" color="#722ed1"><Connection /></el-icon>
              <span>工作流编排</span>
            </div>
            <el-button type="primary" @click="createNewWorkflow">
              <el-icon><Plus /></el-icon>新建工作流
            </el-button>
          </div>
        </template>

        <el-row :gutter="20">
          <el-col v-for="wf in workflows" :key="wf.id" :xs="24" :sm="12" :md="8" :lg="8">
            <div class="workflow-card" :class="{ 'workflow-card--active': wf.is_active }" @click="openEditor(wf)">
              <div class="workflow-card__header">
                <div class="workflow-card__icon">
                  <el-icon :size="24" color="#fff"><Share /></el-icon>
                </div>
                <el-switch v-model="wf.is_active" @click.stop @change="toggleWorkflow(wf)" size="small" />
              </div>
              <h3 class="workflow-card__name">{{ wf.name }}</h3>
              <p class="workflow-card__desc">{{ wf.description }}</p>
              <div class="workflow-card__meta">
                <el-tag size="small" round>{{ triggerMap[wf.trigger_type] || wf.trigger_type }}</el-tag>
                <span class="workflow-card__nodes">{{ parseNodes(wf.nodes).length }} 个节点</span>
              </div>
              <div class="workflow-card__actions" @click.stop>
                <el-button size="small" type="primary" @click="executeWorkflow(wf)" plain>
                  <el-icon><CaretRight /></el-icon>执行
                </el-button>
                <el-button size="small" @click="openEditor(wf)" plain>
                  <el-icon><Edit /></el-icon>编辑
                </el-button>
                <el-button size="small" type="danger" @click="deleteWorkflow(wf)" plain>
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
          </el-col>
        </el-row>

        <el-empty v-if="!workflows.length" description="暂无工作流，点击上方按钮创建" :image-size="80" />
      </el-card>
    </div>

    <!-- Workflow Visual Editor -->
    <div v-else class="workflow-editor">
      <div class="editor-header">
        <div class="editor-header__left">
          <el-button text @click="closeEditor">
            <el-icon><ArrowLeft /></el-icon>返回
          </el-button>
          <h2>{{ editingWorkflowData?.name || '编辑工作流' }}</h2>
        </div>
        <div class="editor-header__right">
          <el-button @click="saveWorkflow" type="primary" :loading="saving">
            <el-icon><Check /></el-icon>保存
          </el-button>
        </div>
      </div>

      <div class="editor-body">
        <!-- Node Palette -->
        <div class="editor-palette">
          <h4 class="palette-title">节点库</h4>
          <div class="palette-group" v-for="(group, groupName) in nodePalette" :key="groupName">
            <div class="palette-group__title">{{ groupName }}</div>
            <div
              v-for="node in group"
              :key="node.type"
              class="palette-item"
              draggable="true"
              @dragstart="onDragStart($event, node)"
            >
              <el-icon :size="20" :color="node.color"><component :is="node.icon" /></el-icon>
              <span>{{ node.label }}</span>
            </div>
          </div>
        </div>

        <!-- Flow Canvas -->
        <div class="editor-canvas" @drop="onDrop" @dragover="$event.preventDefault()">
          <VueFlow
            :nodes="flowNodes"
            v-model:edges="flowEdges"
            :default-zoom="0.8"
            :min-zoom="0.2"
            :max-zoom="4"
            fit-view-on-init
            @connect="onConnect"
            @node-click="onNodeClick"
          >
            <Background />
            <Controls />
            <MiniMap />
          </VueFlow>
        </div>
      </div>

      <!-- Node Config Panel -->
      <el-drawer v-model="nodePanelOpen" title="节点配置" size="360px">
        <template v-if="selectedNode">
          <el-form label-position="top">
            <el-form-item label="节点名称">
              <el-input v-model="selectedNode.label" />
            </el-form-item>
            <el-form-item label="节点类型">
              <el-tag>{{ nodeTypeMap[selectedNode.data?.nodeType || ''] || selectedNode.data?.nodeType }}</el-tag>
            </el-form-item>
            <el-form-item v-if="selectedNode.data?.nodeType === 'agent'" label="关联智能体">
              <el-select v-model="selectedNode.data.agentId" style="width: 100%">
                <el-option v-for="agent in agents" :key="agent.id" :label="agent.name" :value="agent.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="输入配置 (JSON)">
              <el-input v-model="selectedNode.data.inputJson" type="textarea" :rows="6" />
            </el-form-item>
          </el-form>
        </template>
      </el-drawer>
    </div>

    <!-- Create Workflow Dialog -->
    <el-dialog v-model="createDialog" title="新建工作流" width="500px">
      <el-form :model="createForm" label-width="100px">
        <el-form-item label="名称"><el-input v-model="createForm.name" placeholder="工作流名称" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="createForm.description" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="触发方式">
          <el-select v-model="createForm.triggerType" style="width: 100%">
            <el-option label="手动触发" value="manual" />
            <el-option label="定时触发" value="schedule" />
            <el-option label="事件触发" value="event" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="createForm.triggerType === 'schedule'" label="Cron表达式">
          <el-input v-model="createForm.cron" placeholder="0 */2 * * *" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmCreate">创建并打开编辑器</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import type { Connection, Edge, Node } from '@vue-flow/core'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Connection as ConnectionIcon, Plus, CaretRight, Edit, Delete, Share, ArrowLeft, Check, Timer, Mouse, Bell, Cpu, Document, Filter, DataAnalysis } from '@element-plus/icons-vue'
import api from '../api'

const workflows = ref<any[]>([])
const agents = ref<any[]>([])
const createDialog = ref(false)
const editingWorkflow = ref(false)
const editingWorkflowData = ref<any>(null)
const saving = ref(false)
const createForm = ref({ name: '', description: '', triggerType: 'manual', cron: '' })

const flowNodes = ref<Node[]>([])
const flowEdges = ref<Edge[]>([])
const nodePanelOpen = ref(false)
const selectedNode = ref<Node | null>(null)

const triggerMap: Record<string, string> = { manual: '手动', schedule: '定时', event: '事件' }
const nodeTypeMap: Record<string, string> = {
  trigger: '触发器', agent: '智能体', action: '动作', condition: '条件', analytics: '数据分析', delay: '延迟',
}

const nodePalette = {
  '触发器': [
    { type: 'trigger-manual', label: '手动触发', icon: Mouse, color: '#409eff', nodeType: 'trigger' },
    { type: 'trigger-schedule', label: '定时触发', icon: Timer, color: '#67c23a', nodeType: 'trigger' },
    { type: 'trigger-event', label: '事件触发', icon: Bell, color: '#e6a23c', nodeType: 'trigger' },
  ],
  '智能体': [
    { type: 'agent', label: 'AI智能体', icon: Cpu, color: '#722ed1', nodeType: 'agent' },
  ],
  '处理': [
    { type: 'action', label: '执行动作', icon: Document, color: '#13c2c2', nodeType: 'action' },
    { type: 'condition', label: '条件分支', icon: Filter, color: '#eb2f96', nodeType: 'condition' },
    { type: 'analytics', label: '数据分析', icon: DataAnalysis, color: '#fa8c16', nodeType: 'analytics' },
  ],
}

function parseNodes(nodesStr: string): any[] {
  try { return JSON.parse(nodesStr || '[]') } catch { return [] }
}

onMounted(async () => {
  await fetchWorkflows()
  const agentsRes = await api.get('/agents')
  agents.value = agentsRes.data
})

async function fetchWorkflows() {
  try { workflows.value = await api.get('/workflows') } catch (e) { console.error(e) }
}

function createNewWorkflow() {
  createDialog.value = true
}

async function confirmCreate() {
  try {
    const triggerConfig = createForm.value.cron ? { cron: createForm.value.cron } : {}
    const body = {
      name: createForm.value.name,
      description: createForm.value.description,
      nodes: [],
      edges: [],
      triggerType: createForm.value.triggerType,
      triggerConfig,
    }
    const result: any = await api.post('/workflows', body)
    ElMessage.success('工作流已创建')
    createDialog.value = false
    await fetchWorkflows()

    const newWf = workflows.value.find(w => w.name === createForm.value.name)
    if (newWf) openEditor(newWf)
  } catch (e: any) {
    ElMessage.error('创建失败')
  }
}

function openEditor(wf: any) {
  editingWorkflow.value = true
  editingWorkflowData.value = wf

  const nodes = parseNodes(wf.nodes).map((n: any, i: number) => ({
    id: n.id || `node_${i}`,
    type: 'default',
    label: n.label || '节点',
    position: { x: n.x || 100 + i * 200, y: n.y || 200 },
    data: {
      nodeType: n.type || 'action',
      agentId: n.agentType || n.agentId || '',
      inputJson: JSON.stringify(n.config || n.input || {}, null, 2),
    },
    style: { background: getNodeColor(n.type), color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 16px', fontWeight: '600' },
  }))

  let edges: Edge[] = []
  try {
    edges = (JSON.parse(wf.edges || '[]') as any[]).map((e: any) => ({
      id: `edge_${e.from}_${e.to}`,
      source: e.from,
      target: e.to,
      animated: true,
      style: { stroke: '#409eff' },
    }))
  } catch { /* skip */ }

  flowNodes.value = nodes
  flowEdges.value = edges
}

function closeEditor() {
  editingWorkflow.value = false
  editingWorkflowData.value = null
}

function getNodeColor(type?: string): string {
  const colors: Record<string, string> = {
    trigger: '#409eff', agent: '#722ed1', action: '#13c2c2', condition: '#eb2f96', analytics: '#fa8c16', delay: '#909399',
  }
  return colors[type || ''] || '#606266'
}

let draggingNodeData: any = null
function onDragStart(event: DragEvent, node: any) {
  draggingNodeData = node
  event.dataTransfer?.setData('application/vueflow', 'node')
  event.dataTransfer!.effectAllowed = 'move'
}

const { addNodes, addEdges, project } = useVueFlow()

function onDrop(event: DragEvent) {
  if (!draggingNodeData) return

  const bounds = (event.target as HTMLElement).closest('.vue-flow')?.getBoundingClientRect()
  if (!bounds) return

  const position = project({
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  })

  const newNode: Node = {
    id: `node_${Date.now()}`,
    type: 'default',
    label: draggingNodeData.label,
    position,
    data: {
      nodeType: draggingNodeData.nodeType,
      agentId: '',
      inputJson: '{}',
    },
    style: { background: draggingNodeData.color, color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 16px', fontWeight: '600' },
  }

  addNodes([newNode] as any)
  draggingNodeData = null
}

function onConnect(params: Connection) {
  addEdges([{ ...params, animated: true, style: { stroke: '#409eff' } }])
}

function onNodeClick(nodeMouseEvent: any) {
  selectedNode.value = nodeMouseEvent.node
  nodePanelOpen.value = true
}

async function saveWorkflow() {
  saving.value = true
  try {
    const nodes = flowNodes.value.map(n => ({
      id: n.id,
      type: (n.data as any)?.nodeType || 'action',
      label: n.label,
      x: n.position.x,
      y: n.position.y,
      agentType: (n.data as any)?.agentId,
      config: (() => { try { return JSON.parse((n.data as any)?.inputJson || '{}') } catch { return {} } })(),
    }))

    const edges = flowEdges.value.map(e => ({ from: e.source, to: e.target }))

    const triggerConfig = editingWorkflowData.value.trigger_config
      ? JSON.parse(editingWorkflowData.value.trigger_config)
      : {}

    await api.put(`/workflows/${editingWorkflowData.value.id}`, {
      name: editingWorkflowData.value.name,
      description: editingWorkflowData.value.description,
      nodes,
      edges,
      triggerType: editingWorkflowData.value.trigger_type,
      triggerConfig,
    })

    ElMessage.success('工作流已保存')
    await fetchWorkflows()
  } catch (e: any) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

async function toggleWorkflow(wf: any) {
  try {
    await api.post(`/workflows/${wf.id}/toggle`, { active: wf.is_active })
  } catch (e) { wf.is_active = !wf.is_active }
}

async function executeWorkflow(wf: any) {
  try {
    await api.post(`/workflows/${wf.id}/execute`, { input: {} })
    ElMessage.success('工作流已触发')
  } catch (e) { ElMessage.error('执行失败') }
}

async function deleteWorkflow(wf: any) {
  try {
    await ElMessageBox.confirm(`确定删除工作流 "${wf.name}"？`, '确认')
    await api.delete(`/workflows/${wf.id}`)
    ElMessage.success('已删除')
    await fetchWorkflows()
  } catch (e) { /* cancelled */ }
}
</script>

<style scoped>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/controls/dist/style.css';
@import '@vue-flow/minimap/dist/style.css';

.workflows-page {
  animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header__left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 15px;
}

/* Workflow Cards */
.workflow-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.25s ease;
  border: 1px solid #f0f0f0;
  cursor: pointer;
}

.workflow-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.workflow-card--active {
  border-color: #67c23a;
  box-shadow: 0 2px 12px rgba(103, 194, 58, 0.12);
}

.workflow-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.workflow-card__icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: linear-gradient(135deg, #722ed1, #b37feb);
  display: flex;
  align-items: center;
  justify-content: center;
}

.workflow-card__name {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 6px;
  color: #1e293b;
}

.workflow-card__desc {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 12px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.workflow-card__meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.workflow-card__nodes {
  font-size: 12px;
  color: #909399;
}

.workflow-card__actions {
  display: flex;
  gap: 8px;
}

/* Editor */
.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.editor-header__left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.editor-header__left h2 {
  font-size: 18px;
  margin: 0;
  color: #1e293b;
}

.editor-body {
  display: flex;
  gap: 16px;
  height: calc(100vh - 180px);
}

.editor-palette {
  width: 200px;
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow-y: auto;
}

.palette-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 16px;
  color: #303133;
}

.palette-group__title {
  font-size: 12px;
  color: #909399;
  margin: 12px 0 8px;
  font-weight: 500;
}

.palette-group:first-child .palette-group__title {
  margin-top: 0;
}

.palette-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: grab;
  transition: all 0.15s;
  font-size: 13px;
  color: #303133;
  border: 1px solid #f0f0f0;
  margin-bottom: 6px;
}

.palette-item:hover {
  background: #f5f7fa;
  border-color: #dcdfe6;
}

.palette-item:active {
  cursor: grabbing;
}

.editor-canvas {
  flex: 1;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .editor-body {
    flex-direction: column;
    height: calc(100vh - 200px);
  }

  .editor-palette {
    width: 100%;
    height: auto;
    max-height: 150px;
  }

  .editor-canvas {
    min-height: 400px;
  }
}
</style>
