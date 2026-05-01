<template>
  <div class="dashboard">
    <!-- Stats Cards -->
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="12" :sm="12" :md="6">
        <div class="stat-card stat-card--blue" @click="$router.push('/agents')">
          <div class="stat-card__icon">
            <el-icon size="28"><Avatar /></el-icon>
          </div>
          <div class="stat-card__content">
            <div class="stat-card__value">{{ stats.agentCount || 11 }}</div>
            <div class="stat-card__label">AI员工</div>
          </div>
          <div class="stat-card__trend" :class="stats.agentCount > 0 ? 'up' : ''">
            <el-icon v-if="stats.agentCount > 0"><Top /></el-icon>
            <span>运行中</span>
          </div>
          <div class="stat-card__bg"></div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6">
        <div class="stat-card stat-card--green" @click="$router.push('/contents')">
          <div class="stat-card__icon">
            <el-icon size="28"><Document /></el-icon>
          </div>
          <div class="stat-card__content">
            <div class="stat-card__value">{{ stats.contentCount || 0 }}</div>
            <div class="stat-card__label">内容产出</div>
          </div>
          <div class="stat-card__trend" :class="contentTrend > 0 ? 'up' : contentTrend < 0 ? 'down' : ''">
            <el-icon v-if="contentTrend > 0"><Top /></el-icon>
            <el-icon v-else-if="contentTrend < 0"><Bottom /></el-icon>
            <span>{{ contentTrend > 0 ? '+' : '' }}{{ contentTrend }}%</span>
          </div>
          <div class="stat-card__bg"></div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6">
        <div class="stat-card stat-card--orange" @click="$router.push('/leads')">
          <div class="stat-card__icon">
            <el-icon size="28"><UserFilled /></el-icon>
          </div>
          <div class="stat-card__content">
            <div class="stat-card__value">{{ stats.leadCount || 0 }}</div>
            <div class="stat-card__label">新增线索</div>
          </div>
          <div class="stat-card__trend" :class="leadTrend > 0 ? 'up' : leadTrend < 0 ? 'down' : ''">
            <el-icon v-if="leadTrend > 0"><Top /></el-icon>
            <el-icon v-else-if="leadTrend < 0"><Bottom /></el-icon>
            <span>{{ leadTrend > 0 ? '+' : '' }}{{ leadTrend }}%</span>
          </div>
          <div class="stat-card__bg"></div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6">
        <div class="stat-card stat-card--purple">
          <div class="stat-card__icon">
            <el-icon size="28"><Connection /></el-icon>
          </div>
          <div class="stat-card__content">
            <div class="stat-card__value">{{ stats.taskCount || 0 }}</div>
            <div class="stat-card__label">任务执行</div>
          </div>
          <div class="stat-card__trend">
            <span>成功率 {{ taskSuccessRate }}%</span>
          </div>
          <div class="stat-card__bg"></div>
        </div>
      </el-col>
    </el-row>

    <!-- Charts Row -->
    <el-row :gutter="20" class="chart-row">
      <el-col :xs="24" :md="16">
        <el-card class="dashboard-card">
          <template #header>
            <div class="card-header">
              <div class="card-header__left">
                <el-icon :size="18" color="#409eff"><TrendCharts /></el-icon>
                <span>30天趋势</span>
              </div>
              <div class="card-header__actions">
                <el-button size="small" @click="exportReport">
                  <el-icon><Download /></el-icon>导出报告
                </el-button>
                <el-radio-group v-model="trendPeriod" size="small" @change="onPeriodChange">
                  <el-radio-button label="7">7天</el-radio-button>
                  <el-radio-button label="30">30天</el-radio-button>
                </el-radio-group>
              </div>
            </div>
          </template>
          <div ref="trendChartRef" class="chart-container chart-container--trend"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="8">
        <el-card class="dashboard-card">
          <template #header>
            <div class="card-header">
              <div class="card-header__left">
                <el-icon :size="18" color="#67c23a"><PieChart /></el-icon>
                <span>任务成功率</span>
              </div>
            </div>
          </template>
          <div ref="successChartRef" class="chart-container chart-container--success"></div>
          <div class="success-legend">
            <div class="success-legend__item">
              <span class="success-legend__dot success-legend__dot--success"></span>
              <span>成功 {{ successData.success }} ({{ successRate }}%)</span>
            </div>
            <div class="success-legend__item">
              <span class="success-legend__dot success-legend__dot--fail"></span>
              <span>失败 {{ successData.fail }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Agent Status + Source Distribution -->
    <el-row :gutter="20" class="chart-row">
      <el-col :xs="24" :md="12">
        <el-card class="dashboard-card">
          <template #header>
            <div class="card-header">
              <div class="card-header__left">
                <el-icon :size="18" color="#67c23a"><Monitor /></el-icon>
                <span>AI员工状态</span>
              </div>
              <el-button link type="primary" @click="$router.push('/agents')">管理</el-button>
            </div>
          </template>
          <div class="agent-status-list">
            <div 
              v-for="agent in agentStatusList" 
              :key="agent.id" 
              class="agent-status-item"
              @click="goAgentDetail(agent)"
            >
              <div class="agent-status-item__left">
                <div class="agent-status-item__pulse" :class="{ 'agent-status-item__pulse--active': agent.status === 'active' }"></div>
                <div class="agent-status-item__info">
                  <span class="agent-status-item__name">{{ agent.name }}</span>
                  <span class="agent-status-item__type">{{ getTypeLabel(agent.type) }}</span>
                </div>
              </div>
              <div class="agent-status-item__right">
                <span class="agent-status-item__runs">{{ agent.total_runs || 0 }} 次</span>
                <el-tag 
                  :type="agent.status === 'active' ? 'success' : agent.status === 'paused' ? 'warning' : 'info'" 
                  size="small"
                  effect="light"
                  round
                >
                  {{ agent.status === 'active' ? '运行中' : agent.status === 'paused' ? '暂停' : '已停止' }}
                </el-tag>
              </div>
            </div>
            <el-empty v-if="!agentStatusList.length" description="暂无数据" :image-size="60" />
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-card class="dashboard-card">
          <template #header>
            <div class="card-header">
              <div class="card-header__left">
                <el-icon :size="18" color="#e6a23c"><Histogram /></el-icon>
                <span>内容来源分布</span>
              </div>
            </div>
          </template>
          <div ref="sourceChartRef" class="chart-container chart-container--source"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Recent Tasks + Leads -->
    <el-row :gutter="20" class="recent-row">
      <el-col :xs="24" :md="12">
        <el-card class="dashboard-card">
          <template #header>
            <div class="card-header">
              <div class="card-header__left">
                <el-icon :size="18" color="#e6a23c"><Clock /></el-icon>
                <span>最近任务</span>
              </div>
              <el-button link type="primary" @click="$router.push('/agents')">查看全部</el-button>
            </div>
          </template>
          <el-timeline class="task-timeline">
            <el-timeline-item 
              v-for="task in recentTasks" 
              :key="task.id" 
              :timestamp="formatTime(task.created_at)" 
              placement="top"
              :color="task.status === 'success' ? '#67c23a' : task.status === 'failed' ? '#f56c6c' : '#e6a23c'"
            >
              <div class="timeline-content">
                <div class="timeline-content__header">
                  <span class="timeline-content__agent">{{ task.agent_name || getAgentName(task.agent_id) }}</span>
                  <el-tag 
                    :type="task.status === 'success' ? 'success' : task.status === 'failed' ? 'danger' : 'warning'" 
                    size="small"
                    effect="light"
                    round
                  >
                    {{ task.status === 'success' ? '完成' : task.status === 'failed' ? '失败' : '运行中' }}
                  </el-tag>
                </div>
                <div v-if="task.error_message" class="timeline-content__error">{{ task.error_message }}</div>
              </div>
            </el-timeline-item>
            <el-empty v-if="!recentTasks.length" description="暂无任务记录" :image-size="60" />
          </el-timeline>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-card class="dashboard-card">
          <template #header>
            <div class="card-header">
              <div class="card-header__left">
                <el-icon :size="18" color="#f56c6c"><UserFilled /></el-icon>
                <span>最新线索</span>
              </div>
              <el-button link type="primary" @click="$router.push('/leads')">查看全部</el-button>
            </div>
          </template>
          <el-table :data="recentLeads" style="width: 100%" :show-header="false" class="lead-table">
            <el-table-column>
              <template #default="{ row }">
                <div class="lead-item">
                  <div class="lead-item__avatar" :style="{ background: getSourceColor(row.source) }">{{ row.name?.charAt(0) || '?' }}</div>
                  <div class="lead-item__info">
                    <div class="lead-item__name">{{ row.name || '未命名' }}</div>
                    <div class="lead-item__company">{{ row.company || '-' }}</div>
                  </div>
                  <div class="lead-item__meta">
                    <el-tag size="small" effect="plain">{{ getSourceLabel(row.source) }}</el-tag>
                  </div>
                </div>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!recentLeads.length" description="暂无线索" :image-size="60" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Avatar, Document, UserFilled, Connection, TrendCharts, Monitor, Clock, PieChart, Histogram, Top, Bottom, Download } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import api from '../api'

const router = useRouter()
const stats = ref<Record<string, number>>({})
const agentStatusList = ref<any[]>([])
const recentTasks = ref<any[]>([])
const recentLeads = ref<any[]>([])
const loading = ref(false)
const trendChartRef = ref<HTMLElement>()
const successChartRef = ref<HTMLElement>()
const sourceChartRef = ref<HTMLElement>()
const trendPeriod = ref('30')
const contentTrend = ref(0)
const leadTrend = ref(0)

const successData = ref({ success: 0, fail: 0 })
const sourceData = ref<any[]>([])

let trendInstance: echarts.ECharts | null = null
let successInstance: echarts.ECharts | null = null
let sourceInstance: echarts.ECharts | null = null

const agentTypeMap: Record<string, string> = {
  trend: '一键追爆', create: 'AI创作', avatar: '数字人', video: '大片自动生成',
  prospect: 'AI拓客', 'map-prospect': '地图拓客', wechat: 'AI个企微',
  hr: 'AI人事', legal: 'AI法务', call: 'AI电销', live: 'AI直播',
}

function getTypeLabel(type: string): string {
  return agentTypeMap[type] || type
}

function getAgentName(id: string): string {
  const agent = agentStatusList.value.find(a => a.id === id)
  return agent ? agent.name : id
}

const sourceColorMap: Record<string, string> = {
  trend: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  create: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  avatar: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  video: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  prospect: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'map-prospect': 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  wechat: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  default: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
}

function getSourceColor(source: string): string {
  const colors: Record<string, string> = {
    prospect: '#fa709a', 'map-prospect': '#a18cd1', import: '#667eea', test: '#43e97b',
  }
  return colors[source] || '#667eea'
}

function getSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    prospect: 'AI拓客', 'map-prospect': '地图拓客', import: '导入', test: '测试',
  }
  return labels[source] || source
}

const taskSuccessRate = ref(0)
const successRate = ref(0)

onMounted(async () => {
  await fetchDashboard()
  initCharts()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  trendInstance?.dispose()
  successInstance?.dispose()
  sourceInstance?.dispose()
})

function handleResize() {
  const isNarrow = window.innerWidth < 480
  trendInstance?.resize()
  successInstance?.resize()
  sourceInstance?.resize()
  
  // Update legend visibility on narrow screens
  if (trendInstance) {
    trendInstance.setOption({
      legend: { show: !isNarrow, itemGap: isNarrow ? 10 : 20, textStyle: { fontSize: isNarrow ? 10 : 12 } },
      grid: { bottom: isNarrow ? '8%' : '12%' },
    })
  }
}

async function fetchDashboard() {
  loading.value = true
  try {
    const overview = await api.get('/dashboard/overview')
    const overviewData = overview.data as any
    stats.value = {
      agentCount: 11,
      contentCount: overviewData.contents?.reduce((s: number, c: any) => s + c.count, 0) || 0,
      leadCount: overviewData.leads?.reduce((s: number, l: any) => s + l.count, 0) || 0,
      taskCount: overviewData.tasks?.reduce((s: number, t: any) => s + t.count, 0) || 0,
    }

    const agentsRes = await api.get('/agents')
    agentStatusList.value = agentsRes.data

    // Calculate task success rate
    const totalRuns = agentsRes.data.reduce((s: number, a: any) => s + (a.total_runs || 0), 0)
    const totalSuccess = agentsRes.data.reduce((s: number, a: any) => s + (a.success_count || 0), 0)
    const totalFail = agentsRes.data.reduce((s: number, a: any) => s + (a.fail_count || 0), 0)
    taskSuccessRate.value = totalRuns > 0 ? Math.round((totalSuccess / totalRuns) * 100) : 0
    successData.value = { success: totalSuccess, fail: totalFail }
    successRate.value = (totalSuccess + totalFail) > 0 ? Math.round((totalSuccess / (totalSuccess + totalFail)) * 100) : 0

    // Calculate trends
    if (overviewData.contents?.length >= 2) {
      const contents = overviewData.contents
      const prev = contents[contents.length - 2]?.count || 0
      const curr = contents[contents.length - 1]?.count || 0
      contentTrend.value = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0
    }
    if (overviewData.leads?.length >= 2) {
      const leads = overviewData.leads
      const prev = leads[leads.length - 2]?.count || 0
      const curr = leads[leads.length - 1]?.count || 0
      leadTrend.value = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0
    }

    const tasksRes = await api.get('/dashboard/tasks/recent')
    recentTasks.value = (tasksRes.data || []).slice(0, 8)

    const leadsRes = await api.get('/dashboard/leads/summary')
    recentLeads.value = (leadsRes.data?.recent || []).slice(0, 5)

    const dailyRes = await api.get('/dashboard/daily-stats')
    const dailyStats = dailyRes.data as any[]
    const days = trendPeriod.value === '7' ? dailyStats.slice(-7) : dailyStats
    updateTrendChart(days)
    updateSuccessChart()
    updateSourceChart(agentsRes.data)
  } catch (e) {
    console.error('Failed to fetch dashboard data:', e)
  } finally {
    loading.value = false
  }
}

function onPeriodChange() {
  fetchDashboard()
}

function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function goAgentDetail(agent: any) {
  router.push({ path: '/agents', query: { id: agent.id } })
}

// Export report
async function exportReport() {
  try {
    ElMessage.info('正在生成报告...')
    
    // Fetch all data for export
    const [overview, agentsRes, leadsRes] = await Promise.all([
      api.get('/dashboard/overview'),
      api.get('/agents'),
      api.get('/leads', { params: { limit: 100 } }),
    ])
    
    const overviewData = (overview as any).data
    const agents = agentsRes.data
    const leads = leadsRes
    
    // Build CSV content
    const csvParts: string[] = ['"AI智能体系统 - 数据导出报告"']
    csvParts.push(`"导出时间:","${new Date().toLocaleString('zh-CN')}"`)
    csvParts.push('')
    
    // Summary
    csvParts.push('"=== 概览 ==="')
    const totalRuns = agents.reduce((s: number, a: any) => s + (a.total_runs || 0), 0)
    const totalSuccess = agents.reduce((s: number, a: any) => s + (a.success_count || 0), 0)
    csvParts.push(`"AI员工数:","11"`)
    csvParts.push(`"总任务数:","${totalRuns}"`)
    csvParts.push(`"成功数:","${totalSuccess}"`)
    csvParts.push(`"成功率:","${totalRuns > 0 ? Math.round((totalSuccess / totalRuns) * 100) : 0}%"`)
    csvParts.push(`"内容总数:","${overviewData.contents?.reduce((s: number, c: any) => s + c.count, 0) || 0}"`)
    csvParts.push(`"线索总数:","${overviewData.leads?.reduce((s: number, l: any) => s + l.count, 0) || 0}"`)
    csvParts.push('')
    
    // Agent status
    csvParts.push('"=== AI员工状态 ==="')
    csvParts.push('"名称","类型","状态","总运行","成功","失败"')
    agents.forEach((a: any) => {
      csvParts.push(`"${a.name}","${agentTypeMap[a.type] || a.type}","${a.status === 'active' ? '运行中' : '已停止'}","${a.total_runs || 0}","${a.success_count || 0}","${a.fail_count || 0}"`)
    })
    csvParts.push('')
    
    // Recent leads
    csvParts.push('"=== 线索列表 (最近100条) ==="')
    csvParts.push('"名称","公司","电话","来源","意向","状态","创建时间"')
    leads.forEach((l: any) => {
      csvParts.push(`"${l.name || ''}","${l.company || ''}","${l.phone || ''}","${l.source}","${l.intent_level}","${l.status}","${l.created_at || ''}"`)
    })
    
    const csvContent = '\uFEFF' + csvParts.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `AI员工系统报告_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    
    ElMessage.success('报告已导出')
  } catch (e) {
    console.error(e)
    ElMessage.error('导出失败')
  }
}

// Charts
function initCharts() {
  if (trendChartRef.value) {
    trendInstance = echarts.init(trendChartRef.value)
    trendInstance.setOption(getTrendOption())
  }
  if (successChartRef.value) {
    successInstance = echarts.init(successChartRef.value)
    successInstance.setOption(getSuccessOption())
  }
  if (sourceChartRef.value) {
    sourceInstance = echarts.init(sourceChartRef.value)
    sourceInstance.setOption(getSourceOption([]))
  }
}

function getTrendOption() {
  const isNarrow = window.innerWidth < 480
  return {
    tooltip: { 
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#ebeef5',
      borderWidth: 1,
      textStyle: { color: '#303133', fontSize: 12 },
      axisPointer: { type: 'cross', crossStyle: { color: '#999' }, lineStyle: { color: '#409eff', type: 'dashed' } },
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
    legend: { 
      data: ['任务', '内容', '线索'],
      bottom: 0,
      show: !isNarrow,
      itemWidth: 14,
      itemHeight: 8,
      itemGap: isNarrow ? 10 : 20,
      textStyle: { fontSize: isNarrow ? 10 : 12, color: '#606266' },
    },
    grid: { left: '3%', right: '4%', bottom: isNarrow ? '8%' : '12%', top: '8%', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: [],
      axisLine: { lineStyle: { color: '#ebeef5' } },
      axisTick: { show: false },
      axisLabel: { color: '#909399', fontSize: isNarrow ? 9 : 11, rotate: isNarrow ? 30 : 0, interval: isNarrow ? 'auto' : 0 },
    },
    yAxis: { 
      type: 'value',
      splitLine: { lineStyle: { color: '#f2f3f5', type: 'dashed' } },
      axisLabel: { color: '#909399', fontSize: 11 },
    },
    series: [
      { name: '任务', type: 'line', data: [], smooth: true, showSymbol: false, lineStyle: { width: 2.5 }, itemStyle: { color: '#409eff' }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(64,158,255,0.25)' }, { offset: 1, color: 'rgba(64,158,255,0.02)' }] } } },
      { name: '内容', type: 'line', data: [], smooth: true, showSymbol: false, lineStyle: { width: 2.5 }, itemStyle: { color: '#67c23a' }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(103,194,58,0.25)' }, { offset: 1, color: 'rgba(103,194,58,0.02)' }] } } },
      { name: '线索', type: 'line', data: [], smooth: true, showSymbol: false, lineStyle: { width: 2.5 }, itemStyle: { color: '#e6a23c' }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(230,162,60,0.25)' }, { offset: 1, color: 'rgba(230,162,60,0.02)' }] } } },
    ],
  }
}

function getSuccessOption() {
  return {
    tooltip: { 
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#ebeef5',
      textStyle: { color: '#303133' },
    },
    series: [{
      type: 'pie',
      radius: ['55%', '78%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: { scaleSize: 6 },
      labelLine: { show: false },
      data: [
        { value: successData.value.success, name: '成功', itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 1, colorStops: [{ offset: 0, color: '#67c23a' }, { offset: 1, color: '#95d475' }] } } },
        { value: successData.value.fail, name: '失败', itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 1, colorStops: [{ offset: 0, color: '#f56c6c' }, { offset: 1, color: '#fab6b6' }] } } },
      ],
    }],
  }
}

function getSourceOption(data: any[]) {
  return {
    tooltip: { 
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#ebeef5',
      textStyle: { color: '#303133' },
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '50%'],
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, position: 'outside', formatter: '{b}\n{d}%', fontSize: 11, color: '#606266' },
      labelLine: { length: 8, length2: 12 },
      data: data.length > 0 ? data : [{ value: 0, name: '暂无数据', itemStyle: { color: '#ebeef5' } }],
    }],
  }
}

function updateTrendChart(data: any[]) {
  if (!trendInstance || !data?.length) return
  trendInstance.setOption({
    xAxis: { data: data.map((d: any) => d.date.slice(5)) },
    series: [
      { data: data.map((d: any) => d.tasks || 0) },
      { data: data.map((d: any) => d.contents || 0) },
      { data: data.map((d: any) => d.leads || 0) },
    ],
  })
}

function updateSuccessChart() {
  if (!successInstance) return
  successInstance.setOption(getSuccessOption())
}

function updateSourceChart(agents: any[]) {
  if (!sourceInstance) return
  const typeCount: Record<string, number> = {}
  agents.forEach(a => {
    typeCount[a.type] = (typeCount[a.type] || 0) + (a.total_runs || 0)
  })
  const colors = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16', '#52c41a', '#2f54eb', '#1890ff']
  const data = Object.entries(typeCount).map(([type, count], i) => ({
    value: count,
    name: getTypeLabel(type),
    itemStyle: { color: colors[i % colors.length] },
  })).sort((a, b) => b.value - a.value)
  
  sourceData.value = data
  sourceInstance.setOption(getSourceOption(data))
}
</script>

<style scoped>
.dashboard {
  animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.stats-row {
  margin-bottom: 20px;
}

.chart-row {
  margin-bottom: 20px;
}

.recent-row {
  margin-bottom: 0;
}

/* Stat Cards */
.stat-card {
  position: relative;
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.25s ease;
  overflow: hidden;
  cursor: pointer;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.stat-card__bg {
  position: absolute;
  right: -20px;
  top: -20px;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  opacity: 0.1;
  transition: all 0.25s ease;
}

.stat-card:hover .stat-card__bg {
  transform: scale(1.1);
}

.stat-card--blue .stat-card__icon { background: rgba(64, 158, 255, 0.1); color: #409eff; }
.stat-card--blue .stat-card__bg { background: #409eff; }
.stat-card--blue .stat-card__value { color: #409eff; }

.stat-card--green .stat-card__icon { background: rgba(103, 194, 58, 0.1); color: #67c23a; }
.stat-card--green .stat-card__bg { background: #67c23a; }
.stat-card--green .stat-card__value { color: #67c23a; }

.stat-card--orange .stat-card__icon { background: rgba(230, 162, 60, 0.1); color: #e6a23c; }
.stat-card--orange .stat-card__bg { background: #e6a23c; }
.stat-card--orange .stat-card__value { color: #e6a23c; }

.stat-card--purple .stat-card__icon { background: rgba(114, 46, 209, 0.1); color: #722ed1; }
.stat-card--purple .stat-card__bg { background: #722ed1; }
.stat-card--purple .stat-card__value { color: #722ed1; }

.stat-card__icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-card__content {
  position: relative;
  z-index: 1;
}

.stat-card__value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.5px;
}

.stat-card__label {
  color: #909399;
  font-size: 13px;
  margin-top: 2px;
}

.stat-card__trend {
  position: absolute;
  right: 16px;
  bottom: 12px;
  font-size: 12px;
  color: #909399;
  display: flex;
  align-items: center;
  gap: 2px;
}

.stat-card__trend.up { color: #67c23a; }
.stat-card__trend.down { color: #f56c6c; }

/* Dashboard Cards */
.dashboard-card {
  height: 100%;
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

.card-header__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chart-container {
  width: 100%;
}

.chart-container--trend {
  height: 300px;
}

.chart-container--success {
  height: 180px;
}

.chart-container--source {
  height: 250px;
}

/* Success Legend */
.success-legend {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f5f5f5;
}

.success-legend__item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #606266;
}

.success-legend__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.success-legend__dot--success { background: #67c23a; }
.success-legend__dot--fail { background: #f56c6c; }

/* Agent Status List */
.agent-status-list {
  max-height: 320px;
  overflow-y: auto;
}

.agent-status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 8px;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  transition: background 0.15s;
  border-radius: 6px;
}

.agent-status-item:hover {
  background: #f5f7fa;
}

.agent-status-item:last-child {
  border-bottom: none;
}

.agent-status-item__left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.agent-status-item__pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #c0c4cc;
}

.agent-status-item__pulse--active {
  background: #67c23a;
  box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.2);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.2); }
  50% { box-shadow: 0 0 0 6px rgba(103, 194, 58, 0.1); }
}

.agent-status-item__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.agent-status-item__name {
  font-size: 14px;
  font-weight: 500;
}

.agent-status-item__type {
  font-size: 12px;
  color: #909399;
}

.agent-status-item__right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.agent-status-item__runs {
  font-size: 12px;
  color: #909399;
}

/* Timeline */
.task-timeline {
  padding: 0 10px;
}

.timeline-content__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.timeline-content__agent {
  font-weight: 500;
  font-size: 14px;
}

.timeline-content__error {
  font-size: 12px;
  color: #f56c6c;
  margin-top: 4px;
  background: #fef0f0;
  padding: 4px 8px;
  border-radius: 4px;
}

/* Lead Table */
.lead-table :deep(.el-table__inner-wrapper::before) {
  display: none;
}

.lead-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.lead-item__avatar {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.lead-item__info {
  flex: 1;
  min-width: 0;
}

.lead-item__name {
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lead-item__company {
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lead-item__meta {
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .stats-row {
    margin-bottom: 12px;
    gap: 10px;
  }
  
  .stat-card {
    padding: 14px;
    margin-bottom: 0;
    border-radius: var(--radius-md);
  }
  
  .stat-card__icon {
    width: 42px;
    height: 42px;
    border-radius: var(--radius-sm);
  }
  
  .stat-card__value {
    font-size: 20px;
    font-weight: 800;
  }
  
  .stat-card__label {
    font-size: 12px;
    margin-top: 1px;
  }
  
  .stat-card__trend {
    display: none;
  }
  
  .chart-row {
    margin-bottom: 12px;
  }
  
  .dashboard-card {
    margin-bottom: 12px;
    border-radius: var(--radius-md);
  }
  
  .dashboard-card :deep(.el-card__header) {
    padding: 14px 16px;
  }
  
  .dashboard-card :deep(.el-card__body) {
    padding: 16px;
  }
  
  .chart-container--trend {
    height: 220px;
  }
  
  .chart-container--success {
    height: 160px;
  }
  
  .chart-container--source {
    height: 200px;
  }
  
  .agent-status-list {
    max-height: 220px;
  }
  
  .agent-status-item {
    padding: 10px 6px;
  }
  
  .agent-status-item__type {
    display: none;
  }
  
  .agent-status-item__runs {
    display: none;
  }
  
  .agent-status-item__name {
    font-size: 13px;
  }
  
  .timeline-content__agent {
    font-size: 13px;
  }
  
  .timeline-content__error {
    font-size: 12px;
  }
  
  .lead-item__company {
    display: none;
  }
  
  .lead-item__avatar {
    width: 32px;
    height: 32px;
    font-size: 12px;
  }
  
  .lead-item__name {
    font-size: 13px;
  }
  
  .success-legend {
    gap: 16px;
  }
  
  .success-legend__item {
    font-size: 12px;
  }
  
  .card-header__actions {
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
  }
}

@media (max-width: 480px) {
  .stats-row {
    gap: 8px;
  }
  
  .stat-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 12px;
    border-radius: var(--radius-sm);
  }
  
  .stat-card__icon {
    width: 34px;
    height: 34px;
  }
  
  .stat-card__value {
    font-size: 18px;
  }
  
  .stat-card__trend {
    position: static;
    margin-top: 2px;
    font-size: 12px;
  }
  
  .chart-container--trend {
    height: 180px;
  }
  
  .chart-container--success {
    height: 140px;
  }
  
  .chart-container--source {
    height: 160px;
  }
  
  .dashboard-card :deep(.el-card__header) {
    padding: 12px 14px;
  }
  
  .dashboard-card :deep(.el-card__body) {
    padding: 12px;
  }
  
  .card-header__left span {
    font-size: 14px;
  }
  
  .agent-status-list {
    max-height: 180px;
  }
  
  .agent-status-item__pulse {
    width: 6px;
    height: 6px;
  }
  
  .timeline-content__header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .success-legend {
    gap: 12px;
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .success-legend__item {
    font-size: 12px;
  }
  
  .card-header__actions {
    flex-wrap: wrap;
    gap: 6px;
  }
  
  .card-header__actions .el-radio-group {
    display: none;
  }
  
  .card-header__actions .el-button {
    font-size: 12px;
    padding: 4px 8px;
  }
}
</style>
