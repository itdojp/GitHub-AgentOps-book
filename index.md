---
layout: book
title: "GitHub AgentOps 実践ガイド"
---

# GitHub AgentOps 実践ガイド

AIエージェント駆動開発のための運用設計

- English Title: GitHub AgentOps Practical Guide
- English Subtitle: Ops Design for AI Agent-Driven Development
- スコープ注記: 例: Codex / GitHub Agents / Copilot coding agent（主要例は Codex）

本書は、GitHub 上で AI エージェントを運用するための「運用設計（Ops）」を、実装可能なテンプレートと手順に落とすための実践ガイドです。

## 想定読者

- 開発リーダー / テックリード（標準化・統制・レビュー設計）
- 中〜大規模開発のメンテナー（CI / 権限 / 品質ゲート）
- SRE / DevEx / Platform Engineering（運用設計と自動化）

## 前提知識

- GitHub の基本操作（Issue / PR / Review / Actions）
- CI の基本概念（lint / test / build / required checks）
- 権限管理と Secrets の基本（最小権限・監査の考え方）

## 学習成果

- Agent-ready repo の最小要件を整理し、導入順序を決められる
- AGENTS.md / Skills / Rules / CI を役割分担に沿って設計できる
- Issue → PR → CI → Review → Merge の運用を、監査可能な形で回せる
- Secrets / 権限 / ログ / コストを考慮した AgentOps の統制設計ができる

## 所要時間

- 通読: 約2〜3時間
- Companion のテンプレートを適用しながら導入する場合: 半日〜1日

## 読み方ガイド

- まず全体像を把握したい場合は、はじめに → 第1章 → 第2章 → 第6章 → 第10章の順で読む
- 既に GitHub Actions を運用している場合は、第2章・第6章・第9章・第10章を先に読む
- 標準化テンプレートを整えたい場合は、第3章〜第5章と付録A / 付録B を併読する
- 障害対応や失敗例を先に確認したい場合は、付録C から入り、該当章へ戻る読み方でもよい

## Companion（導入資産）

テンプレートやサンプルワークフローなど、導入に必要な「コピペできる資産」は Companion repo に集約します。

- Companion repo: [itdojp/GitHub-AgentOps-companion](https://github.com/itdojp/GitHub-AgentOps-companion)

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

## 関連書籍

- GitHub 操作の基礎を補う: [GitHub初心者ガイド](https://itdojp.github.io/github-guide-for-beginners-book/)
- CI / merge queue / workflow 設計を深掘りする: [AI開発のためのGitHubワークフロー実践ガイド](https://itdojp.github.io/github-workflow-book/)
- Secrets / 権限 / 取り扱い基礎を補う: [セキュリティ＆プライバシー基礎リテラシー](https://itdojp.github.io/security-privacy-literacy-book/)

## ライセンス

本書は CC BY-NC-SA 4.0 で公開されています。商用利用は別途契約が必要です。

## 利用と更新情報

- リポジトリ: [itdojp/GitHub-AgentOps-book](https://github.com/itdojp/GitHub-AgentOps-book)
- Companion（導入資産）については、上部の「Companion（導入資産）」セクションを参照してください。
- 更新差分を追う場合は、GitHub のコミット履歴と PR 一覧を参照してください。
