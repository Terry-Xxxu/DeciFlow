/**
 * 对话记忆系统 - 四层架构设计
 *
 * 架构分层：
 * ┌─────────────────────────────────────────────────────────────┐
 * │ Layer 1: 会话层 (Session Layer)                              │
 * │ - 用户可见的对话会话管理                                      │
 * │ - 会话标题、时间戳、元数据                                     │
 * └─────────────────────────────────────────────────────────────┘
 *                            ↓
 * ┌─────────────────────────────────────────────────────────────┐
 * │ Layer 2: 语义层 (Semantic Layer)  ⭐ 核心层                  │
 * │ - 对话内容向量化 (Embeddings)                                 │
 * │ - 意图识别与分类                                             │
 * │ - 关键实体提取                                               │
 * │ - 语义相似度计算                                             │
 * └─────────────────────────────────────────────────────────────┘
 *                            ↓
 * ┌─────────────────────────────────────────────────────────────┐
 * │ Layer 3: 上下文层 (Context Layer)                            │
 * │ - 结构化对话存储                                             │
 * │ - 消息序列管理                                               │
 * │ - 对话状态追踪                                               │
 * │ - 关联数据链接                                               │
 * └─────────────────────────────────────────────────────────────┘
 *                            ↓
 * ┌─────────────────────────────────────────────────────────────┐
 * │ Layer 4: 存储层 (Storage Layer)                              │
 * │ - 向量索引 (Vector DB)                                       │
 * │ - JSON文件存储 (完整对话)                                     │
 * │ - 内存缓存 (快速访问)                                         │
 * └─────────────────────────────────────────────────────────────┘
 */

// ==================== 类型定义 ====================

/**
 * 会话层 - 用户可见的会话
 */
export interface Session {
  sessionId: string
  title: string
  createdAt: number
  updatedAt: number
  messageCount: number
  tags?: string[]  // AI生成的标签
  summary?: string  // AI生成的摘要
  metadata?: {
    query?: string
    metric?: string
    databaseType?: string
  }
}

/**
 * 语义层 - 向量化表示
 */
export interface SemanticMemory {
  memoryId: string
  sessionId: string
  messageId: string

  // 向量表示
  embedding: number[]  // 1536维向量 (OpenAI text-embedding-ada-002)

  // 语义信息
  intent: string  // 意图类别: 'query' | 'analysis' | 'explanation' | 'action'
  entities: Entity[]  // 提取的实体
  topics: string[]  // 话题标签

  // 内容
  content: string  // 原始内容（用于检索后显示）
  contentType: 'user' | 'assistant' | 'system'

  // 元数据
  timestamp: number
  importance: number  // 重要性评分 (0-1)
}

/**
 * 实体提取结果
 */
export interface Entity {
  type: 'metric' | 'dimension' | 'table' | 'value' | 'time_range'
  text: string
  confidence: number
}

/**
 * 上下文层 - 结构化对话
 */
export interface ConversationContext {
  sessionId: string
  messages: ConversationMessage[]
  state: ConversationState
  linkedData: LinkedData
}

export interface ConversationMessage {
  messageId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  semanticMemoryId?: string  // 关联的语义记忆ID
}

export interface ConversationState {
  lastMetric?: string
  lastDimension?: string
  lastTimeRange?: string
  pendingQuestions?: string[]
}

export interface LinkedData {
  queryResults?: any[]
  analyses?: any[]
  sqlQueries?: string[]
  [key: string]: any  // 允许其他属性
}

/**
 * 存储层 - 索引结构
 */
export interface VectorIndex {
  memoryId: string
  sessionId: string
  embedding: number[]
  timestamp: number
  importance: number
}

/**
 * 语义检索结果
 */
export interface SemanticSearchResult {
  memory: SemanticMemory
  similarity: number
  context: ConversationMessage
  session: Session
}

/**
 * 智能召回结果
 */
export interface MemoryRecallResult {
  relevantMemories: SemanticSearchResult[]
  summary: string
  suggestedQuestions: string[]
  confidence: number
}

// ==================== 意图分类 ====================

export const INTENT_CATEGORIES = {
  QUERY: 'query',  // 数据查询
  ANALYSIS: 'analysis',  // 深度分析
  EXPLANATION: 'explanation',  // 原因解释
  COMPARISON: 'comparison',  // 对比分析
  ACTION: 'action',  // 行动建议
  GENERAL: 'general'  // 通用对话
} as const

// ==================== 向量数据库配置 ====================

export const VECTOR_CONFIG = {
  // 使用 OpenAI text-embedding-3-small (更便宜，性能好)
  model: 'text-embedding-3-small',
  dimensions: 1536,
  // 向量存储在 JSON 文件中（轻量级方案）
  indexPath: './memory/vector-index.json',
  // 检索配置
  search: {
    topK: 5,  // 返回最相关的5条
    minSimilarity: 0.7,  // 最小相似度阈值
    timeDecay: true,  // 启用时间衰减（最近的记忆更重要）
    decayRate: 0.1  // 衰减率
  }
} as const

// ==================== 架构导出 ====================

export const MEMORY_ARCHITECTURE = {
  layers: {
    SESSION: 'session',
    SEMANTIC: 'semantic',
    CONTEXT: 'context',
    STORAGE: 'storage'
  },
  vectorConfig: VECTOR_CONFIG,
  intentCategories: INTENT_CATEGORIES
} as const
