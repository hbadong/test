<template>
  <div class="settings-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="card-header__left">
            <el-icon :size="18" color="#909399"><Setting /></el-icon>
            <span>系统设置</span>
          </div>
        </div>
      </template>

      <el-tabs v-model="activeTab" class="settings-tabs">
        <el-tab-pane label="AI配置" name="ai">
          <div class="settings-section">
            <h3 class="settings-section__title">大模型服务配置</h3>
            <p class="settings-section__desc">配置AI智能体使用的大语言模型服务</p>
            <el-form :model="aiForm" label-width="120px" class="settings-form">
              <el-form-item label="AI服务商">
                <el-select v-model="aiForm['llm.provider']" style="width: 100%" @change="onProviderChange">
                  <el-option label="Mock (开发测试)" value="mock" />
                  <el-option label="OpenAI (GPT-4/GPT-3.5)" value="openai" />
                  <el-option label="通义千问 (Qwen)" value="qianwen" />
                </el-select>
              </el-form-item>
              <el-form-item label="API密钥">
                <el-input v-model="aiForm['llm.api_key']" type="password" show-password placeholder="sk-..." />
              </el-form-item>
              <el-form-item label="API地址">
                <el-input v-model="aiForm['llm.api_url']" placeholder="https://api.openai.com/v1" />
              </el-form-item>
              <el-form-item label="模型名称">
                <el-select v-model="aiForm['llm.model']" style="width: 100%" filterable allow-create>
                  <el-option label="gpt-4o" value="gpt-4o" />
                  <el-option label="gpt-4" value="gpt-4" />
                  <el-option label="gpt-3.5-turbo" value="gpt-3.5-turbo" />
                  <el-option label="qwen-plus" value="qwen-plus" />
                  <el-option label="qwen-turbo" value="qwen-turbo" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <div style="display: flex; gap: 12px">
                  <el-button type="primary" @click="saveAiConfig">
                    <el-icon><Check /></el-icon>保存AI配置
                  </el-button>
                  <el-button @click="testLLM" :loading="testingLLM">
                    <el-icon><Connection /></el-icon>测试连接
                  </el-button>
                </div>
              </el-form-item>
              <el-form-item v-if="llmTestResult">
                <el-alert :title="llmTestResult" :type="llmTestResult.includes('成功') ? 'success' : 'error'" show-icon :closable="false" />
              </el-form-item>
            </el-form>
          </div>

          <el-divider />

          <div class="settings-section">
            <h3 class="settings-section__title">语音合成服务</h3>
            <p class="settings-section__desc">数字人、AI电销等模块的语音输出</p>
            <el-form :model="aiForm" label-width="120px" class="settings-form">
              <el-form-item label="TTS服务商">
                <el-select v-model="aiForm['tts.provider']" style="width: 100%">
                  <el-option label="Mock (开发测试)" value="mock" />
                  <el-option label="Azure TTS" value="azure" />
                  <el-option label="阿里云TTS" value="aliyun" />
                </el-select>
              </el-form-item>
              <el-form-item label="语音音色" v-if="aiForm['tts.provider'] !== 'mock'">
                <el-input v-model="aiForm['tts.voice']" placeholder="默认音色" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="saveAiConfig">保存配置</el-button>
              </el-form-item>
            </el-form>
          </div>

          <el-divider />

          <div class="settings-section">
            <h3 class="settings-section__title">图像生成服务</h3>
            <p class="settings-section__desc">AI创作模块的图片生成</p>
            <el-form :model="aiForm" label-width="120px" class="settings-form">
              <el-form-item label="Vision服务商">
                <el-select v-model="aiForm['vision.provider']" style="width: 100%">
                  <el-option label="Mock (开发测试)" value="mock" />
                  <el-option label="OpenAI DALL-E 3" value="openai" />
                  <el-option label="Stability AI" value="stability" />
                </el-select>
              </el-form-item>
              <el-form-item label="图片风格" v-if="aiForm['vision.provider'] !== 'mock'">
                <el-select v-model="aiForm['vision.style']" style="width: 100%">
                  <el-option label="自然风" value="natural" />
                  <el-option label="动漫风" value="anime" />
                  <el-option label="写实风" value="realistic" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="saveAiConfig">保存配置</el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>

        <el-tab-pane label="拓客配置" name="prospect">
          <div class="settings-section">
            <h3 class="settings-section__title">地图服务配置</h3>
            <el-form :model="prospectForm" label-width="140px" class="settings-form">
              <el-form-item label="地图服务商">
                <el-select v-model="prospectForm['map.provider']" style="width: 100%">
                  <el-option label="高德地图" value="amap" />
                  <el-option label="百度地图" value="baidu" />
                </el-select>
              </el-form-item>
              <el-form-item label="默认搜索半径">
                <el-input-number v-model="defaultRadius" :min="500" :max="50000" :step="500" />
                <span class="form-unit">米</span>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="saveProspectConfig">保存配置</el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>

        <el-tab-pane label="系统信息" name="system">
          <div class="system-info">
            <div class="system-info__card">
              <div class="system-info__icon">
                <el-icon size="32" color="#409eff"><Monitor /></el-icon>
              </div>
              <h3>AI智能体AI员工系统</h3>
              <p class="system-info__version">v1.0.0</p>
            </div>
            <el-descriptions :column="1" border class="system-info__desc">
              <el-descriptions-item label="AI员工数">11个岗位</el-descriptions-item>
              <el-descriptions-item label="支持岗位">
                <div class="tags-group">
                  <el-tag size="small" v-for="tag in agentTags" :key="tag" style="margin: 2px">{{ tag }}</el-tag>
                </div>
              </el-descriptions-item>
              <el-descriptions-item label="运行模式">24小时自动运转</el-descriptions-item>
              <el-descriptions-item label="适用场景">一人公司、自媒体、电商、实体店、小工作室</el-descriptions-item>
            </el-descriptions>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Setting, Check, Monitor, Connection } from '@element-plus/icons-vue'
import api from '../api'

const activeTab = ref('ai')
const aiForm = ref<Record<string, string>>({})
const prospectForm = ref<Record<string, string>>({})
const defaultRadius = ref(5000)
const testingLLM = ref(false)
const llmTestResult = ref('')

const agentTags = [
  '一键追爆', 'AI创作', '数字人', '大片自动生成',
  'AI拓客', '地图拓客', 'AI个企微', 'AI人事',
  'AI法务', 'AI电销', 'AI直播'
]

onMounted(fetchSettings)

async function fetchSettings() {
  try {
    const res = await api.get('/settings')
    const settings = res.data as Record<string, { value: string }>
    for (const [key, val] of Object.entries(settings)) {
      if (key.startsWith('llm.') || key.startsWith('tts.') || key.startsWith('vision.')) {
        aiForm.value[key] = val.value
      }
      if (key.startsWith('map.')) {
        prospectForm.value[key] = val.value
      }
    }
    // Set defaults if not configured
    if (!aiForm.value['llm.provider']) aiForm.value['llm.provider'] = 'mock'
    if (!aiForm.value['tts.provider']) aiForm.value['tts.provider'] = 'mock'
    if (!aiForm.value['vision.provider']) aiForm.value['vision.provider'] = 'mock'
  } catch (e) { console.error(e) }
}

function onProviderChange() {
  const provider = aiForm.value['llm.provider']
  if (provider === 'openai') {
    aiForm.value['llm.api_url'] = 'https://api.openai.com/v1'
    aiForm.value['llm.model'] = 'gpt-4o'
  } else if (provider === 'qianwen') {
    aiForm.value['llm.api_url'] = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
    aiForm.value['llm.model'] = 'qwen-plus'
  } else if (provider === 'mock') {
    aiForm.value['llm.api_key'] = ''
  }
}

async function saveAiConfig() {
  try {
    await api.post('/settings/batch', aiForm.value)
    // Update AI services on server
    await api.post('/ai/config/update')
    ElMessage.success('AI配置已保存并生效')
  } catch (e) { ElMessage.error('保存失败') }
}

async function testLLM() {
  testingLLM.value = true
  llmTestResult.value = ''
  try {
    // Save first, then test
    await api.post('/settings/batch', aiForm.value)
    await api.post('/ai/config/update')
    const res: any = await api.post('/ai/test/llm')
    llmTestResult.value = `测试成功! 回复: ${res.data?.response?.slice(0, 100)}...`
  } catch (e: any) {
    llmTestResult.value = e.response?.data?.error || '测试失败'
  } finally {
    testingLLM.value = false
  }
}

async function saveProspectConfig() {
  try {
    await api.post('/settings/batch', { ...prospectForm.value, 'map.radius': String(defaultRadius.value) })
    ElMessage.success('拓客配置已保存')
  } catch (e) { ElMessage.error('保存失败') }
}
</script>

<style scoped>
.settings-page {
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

.settings-section {
  padding: 8px 0;
}

.settings-section__title {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 4px;
  color: #303133;
}

.settings-section__desc {
  font-size: 13px;
  color: #909399;
  margin: 0 0 20px;
}

.settings-form {
  max-width: 500px;
}

.form-unit {
  margin-left: 8px;
  color: #909399;
  font-size: 13px;
}

.system-info {
  max-width: 600px;
}

.system-info__card {
  text-align: center;
  padding: 24px;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.05) 0%, rgba(114, 46, 209, 0.05) 100%);
  border-radius: 12px;
  margin-bottom: 24px;
}

.system-info__icon {
  margin-bottom: 12px;
}

.system-info__card h3 {
  margin: 0 0 4px;
  font-size: 18px;
}

.system-info__version {
  color: #909399;
  margin: 0;
  font-size: 13px;
}

.tags-group {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

@media (max-width: 768px) {
  .settings-page {
    padding: 0;
  }
  
  .settings-page :deep(.el-card) {
    border-radius: var(--radius-md);
  }
  
  .settings-page :deep(.el-card__header) {
    padding: 16px;
  }
  
  .settings-page :deep(.el-card__body) {
    padding: 0 16px 16px;
  }
  
  .card-header__left {
    font-size: 14px;
  }
  
  .settings-tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .settings-tabs :deep(.el-tabs__header) {
    margin-bottom: 16px;
  }
  
  .settings-tabs :deep(.el-tabs__nav-wrap::after) {
    height: 1px;
  }
  
  .settings-section {
    padding: 4px 0;
  }
  
  .settings-section__title {
    font-size: 14px;
  }
  
  .settings-section__desc {
    font-size: 12px;
    margin-bottom: 16px;
  }
  
  .settings-form {
    max-width: 100%;
  }
  
  .settings-form :deep(.el-form-item__label) {
    font-size: 13px;
    padding-right: 8px;
  }
  
  .system-info {
    max-width: 100%;
  }
  
  .system-info__card {
    padding: 20px 16px;
    margin-bottom: 20px;
    border-radius: var(--radius-md);
  }
  
  .system-info__card h3 {
    font-size: 16px;
  }
  
  .system-info__version {
    font-size: 12px;
  }
  
  .system-info__desc {
    font-size: 13px;
  }
  
  .tags-group {
    gap: 6px;
  }
  
  .form-unit {
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .settings-page :deep(.el-card) {
    border-radius: var(--radius-sm);
  }
  
  .settings-page :deep(.el-card__header) {
    padding: 14px;
  }
  
  .settings-page :deep(.el-card__body) {
    padding: 0 14px 14px;
  }
  
  .card-header__left span {
    font-size: 13px;
  }
  
  .settings-tabs :deep(.el-tabs__item) {
    font-size: 13px;
    padding: 0 12px;
  }
  
  .settings-section__title {
    font-size: 13px;
  }
  
  .settings-section__desc {
    font-size: 12px;
  }
  
  .settings-form :deep(.el-form-item__label) {
    font-size: 12px;
    width: 90px !important;
  }
  
  .settings-form :deep(.el-form-item__content) {
    margin-left: 90px !important;
  }
  
  .system-info__card {
    padding: 16px 12px;
    margin-bottom: 16px;
  }
  
  .system-info__card h3 {
    font-size: 14px;
  }
  
  .tags-group {
    gap: 4px;
  }
  
  .tags-group .el-tag {
    font-size: 12px;
    padding: 0 6px;
  }
  
  .el-button {
    font-size: 13px;
  }
}
</style>
