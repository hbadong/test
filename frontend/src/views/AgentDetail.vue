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
            <el-table-column prop="id" label="任务ID" width="280">
              <template #default="{ row }">
                <span class="task-id">{{ row.id.slice(0, 8) }}...</span>
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
            <el-table-column prop="started_at" label="开始时间" width="180" />
            <el-table-column prop="error_message" label="备注/错误" show-overflow-tooltip>
              <template #default="{ row }">
                <span v-if="row.error_message" class="error-text">{{ row.error_message }}</span>
                <span v-else class="success-text">完成</span>
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
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Monitor, TrendCharts, Clock, Setting, EditPen, CaretRight, SuccessFilled } from '@element-plus/icons-vue'
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
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
})

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
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#ebeef5', textStyle: { color: '#303133' } },
    grid: { left: '3%', right: '4%', bottom: '8%', top: '8%', containLabel: true },
    xAxis: { type: 'category', data: [], axisLine: { lineStyle: { color: '#ebeef5' } }, axisTick: { show: false }, axisLabel: { color: '#909399', fontSize: 11 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f2f3f5', type: 'dashed' } }, axisLabel: { color: '#909399', fontSize: 11 } },
    series: [{ name: '任务', type: 'bar', data: [], itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#409eff' }, { offset: 1, color: '#79bbff' }] } }, barWidth: '60%', borderRadius: [4, 4, 0, 0] }],
  })
}

function updateChart() {
  if (!chartInstance || !tasks.value.length) return
  
  // Group tasks by date
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
    series: [{ data: dates.map(d => dateMap[d].total) }],
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

@media (max-width: 768px) {
  .detail-header__main {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .detail-header__actions {
    margin-left: 0;
    width: 100%;
    justify-content: space-between;
  }
  
  .mini-stat {
    margin-bottom: 12px;
  }
  
  .chart-container {
    height: 200px;
  }
}
</style>
