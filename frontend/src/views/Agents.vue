<template>
  <div class="agents-page">
    <el-card class="agents-header-card">
      <div class="agents-header">
        <div class="agents-header__left">
          <h2>AI员工管理</h2>
          <p class="agents-header__desc">管理11个AI智能体岗位，配置自动化工作流，实现24小时无人值守运营</p>
        </div>
        <div class="agents-header__actions">
          <el-button type="primary" @click="runAll" :icon="VideoPlay">全部运行</el-button>
          <el-button @click="stopAll" :icon="VideoPause">全部停止</el-button>
        </div>
      </div>
    </el-card>

    <el-row :gutter="20" class="agents-grid">
      <el-col v-for="agent in agents" :key="agent.id" :xs="24" :sm="12" :md="8" :lg="6">
        <div class="agent-card" :class="{ 'agent-card--active': agent.status === 'active' }" @click="goDetail(agent)">
          <div class="agent-card__header">
            <div class="agent-card__icon" :style="{ background: agentColors[agent.type]?.gradient || '#f0f0f0' }">
              <el-icon :size="24" color="#fff">
                <component :is="agentIcons[agent.type] || Monitor" />
              </el-icon>
            </div>
            <div class="agent-card__status" @click.stop>
              <el-switch
                v-model="agent.status"
                active-value="active"
                inactive-value="stopped"
                @change="toggleAgent(agent)"
                inline-prompt
                active-text="开"
                inactive-text="关"
                size="small"
              />
            </div>
          </div>

          <h3 class="agent-card__name">{{ agent.name }}</h3>
          <p class="agent-card__desc">{{ agentDescriptions[agent.type] }}</p>

          <div class="agent-card__stats">
            <div class="agent-card__stat">
              <span class="agent-card__stat-value">{{ agent.total_runs || 0 }}</span>
              <span class="agent-card__stat-label">运行</span>
            </div>
            <div class="agent-card__stat agent-card__stat--success">
              <span class="agent-card__stat-value">{{ agent.success_count || 0 }}</span>
              <span class="agent-card__stat-label">成功</span>
            </div>
            <div class="agent-card__stat agent-card__stat--danger">
              <span class="agent-card__stat-value">{{ agent.fail_count || 0 }}</span>
              <span class="agent-card__stat-label">失败</span>
            </div>
          </div>

          <div class="agent-card__actions" @click.stop>
            <el-button size="small" type="primary" @click="executeAgent(agent)" :loading="running[agent.id]" plain>
              <el-icon><CaretRight /></el-icon>运行
            </el-button>
            <el-button size="small" @click="showConfig(agent)" plain>
              <el-icon><Setting /></el-icon>配置
            </el-button>
            <el-button size="small" @click="showTasks(agent)" plain>
              <el-icon><Document /></el-icon>日志
            </el-button>
          </div>

          <div v-if="agent.status === 'active'" class="agent-card__pulse"></div>
        </div>
      </el-col>
    </el-row>

    <!-- Config Dialog -->
    <el-dialog v-model="configDialog" :title="currentAgent?.name" width="600px" class="config-dialog">
      <template #header>
        <div class="dialog-header">
          <div class="dialog-header__icon" :style="{ background: agentColors[currentAgent?.type]?.gradient }">
            <el-icon size="20" color="#fff"><component :is="agentIcons[currentAgent?.type]" /></el-icon>
          </div>
          <div>
            <h3>{{ currentAgent?.name }}</h3>
            <p>{{ agentDescriptions[currentAgent?.type] }}</p>
          </div>
        </div>
      </template>
      <el-form :model="configForm" label-width="100px">
        <el-form-item label="定时任务">
          <el-input v-model="configForm.schedule" placeholder="Cron表达式, 如: 0 */2 * * *" />
          <div class="form-hint">留空表示不定时执行</div>
        </el-form-item>
        <el-form-item label="参数配置">
          <el-input
            v-model="configForm.configJson"
            type="textarea"
            :rows="8"
            placeholder="JSON格式的配置参数"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="configDialog = false">取消</el-button>
        <el-button type="primary" @click="saveConfig">保存配置</el-button>
      </template>
    </el-dialog>

    <!-- Tasks Dialog -->
    <el-dialog v-model="tasksDialog" :title="currentAgent?.name + ' - 任务日志'" width="800px">
      <el-table :data="tasks" style="width: 100%">
        <el-table-column prop="id" label="任务ID" width="200" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'success' ? 'success' : row.status === 'failed' ? 'danger' : 'warning'" size="small" round>
              {{ row.status === 'success' ? '成功' : row.status === 'failed' ? '失败' : '运行' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="started_at" label="开始时间" width="180" />
        <el-table-column prop="completed_at" label="完成时间" width="180" />
        <el-table-column prop="error_message" label="错误信息" />
      </el-table>
    </el-dialog>

    <!-- Execute Dialog -->
    <el-dialog v-model="executeDialog" :title="'执行 - ' + currentAgent?.name" width="600px">
      <el-form :model="executeForm" label-width="100px">
        <el-form-item label="输入参数">
          <el-input
            v-model="executeForm.inputJson"
            type="textarea"
            :rows="10"
            placeholder="JSON格式的输入参数"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="executeDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmExecute" :loading="executing">
          <el-icon><CaretRight /></el-icon>执行
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElNotification } from 'element-plus'
import { Monitor, TrendCharts, EditPen, VideoCamera, Search, Location, ChatDotRound, User, DocumentChecked, Phone, VideoPlay, VideoPause, CaretRight, Setting, Document } from '@element-plus/icons-vue'
import api from '../api'

const router = useRouter()

const agents = ref<any[]>([])
const running = ref<Record<string, boolean>>({})
const executing = ref(false)
const configDialog = ref(false)
const tasksDialog = ref(false)
const executeDialog = ref(false)
const currentAgent = ref<any>(null)
const configForm = ref({ schedule: '', configJson: '{}' })
const executeForm = ref({ inputJson: '{}' })
const tasks = ref<any[]>([])

const agentIcons: Record<string, any> = {
  trend: TrendCharts, create: EditPen, avatar: VideoCamera, video: VideoCamera,
  prospect: Search, 'map-prospect': Location, wechat: ChatDotRound,
  hr: User, legal: DocumentChecked, call: Phone, live: VideoPlay,
}

const agentColors: Record<string, { gradient: string; color: string }> = {
  trend: { gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#667eea' },
  create: { gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: '#f5576c' },
  avatar: { gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: '#4facfe' },
  video: { gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: '#43e97b' },
  prospect: { gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: '#fa709a' },
  'map-prospect': { gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', color: '#a18cd1' },
  wechat: { gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', color: '#fcb69f' },
  hr: { gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', color: '#ff9a9e' },
  legal: { gradient: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)', color: '#66a6ff' },
  call: { gradient: 'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)', color: '#f59e0b' },
  live: { gradient: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)', color: '#a1c4fd' },
}

const agentDescriptions: Record<string, string> = {
  trend: '自动追踪全网热点，生成爆款选题',
  create: 'AI文案、图片、脚本创作',
  avatar: 'AI数字人播报视频生成',
  video: '文案自动转视频，智能配画面',
  prospect: '自动寻找并触达潜在客户',
  'map-prospect': '基于地图POI发现周边客户',
  wechat: '自动管理微信/企微消息',
  hr: 'AI处理招聘、考勤、员工问答',
  legal: '合同审查、法律咨询、合规检查',
  call: 'AI自动外呼，智能对话转化',
  live: '数字人24小时自动直播带货',
}

onMounted(async () => {
  await fetchAgents()
})

async function fetchAgents() {
  try {
    agents.value = await api.get('/agents')
  } catch (e) {
    console.error('Failed to fetch agents:', e)
  }
}

async function toggleAgent(agent: any) {
  try {
    await api.put(`/agents/${agent.id}`, { status: agent.status })
    ElMessage.success(`${agent.name} 已${agent.status === 'active' ? '启动' : '停止'}`)
  } catch (e) {
    ElMessage.error('操作失败')
    await fetchAgents()
  }
}

async function executeAgent(agent: any) {
  currentAgent.value = agent
  executeForm.value = { inputJson: '{}' }
  executeDialog.value = true
}

async function confirmExecute() {
  executing.value = true
  try {
    const input = JSON.parse(executeForm.value.inputJson)
    running.value[currentAgent.value.id] = true
    const result = await api.post(`/agents/${currentAgent.value.id}/execute`, { input })
    ElMessage.success('任务执行完成')
    ElNotification({
      title: currentAgent.value.name,
      message: `执行成功`,
      type: 'success',
    })
    executeDialog.value = false
    await fetchAgents()
  } catch (e: any) {
    ElMessage.error('执行失败: ' + (e.response?.data?.error || e.message))
  } finally {
    executing.value = false
    running.value[currentAgent.value.id] = false
  }
}

function showConfig(agent: any) {
  currentAgent.value = agent
  configForm.value = {
    schedule: agent.schedule || '',
    configJson: typeof agent.config === 'string' ? agent.config : JSON.stringify(JSON.parse(agent.config || '{}'), null, 2),
  }
  configDialog.value = true
}

async function saveConfig() {
  try {
    JSON.parse(configForm.value.configJson)
    await api.put(`/agents/${currentAgent.value.id}`, {
      schedule: configForm.value.schedule,
      config: JSON.parse(configForm.value.configJson),
    })
    ElMessage.success('配置已保存')
    configDialog.value = false
    await fetchAgents()
  } catch (e: any) {
    ElMessage.error('配置JSON格式错误')
  }
}

async function showTasks(agent: any) {
  currentAgent.value = agent
  try {
    tasks.value = await api.get(`/agents/${agent.id}/tasks`)
    tasksDialog.value = true
  } catch (e) {
    ElMessage.error('获取任务日志失败')
  }
}

async function runAll() {
  for (const agent of agents.value) {
    if (agent.status === 'active') {
      try {
        running.value[agent.id] = true
        await api.post(`/agents/${agent.id}/execute`, { input: {} })
      } catch (e) { /* skip */ }
      finally { running.value[agent.id] = false }
    }
  }
  ElMessage.success('已触发所有运行中的AI员工')
  await fetchAgents()
}

async function stopAll() {
  for (const agent of agents.value) {
    if (agent.status === 'active') {
      try {
        await api.put(`/agents/${agent.id}`, { status: 'stopped' })
      } catch (e) { /* skip */ }
    }
  }
  ElMessage.success('已停止所有AI员工')
  await fetchAgents()
}

function goDetail(agent: any) {
  router.push(`/agents/${agent.id}`)
}
</script>

<style scoped>
.agents-page {
  animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.agents-header-card {
  margin-bottom: 20px;
}

.agents-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.agents-header__left h2 {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 4px;
  color: #303133;
}

.agents-header__desc {
  font-size: 13px;
  color: #909399;
  margin: 0;
}

.agents-header__actions {
  display: flex;
  gap: 8px;
}

.agents-grid {
  margin-bottom: 0;
}

/* Agent Card */
.agent-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.25s ease;
  position: relative;
  overflow: hidden;
  border: 1px solid #f0f0f0;
  cursor: pointer;
}

.agent-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  border-color: transparent;
}

.agent-card--active {
  border-color: rgba(103, 194, 58, 0.3);
}

.agent-card__pulse {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #67c23a;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(103, 194, 58, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(103, 194, 58, 0); }
}

.agent-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.agent-card__icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.agent-card__name {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 6px;
  color: #303133;
}

.agent-card__desc {
  font-size: 12px;
  color: #909399;
  margin: 0 0 16px;
  line-height: 1.5;
  min-height: 36px;
}

.agent-card__stats {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 0;
  border-top: 1px dashed #f0f0f0;
  border-bottom: 1px dashed #f0f0f0;
}

.agent-card__stat {
  text-align: center;
  flex: 1;
}

.agent-card__stat-value {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #303133;
}

.agent-card__stat-label {
  font-size: 11px;
  color: #909399;
}

.agent-card__stat--success .agent-card__stat-value { color: #67c23a; }
.agent-card__stat--danger .agent-card__stat-value { color: #f56c6c; }

.agent-card__actions {
  display: flex;
  gap: 8px;
}

.agent-card__actions .el-button {
  flex: 1;
  padding: 8px 12px;
}

/* Dialog Header */
.dialog-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dialog-header__icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-header h3 {
  margin: 0;
  font-size: 16px;
}

.dialog-header p {
  margin: 0;
  font-size: 12px;
  color: #909399;
}

.form-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

@media (max-width: 768px) {
  .agents-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .agents-header__right {
    flex-wrap: wrap;
  }
  
  .agent-card {
    margin-bottom: 16px;
    padding: 16px;
  }
  
  .agent-card__icon {
    width: 44px;
    height: 44px;
  }
  
  .agent-card__name {
    font-size: 16px;
  }
  
  .agent-card__desc {
    font-size: 12px;
  }
  
  .agent-card__stat-value {
    font-size: 18px;
  }
  
  .agent-card__actions {
    flex-wrap: wrap;
  }
  
  .agent-card__actions .el-button {
    flex: 1;
    min-width: 0;
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .agents-header__title h2 {
    font-size: 20px;
  }
  
  .agent-card__stats {
    gap: 8px;
  }
  
  .agent-card__stat {
    padding: 6px 12px;
  }
  
  .agent-card__actions {
    flex-direction: column;
    gap: 6px;
  }
  
  .agent-card__actions .el-button {
    width: 100%;
  }
}
</style>
