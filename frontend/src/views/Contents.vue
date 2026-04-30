<template>
  <div class="contents-page">
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
              <el-option label="文本" value="text" />
              <el-option label="视频" value="video" />
              <el-option label="图片" value="image" />
            </el-select>
            <el-select v-model="filterStatus" placeholder="状态" style="width: 110px" @change="fetchContents">
              <el-option label="全部" value="" />
              <el-option label="草稿" value="draft" />
              <el-option label="已发布" value="published" />
              <el-option label="已归档" value="archived" />
            </el-select>
          </div>
        </div>
      </template>

      <el-table :data="contents" style="width: 100%">
        <el-table-column prop="type" label="类型" width="90">
          <template #default="{ row }">
            <el-tag 
              :type="row.type === 'text' ? '' : row.type === 'video' ? 'danger' : 'success'" 
              size="small" 
              round
            >
              {{ row.type === 'text' ? '文本' : row.type === 'video' ? '视频' : '图片' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="200" />
        <el-table-column prop="source_agent_id" label="来源" width="100">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ agentMap[row.source_agent_id] || row.source_agent_id }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag 
              :type="row.status === 'published' ? 'success' : row.status === 'archived' ? 'info' : 'warning'" 
              size="small"
              round
            >
              {{ row.status === 'draft' ? '草稿' : row.status === 'published' ? '已发布' : '已归档' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="170" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="viewContent(row)">查看</el-button>
            <el-button size="small" link type="success" v-if="row.status === 'draft'" @click="publishContent(row)">发布</el-button>
            <el-button size="small" link type="danger" @click="deleteContent(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!contents.length" description="暂无内容" :image-size="80" />
    </el-card>

    <el-dialog v-model="viewDialog" title="内容详情" width="700px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="类型">
          <el-tag size="small">{{ currentContent?.type }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag size="small" :type="currentContent?.status === 'published' ? 'success' : 'warning'">
            {{ currentContent?.status }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="标题" :span="2">{{ currentContent?.title }}</el-descriptions-item>
        <el-descriptions-item label="内容" :span="2">
          <pre class="content-body">{{ formatBody(currentContent?.body) }}</pre>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ currentContent?.created_at }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ currentContent?.updated_at }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document } from '@element-plus/icons-vue'
import api from '../api'

const contents = ref<any[]>([])
const filterType = ref('')
const filterStatus = ref('')
const viewDialog = ref(false)
const currentContent = ref<any>(null)

const agentMap: Record<string, string> = {
  'trend': '一键追爆',
  'create': 'AI创作',
  'video': '大片生成',
}

onMounted(fetchContents)

async function fetchContents() {
  try {
    const params: Record<string, string> = {}
    if (filterType.value) params.type = filterType.value
    if (filterStatus.value) params.status = filterStatus.value
    contents.value = await api.get('/contents', { params })
  } catch (e) { console.error(e) }
}

function formatBody(body: string): string {
  try { return JSON.stringify(JSON.parse(body), null, 2) } catch { return body || '' }
}

function viewContent(content: any) {
  currentContent.value = content
  viewDialog.value = true
}

async function publishContent(content: any) {
  try {
    await api.patch(`/contents/${content.id}`, { status: 'published' })
    ElMessage.success('已发布')
    await fetchContents()
  } catch (e) { ElMessage.error('发布失败') }
}

async function deleteContent(content: any) {
  try {
    await ElMessageBox.confirm('确定删除此内容？', '确认')
    await api.delete(`/contents/${content.id}`)
    ElMessage.success('已删除')
    await fetchContents()
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
}

.content-body {
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
  margin: 0;
}

@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .card-header__right {
    width: 100%;
  }
}
</style>
