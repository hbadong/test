<template>
  <div class="leads-page">
    <!-- Stats Overview -->
    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="6">
        <div class="stat-mini stat-mini--blue">
          <div class="stat-mini__value">{{ leads.length }}</div>
          <div class="stat-mini__label">总线索</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-mini stat-mini--red">
          <div class="stat-mini__value">{{ leads.filter(l => l.intent_level === 'high').length }}</div>
          <div class="stat-mini__label">高意向</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-mini stat-mini--green">
          <div class="stat-mini__value">{{ leads.filter(l => l.status === 'converted').length }}</div>
          <div class="stat-mini__label">已成交</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-mini stat-mini--orange">
          <div class="stat-mini__value">{{ conversionRate }}%</div>
          <div class="stat-mini__label">转化率</div>
        </div>
      </el-col>
    </el-row>

    <!-- View Toggle & Filters -->
    <el-card class="filter-card">
      <div class="filter-bar">
        <div class="filter-bar__left">
          <el-button-group>
            <el-button :type="viewMode === 'table' ? 'primary' : 'default'" @click="viewMode = 'table'">
              <el-icon><Grid /></el-icon>表格
            </el-button>
            <el-button :type="viewMode === 'kanban' ? 'primary' : 'default'" @click="viewMode = 'kanban'">
              <el-icon><Menu /></el-icon>看板
            </el-button>
          </el-button-group>
        </div>
        <div class="filter-bar__right">
          <el-select v-model="filterSource" placeholder="来源" style="width: 120px" @change="fetchLeads">
            <el-option label="全部" value="" />
            <el-option label="AI拓客" value="prospect" />
            <el-option label="地图拓客" value="map-prospect" />
            <el-option label="AI电销" value="call" />
            <el-option label="个企微" value="wechat" />
          </el-select>
          <el-select v-model="filterIntent" placeholder="意向" style="width: 100px" @change="fetchLeads">
            <el-option label="全部" value="" />
            <el-option label="高" value="high" />
            <el-option label="中" value="medium" />
            <el-option label="低" value="low" />
          </el-select>
          <el-button type="primary" @click="importDialog = true">
            <el-icon><UploadFilled /></el-icon>导入
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- Batch Operations Bar -->
    <div v-if="selectedLeads.length > 0" class="batch-bar">
      <span class="batch-bar__count">已选 {{ selectedLeads.length }} 条</span>
      <el-button size="small" type="success" @click="batchUpdateStatus('contacted')">
        <el-icon><Phone /></el-icon>标记已联系
      </el-button>
      <el-button size="small" type="warning" @click="batchUpdateStatus('qualified')">
        <el-icon><Star /></el-icon>标记高意向
      </el-button>
      <el-button size="small" type="danger" @click="batchDelete">
        <el-icon><Delete /></el-icon>批量删除
      </el-button>
      <el-button size="small" link @click="selectedLeads = []">取消选择</el-button>
    </div>

    <!-- Table View -->
    <el-card v-if="viewMode === 'table'">
      <el-table :data="filteredLeads" style="width: 100%" @selection-change="onSelectionChange" class="leads-table">
        <el-table-column type="selection" width="40" />
        <el-table-column prop="name" label="名称" min-width="140">
          <template #default="{ row }">
            <div class="lead-name" @click="viewLead(row)">
              <div class="lead-avatar" :style="{ background: getAvatarColor(row.name) }">
                {{ row.name?.charAt(0) || '?' }}
              </div>
              <div>
                <span class="lead-name__text">{{ row.name || '未命名' }}</span>
                <div class="lead-name__company">{{ row.company || '-' }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="电话" width="140" />
        <el-table-column prop="email" label="邮箱" width="180" />
        <el-table-column prop="source" label="来源" width="110">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ sourceMap[row.source] || row.source }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="intent_level" label="意向" width="80">
          <template #default="{ row }">
            <el-tag :type="intentColorMap[row.intent_level]" size="small" round>{{ intentLabelMap[row.intent_level] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="score" label="评分" width="80">
          <template #default="{ row }">
            <div class="score-cell">
              <div class="score-bar" :style="{ width: `${calculateScore(row)}%`, background: getScoreColor(calculateScore(row)) }"></div>
              <span>{{ calculateScore(row) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusColorMap[row.status]" size="small" round>{{ statusLabelMap[row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="150">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="viewLead(row)">详情</el-button>
            <el-button size="small" link type="success" @click="nextStatus(row)">推进</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Kanban View -->
    <div v-else class="kanban-view">
      <div v-for="stage in kanbanStages" :key="stage.value" class="kanban-column">
        <div class="kanban-column__header" :style="{ borderColor: stage.color }">
          <span class="kanban-column__title">{{ stage.label }}</span>
          <span class="kanban-column__count">{{ getLeadsByStatus(stage.value).length }}</span>
        </div>
        <div class="kanban-column__body">
          <div v-for="lead in getLeadsByStatus(stage.value)" :key="lead.id" class="kanban-card" @click="viewLead(lead)">
            <div class="kanban-card__header">
              <div class="kanban-card__avatar" :style="{ background: getAvatarColor(lead.name) }">
                {{ lead.name?.charAt(0) || '?' }}
              </div>
              <div class="kanban-card__info">
                <div class="kanban-card__name">{{ lead.name || '未命名' }}</div>
                <div class="kanban-card__company">{{ lead.company || '-' }}</div>
              </div>
            </div>
            <div class="kanban-card__meta">
              <el-tag :type="intentColorMap[lead.intent_level]" size="small" round>{{ intentLabelMap[lead.intent_level] }}</el-tag>
              <span class="kanban-card__score">{{ calculateScore(lead) }}分</span>
            </div>
            <div class="kanban-card__contact">
              <span><el-icon><Phone /></el-icon>{{ lead.phone || '-' }}</span>
            </div>
            <div class="kanban-card__footer">
              <span class="kanban-card__source">{{ sourceMap[lead.source] }}</span>
              <el-button size="small" link type="primary" @click.stop="nextStatus(lead)">推进</el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Lead Detail Drawer -->
    <el-drawer v-model="detailDrawer" title="线索详情" size="480px">
      <div v-if="currentLead" class="lead-detail">
        <div class="lead-detail__header">
          <div class="lead-detail__avatar" :style="{ background: getAvatarColor(currentLead.name) }">
            {{ currentLead.name?.charAt(0) || '?' }}
          </div>
          <div class="lead-detail__info">
            <h3>{{ currentLead.name || '未命名' }}</h3>
            <p>{{ currentLead.company || '-' }}</p>
          </div>
        </div>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="电话">{{ currentLead.phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ currentLead.email || '-' }}</el-descriptions-item>
          <el-descriptions-item label="来源">{{ sourceMap[currentLead.source] || currentLead.source }}</el-descriptions-item>
          <el-descriptions-item label="意向等级">
            <el-tag :type="intentColorMap[currentLead.intent_level]" size="small">{{ intentLabelMap[currentLead.intent_level] }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusColorMap[currentLead.status]" size="small">{{ statusLabelMap[currentLead.status] }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="评分">{{ calculateScore(currentLead) }}分</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatTime(currentLead.created_at) }}</el-descriptions-item>
        </el-descriptions>
        
        <!-- Follow-up Timeline -->
        <div class="follow-up-section">
          <h4 class="follow-up__title">跟进记录</h4>
          <el-timeline class="follow-up__timeline">
            <el-timeline-item
              v-for="record in followUpRecords"
              :key="record.id"
              :timestamp="formatTime(record.created_at)"
              placement="top"
              :color="record.type === 'call' ? '#409eff' : record.type === 'visit' ? '#67c23a' : '#e6a23c'"
            >
              <div class="follow-up__record">
                <el-tag size="small" round>{{ followUpTypeMap[record.type] || record.type }}</el-tag>
                <p class="follow-up__note">{{ record.note }}</p>
              </div>
            </el-timeline-item>
            <el-empty v-if="!followUpRecords.length" description="暂无跟进记录" :image-size="40" />
          </el-timeline>
        </div>

        <!-- Add Follow-up -->
        <div class="follow-up-add">
          <el-input
            v-model="newFollowUpNote"
            type="textarea"
            :rows="2"
            placeholder="输入跟进记录..."
          />
          <div class="follow-up-add__actions">
            <el-select v-model="newFollowUpType" size="small" style="width: 100px">
              <el-option label="电话" value="call" />
              <el-option label="拜访" value="visit" />
              <el-option label="消息" value="message" />
              <el-option label="其他" value="other" />
            </el-select>
            <el-button type="primary" size="small" @click="addFollowUp">添加记录</el-button>
          </div>
        </div>

        <div class="lead-detail__actions">
          <el-button type="primary" @click="nextStatus(currentLead)" style="width: 100%">推进到下一阶段</el-button>
        </div>
      </div>
    </el-drawer>

    <!-- Import Dialog -->
    <el-dialog v-model="importDialog" title="导入线索" width="500px">
      <el-upload drag action="/api/leads/import" :on-success="() => { ElMessage.success('导入成功'); importDialog = false; fetchLeads() }" :show-file-list="false">
        <el-icon size="48" color="#409eff"><UploadFilled /></el-icon>
        <p>拖拽文件到这里，或 <em>点击上传</em></p>
        <p style="color: #909399; font-size: 12px">支持JSON/CSV格式</p>
      </el-upload>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled, UserFilled, Grid, Menu, Phone, Star, Delete } from '@element-plus/icons-vue'
import api from '../api'

const leads = ref<any[]>([])
const filterSource = ref('')
const filterIntent = ref('')
const viewMode = ref<'table' | 'kanban'>('table')
const importDialog = ref(false)
const detailDrawer = ref(false)
const currentLead = ref<any>(null)
const selectedLeads = ref<any[]>([])

const followUpRecords = ref<any[]>([])
const newFollowUpNote = ref('')
const newFollowUpType = ref('call')

const sourceMap: Record<string, string> = { prospect: 'AI拓客', 'map-prospect': '地图拓客', call: 'AI电销', live: 'AI直播', wechat: '个企微', import: '导入' }
const followUpTypeMap: Record<string, string> = { call: '电话', visit: '拜访', message: '消息', other: '其他' }
const statusLabelMap: Record<string, string> = { new: '新线索', contacted: '已联系', qualified: '高意向', converted: '已成交', lost: '已流失' }
const statusColorMap: Record<string, any> = { new: '', contacted: 'warning', qualified: 'success', converted: 'info', lost: 'danger' }
const intentLabelMap: Record<string, string> = { high: '高', medium: '中', low: '低', unknown: '未知' }
const intentColorMap: Record<string, any> = { high: 'danger', medium: 'warning', low: 'info', unknown: 'info' }

const kanbanStages = [
  { value: 'new', label: '新线索', color: '#409eff' },
  { value: 'contacted', label: '已联系', color: '#e6a23c' },
  { value: 'qualified', label: '高意向', color: '#67c23a' },
  { value: 'converted', label: '已成交', color: '#722ed1' },
  { value: 'lost', label: '已流失', color: '#f56c6c' },
]

const filteredLeads = computed(() => {
  let result = leads.value
  if (filterSource.value) result = result.filter(l => l.source === filterSource.value)
  if (filterIntent.value) result = result.filter(l => l.intent_level === filterIntent.value)
  return result
})

const conversionRate = computed(() => {
  const converted = leads.value.filter(l => l.status === 'converted').length
  return leads.value.length > 0 ? Math.round((converted / leads.value.length) * 100) : 0
})

onMounted(fetchLeads)

async function fetchLeads() {
  try {
    const params: Record<string, string> = {}
    if (filterSource.value) params.source = filterSource.value
    leads.value = await api.get('/leads', { params })
  } catch (e) { console.error(e) }
}

function getLeadsByStatus(status: string) {
  return filteredLeads.value.filter(l => l.status === status)
}

function calculateScore(lead: any): number {
  let score = 30
  if (lead.intent_level === 'high') score += 30
  else if (lead.intent_level === 'medium') score += 15
  if (lead.status === 'qualified') score += 15
  else if (lead.status === 'converted') score += 25
  else if (lead.status === 'contacted') score += 5
  if (lead.company) score += 5
  if (lead.phone) score += 5
  return Math.min(100, score)
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#67c23a'
  if (score >= 60) return '#e6a23c'
  if (score >= 40) return '#409eff'
  return '#909399'
}

function getAvatarColor(name: string): string {
  const colors = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  ]
  const hash = (name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function onSelectionChange(selection: any[]) {
  selectedLeads.value = selection
}

function viewLead(lead: any) {
  currentLead.value = lead
  detailDrawer.value = true
  fetchFollowUps(lead.id)
}

async function fetchFollowUps(leadId: string) {
  try {
    followUpRecords.value = await api.get(`/leads/${leadId}/follow-ups`)
  } catch { followUpRecords.value = [] }
}

async function addFollowUp() {
  if (!currentLead.value || !newFollowUpNote.value.trim()) return
  try {
    await api.post(`/leads/${currentLead.value.id}/follow-ups`, {
      type: newFollowUpType.value,
      note: newFollowUpNote.value,
    })
    ElMessage.success('跟进记录已添加')
    newFollowUpNote.value = ''
    await fetchFollowUps(currentLead.value.id)
  } catch { ElMessage.error('添加失败') }
}

async function nextStatus(lead: any) {
  const statuses = ['new', 'contacted', 'qualified', 'converted']
  const idx = statuses.indexOf(lead.status)
  if (idx >= statuses.length - 1) {
    ElMessage.info('该线索已在最终阶段')
    return
  }
  const nextStatus = statuses[idx + 1]
  try {
    await api.patch(`/leads/${lead.id}`, { status: nextStatus })
    ElMessage.success(`已推进至: ${statusLabelMap[nextStatus]}`)
    await fetchLeads()
  } catch (e) { ElMessage.error('更新失败') }
}

async function batchUpdateStatus(status: string) {
  try {
    for (const lead of selectedLeads.value) {
      await api.patch(`/leads/${lead.id}`, { status })
    }
    ElMessage.success(`已将 ${selectedLeads.value.length} 条线索标记为 ${statusLabelMap[status]}`)
    selectedLeads.value = []
    await fetchLeads()
  } catch (e) { ElMessage.error('批量更新失败') }
}

async function batchDelete() {
  try {
    await ElMessageBox.confirm(`确定删除 ${selectedLeads.value.length} 条线索？`, '确认')
    for (const lead of selectedLeads.value) {
      await api.delete(`/leads/${lead.id}`)
    }
    ElMessage.success('批量删除成功')
    selectedLeads.value = []
    await fetchLeads()
  } catch { /* cancelled */ }
}
</script>

<style scoped>
.leads-page {
  animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.stats-row { margin-bottom: 16px; }

.stat-mini {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.25s ease;
}

.stat-mini:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08); }
.stat-mini__value { font-size: 28px; font-weight: 700; }
.stat-mini__label { font-size: 12px; color: #909399; margin-top: 4px; }
.stat-mini--blue .stat-mini__value { color: #409eff; }
.stat-mini--red .stat-mini__value { color: #f56c6c; }
.stat-mini--green .stat-mini__value { color: #67c23a; }
.stat-mini--orange .stat-mini__value { color: #e6a23c; }

.filter-card { margin-bottom: 16px; }
.filter-card :deep(.el-card__body) { padding: 12px 16px; }

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.filter-bar__right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.batch-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #ecf5ff;
  border-radius: 8px;
  margin-bottom: 16px;
}

.batch-bar__count {
  font-weight: 600;
  color: #409eff;
}

.lead-name {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.lead-name__text { font-weight: 500; }
.lead-name__company { font-size: 12px; color: #909399; }

.lead-avatar {
  width: 32px; height: 32px;
  border-radius: 8px;
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 600;
  flex-shrink: 0;
}

.score-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.score-bar {
  height: 6px;
  border-radius: 3px;
  min-width: 20px;
  transition: width 0.3s;
}

/* Kanban */
.kanban-view {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 16px;
}

.kanban-column {
  min-width: 280px;
  flex: 1;
  background: #f5f7fa;
  border-radius: 12px;
  overflow: hidden;
}

.kanban-column__header {
  padding: 12px 16px;
  background: #fff;
  border-bottom: 3px solid;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.kanban-column__title { font-weight: 600; font-size: 14px; }
.kanban-column__count { font-size: 12px; color: #909399; background: #f0f0f0; padding: 2px 8px; border-radius: 10px; }

.kanban-column__body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 200px;
}

.kanban-card {
  background: #fff;
  border-radius: 10px;
  padding: 14px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: all 0.2s;
}

.kanban-card:hover { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); transform: translateY(-1px); }

.kanban-card__header { display: flex; gap: 10px; margin-bottom: 10px; }
.kanban-card__avatar { width: 36px; height: 36px; border-radius: 8px; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; flex-shrink: 0; }
.kanban-card__name { font-weight: 500; font-size: 14px; }
.kanban-card__company { font-size: 12px; color: #909399; }

.kanban-card__meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.kanban-card__score { font-size: 12px; color: #606266; font-weight: 500; }

.kanban-card__contact { font-size: 12px; color: #606266; margin-bottom: 8px; }
.kanban-card__contact .el-icon { margin-right: 4px; }

.kanban-card__footer { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #909399; border-top: 1px solid #f0f0f0; padding-top: 8px; }

/* Lead Detail */
.lead-detail__header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f0f0f0; }
.lead-detail__avatar { width: 56px; height: 56px; border-radius: 12px; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; }
.lead-detail__info h3 { margin: 0 0 4px; font-size: 18px; }
.lead-detail__info p { margin: 0; color: #909399; }
.lead-detail__actions { margin-top: 20px; }

/* Follow-up Section */
.follow-up-section { margin-top: 24px; }
.follow-up__title { font-size: 14px; font-weight: 600; color: #303133; margin: 0 0 16px; }
.follow-up__timeline { padding-left: 8px; }
.follow-up__record { display: flex; flex-direction: column; gap: 6px; }
.follow-up__note { margin: 0; font-size: 13px; color: #606266; line-height: 1.6; }

.follow-up-add { margin-top: 16px; }
.follow-up-add__actions { display: flex; gap: 8px; margin-top: 8px; align-items: center; }

@media (max-width: 768px) {
  .filter-card {
    margin-bottom: 12px;
    border-radius: var(--radius-md);
  }
  
  .filter-card :deep(.el-card__body) {
    padding: 10px 14px;
  }
  
  .filter-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .filter-bar__right {
    width: 100%;
    flex-direction: column;
    gap: 8px;
  }
  
  .filter-bar__right .el-select {
    width: 100% !important;
  }
  
  .batch-bar {
    flex-wrap: wrap;
    padding: 10px 12px;
    gap: 8px;
  }
  
  .batch-bar__count {
    width: 100%;
    margin-bottom: 4px;
  }
  
  .batch-bar .el-button {
    flex: 1;
    min-width: 0;
  }
  
  .leads-table {
    font-size: 13px;
  }
  
  .leads-table :deep(.el-table__cell) {
    padding: 10px 8px;
  }
  
  .lead-name {
    gap: 8px;
  }
  
  .lead-avatar {
    width: 28px;
    height: 28px;
    font-size: 12px;
  }
  
  .lead-name__text {
    font-size: 13px;
  }
  
  .lead-name__company {
    font-size: 12px;
  }
  
  .kanban-view {
    flex-direction: column;
    gap: 12px;
  }
  
  .kanban-column {
    min-width: 100%;
    border-radius: var(--radius-md);
  }
  
  .kanban-column__header {
    padding: 10px 14px;
  }
  
  .kanban-column__title {
    font-size: 13px;
  }
  
  .kanban-column__body {
    padding: 10px;
    gap: 8px;
  }
  
  .kanban-card {
    padding: 12px;
    border-radius: var(--radius-sm);
  }
  
  .kanban-card__avatar {
    width: 32px;
    height: 32px;
    font-size: 12px;
  }
  
  .kanban-card__name {
    font-size: 13px;
  }
  
  .kanban-card__company {
    font-size: 12px;
  }
  
  .kanban-card__meta {
    margin-bottom: 6px;
  }
  
  .kanban-card__contact {
    font-size: 12px;
    margin-bottom: 6px;
  }
  
  .kanban-card__footer {
    font-size: 12px;
    padding-top: 6px;
  }
  
  /* Lead Detail Drawer */
  .lead-detail__header {
    gap: 12px;
    margin-bottom: 16px;
    padding-bottom: 12px;
  }
  
  .lead-detail__avatar {
    width: 48px;
    height: 48px;
    font-size: 18px;
  }
  
  .lead-detail__info h3 {
    font-size: 16px;
  }
  
  .lead-detail__info p {
    font-size: 12px;
  }
  
  .el-descriptions :deep(.el-descriptions__label) {
    font-size: 12px;
    padding: 12px 8px;
  }
  
  .el-descriptions :deep(.el-descriptions__content) {
    font-size: 12px;
    padding: 12px 8px;
  }
  
  /* Follow-up Section */
  .follow-up-section {
    margin-top: 20px;
  }
  
  .follow-up__title {
    font-size: 13px;
    margin-bottom: 12px;
  }
  
  .follow-up__timeline {
    padding-left: 4px;
  }
  
  .follow-up__record {
    gap: 4px;
  }
  
  .follow-up__note {
    font-size: 12px;
  }
  
  .follow-up-add {
    margin-top: 12px;
  }
  
  .follow-up-add__actions {
    flex-direction: column;
    gap: 6px;
  }
  
  .follow-up-add__actions .el-select,
  .follow-up-add__actions .el-button {
    width: 100% !important;
  }
}

@media (max-width: 480px) {
  .stats-row {
    gap: 8px;
    margin-bottom: 10px;
  }
  
  .stat-mini {
    padding: 12px;
    border-radius: var(--radius-sm);
  }
  
  .stat-mini__value {
    font-size: 22px;
  }
  
  .stat-mini__label {
    font-size: 12px;
  }
  
  .leads-table :deep(.el-table__cell) {
    padding: 8px 6px;
  }
  
  .kanban-card {
    padding: 10px;
  }
  
  .el-drawer__body {
    padding: 16px;
  }
}
</style>
