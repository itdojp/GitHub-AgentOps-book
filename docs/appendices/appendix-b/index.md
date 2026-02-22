---
layout: book
title: "付録B：プレイブック集（タスク別運用手順）"
---

# 付録B：プレイブック集（タスク別運用手順）

バグ修正、依存更新、テスト追加、ドキュメント整備、リファクタ等の標準手順を整理します。

## Companion repo

- リポジトリ: [itdojp/GitHub-AgentOps-companion](https://github.com/itdojp/GitHub-AgentOps-companion)

## 共通（最小プレイブック）

1. Issue を実行仕様として固定（目的/受入基準/制約/検証）
2. 小さく作業し、PR に証跡を残す（差分の意図、検証結果、リスク、ロールバック）
3. Rules（allow/prompt/forbidden）に従い、prompt は承認ログを残す
4. CI を通し、レビュー指摘を反復して収束させる

## バグ修正

- Issue テンプレ: `.github/ISSUE_TEMPLATE/bug-report.yml`
- 関連 Skill: `skills/add-tests/SKILL.md`（回帰防止の最小）

推奨手順（最小）：

1. 再現条件/期待結果/実結果を Issue に固定
2. 最小再現またはテストを追加（先に安全柵を置く）
3. 修正を適用し、CI とローカルで検証
4. ロールバック（revert 手順）を明記

## 依存更新

- Issue テンプレ: `.github/ISSUE_TEMPLATE/dependency-update.yml`
- Skill: `skills/dependency-update/SKILL.md`

推奨手順（最小）：

1. 更新理由（一次情報）と受入基準/テスト計画/ロールバックを固定
2. lockfile を含めて更新し、差分を最小化
3. 破壊的変更の有無を評価し、移行が必要なら手順を追記

## テスト追加

- Skill: `skills/add-tests/SKILL.md`
- カスタムエージェント例: `custom-agents/test-agent/.agent.md`

推奨手順（最小）：

1. 受入基準をテスト観点へ分解（正常/異常/境界）
2. 粒度（unit/integration/e2e）を決め、再現性とコストを優先
3. フレーク対策（非決定要因の排除）をセットで行う

## ドキュメント整備

- Issue テンプレ: `.github/ISSUE_TEMPLATE/documentation.yml`
- Skill: `skills/docs-update/SKILL.md`
- カスタムエージェント例: `custom-agents/doc-agent/.agent.md`

推奨手順（最小）：

1. 読者の到達点（何ができるか）を明確化
2. 参照（章間/資産/リンク）を更新し、リンク検証を通す
3. 断定が危険な箇所は一次情報参照へ寄せる

## 安全なリファクタ

- Skill: `skills/refactor-safe/SKILL.md`

推奨手順（最小）：

1. 1PR=1意図で分割し、レビュー可能な差分にする
2. 既存テストを実行し、必要なら先にテストを追加
3. 振る舞い不変を受入基準として検証する

## リリース前チェック（変更点サマリ/チェックリスト）

- ワークフロー例: `.github/workflows/codex-release-prep.yml`

推奨手順（最小）：

1. 実行範囲（base/head）を決め、手動実行で結果を確認
2. チェックリストをレビューし、必要なら未完了項目を Issue 化する
