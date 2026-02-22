---
layout: book
title: "第2章：Agent-ready repo 要件（テンプレ / 品質ゲート / 権限境界）"
---

# 第2章：Agent-ready repo 要件（テンプレ / 品質ゲート / 権限境界）

## この章で扱うこと

- Issue/PR テンプレ、品質ゲート、権限境界、ログ/監査の最小要件
- Companion repo の資産を「導入可能（コピペ）」にする設計

## Agent-ready repo の最小要件

エージェントを開発プロセスに組み込む場合、リポジトリ側に最低限の「受入条件」が必要です。
ここでいう Agent-ready repo は、次を満たす状態を指します。

- **仕様が機械可読に近い**：Issue が実行仕様（受入基準・制約・検証）として書ける
- **検証が自動化されている**：CI が品質ゲートを担い、同じ手順で再実行できる
- **権限が分離されている**：Secrets/マージ権限/デプロイ権限の境界が明確
- **監査できる**：誰が何を承認し、どの検証を通過したかが追跡できる

## テンプレ（Issue / PR）

テンプレは「指示書の標準化」です。人間の認知負荷を下げ、エージェントの探索空間を狭めます。

### Issue（実行仕様）

最低限、次の要素を含めます。

- 目的（何を達成するか）
- スコープ/非スコープ（やらないことを明記する）
- 受入基準（DoD）
- 制約（禁止事項、互換性、権限、コスト上限など）
- 検証（再現手順、テスト、ログの確認点）

### PR（変更の意図と検証）

PR では「差分の意図」「検証結果」「リスク」「ロールバック」を短く書ける形にします。

## 品質ゲート（CI）

CI は「個人の頑張り」を「再現可能なプロセス」に変換します。
エージェントは CI の失敗を起点に反復できるため、CI の整備は投資対効果が高い領域です。

例：

- lint（Markdown/コード）
- unit/integration test
- build（成果物生成）
- link-check（ドキュメントの参照整合性）

## 権限境界（Secrets / マージ / デプロイ）

エージェント導入で問題になりやすいのは「権限が広すぎる」ことです。
最小権限の原則に沿って、次を整理します。

- Secrets を参照できるジョブ/イベントの範囲
- `GITHUB_TOKEN` の権限（workflow 単位 / job 単位）
- CODEOWNERS と Required reviewers による承認境界
- デプロイ前の環境保護（人間承認、手動実行など）

## ログ/監査（追跡可能性）

少なくとも、次が追跡できる状態にします。

- 仕様（Issue）→ 実装（PR）→ 検証（Checks）→ 承認（Review）→ 反映（Merge）
- CI の実行ログと、再現可能な実行手順

## Companion 資産（参照先）

Companion repo: [itdojp/GitHub-AgentOps-companion](https://github.com/itdojp/GitHub-AgentOps-companion)

- Issue フォーム: `.github/ISSUE_TEMPLATE/`
- PR テンプレ: `.github/PULL_REQUEST_TEMPLATE.md`
- CODEOWNERS 指針: `CODEOWNERS_GUIDE.md`

## 導入手順（最小）

1. Companion からテンプレをコピー（Issue フォーム / PR テンプレ）
2. CI を追加し、最小の Required checks を決める（lint/test/build 等）
3. CODEOWNERS と Required reviewers を設定し、承認境界を明文化する
4. Secrets/権限/監査ログの方針を決め、ドキュメント化する
5. 小さな Issue を 1 件流し、テンプレ→CI→レビュー→マージの一連を検証する

## 章末チェックリスト（ドラフト）

- [ ] Issue/PR テンプレが整備され、受入基準が明文化されている
- [ ] ブランチ保護/Required checks/Required reviewers の方針が決まっている
- [ ] Secrets/権限/監査ログの運用方針が決まっている
