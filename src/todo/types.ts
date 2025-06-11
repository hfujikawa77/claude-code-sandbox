export enum TodoStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum TodoPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface Todo {
  id: string;
  title: string;
  description?: string;
  status: TodoStatus;
  priority: TodoPriority;
  created_at: Date;
  updated_at: Date;
  due_date?: Date;
  tags: string[];
  assignee?: string;
  progress: number;
}

export interface CreateTodoParams {
  title: string;
  description?: string;
  priority?: TodoPriority;
  due_date?: string;
  tags?: string[];
  assignee?: string;
}

export interface UpdateTodoParams {
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

export interface ListTodosParams {
  status?: TodoStatus[];
  priority?: TodoPriority[];
  assignee?: string;
  tags?: string[];
  due_before?: string;
  due_after?: string;
  limit?: number;
  offset?: number;
}

export interface DeleteTodoParams {
  id: string;
}

export interface GetTodoParams {
  id: string;
}

export interface CreateTodoResult {
  success: boolean;
  message: string;
  todo?: Todo;
}

export interface ListTodosResult {
  success: boolean;
  message: string;
  todos?: Todo[];
  total_count?: number;
}

export interface GetTodoResult {
  success: boolean;
  message: string;
  todo?: Todo;
}

export interface UpdateTodoResult {
  success: boolean;
  message: string;
  todo?: Todo;
}

export interface DeleteTodoResult {
  success: boolean;
  message: string;
  deleted_id?: string;
}

export interface TodoStats {
  total: number;
  by_status: Record<TodoStatus, number>;
  by_priority: Record<TodoPriority, number>;
  overdue: number;
  completed_today: number;
  completion_rate: number;
}

export interface GetTodoStatsResult {
  success: boolean;
  message: string;
  stats?: TodoStats;
}

export interface TodoDatabase {
  todos: Todo[];
  metadata: {
    version: string;
    last_updated: Date;
    total_count: number;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export enum TodoErrorCode {
  TODO_NOT_FOUND = 'TODO_NOT_FOUND',
  INVALID_TODO_DATA = 'INVALID_TODO_DATA',
  DUPLICATE_TODO = 'DUPLICATE_TODO',
  STORAGE_ERROR = 'STORAGE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

export interface TodoConfig {
  storage_path: string;
  max_todos: number;
  backup_enabled: boolean;
  backup_interval: number;
  auto_cleanup_days: number;
}

export interface TodoRepository {
  create(todo: Omit<Todo, 'id' | 'created_at' | 'updated_at'>): Promise<Todo>;
  findById(id: string): Promise<Todo | null>;
  findAll(params?: ListTodosParams): Promise<Todo[]>;
  update(id: string, updates: Partial<Todo>): Promise<Todo | null>;
  delete(id: string): Promise<boolean>;
  getStats(): Promise<TodoStats>;
  search(query: string): Promise<Todo[]>;
  export(): Promise<TodoDatabase>;
  import(data: TodoDatabase): Promise<void>;
}