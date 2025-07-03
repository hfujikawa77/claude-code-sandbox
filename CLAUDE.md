# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

このプロジェクトは、名前と年齢を入力・保存・一覧表示するシンプルなPythonシステムです。

### 要件（REQUIREMENTS.mdより）
- 名前と年齢を入れて、保存して、一覧表示するだけのシステム
- 削除・編集は不要
- 入力と一覧は同じ画面でOK
- 保存場所はファイル
- 技術はPython

## プロジェクト構造

```
claude-code-sandbox/
├── src/
│   └── models/
│       └── person.py      # Personデータモデル（名前と年齢の検証機能付き）
├── tests/
│   └── test_person.py     # Personクラスの詳細なテスト
├── REQUIREMENTS.md        # プロジェクト要件
└── CLAUDE.md             # このファイル
```

## 開発コマンド

### テストの実行
```bash
# 全テストを実行
python -m pytest tests/

# 特定のテストファイルを実行
python -m pytest tests/test_person.py

# 詳細な出力でテストを実行
python -m pytest -v tests/

# 特定のテストクラスやメソッドを実行
python -m pytest tests/test_person.py::TestPerson::test_valid_person_creation
```

### コードの実行
```bash
# Pythonインタープリタでモデルを使用
python -c "import sys; sys.path.insert(0, 'src'); from models.person import Person; p = Person('山田太郎', 30); print(p)"
```

## アーキテクチャ概要

### データモデル（src/models/person.py）
- `Person`クラス: dataclassを使用した名前と年齢のデータモデル
- 入力検証機能:
  - 名前: 必須、文字列、1-100文字
  - 年齢: 整数、0-150の範囲
- `__str__`と`__repr__`メソッドで適切な文字列表現を提供

### テスト戦略
- pytestを使用したユニットテスト
- 正常系、異常系、エッジケースを網羅
- sys.pathを調整してsrcディレクトリのモジュールをインポート

## 今後の実装予定

現在はPersonモデルのみ実装済み。以下の機能の実装が必要：
1. ファイルへの保存機能
2. ファイルからの読み込み機能
3. 入力と一覧表示のUI（CLI）
4. メインアプリケーションのエントリーポイント