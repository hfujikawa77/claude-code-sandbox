# テストガイド

このドキュメントでは、ArduPilot MCP Serverのテストスイートの実行方法と構成について説明します。

## 📋 目次

- [テスト環境の設定](#テスト環境の設定)
- [テストの実行](#テストの実行)
- [テストの種類](#テストの種類)
- [モック・スタブについて](#モック・スタブについて)
- [カバレッジレポート](#カバレッジレポート)
- [継続的インテグレーション](#継続的インテグレーション)

## 🔧 テスト環境の設定

### 前提条件

- Node.js 18以上
- npm 8以上
- TypeScript 5.0以上

### 依存関係のインストール

```bash
npm install
```

## 🧪 テストの実行

### 基本的なテストコマンド

```bash
# 全テストを実行
npm test

# テストをウォッチモードで実行
npm run test:watch

# カバレッジ付きでテストを実行
npm run test:coverage

# CI環境でのテスト実行
npm run test:ci

# 統合テストのみ実行
npm run test:integration
```

### 個別テストの実行

```bash
# 特定のテストファイルを実行
npx jest src/__tests__/mcp-tools.test.ts

# 特定のテストケースを実行
npx jest --testNamePattern="armツール"

# 特定のディレクトリのテストを実行
npx jest tests/integration/
```

## 📝 テストの種類

### 1. 単体テスト (Unit Tests)

**場所**: `src/__tests__/`

#### MCPツール関数テスト (`mcp-tools.test.ts`)
- 6つのMCPツール関数の個別テスト
- モック環境でのエラーハンドリング
- パラメータ検証とレスポンス確認

```typescript
describe('armツール', () => {
  it('正常にモーターをアームできる', async () => {
    // テストケース実装
  });
});
```

#### MAVLink接続管理テスト (`connection.test.ts`)
- 接続・切断処理のテスト
- ハートビート送受信のテスト
- 自動再接続機能のテスト

### 2. 統合テスト (Integration Tests)

**場所**: `tests/integration/`

#### MCPサーバー統合テスト (`mcp-server.test.ts`)
- MCPサーバー全体の動作テスト
- ツール実行フローのエンドツーエンドテスト
- エラーハンドリングの統合テスト

### 3. モック・スタブ

**場所**: `tests/mocks/`

#### MAVLinkモック (`mavlink-mock.ts`)
- `MockMavEsp8266`: ArduPilot SITL環境の模擬
- ハートビート、GPS、ステータス情報のシミュレーション
- エラー状況の再現機能

```typescript
export class MockMavEsp8266 extends EventEmitter {
  // ArduPilot接続をシミュレート
  async start(port1: number, port2: number, host: string): Promise<void> {
    this.connected = true;
    this.startHeartbeat();
  }
}
```

#### エラーハンドリングモック (`errors-mock.ts`)
- エラークラスとファクトリのモック
- タイムアウト処理のモック
- ログ出力のモック

## 📊 カバレッジレポート

### カバレッジ目標

- **関数カバレッジ**: 80%以上
- **行カバレッジ**: 80%以上
- **分岐カバレッジ**: 80%以上
- **文カバレッジ**: 80%以上

### カバレッジレポートの確認

```bash
# カバレッジレポートを生成
npm run test:coverage

# HTMLレポートを表示
open coverage/lcov-report/index.html
```

### カバレッジ除外設定

以下のファイルはカバレッジ計測から除外されています：

- `src/**/*.d.ts` - TypeScript型定義ファイル
- `src/**/__tests__/**` - テストファイル
- `src/**/index.ts` - エントリーポイントファイル

## 🔄 継続的インテグレーション

### GitHub Actions ワークフロー

`.github/workflows/ci.yml`で以下のチェックを実行：

1. **コード品質チェック**
   - ESLint実行
   - Prettier フォーマットチェック

2. **TypeScript型チェック**
   - `tsc --noEmit`による型検証

3. **ビルドテスト**
   - TypeScriptコンパイル確認
   - 成果物の生成確認

4. **テストスイート**
   - Node.js 18/20での並列テスト
   - カバレッジ測定とCodecovアップロード

5. **セキュリティ監査**
   - `npm audit`による脆弱性チェック

6. **品質ゲート**
   - 統合テスト実行
   - カバレッジ閾値チェック

### ローカル環境でのCI模擬

```bash
# lint + format check
npm run lint
npm run format -- --check

# type check
npm run typecheck

# build test
npm run build

# test with coverage
npm run test:ci

# security audit
npm audit
```

## 🐛 トラブルシューティング

### よくある問題と解決方法

#### 1. テストタイムアウト

```bash
# タイムアウト時間を延長
npx jest --testTimeout=60000
```

#### 2. モックが正しく動作しない

```typescript
// beforeEach でモックをリセット
beforeEach(() => {
  jest.clearAllMocks();
});
```

#### 3. TypeScript型エラー

```bash
# 型定義を最新に更新
npm run typecheck
```

#### 4. カバレッジが不足

```bash
# 詳細なカバレッジ情報を確認
npx jest --coverage --verbose
```

## 🚀 テストベストプラクティス

### 1. AAA パターンの使用

```typescript
it('should return success when arm command is accepted', async () => {
  // Arrange (準備)
  const mockResult = MAV_RESULT.ACCEPTED;
  jest.spyOn(tools as any, 'waitForCommandAck').mockResolvedValue(mockResult);

  // Act (実行)
  const result = await tools.arm({});

  // Assert (検証)
  expect(result.success).toBe(true);
  expect(result.message).toBe('モーターのアームが完了しました');
});
```

### 2. 適切なモック使用

```typescript
// 部分的なモック
jest.spyOn(connection, 'sendMessage').mockResolvedValue();

// 完全なモック
jest.mock('../connection.js', () => ({
  ArduPilotConnection: MockArduPilotConnection
}));
```

### 3. テストの独立性確保

```typescript
afterEach(async () => {
  await connection.cleanup();
  jest.clearAllMocks();
});
```

### 4. エラーケースのテスト

```typescript
it('should handle connection error gracefully', async () => {
  jest.spyOn(connection, 'sendMessage').mockRejectedValue(new Error('Connection lost'));
  
  const result = await tools.arm({});
  
  expect(result.success).toBe(false);
  expect(result.message).toContain('エラーが発生しました');
});
```

## 📚 参考資料

- [Jest公式ドキュメント](https://jestjs.io/docs/getting-started)
- [TypeScript + Jest設定ガイド](https://jestjs.io/docs/getting-started#using-typescript)
- [GitHub Actions CI/CDドキュメント](https://docs.github.com/en/actions)
- [Codecovダッシュボード](https://codecov.io/)