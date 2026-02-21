---
layout: book
title: "GitHub AgentOps 実践ガイド（Codex中心）"
---

# GitHub AgentOps 実践ガイド（Codex中心）

本書は、GitHub 上で AI エージェント（Codex 等）を運用するための「運用設計（Ops）」を、実装可能なテンプレートと手順に落とすための実践ガイドです。

## 目次

- [はじめに](introduction/)
- 第1部：AgentOps 概観
  - [第1章：責任分界（人間 / エージェント / CI）](chapters/chapter01/)
  - [第2章：Agent-ready repo 要件（テンプレ / 品質ゲート / 権限境界）](chapters/chapter02/)
- 第2部：指示と再利用
  - [第3章：AGENTS.md 設計](chapters/chapter03/)
  - [第4章：Skills 設計](chapters/chapter04/)
  - [第5章：Rules 設計](chapters/chapter05/)
- 第3部：GitHub エージェント運用
  - [第6章：GitHub Agents 運用（Issue→PR→反復→マージ）](chapters/chapter06/)
  - [第7章：カスタムエージェント（.agent.md）と MCP（公開範囲）](chapters/chapter07/)
  - [第8章：コスト設計（premium requests / Actions minutes）](chapters/chapter08/)
- 第4部：CI/CD 統合とガバナンス
  - [第9章：Codex GitHub Action で継続的 AI](chapters/chapter09/)
  - [第10章：セキュリティ設計（Secrets / 権限 / ログ / 供給網）](chapters/chapter10/)
  - [第11章：メトリクス設計（Lead time / Review time / 差し戻し率）](chapters/chapter11/)
- 付録
  - [付録A：テンプレ集（AGENTS.md / Issue / PR / .agent.md / Skills）](appendices/appendix-a/)
  - [付録B：プレイブック集（タスク別運用手順）](appendices/appendix-b/)
  - [付録C：トラブルシュート（失敗パターンと対処）](appendices/appendix-c/)
