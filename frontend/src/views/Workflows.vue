<template>
  <div class="workflows-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="card-header__left">
            <el-icon :size="18" color="#722ed1"><Connection /></el-icon>
            <span>工作流编排</span>
          </div>
          <el-button type="primary" @click="showCreateDialog">
            <el-icon><Plus /></el-icon>新建工作流
          </el-button>
        </div>
      </template>

      <el-table :data="workflows" style="width: 100%">
        <el-table-column prop="name" label="名称" min-width="150" />
        <el-table-column prop="description" label="描述" min-width="200" />
        <el-table-column prop="trigger_type" label="触发方式" width="100">
          <template #default="{ row }">
            <el-tag size="small" round>{{ triggerMap[row.trigger_type] || row.trigger_type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-switch v-model="row.is_active" @change="toggleWorkflow(row)" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="executeWorkflow(row)">
              <el-icon><CaretRight /></el-icon>执行
            </el-button>
            <el-button size="small" link type="warning" @click="editWorkflow(row)">
              <el-icon><Edit /></el-icon>编辑
            </el-button>
            <el-button size="small" link type="danger" @click="deleteWorkflow(row)">
              <el-icon><Delete /></el-icon>删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!workflows.length" description="暂无工作流，点击上方按钮创建" :image-size="80" />
    </el-card>

    <el-dialog v-model="createDialog" :title="editing ? '编辑工作流' : '新建工作流'" width="700px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="名称">
          <el-input v-model="form.name" placeholder="工作流名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="描述" />
        </el-form-item>
        <el-form-item label="触发方式">
          <el-select v-model="form.triggerType" style="width: 100%">
            <el-option label="手动触发" value="manual" />
            <el-option label="定时触发" value="schedule" />
            <el-option label="事件触发" value="event" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.triggerType === 'schedule'" label="Cron表达式">
          <el-input v-model="form.cron" placeholder="0 */2 * * *" />
        </el-form-item>
        <el-form-item label="节点配置">
          <el-input v-model="form.nodesJson" type="textarea" :rows="8" placeholder="JSON节点配置" />
          <div class="form-hint">格式: [{"id": "n1", "type": "agent", "config": {"agentId": "trend", "input": {}}}]</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialog = false">取消</el-button>
        <el-button type="primary" @click="saveWorkflow">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Connection, Plus, CaretRight, Edit, Delete } from '@element-plus/icons-vue'
import api from '../api'

const workflows = ref<any[]>([])
const createDialog = ref(false)
const editing = ref(false)
const form = ref({ name: '', description: '', triggerType: 'manual', cron: '', nodesJson: '[]' })

const triggerMap: Record<string, string> = {
  'manual': '手动',
  'schedule': '定时',
  'event': '事件',
}

onMounted(fetchWorkflows)

async function fetchWorkflows() {
  try { workflows.value = await api.get('/workflows') } catch (e) { console.error(e) }
}

function showCreateDialog() {
  editing.value = false
  form.value = { name: '', description: '', triggerType: 'manual', cron: '', nodesJson: '[]' }
  createDialog.value = true
}

function editWorkflow(wf: any) {
  editing.value = true
  form.value = {
    name: wf.name,
    description: wf.description,
    triggerType: wf.trigger_type,
    cron: JSON.parse(wf.trigger_config || '{}').cron || '',
    nodesJson: wf.nodes,
  }
  createDialog.value = true
}

async function saveWorkflow() {
  try {
    const nodes = JSON.parse(form.value.nodesJson)
    const triggerConfig = form.value.cron ? { cron: form.value.cron } : {}
    const body = {
      name: form.value.name,
      description: form.value.description,
      nodes,
      edges: [],
      triggerType: form.value.triggerType,
      triggerConfig,
    }
    await api.post('/workflows', body)
    ElMessage.success('工作流已保存')
    createDialog.value = false
    await fetchWorkflows()
  } catch (e: any) {
    ElMessage.error('保存失败: ' + (e.response?.data?.error || e.message))
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

.form-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>
