# BOOK-PROPOSAL（v1.0）

## 1. タイトル / サブタイトル

### 決定

- 日本語タイトル: GitHub AgentOps 実践ガイド
- 日本語副題: AIエージェント駆動開発のための運用設計
- English Title: GitHub AgentOps Practical Guide
- English Subtitle: Ops Design for AI Agent-Driven Development

## 2. 想定読者

- 開発リーダー / テックリード（標準化・統制・レビュー設計）
- 中〜大規模開発のメンテナー（CI / 権限 / 品質ゲート）
- SRE / DevEx / Platform Engineering（運用設計と自動化）

## 3. Problem Statement（解く課題）

- Issue が「実行仕様」になっておらず、エージェントの成果が安定しない
- エージェント生成 PR のレビュー観点 / 責任分界が曖昧で品質事故が起きる
- MCP / custom agents / Skills / Policy が点在し、統制設計の型がない
- コスト・予算・利用ガバナンス（premium requests / Actions minutes / analytics）とセキュリティ・供給網（Secrets / 権限 / OIDC / artifact attestations）を一体で設計できない

## 4. コアスコープ（本書で扱う）

- GitHub 上のエージェント運用を「運用設計（Ops）」として体系化する
  - Issue → Agent → PR → コメント反復 → マージ
- 例: Copilot cloud agent / third-party agents（OpenAI Codex 等）/ Copilot CLI を前提に、「リポジトリにコミットできる統制」を実装可能にする
  - `AGENTS.md`（指示の資産化）
  - Skills（`SKILL.md` を中心とした手順再利用）
  - Policy / control surface（allow / prompt / forbidden 等の執行境界）
  - 継続的 AI の実装パターン（Copilot code review / agents / Codex CLI / Codex Action）
  - GitHub custom agents と MCP / tool exposure 設計

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
  3. Instruction hierarchy と context 設計
  4. 再利用レイヤー（Skills / custom agents / hooks）
  5. Policy と control surface 設計
- 第3部：GitHub エージェント運用
  6. GitHub ネイティブな実行フロー
  7. MCP と tool exposure 設計
  8. コスト・予算・利用ガバナンス
- 第4部：CI/CD 統合とガバナンス
  9. 継続的 AI の実装パターン
  10. セキュリティ・秘密情報・供給網
  11. メトリクス・運用レビュー・展開ロードマップ
- 付録
  - A: テンプレ集（AGENTS.md / Issue / PR / custom agents / Skills / MCP）
  - B: プレイブック集（タスク別運用手順）
  - C: トラブルシュート（失敗パターンと対処）

## 8. Companion repo 方針

- 書籍: 「理解」を担う（背景・判断基準・設計原則）
- repo: 「導入」を担う（コピペで導入できるテンプレ/サンプル/規約）
- 本文は Companion repo の固定パス参照を前提に記述する（リンク破壊を最小化）

## 9. 更新ポリシー（四半期棚卸し）

最低限、四半期ごとに以下を棚卸しし、Issue として追跡する。

- cloud agent / MCP / Copilot code review / Codex CLI / Codex Action などの仕様変更追従
- 課金体系（premium requests / Actions minutes / usage-based billing）とベストプラクティスの更新
- リンク切れ / サンプルの動作確認（導入手順の再現性）

## 10. 成功指標（例）

- Lead time の短縮（Issue→マージまでの時間）
- Review time の短縮（PR 作成→承認までの時間）
- Reopen 率 / 差し戻し率 / post-merge failure の低下
- 重要インシデント（Secrets 事故、権限逸脱）と cost exception の抑止
- flow / quality / security / cost / adoption を同一 scorecard で月次レビューできる状態（template 整備 + pilot team 1 つ以上で 2 か月連続運用）

## 11. 公開形態 / ライセンス（決定）

決定事項は以下。

- 公開形態: Web（GitHub Pages）を v1.0 の前提とする（Folder: `/docs`）。電子書籍（EPUB/PDF）は v1.0 では任意。
- ライセンス（書籍本文）: `CC-BY-NC-SA-4.0`（商用は別契約。詳細は `LICENSE.md`）
- ライセンス（サンプル/テンプレ）: Companion repo（`itdojp/GitHub-AgentOps-companion`）に集約し、`MIT` とする
