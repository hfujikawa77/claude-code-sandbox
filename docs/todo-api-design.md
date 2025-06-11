# Todo機能 - データ構造とAPI設計

## データ構造設計

### 基本Todo構造
```typescript
interface Todo {
  id: string;                    // 一意識別子 (UUID v4)
  title: string;                 // タイトル（必須、最大100文字）
  description?: string;          // 説明（オプション、最大500文字）
  status: TodoStatus;            // ステータス
  priority: TodoPriority;        // 優先度
  created_at: Date;              // 作成日時
  updated_at: Date;              // 更新日時
  due_date?: Date;               // 期限（オプション）
  tags: string[];                // タグ配列
  assignee?: string;             // 担当者（オプション）
  progress: number;              // 進捗率 (0-100)
}

enum TodoStatus {
  PENDING = 'pending',           // 待機中
  IN_PROGRESS = 'in_progress',   // 進行中
  COMPLETED = 'completed',       // 完了
  CANCELLED = 'cancelled'        // キャンセル
}

enum TodoPriority {
  LOW = 'low',                   // 低
  MEDIUM = 'medium',             // 中
  HIGH = 'high',                 // 高
  URGENT = 'urgent'              // 緊急
}
```

### Todo操作パラメータ
```typescript
// 作成パラメータ
interface CreateTodoParams {
  title: string;
  description?: string;
  priority?: TodoPriority;
  due_date?: string;             // ISO 8601形式
  tags?: string[];
  assignee?: string;
}

// 更新パラメータ
interface UpdateTodoParams {
  id: string;
  title?: string;
  description?: string;
  status?: TodoStatus;
  priority?: TodoPriority;
  due_date?: string;
  tags?: string[];
  assignee?: string;
  progress?: number;
}

// 検索・フィルタパラメータ
interface ListTodosParams {
  status?: TodoStatus[];
  priority?: TodoPriority[];
  assignee?: string;
  tags?: string[];
  due_before?: string;
  due_after?: string;
  limit?: number;
  offset?: number;
}

// 削除パラメータ
interface DeleteTodoParams {
  id: string;
}

// ID取得パラメータ
interface GetTodoParams {
  id: string;
}
```

## MCP Tool API設計

### 1. create_todo ツール
```typescript
interface CreateTodoResult {
  success: boolean;
  message: string;
  todo?: Todo;
}
```

### 2. list_todos ツール
```typescript
interface ListTodosResult {
  success: boolean;
  message: string;
  todos?: Todo[];
  total_count?: number;
}
```

### 3. get_todo ツール
```typescript
interface GetTodoResult {
  success: boolean;
  message: string;
  todo?: Todo;
}
```

### 4. update_todo ツール
```typescript
interface UpdateTodoResult {
  success: boolean;
  message: string;
  todo?: Todo;
}
```

### 5. delete_todo ツール
```typescript
interface DeleteTodoResult {
  success: boolean;
  message: string;
  deleted_id?: string;
}
```

### 6. get_todo_stats ツール
```typescript
interface TodoStats {
  total: number;
  by_status: Record<TodoStatus, number>;
  by_priority: Record<TodoPriority, number>;
  overdue: number;
  completed_today: number;
  completion_rate: number;
}

interface GetTodoStatsResult {
  success: boolean;
  message: string;
  stats?: TodoStats;
}
```

## データ永続化設計

### 1. ファイルシステムベース（JSON）
```typescript
interface TodoDatabase {
  todos: Todo[];
  metadata: {
    version: string;
    last_updated: Date;
    total_count: number;
  };
}

// 保存場所: ./data/todos.json
```

### 2. データベース操作インターフェース
```typescript
interface TodoRepository {
  // CRUD操作
  create(todo: Omit<Todo, 'id' | 'created_at' | 'updated_at'>): Promise<Todo>;
  findById(id: string): Promise<Todo | null>;
  findAll(params?: ListTodosParams): Promise<Todo[]>;
  update(id: string, updates: Partial<Todo>): Promise<Todo | null>;
  delete(id: string): Promise<boolean>;
  
  // 統計・分析
  getStats(): Promise<TodoStats>;
  search(query: string): Promise<Todo[]>;
  
  // バックアップ・復元
  export(): Promise<TodoDatabase>;
  import(data: TodoDatabase): Promise<void>;
}
```

## バリデーション設計

### 入力バリデーション
```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  field: string;
  message: string;
  code: string;
}

class TodoValidator {
  static validateTitle(title: string): ValidationResult;
  static validateDescription(description: string): ValidationResult;
  static validateDueDate(date: string): ValidationResult;
  static validateTags(tags: string[]): ValidationResult;
  static validateProgress(progress: number): ValidationResult;
}
```

## エラーハンドリング設計

### Todo専用エラータイプ
```typescript
enum TodoErrorCode {
  TODO_NOT_FOUND = 'TODO_NOT_FOUND',
  INVALID_TODO_DATA = 'INVALID_TODO_DATA',
  DUPLICATE_TODO = 'DUPLICATE_TODO',
  STORAGE_ERROR = 'STORAGE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

class TodoError extends Error {
  constructor(
    public code: TodoErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'TodoError';
  }
}
```

## 設定・環境変数

```typescript
interface TodoConfig {
  storage_path: string;          // データ保存パス
  max_todos: number;             // 最大Todo数
  backup_enabled: boolean;       // バックアップ有効化
  backup_interval: number;       // バックアップ間隔（分）
  auto_cleanup_days: number;     // 自動削除日数（完了後）
}

// 環境変数
// TODO_STORAGE_PATH=./data/todos.json
// TODO_MAX_TODOS=1000
// TODO_BACKUP_ENABLED=true
// TODO_BACKUP_INTERVAL=60
// TODO_AUTO_CLEANUP_DAYS=30
```

## ファイル構成

```
src/
├── todo/
│   ├── types.ts           # Todo型定義
│   ├── repository.ts      # データ永続化
│   ├── validator.ts       # バリデーション
│   ├── mcp-tools.ts       # MCPツール実装
│   └── errors.ts          # エラー定義
├── types.ts               # 既存型定義（拡張）
└── mcp-server.ts          # メインサーバー（統合）
```

## 実装優先度

1. **Phase 1**: 基本データ構造とバリデーション
2. **Phase 2**: ファイルベース永続化
3. **Phase 3**: MCPツール実装
4. **Phase 4**: 統合とテスト
5. **Phase 5**: 拡張機能（統計、検索など）