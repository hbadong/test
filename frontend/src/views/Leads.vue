<template>
  <div class="leads-page">
    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="6">
        <div class="stat-mini stat-mini--blue">
          <div class="stat-mini__value">{{ summary.bySource?.reduce((s: number, i: any) => s + i.count, 0) || 0 }}</div>
          <div class="stat-mini__label">总线索</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-mini stat-mini--red">
          <div class="stat-mini__value">{{ getIntentCount('high') }}</div>
          <div class="stat-mini__label">高意向</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-mini stat-mini--orange">
          <div class="stat-mini__value">{{ getIntentCount('medium') }}</div>
          <div class="stat-mini__label">中意向</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-mini stat-mini--gray">
          <div class="stat-mini__value">{{ getIntentCount('low') }}</div>
          <div class="stat-mini__label">低意向</div>
        </div>
      </el-col>
    </el-row>

    <el-card>
      <template #header>
        <div class="card-header">
          <div class="card-header__left">
            <el-icon :size="18" color="#409eff"><UserFilled /></el-icon>
            <span>线索列表</span>
          </div>
          <div class="card-header__right">
            <el-select v-model="filterSource" placeholder="来源" style="width: 120px" @change="fetchLeads">
              <el-option label="全部" value="" />
              <el-option label="AI拓客" value="prospect" />
              <el-option label="地图拓客" value="map-prospect" />
              <el-option label="AI电销" value="call" />
              <el-option label="AI直播" value="live" />
            </el-select>
            <el-button type="primary" @click="importDialog = true">
              <el-icon><UploadFilled /></el-icon>导入线索
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="leads" style="width: 100%" class="leads-table">
        <el-table-column prop="name" label="名称" min-width="120">
          <template #default="{ row }">
            <div class="lead-name">
              <div class="lead-avatar" :style="{ background: getAvatarColor(row.name) }">
                {{ row.name?.charAt(0) || '?' }}
              </div>
              <span>{{ row.name || '未命名' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="company" label="公司" min-width="140" />
        <el-table-column prop="phone" label="电话" width="140" />
        <el-table-column prop="source" label="来源" width="110">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ sourceMap[row.source] || row.source }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="intent_level" label="意向" width="80">
          <template #default="{ row }">
            <el-tag 
              :type="row.intent_level === 'high' ? 'danger' : row.intent_level === 'medium' ? 'warning' : 'info'" 
              size="small" 
              effect="light"
              round
            >
              {{ row.intent_level === 'high' ? '高' : row.intent_level === 'medium' ? '中' : '低' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" round>{{ statusMap[row.status] || row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="170" />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="viewLead(row)">详情</el-button>
            <el-button size="small" link type="success" @click="updateStatus(row)">跟进</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="importDialog" title="导入线索" width="500px">
      <el-upload
        drag
        action="/api/leads/import"
        :on-success="() => { ElMessage.success('导入成功'); importDialog = false; fetchLeads() }"
        :show-file-list="false"
      >
        <el-icon size="48" color="#409eff"><UploadFilled /></el-icon>
        <p>拖拽文件到这里，或 <em>点击上传</em></p>
        <p style="color: #909399; font-size: 12px">支持JSON/CSV格式</p>
      </el-upload>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled, UserFilled } from '@element-plus/icons-vue'
import api from '../api'

const leads = ref<any[]>([])
const summary = ref<any>({})
const filterSource = ref('')
const importDialog = ref(false)

const sourceMap: Record<string, string> = {
  'prospect': 'AI拓客',
  'map-prospect': '地图拓客',
  'call': 'AI电销',
  'live': 'AI直播',
  'wechat': '个企微',
}

const statusMap: Record<string, string> = {
  'new': '新线索',
  'contacted': '已联系',
  'qualified': '高意向',
  'converted': '已成交',
  'lost': '已流失',
}

onMounted(async () => {
  await fetchLeads()
  await fetchSummary()
})

async function fetchLeads() {
  try {
    const params: Record<string, string> = {}
    if (filterSource.value) params.source = filterSource.value
    leads.value = await api.get('/leads', { params })
  } catch (e) { console.error(e) }
}

async function fetchSummary() {
  try { summary.value = await api.get('/dashboard/leads/summary') } catch (e) { console.error(e) }
}

function getIntentCount(level: string): number {
  return summary.value?.byIntent?.find((i: any) => i.intent_level === level)?.count || 0
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

function viewLead(lead: any) {
  ElMessage.info(`查看线索: ${lead.name} - ${lead.company}`)
}

async function updateStatus(lead: any) {
  const statuses = ['new', 'contacted', 'qualified', 'converted', 'lost']
  const idx = statuses.indexOf(lead.status)
  const nextStatus = statuses[(idx + 1) % statuses.length]
  try {
    await api.patch(`/leads/${lead.id}`, { status: nextStatus })
    ElMessage.success(`状态已更新为: ${statusMap[nextStatus]}`)
    await fetchLeads()
  } catch (e) { ElMessage.error('更新失败') }
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

.stats-row {
  margin-bottom: 20px;
}

.stat-mini {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.25s ease;
}

.stat-mini:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.stat-mini__value {
  font-size: 28px;
  font-weight: 700;
}

.stat-mini__label {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.stat-mini--blue .stat-mini__value { color: #409eff; }
.stat-mini--red .stat-mini__value { color: #f56c6c; }
.stat-mini--orange .stat-mini__value { color: #e6a23c; }
.stat-mini--gray .stat-mini__value { color: #909399; }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.card-header__left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 15px;
}

.card-header__right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.lead-name {
  display: flex;
  align-items: center;
  gap: 10px;
}

.lead-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .card-header__right {
    width: 100%;
  }
  
  .card-header__right .el-select {
    flex: 1;
  }
}
</style>
