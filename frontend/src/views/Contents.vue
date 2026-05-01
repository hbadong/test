<template>
  <div class="contents-page">
    <!-- Stats Overview -->
    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="6">
        <div class="stat-card stat-card--blue">
          <div class="stat-card__value">{{ stats.total }}</div>
          <div class="stat-card__label">总内容</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card stat-card--green">
          <div class="stat-card__value">{{ stats.published }}</div>
          <div class="stat-card__label">已发布</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card stat-card--orange">
          <div class="stat-card__value">{{ stats.views }}</div>
          <div class="stat-card__label">总阅读量</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card stat-card--purple">
          <div class="stat-card__value">{{ stats.engagement }}%</div>
          <div class="stat-card__label">互动率</div>
        </div>
      </el-col>
    </el-row>

    <!-- Content List -->
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="card-header__left">
            <el-icon :size="18" color="#67c23a"><Document /></el-icon>
            <span>内容中心</span>
          </div>
          <div class="card-header__right">
            <el-select v-model="filterType" placeholder="类型" style="width: 110px" @change="fetchContents">
              <el-option label="全部" value="" />
              <el-option label="文章" value="article" />
              <el-option label="图片" value="image" />
              <el-option label="视频" value="video" />
              <el-option label="脚本" value="script" />
              <el-option label="文案" value="copywriting" />
            </el-select>
            <el-select v-model="filterStatus" placeholder="状态" style="width: 110px" @change="fetchContents">
              <el-option label="全部" value="" />
              <el-option label="草稿" value="draft" />
              <el-option label="待发布" value="pending" />
              <el-option label="已发布" value="published" />
            </el-select>
            <el-button type="primary" @click="showCreateDialog">
              <el-icon><Plus /></el-icon>新建内容
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="contents" style="width: 100%">
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="typeColorMap[row.type]" size="small" round>{{ typeLabelMap[row.type] || row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="200">
          <template #default="{ row }">
            <div class="title-cell">
              <span class="title-cell__text">{{ row.title }}</span>
              <div class="title-cell__platforms">
                <el-tag v-for="p in parsePlatforms(row.publish_platform)" :key="p" size="small" effect="plain" class="platform-tag">{{ platformLabelMap[p] || p }}</el-tag>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="source_agent_id" label="来源" width="110">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ agentMap[row.source_agent_id] || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="数据" width="140">
          <template #default="{ row }">
            <div class="metrics-cell">
              <span><el-icon><View /></el-icon>{{ formatMetrics(row.metrics).views }}</span>
              <span><el-icon><Star /></el-icon>{{ formatMetrics(row.metrics).likes }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="statusColorMap[row.status]" size="small" round>{{ statusLabelMap[row.status] || row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="150">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="viewContent(row)">预览</el-button>
            <el-button size="small" link type="success" v-if="row.status === 'draft'" @click="showPublishDialog(row)">发布</el-button>
            <el-button size="small" link type="warning" @click="editContent(row)">编辑</el-button>
            <el-button size="small" link type="danger" @click="deleteContent(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!contents.length" description="暂无内容" :image-size="80" />
    </el-card>

    <!-- Content Preview Dialog -->
    <el-dialog v-model="previewDialog" title="内容预览" width="800px" class="preview-dialog">
      <div v-if="currentContent" class="preview-body">
        <div class="preview-header">
          <h2>{{ currentContent.title }}</h2>
          <div class="preview-meta">
            <el-tag size="small">{{ typeLabelMap[currentContent.type] }}</el-tag>
            <el-tag size="small" :type="statusColorMap[currentContent.status]">{{ statusLabelMap[currentContent.status] }}</el-tag>
            <span class="preview-meta__time">{{ formatTime(currentContent.created_at) }}</span>
          </div>
        </div>
        <div class="preview-content" v-html="renderContent(currentContent)"></div>
        <el-divider />
        <div class="preview-stats">
          <div class="preview-stat"><el-icon :size="18" color="#409eff"><View /></el-icon><span>{{ formatMetrics(currentContent.metrics).views }} 阅读</span></div>
          <div class="preview-stat"><el-icon :size="18" color="#67c23a"><Star /></el-icon><span>{{ formatMetrics(currentContent.metrics).likes }} 点赞</span></div>
          <div class="preview-stat"><el-icon :size="18" color="#e6a23c"><ChatDotRound /></el-icon><span>{{ formatMetrics(currentContent.metrics).comments }} 评论</span></div>
          <div class="preview-stat"><el-icon :size="18" color="#f56c6c"><Share /></el-icon><span>{{ formatMetrics(currentContent.metrics).shares }} 分享</span></div>
        </div>
      </div>
    </el-dialog>

    <!-- Create/Edit Content Dialog -->
    <el-dialog v-model="createDialog" :title="editing ? '编辑内容' : '新建内容'" width="800px" top="5vh">
      <el-form :model="createForm" label-width="80px">
        <el-form-item label="标题"><el-input v-model="createForm.title" placeholder="内容标题" /></el-form-item>
        <el-form-item label="类型">
          <el-select v-model="createForm.type" style="width: 100%">
            <el-option label="文章" value="article" />
            <el-option label="图片" value="image" />
            <el-option label="视频" value="video" />
            <el-option label="脚本" value="script" />
            <el-option label="文案" value="copywriting" />
          </el-select>
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="createForm.body" type="textarea" :rows="10" placeholder="输入内容..." />
        </el-form-item>
        <el-form-item label="发布平台">
          <el-select v-model="createForm.platforms" multiple style="width: 100%">
            <el-option label="抖音" value="douyin" />
            <el-option label="小红书" value="xiaohongshu" />
            <el-option label="微信" value="wechat" />
            <el-option label="微博" value="weibo" />
            <el-option label="快手" value="kuaishou" />
            <el-option label="B站" value="bilibili" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="warning" @click="generateWithAI" :loading="generating">
            <el-icon><MagicStick /></el-icon>AI 生成内容
          </el-button>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialog = false">取消</el-button>
        <el-button type="primary" @click="saveContent">保存草稿</el-button>
      </template>
    </el-dialog>

    <!-- Publish Dialog -->
    <el-dialog v-model="publishDialogVisible" title="发布内容" width="500px">
      <el-form label-width="100px">
        <el-form-item label="发布平台">
          <el-select v-model="publishPlatforms" multiple style="width: 100%">
            <el-option label="抖音" value="douyin" />
            <el-option label="小红书" value="xiaohongshu" />
            <el-option label="微信" value="wechat" />
            <el-option label="微博" value="weibo" />
            <el-option label="快手" value="kuaishou" />
            <el-option label="B站" value="bilibili" />
          </el-select>
        </el-form-item>
        <el-form-item label="定时发布">
          <el-switch v-model="schedulePublish" />
        </el-form-item>
        <el-form-item v-if="schedulePublish" label="发布时间">
          <el-date-picker v-model="publishTime" type="datetime" placeholder="选择时间" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="publishDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmPublish">确认发布</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, Plus, View, Star, ChatDotRound, Share, MagicStick } from '@element-plus/icons-vue'
import api from '../api'

const contents = ref<any[]>([])
const filterType = ref('')
const filterStatus = ref('')
const previewDialog = ref(false)
const createDialog = ref(false)
const publishDialogVisible = ref(false)
const editing = ref(false)
const generating = ref(false)
const currentContent = ref<any>(null)
const editingId = ref('')
const publishPlatforms = ref<string[]>([])
const schedulePublish = ref(false)
const publishTime = ref<Date | null>(null)

const createForm = reactive({ title: '', type: 'article', body: '', platforms: [] as string[] })

const stats = reactive({ total: 0, published: 0, views: 0, engagement: 0 })

const agentMap: Record<string, string> = {
  trend: '一键追爆', create: 'AI创作', avatar: '数字人', video: '大片自动生成',
  prospect: 'AI拓客', 'map-prospect': '地图拓客', wechat: 'AI个企微',
  hr: 'AI人事', legal: 'AI法务', call: 'AI电销', live: 'AI直播',
}

const typeColorMap: Record<string, any> = { article: '', image: 'success', video: 'danger', script: 'warning', copywriting: 'info' }
const typeLabelMap: Record<string, string> = { article: '文章', image: '图片', video: '视频', script: '脚本', copywriting: '文案' }
const statusColorMap: Record<string, any> = { draft: 'warning', pending: 'info', published: 'success' }
const statusLabelMap: Record<string, string> = { draft: '草稿', pending: '待发布', published: '已发布' }
const platformLabelMap: Record<string, string> = { douyin: '抖音', xiaohongshu: '小红书', wechat: '微信', weibo: '微博', kuaishou: '快手', bilibili: 'B站' }

onMounted(async () => {
  await fetchContents()
  await fetchStats()
})

async function fetchContents() {
  try {
    const params: Record<string, string> = {}
    if (filterType.value) params.type = filterType.value
    if (filterStatus.value) params.status = filterStatus.value
    contents.value = await api.get('/contents', { params })
  } catch (e) { console.error(e) }
}

async function fetchStats() {
  try {
    const all = await api.get('/contents')
    stats.total = all.length
    stats.published = all.filter((c: any) => c.status === 'published').length
    let totalViews = 0, totalLikes = 0
    all.forEach((c: any) => {
      const m = formatMetrics(c.metrics)
      totalViews += m.views
      totalLikes += m.likes
    })
    stats.views = totalViews
    stats.engagement = totalViews > 0 ? Math.round((totalLikes / totalViews) * 100) : 0
  } catch (e) { /* skip */ }
}

function parsePlatforms(str: string): string[] {
  try { return JSON.parse(str || '[]') } catch { return [] }
}

function formatMetrics(str: string): { views: number; likes: number; comments: number; shares: number } {
  try {
    const m = JSON.parse(str || '{}')
    return { views: m.views || 0, likes: m.likes || 0, comments: m.comments || 0, shares: m.shares || 0 }
  } catch { return { views: 0, likes: 0, comments: 0, shares: 0 } }
}

function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function renderContent(content: any): string {
  if (content.type === 'image') {
    return `<div style="text-align:center;padding:20px"><div style="width:100%;height:200px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px">图片内容预览</div></div><p>${content.body || ''}</p>`
  }
  if (content.type === 'video') {
    return `<div style="text-align:center;padding:20px"><div style="width:100%;height:200px;background:linear-gradient(135deg,#f56c6c,#fab6b6);border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px">▶ 视频内容预览</div></div><p>${content.body || ''}</p>`
  }
  return `<div style="line-height:1.8;font-size:15px">${(content.body || '').replace(/\n/g, '<br>')}</div>`
}

function showCreateDialog() {
  editing.value = false
  editingId.value = ''
  Object.assign(createForm, { title: '', type: 'article', body: '', platforms: [] })
  createDialog.value = true
}

function editContent(content: any) {
  editing.value = true
  editingId.value = content.id
  createForm.title = content.title
  createForm.type = content.type
  createForm.body = content.body
  createForm.platforms = parsePlatforms(content.publish_platform)
  createDialog.value = true
}

async function generateWithAI() {
  generating.value = true
  try {
    const res: any = await api.post('/ai/test/llm')
    createForm.body = res.data?.response || 'AI 生成内容失败，请稍后重试'
    ElMessage.success('AI 内容生成成功')
  } catch (e) {
    ElMessage.error('AI 生成失败')
  } finally {
    generating.value = false
  }
}

async function saveContent() {
  try {
    const body = {
      title: createForm.title,
      type: createForm.type,
      body: createForm.body,
      publish_platform: JSON.stringify(createForm.platforms),
      status: 'draft',
    }
    if (editing.value) {
      await api.patch(`/contents/${editingId.value}`, body)
      ElMessage.success('内容已更新')
    } else {
      await api.post('/contents', body)
      ElMessage.success('内容已保存')
    }
    createDialog.value = false
    await fetchContents()
    await fetchStats()
  } catch (e) { ElMessage.error('保存失败') }
}

function viewContent(content: any) {
  currentContent.value = content
  previewDialog.value = true
}

function showPublishDialog(content: any) {
  currentContent.value = content
  publishPlatforms.value = parsePlatforms(content.publish_platform)
  schedulePublish.value = false
  publishTime.value = null
  publishDialogVisible.value = true
}

async function confirmPublish() {
  try {
    const status = schedulePublish.value ? 'pending' : 'published'
    const body: any = { status, publish_platform: JSON.stringify(publishPlatforms.value) }
    if (schedulePublish.value && publishTime.value) {
      body.scheduled_at = publishTime.value.toISOString()
    }
    await api.patch(`/contents/${currentContent.value.id}`, body)
    ElMessage.success(schedulePublish.value ? '已设置定时发布' : '发布成功')
    publishDialogVisible.value = false
    await fetchContents()
    await fetchStats()
  } catch (e) { ElMessage.error('发布失败') }
}

async function deleteContent(content: any) {
  try {
    await ElMessageBox.confirm('确定删除此内容？', '确认')
    await api.delete(`/contents/${content.id}`)
    ElMessage.success('已删除')
    await fetchContents()
    await fetchStats()
  } catch { /* cancelled */ }
}
</script>

<style scoped>
.contents-page {
  animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.stats-row {
  margin-bottom: 16px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  margin-bottom: 16px;
}

.stat-card__value {
  font-size: 24px;
  font-weight: 700;
}

.stat-card__label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.stat-card--blue .stat-card__value { color: #409eff; }
.stat-card--green .stat-card__value { color: #67c23a; }
.stat-card--orange .stat-card__value { color: #e6a23c; }
.stat-card--purple .stat-card__value { color: #722ed1; }

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

.title-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.title-cell__text {
  font-weight: 500;
}

.title-cell__platforms {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.platform-tag {
  font-size: 10px;
  padding: 0 6px;
  height: 18px;
  line-height: 16px;
}

.metrics-cell {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #606266;
}

.metrics-cell .el-icon {
  margin-right: 2px;
}

/* Preview Dialog */
.preview-header h2 {
  margin: 0 0 12px;
  font-size: 22px;
  color: #1e293b;
}

.preview-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
}

.preview-meta__time {
  font-size: 13px;
  color: #909399;
}

.preview-content {
  font-size: 15px;
  line-height: 1.8;
  color: #303133;
}

.preview-stats {
  display: flex;
  justify-content: space-around;
  padding: 16px 0;
}

.preview-stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #606266;
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
  
  .preview-stats {
    flex-wrap: wrap;
    gap: 12px;
  }
  
  .preview-stat {
    flex: 1;
    min-width: 120px;
  }
}
</style>
