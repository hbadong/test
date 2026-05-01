<template>
  <div class="agent-detail" v-loading="loading">
    <!-- Back Button & Header -->
    <div class="detail-header">
      <el-button link @click="$router.push('/agents')" class="back-btn">
        <el-icon><ArrowLeft /></el-icon>
        返回列表
      </el-button>
      <div class="detail-header__main" v-if="agent">
        <div class="detail-header__icon" :style="{ background: agentColors[agent.type]?.gradient }">
          <el-icon :size="28" color="#fff"><component :is="agentIcons[agent.type] || Monitor" /></el-icon>
        </div>
        <div class="detail-header__info">
          <h2>{{ agent.name }}</h2>
          <p>{{ agentDescriptions[agent.type] }}</p>
        </div>
        <div class="detail-header__actions">
          <el-tag 
            :type="agent.status === 'active' ? 'success' : agent.status === 'paused' ? 'warning' : 'info'" 
            size="large"
            effect="dark"
            round
          >
            {{ agent.status === 'active' ? '运行中' : agent.status === 'paused' ? '暂停' : '已停止' }}
          </el-tag>
          <el-button type="primary" @click="executeAgent" :loading="executing" :icon="CaretRight">
            执行任务
          </el-button>
          <el-switch
            v-model="agent.status"
            active-value="active"
            inactive-value="stopped"
            @change="toggleAgent"
            inline-prompt
            active-text="开"
            inactive-text="关"
            style="margin-left: 8px"
          />
        </div>
      </div>
    </div>

    <!-- Stats Cards -->
    <el-row :gutter="16" v-if="agent" class="stats-row">
      <el-col :xs="12" :sm="6">
        <div class="mini-stat">
          <div class="mini-stat__value">{{ agent.total_runs || 0 }}</div>
          <div class="mini-stat__label">总运行次数</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="mini-stat mini-stat--success">
          <div class="mini-stat__value">{{ agent.success_count || 0 }}</div>
          <div class="mini-stat__label">成功次数</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="mini-stat mini-stat--danger">
          <div class="mini-stat__value">{{ agent.fail_count || 0 }}</div>
          <div class="mini-stat__label">失败次数</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="mini-stat mini-stat--info">
          <div class="mini-stat__value">{{ successRate }}%</div>
          <div class="mini-stat__label">成功率</div>
        </div>
      </el-col>
    </el-row>

    <!-- Charts & Config -->
    <el-row :gutter="20" v-if="agent" class="content-row">
      <el-col :xs="24" :md="16">
        <el-card class="detail-card">
          <template #header>
            <div class="card-header">
              <div class="card-header__left">
                <el-icon :size="18" color="#409eff"><TrendCharts /></el-icon>
                <span>运行趋势</span>
              </div>
              <el-radio-group v-model="chartPeriod" size="small" @change="fetchTasks">
                <el-radio-button label="7">7天</el-radio-button>
                <el-radio-button label="15">15天</el-radio-button>
                <el-radio-button label="30">30天</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="chartRef" class="chart-container"></div>
        </el-card>

        <!-- Task Log -->
        <el-card class="detail-card" style="margin-top: 20px">
          <template #header>
            <div class="card-header">
              <div class="card-header__left">
                <el-icon :size="18" color="#e6a23c"><Clock /></el-icon>
                <span>任务日志</span>
                <el-tag size="small" round>{{ filteredTasks.length }} 条</el-tag>
              </div>
              <div class="card-header__filters">
                <el-select v-model="taskFilter" size="small" placeholder="状态过滤" style="width: 100px">
                  <el-option label="全部" value="" />
                  <el-option label="成功" value="success" />
                  <el-option label="失败" value="failed" />
                  <el-option label="运行中" value="running" />
                </el-select>
              </div>
            </div>
          </template>
          <el-table :data="filteredTasks" style="width: 100%" stripe>
            <el-table-column prop="id" label="任务ID" width="200">
              <template #default="{ row }">
                <el-tooltip :content="row.id" placement="top">
                  <span class="task-id">{{ row.id.slice(0, 12) }}...</span>
                </el-tooltip>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="statusType(row.status)" size="small" round>
                  {{ statusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="耗时" width="80">
              <template #default="{ row }">
                {{ calcDuration(row) }}
              </template>
            </el-table-column>
            <el-table-column prop="started_at" label="开始时间" width="170">
              <template #default="{ row }">{{ formatTime(row.started_at) }}</template>
            </el-table-column>
            <el-table-column prop="error_message" label="备注/错误" show-overflow-tooltip>
              <template #default="{ row }">
                <span v-if="row.error_message" class="error-text">{{ row.error_message.slice(0, 30) }}...</span>
                <span v-else class="success-text">完成</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="70" fixed="right">
              <template #default="{ row }">
                <el-button size="small" link type="primary" @click="viewTaskOutput(row)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!filteredTasks.length" description="暂无任务记录" :image-size="80" />
        </el-card>
      </el-col>

      <el-col :xs="24" :md="8">
        <!-- Config Editor -->
        <el-card class="detail-card">
          <template #header>
            <div class="card-header">
              <div class="card-header__left">
                <el-icon :size="18" color="#67c23a"><Setting /></el-icon>
                <span>配置</span>
              </div>
            </div>
          </template>
          <el-form label-position="top" @submit.prevent="saveConfig">
            <el-form-item label="定时任务 (Cron)">
              <el-input v-model="configForm.schedule" placeholder="如: 0 */2 * * *" />
              <div class="form-hint">留空表示不定时执行</div>
            </el-form-item>
            <el-form-item label="参数配置 (JSON)">
              <el-input
                v-model="configForm.configJson"
                type="textarea"
                :rows="12"
                placeholder="JSON 格式"
                class="config-textarea"
              />
            </el-form-item>
            <el-button type="primary" @click="saveConfig" style="width: 100%" :loading="saving">
              保存配置
            </el-button>
          </el-form>
        </el-card>

        <!-- Quick Input -->
        <el-card class="detail-card" style="margin-top: 20px">
          <template #header>
            <div class="card-header">
              <div class="card-header__left">
                <el-icon :size="18" color="#409eff"><EditPen /></el-icon>
                <span>快捷输入</span>
              </div>
            </div>
          </template>
          <el-form label-position="top" @submit.prevent="quickExecute">
            <el-form-item label="输入参数 (JSON)">
              <el-input
                v-model="executeForm.inputJson"
                type="textarea"
                :rows="8"
                placeholder='{"key": "value"}'
                class="config-textarea"
              />
            </el-form-item>
            <el-button type="primary" @click="quickExecute" style="width: 100%" :loading="executing">
              <el-icon><CaretRight /></el-icon>执行
            </el-button>
          </el-form>
        </el-card>

        <!-- Recent Output -->
        <el-card class="detail-card" style="margin-top: 20px" v-if="lastResult">
          <template #header>
            <div class="card-header">
              <div class="card-header__left">
                <el-icon :size="18" color="#67c23a"><SuccessFilled /></el-icon>
                <span>最近执行结果</span>
              </div>
            </div>
          </template>
          <pre class="result-output">{{ JSON.stringify(lastResult, null, 2) }}</pre>
        </el-card>

        <!-- Auto-refresh Indicator -->
        <el-card class="detail-card" style="margin-top: 20px" v-if="agent?.status === 'active'">
          <div class="auto-refresh">
            <el-icon class="auto-refresh__icon" :size="16" color="#67c23a"><Refresh /></el-icon>
            <span>实时监控中</span>
            <span class="auto-refresh__timer">{{ autoRefreshCountdown }}s</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Task Output Dialog -->
    <el-dialog v-model="taskOutputDialog" title="任务详情" width="700px">
      <div v-if="selectedTask" class="task-output">
        <el-descriptions :column="2" border class="task-output__meta">
          <el-descriptions-item label="状态">
            <el-tag :type="statusType(selectedTask.status)" size="small" round>{{ statusLabel(selectedTask.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="耗时">{{ calcDuration(selectedTask) }}</el-descriptions-item>
          <el-descriptions-item label="开始时间">{{ formatTime(selectedTask.started_at) }}</el-descriptions-item>
          <el-descriptions-item label="完成时间">{{ selectedTask.completed_at ? formatTime(selectedTask.completed_at) : '-' }}</el-descriptions-item>
        </el-descriptions>
        
        <h4 class="task-output__title">输入参数</h4>
        <pre class="task-output__json">{{ formatJson(selectedTask.input) }}</pre>
        
        <h4 class="task-output__title" v-if="selectedTask.output">输出结果</h4>
        <pre class="task-output__json task-output__json--success" v-if="selectedTask.output">{{ formatJson(selectedTask.output) }}</pre>
        
        <h4 class="task-output__title" v-if="selectedTask.error_message">错误信息</h4>
        <pre class="task-output__json task-output__json--error" v-if="selectedTask.error_message">{{ selectedTask.error_message }}</pre>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Monitor, TrendCharts, Clock, Setting, EditPen, CaretRight, SuccessFilled, Refresh } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import api from '../api'

const route = useRoute()
const agent = ref<any>(null)
const tasks = ref<any[]>([])
const loading = ref(true)
const executing = ref(false)
const saving = ref(false)
const configForm = ref({ schedule: '', configJson: '{}' })
const executeForm = ref({ inputJson: '{}' })
const taskFilter = ref('')
const chartPeriod = ref('7')
const lastResult = ref<any>(null)
const chartRef = ref<HTMLElement>()
let chartInstance: echarts.ECharts | null = null

// Auto-refresh
const autoRefreshCountdown = ref(10)
let autoRefreshTimer: ReturnType<typeof setInterval> | null = null
let countdownTimer: ReturnType<typeof setInterval> | null = null

// Task output dialog
const taskOutputDialog = ref(false)
const selectedTask = ref<any>(null)

const agentIcons: Record<string, any> = {
  trend: 'TrendCharts', create: 'EditPen', avatar: 'VideoCamera', video: 'VideoCamera',
  prospect: 'Search', 'map-prospect': 'Location', wechat: 'ChatDotRound',
  hr: 'User', legal: 'DocumentChecked', call: 'Phone', live: 'VideoPlay',
}

const agentColors: Record<string, { gradient: string }> = {
  trend: { gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  create: { gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  avatar: { gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  video: { gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  prospect: { gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  'map-prospect': { gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
  wechat: { gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
  hr: { gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' },
  legal: { gradient: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)' },
  call: { gradient: 'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)' },
  live: { gradient: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)' },
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

const successRate = computed(() => {
  if (!agent.value) return 0
  const total = (agent.value.total_runs || 0)
  return total > 0 ? Math.round(((agent.value.success_count || 0) / total) * 100) : 0
})

const filteredTasks = computed(() => {
  if (!taskFilter.value) return tasks.value
  return tasks.value.filter(t => t.status === taskFilter.value)
})

onMounted(async () => {
  await fetchAgent()
  await fetchTasks()
  initChart()
  window.addEventListener('resize', handleResize)
  startAutoRefresh()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
  stopAutoRefresh()
})

function startAutoRefresh() {
  stopAutoRefresh()
  autoRefreshCountdown.value = 10
  countdownTimer = setInterval(() => {
    autoRefreshCountdown.value--
    if (autoRefreshCountdown.value <= 0) {
      autoRefreshCountdown.value = 10
      if (agent.value?.status === 'active') {
        fetchAgent()
        fetchTasks()
      }
    }
  }, 1000)
}

function stopAutoRefresh() {
  if (countdownTimer) clearInterval(countdownTimer)
  if (autoRefreshTimer) clearInterval(autoRefreshTimer)
}

function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatJson(str: string): string {
  try { return JSON.stringify(JSON.parse(str), null, 2) } catch { return str || '' }
}

function viewTaskOutput(task: any) {
  selectedTask.value = task
  taskOutputDialog.value = true
}

watch(() => route.params.id, () => {
  fetchAgent()
  fetchTasks()
})

function handleResize() {
  chartInstance?.resize()
}

async function fetchAgent() {
  loading.value = true
  try {
    const res = await api.get(`/agents/${route.params.id}`)
    agent.value = res.data
    configForm.value = {
      schedule: agent.value.schedule || '',
      configJson: typeof agent.value.config === 'string' 
        ? JSON.stringify(JSON.parse(agent.value.config), null, 2) 
        : JSON.stringify(agent.value.config || {}, null, 2),
    }
  } catch (e) {
    ElMessage.error('获取 Agent 信息失败')
  } finally {
    loading.value = false
  }
}

async function fetchTasks() {
  try {
    const res = await api.get(`/agents/${route.params.id}/tasks`)
    tasks.value = res.data || []
    updateChart()
  } catch (e) {
    console.error('获取任务日志失败:', e)
  }
}

async function toggleAgent() {
  try {
    await api.put(`/agents/${agent.value.id}`, { status: agent.value.status })
    ElMessage.success(`${agent.value.name} 已${agent.value.status === 'active' ? '启动' : '停止'}`)
  } catch (e) {
    ElMessage.error('操作失败')
    await fetchAgent()
  }
}

async function executeAgent() {
  executing.value = true
  try {
    const input = executeForm.value.inputJson ? JSON.parse(executeForm.value.inputJson) : {}
    const res = await api.post(`/agents/${agent.value.id}/execute`, { input })
    lastResult.value = res.data.data
    ElMessage.success('任务执行完成')
    await fetchAgent()
    await fetchTasks()
  } catch (e: any) {
    ElMessage.error('执行失败: ' + (e.response?.data?.error || e.message))
  } finally {
    executing.value = false
  }
}

async function quickExecute() {
  await executeAgent()
}

async function saveConfig() {
  saving.value = true
  try {
    JSON.parse(configForm.value.configJson)
    await api.put(`/agents/${agent.value.id}`, {
      schedule: configForm.value.schedule,
      config: JSON.parse(configForm.value.configJson),
    })
    ElMessage.success('配置已保存')
    await fetchAgent()
  } catch (e: any) {
    ElMessage.error('配置JSON格式错误')
  } finally {
    saving.value = false
  }
}

function statusType(status: string): 'success' | 'danger' | 'warning' | 'info' {
  switch (status) {
    case 'success': return 'success'
    case 'failed': return 'danger'
    case 'running': return 'warning'
    default: return 'info'
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'success': return '成功'
    case 'failed': return '失败'
    case 'running': return '运行中'
    default: return status
  }
}

function calcDuration(row: any): string {
  if (!row.started_at || !row.completed_at) return '-'
  const start = new Date(row.started_at).getTime()
  const end = new Date(row.completed_at).getTime()
  const diff = end - start
  if (diff < 1000) return `${diff}ms`
  return `${(diff / 1000).toFixed(1)}s`
}

// Chart
function initChart() {
  if (!chartRef.value) return
  chartInstance = echarts.init(chartRef.value)
  chartInstance.setOption({
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#ebeef5', textStyle: { color: '#303133' },
      formatter: (params: any[]) => {
        let html = `<div style="font-weight:600;margin-bottom:6px">${params[0]?.axisValue}</div>`
        params.forEach(p => {
          html += `<div style="display:flex;align-items:center;gap:6px;margin:4px 0">
            <span style="width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
            <span>${p.seriesName}: <b>${p.value}</b></span>
          </div>`
        })
        return html
      }
    },
    legend: { data: ['成功', '失败'], bottom: 0, itemWidth: 12, itemHeight: 8, textStyle: { fontSize: 12 } },
    grid: { left: '3%', right: '4%', bottom: '14%', top: '8%', containLabel: true },
    xAxis: { type: 'category', data: [], axisLine: { lineStyle: { color: '#ebeef5' } }, axisTick: { show: false }, axisLabel: { color: '#909399', fontSize: 11 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f2f3f5', type: 'dashed' } }, axisLabel: { color: '#909399', fontSize: 11 } },
    series: [
      { name: '成功', type: 'bar', stack: 'total', data: [], itemStyle: { color: '#67c23a' }, barWidth: '60%', borderRadius: [0, 0, 0, 0] },
      { name: '失败', type: 'bar', stack: 'total', data: [], itemStyle: { color: '#f56c6c' }, borderRadius: [4, 4, 0, 0] },
    ],
  })
}

function updateChart() {
  if (!chartInstance) return
  
  const dateMap: Record<string, { total: number; success: number; fail: number }> = {}
  const now = new Date()
  const days = parseInt(chartPeriod.value)
  
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    dateMap[key] = { total: 0, success: 0, fail: 0 }
  }

  tasks.value.forEach(t => {
    const key = t.started_at?.slice(0, 10)
    if (dateMap[key] !== undefined) {
      dateMap[key].total++
      if (t.status === 'success') dateMap[key].success++
      if (t.status === 'failed') dateMap[key].fail++
    }
  })

  const dates = Object.keys(dateMap)
  chartInstance.setOption({
    xAxis: { data: dates.map(d => d.slice(5)) },
    series: [
      { data: dates.map(d => dateMap[d].success) },
      { data: dates.map(d => dateMap[d].fail) },
    ],
  })
}
</script>

<style scoped>
.agent-detail {
  animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Header */
.detail-header {
  margin-bottom: 20px;
}

.back-btn {
  margin-bottom: 12px;
  color: #909399;
  font-size: 14px;
}

.back-btn:hover {
  color: #409eff;
}

.detail-header__main {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #fff;
  padding: 20px 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.detail-header__icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.detail-header__info h2 {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 700;
  color: #303133;
}

.detail-header__info p {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.detail-header__actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Stats */
.stats-row {
  margin-bottom: 20px;
}

.mini-stat {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.mini-stat__value {
  font-size: 32px;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
}

.mini-stat__label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.mini-stat--success .mini-stat__value { color: #67c23a; }
.mini-stat--danger .mini-stat__value { color: #f56c6c; }
.mini-stat--info .mini-stat__value { color: #409eff; }

/* Content */
.content-row {
  margin-bottom: 0;
}

.detail-card {
  height: auto;
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

.chart-container {
  height: 280px;
  width: 100%;
}

/* Task Table */
.task-id {
  font-family: monospace;
  font-size: 12px;
  color: #606266;
}

.error-text {
  color: #f56c6c;
  font-size: 12px;
}

.success-text {
  color: #67c23a;
  font-size: 12px;
}

/* Config */
.form-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.config-textarea :deep(.el-textarea__inner) {
  font-family: 'SF Mono', 'Menlo', monospace;
  font-size: 12px;
}

/* Result Output */
.result-output {
  background: #f5f7fa;
  padding: 16px;
  border-radius: 8px;
  font-size: 12px;
  font-family: 'SF Mono', 'Menlo', monospace;
  line-height: 1.6;
  max-height: 400px;
  overflow: auto;
  color: #303133;
  margin: 0;
}

/* Auto Refresh */
.auto-refresh {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #67c23a;
  padding: 8px 0;
}

.auto-refresh__icon {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.auto-refresh__timer {
  margin-left: auto;
  font-weight: 600;
  font-family: monospace;
}

/* Task Output Dialog */
.task-output__meta {
  margin-bottom: 20px;
}

.task-output__title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin: 16px 0 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f0f0f0;
}

.task-output__json {
  background: #f5f7fa;
  padding: 16px;
  border-radius: 8px;
  font-size: 12px;
  font-family: 'SF Mono', 'Menlo', monospace;
  line-height: 1.6;
  max-height: 300px;
  overflow: auto;
  color: #303133;
  margin: 0;
}

.task-output__json--success {
  background: #f0f9eb;
  border: 1px solid #e1f3d8;
}

.task-output__json--error {
  background: #fef0f0;
  border: 1px solid #fde2e2;
  color: #f56c6c;
}

@media (max-width: 768px) {
  .detail-card {
    margin-bottom: 12px;
    border-radius: var(--radius-md);
  }
  
  .detail-card :deep(.el-card__header) {
    padding: 14px 16px;
  }
  
  .detail-card :deep(.el-card__body) {
    padding: 16px;
  }
  
  .detail-header {
    padding: 16px;
    border-radius: var(--radius-md);
    margin-bottom: 12px;
  }
  
  .detail-header__main {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
  }
  
  .detail-header__info {
    width: 100%;
  }
  
  .detail-header__title {
    font-size: 18px;
  }
  
  .detail-header__actions {
    margin-left: 0;
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .detail-header__actions .el-button {
    flex: 1;
    min-width: 80px;
  }
  
  .detail-stats {
    gap: 8px;
    margin-top: 12px;
  }
  
  .mini-stat {
    flex: 1;
    min-width: 0;
    margin-bottom: 0;
    padding: 10px 8px;
  }
  
  .mini-stat__value {
    font-size: 18px;
  }
  
  .mini-stat__label {
    font-size: 11px;
  }
  
  .chart-container {
    height: 200px;
  }
  
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .card-header__filters {
    width: 100%;
  }
  
  .task-id {
    font-size: 12px;
  }
  
  .el-table {
    font-size: 13px;
  }
  
  .el-table :deep(.el-table__cell) {
    padding: 10px 8px;
  }
  
  .auto-refresh {
    font-size: 12px;
    padding: 6px 0;
  }
  
  .auto-refresh__icon {
    font-size: 14px;
  }
  
  .result-output {
    padding: 12px;
    font-size: 11px;
    max-height: 300px;
  }
  
  .task-output__json {
    padding: 12px;
    font-size: 11px;
    max-height: 250px;
  }
}

@media (max-width: 480px) {
  .detail-header {
    padding: 14px;
  }
  
  .detail-header__title {
    font-size: 16px;
  }
  
  .detail-header__type {
    font-size: 11px;
    padding: 3px 8px;
  }
  
  .detail-stats {
    gap: 6px;
  }
  
  .mini-stat {
    padding: 8px 6px;
  }
  
  .mini-stat__value {
    font-size: 16px;
  }
  
  .mini-stat__label {
    font-size: 10px;
  }
  
  .chart-container {
    height: 180px;
  }
  
  .detail-card :deep(.el-card__header) {
    padding: 12px 14px;
  }
  
  .detail-card :deep(.el-card__body) {
    padding: 12px;
  }
  
  .el-table :deep(.el-table__cell) {
    padding: 8px 6px;
  }
  
  .el-tag {
    padding: 0 6px;
    font-size: 11px;
  }
}
</style>
