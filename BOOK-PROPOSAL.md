# BOOK-PROPOSAL（v0.1）

## 1. タイトル / サブタイトル

### 仮タイトル案

- AIエージェント駆動開発のための GitHub AgentOps 実践ガイド（Codex中心）
- GitHub AgentOps Practical Guide for Agentic Development (Codex-first)

### 決定案

未決定（Issue #3 で確定する）。

## 2. 想定読者

- 開発リーダー / テックリード（標準化・統制・レビュー設計）
- 中〜大規模開発のメンテナー（CI / 権限 / 品質ゲート）
- SRE / DevEx / Platform Engineering（運用設計と自動化）

## 3. Problem Statement（解く課題）

- Issue が「実行仕様」になっておらず、エージェントの成果が安定しない
- エージェント生成 PR のレビュー観点 / 責任分界が曖昧で品質事故が起きる
- MCP / カスタムエージェント / Skills / Rules が点在し、統制設計の型がない
- コスト（premium requests / Actions minutes）とセキュリティ（Secrets / 権限）を一体で設計できない

## 4. コアスコープ（本書で扱う）

- GitHub 上のエージェント運用を「運用設計（Ops）」として体系化する
  - Issue → Agent → PR → コメント反復 → マージ
- Codex 中心で「リポジトリにコミットできる統制」を実装可能にする
  - `AGENTS.md`（指示の資産化）
  - Skills（`SKILL.md` を中心とした手順再利用）
  - Rules（allow / prompt / forbidden 等の実行境界）
  - Codex GitHub Action（CI 統合）
  - GitHub カスタムエージェント（`.agent.md`）と MCP 公開範囲設計

## 5. 非スコープ（他書へ委譲）

- Git / GitHub の基礎操作・初歩 UI（Book1）
- 一般的なプロンプト術・AI 協働全般（Book2）

## 6. Deliverables（成果物）

1. 書籍本体（Web を前提）
2. Companion Repository（テンプレ / 規約 / サンプルワークフロー）
3. 運用プレイブック（依存更新・テスト追加・ドキュメント整備・リファクタ等）

## 7. 章構成（v1.0）

- 第1部：AgentOps 概観
  1. 責任分界（人間 / エージェント / CI）
  2. Agent-ready repo 要件（テンプレ / 品質ゲート / 権限境界）
- 第2部：指示と再利用
  3. AGENTS.md 設計
  4. Skills 設計
  5. Rules 設計
- 第3部：GitHub エージェント運用
  6. GitHub Agents 運用（Issue→PR→反復）
  7. カスタムエージェント（`.agent.md`）と MCP（ツール公開範囲）
  8. コスト設計（premium requests / Actions minutes）
- 第4部：CI/CD 統合とガバナンス
  9. Codex GitHub Action で継続的 AI
  10. セキュリティ設計（Secrets、権限、ログ、供給網）
  11. メトリクス設計（Lead time / Review time / Reopen率 / 差し戻し率）
- 付録
  - A: テンプレ集（AGENTS.md / Issue / PR / `.agent.md` / Skills）
  - B: プレイブック集（タスク別運用手順）
  - C: トラブルシュート（失敗パターンと対処）

## 8. Companion repo 方針

- 書籍: 「理解」を担う（背景・判断基準・設計原則）
- repo: 「導入」を担う（コピペで導入できるテンプレ/サンプル/規約）
- 本文は Companion repo の固定パス参照を前提に記述する（リンク破壊を最小化）

## 9. 更新ポリシー（四半期棚卸し）

最低限、四半期ごとに以下を棚卸しし、Issue として追跡する。

- Agents / MCP / Codex Action などの仕様変更追従
- 課金体系（premium requests / Actions minutes）とベストプラクティスの更新
- リンク切れ / サンプルの動作確認（導入手順の再現性）

## 10. 成功指標（例）

- Lead time の短縮（Issue→マージまでの時間）
- Review time の短縮（PR 作成→承認までの時間）
- Reopen 率 / 差し戻し率の低下
- 重要インシデント（Secrets 事故、権限逸脱）の抑止

## 11. 公開形態 / ライセンス（提案）

未決定（Issue #3 で確定する）。現時点の提案は以下。

- 公開形態: Web（GitHub Pages）を v1.0 の前提とする。電子書籍（EPUB/PDF）は v1.0 では任意。
- ライセンス: 本文は `CC-BY-NC-SA-4.0`、サンプル/テンプレは `MIT` の分離を第一候補とする。
