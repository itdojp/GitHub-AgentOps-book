---
layout: book
title: "第9章：Codex GitHub Action で継続的 AI"
---

# 第9章：Codex GitHub Action で継続的 AI

## この章で扱うこと

- PR 時の要約/リスク抽出、リリース前のチェック等の自動化例
- 自動化範囲と人間承認の境界

## Companion 資産（参照先）

Companion repo: [itdojp/GitHub-AgentOps-companion](https://github.com/itdojp/GitHub-AgentOps-companion)

- PR 作成/更新時の要約 + リスク抽出コメント: `.github/workflows/codex-pr-review.yml`
- リリース前の変更点サマリ/影響範囲/チェックリスト生成: `.github/workflows/codex-release-prep.yml`
- Codex Action 用プロンプト雛形: `.github/codex/prompts/`

## 章末チェックリスト（ドラフト）

- [ ] 最小構成で動作するワークフローがある
- [ ] Secrets/権限/実行範囲の注意が明記されている
