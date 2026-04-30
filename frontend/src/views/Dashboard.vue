<template>
  <div class="dashboard">
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="12" :sm="12" :md="6">
        <div class="stat-card stat-card--blue">
          <div class="stat-card__icon">
            <el-icon size="28"><Avatar /></el-icon>
          </div>
          <div class="stat-card__content">
            <div class="stat-card__value">{{ stats.agentCount || 11 }}</div>
            <div class="stat-card__label">AI员工</div>
          </div>
          <div class="stat-card__bg"></div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6">
        <div class="stat-card stat-card--green">
          <div class="stat-card__icon">
            <el-icon size="28"><Document /></el-icon>
          </div>
          <div class="stat-card__content">
            <div class="stat-card__value">{{ stats.contentCount || 0 }}</div>
            <div class="stat-card__label">内容产出</div>
          </div>
          <div class="stat-card__bg"></div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6">
        <div class="stat-card stat-card--orange">
          <div class="stat-card__icon">
            <el-icon size="28"><UserFilled /></el-icon>
          </div>
          <div class="stat-card__content">
            <div class="stat-card__value">{{ stats.leadCount || 0 }}</div>
            <div class="stat-card__label">新增线索</div>
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
          <div class="stat-card__bg"></div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-row">
      <el-col :xs="24" :md="16">
        <el-card class="dashboard-card">
          <template #header>
            <div class="card-header">
              <div class="card-header__left">
                <el-icon :size="18" color="#409eff"><TrendCharts /></el-icon>
                <span>30天趋势</span>
              </div>
              <el-radio-group v-model="trendPeriod" size="small">
                <el-radio-button label="7">7天</el-radio-button>
                <el-radio-button label="30">30天</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="trendChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="8">
        <el-card class="dashboard-card">
          <template #header>
            <div class="card-header">
              <div class="card-header__left">
                <el-icon :size="18" color="#67c23a"><Monitor /></el-icon>
                <span>AI员工状态</span>
              </div>
            </div>
          </template>
          <div class="agent-status-list">
            <div v-for="agent in agentStatusList" :key="agent.id" class="agent-status-item">
              <div class="agent-status-item__info">
                <span class="agent-status-item__name">{{ agent.name }}</span>
                <span class="agent-status-item__type">{{ agent.type }}</span>
              </div>
              <el-tag 
                :type="agent.status === 'active' ? 'success' : agent.status === 'paused' ? 'warning' : 'info'" 
                size="small"
                effect="light"
                round
              >
                {{ agent.status === 'active' ? '运行中' : agent.status === 'paused' ? '暂停' : '已停止' }}
              </el-tag>
            </div>
            <el-empty v-if="!agentStatusList.length" description="暂无数据" :image-size="60" />
          </div>
        </el-card>
      </el-col>
    </el-row>

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
                  <span class="timeline-content__agent">{{ task.agent_name || task.agent_id }}</span>
                  <el-tag 
                    :type="task.status === 'success' ? 'success' : task.status === 'failed' ? 'danger' : 'warning'" 
                    size="small"
                    effect="light"
                    round
                  >
                    {{ task.status === 'success' ? '完成' : task.status === 'failed' ? '失败' : '运行中' }}
                  </el-tag>
                </div>
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
                  <div class="lead-item__avatar">{{ row.name?.charAt(0) || '?' }}</div>
                  <div class="lead-item__info">
                    <div class="lead-item__name">{{ row.name || '未命名' }}</div>
                    <div class="lead-item__company">{{ row.company || '-' }}</div>
                  </div>
                  <div class="lead-item__meta">
                    <el-tag size="small" effect="plain">{{ row.source || '-' }}</el-tag>
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
import { ref, onMounted, watch } from 'vue'
import { Avatar, Document, UserFilled, Connection, TrendCharts, Monitor, Clock } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import api from '../api'

const stats = ref<Record<string, number>>({})
const agentStatusList = ref<any[]>([])
const recentTasks = ref<any[]>([])
const recentLeads = ref<any[]>([])
const trendChartRef = ref<HTMLElement>()
const trendPeriod = ref('30')

onMounted(async () => {
  await fetchDashboard()
  initTrendChart()
})

watch(trendPeriod, () => {
  fetchDashboard()
})

async function fetchDashboard() {
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

    const tasksRes = await api.get('/dashboard/tasks/recent')
    recentTasks.value = (tasksRes.data || []).slice(0, 5)

    const leadsRes = await api.get('/dashboard/leads/summary')
    recentLeads.value = (leadsRes.data?.recent || []).slice(0, 5)

    const dailyRes = await api.get('/dashboard/daily-stats')
    const dailyStats = dailyRes.data as any[]
    const days = trendPeriod.value === '7' ? dailyStats.slice(-7) : dailyStats
    updateTrendChart(days)
  } catch (e) {
    console.error('Failed to fetch dashboard data:', e)
  }
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

let chartInstance: echarts.ECharts | null = null

function initTrendChart() {
  if (!trendChartRef.value) return
  chartInstance = echarts.init(trendChartRef.value)

  chartInstance.setOption({
    tooltip: { 
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#ebeef5',
      textStyle: { color: '#303133' },
    },
    legend: { 
      data: ['任务', '内容', '线索'],
      bottom: 0,
      itemWidth: 12,
      itemHeight: 3,
    },
    grid: { left: '3%', right: '4%', bottom: '10%', top: '8%', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: [],
      axisLine: { lineStyle: { color: '#ebeef5' } },
      axisTick: { show: false },
      axisLabel: { color: '#909399', fontSize: 11 },
    },
    yAxis: { 
      type: 'value',
      splitLine: { lineStyle: { color: '#f2f3f5', type: 'dashed' } },
      axisLabel: { color: '#909399', fontSize: 11 },
    },
    series: [
      { name: '任务', type: 'line', data: [], smooth: true, showSymbol: false, lineStyle: { width: 2 }, itemStyle: { color: '#409eff' }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(64,158,255,0.2)' }, { offset: 1, color: 'rgba(64,158,255,0.02)' }] } } },
      { name: '内容', type: 'line', data: [], smooth: true, showSymbol: false, lineStyle: { width: 2 }, itemStyle: { color: '#67c23a' }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(103,194,58,0.2)' }, { offset: 1, color: 'rgba(103,194,58,0.02)' }] } } },
      { name: '线索', type: 'line', data: [], smooth: true, showSymbol: false, lineStyle: { width: 2 }, itemStyle: { color: '#e6a23c' }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(230,162,60,0.2)' }, { offset: 1, color: 'rgba(230,162,60,0.02)' }] } } },
    ],
  })

  window.addEventListener('resize', () => chartInstance?.resize())
}

function updateTrendChart(data: any[]) {
  if (!chartInstance || !data?.length) return

  chartInstance.setOption({
    xAxis: { data: data.map((d: any) => d.date.slice(5)) },
    series: [
      { data: data.map((d: any) => d.tasks) },
      { data: data.map((d: any) => d.contents) },
      { data: data.map((d: any) => d.leads) },
    ],
  })
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
  cursor: default;
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

.chart-container {
  height: 300px;
  width: 100%;
}

/* Agent Status List */
.agent-status-list {
  max-height: 300px;
  overflow-y: auto;
}

.agent-status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}

.agent-status-item:last-child {
  border-bottom: none;
}

.agent-status-item__info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.agent-status-item__name {
  font-size: 14px;
  font-weight: 500;
}

.agent-status-item__type {
  font-size: 11px;
  color: #909399;
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  }
  
  .stat-card {
    margin-bottom: 12px;
  }
  
  .stat-card__value {
    font-size: 22px;
  }
  
  .chart-container {
    height: 220px;
  }
}
</style>
