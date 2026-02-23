# はじめに

本書は、GitHub 上で AI エージェントを活用する開発チーム向けに、エージェント運用を「Ops（運用設計）」として体系化することを目的とします。

## スコープ注記

本書は、例として Codex / GitHub Agents / Copilot coding agent を扱います（主要例は Codex）。

## Companion repo（導入資産）

テンプレートやサンプルワークフローなど、導入に必要な「コピペできる資産」は Companion repo に集約します。

- Companion repo: [itdojp/GitHub-AgentOps-companion](https://github.com/itdojp/GitHub-AgentOps-companion)
- 役割分担: 本書 = 理解 / Companion = 導入（テンプレ・サンプル）

## 想定読者

- 開発リーダー / テックリード（標準化・統制・レビュー設計）
- 中〜大規模開発のメンテナー（CI / 権限 / 品質ゲート）
- SRE / DevEx / Platform Engineering（運用設計と自動化）

## 本書の読み方

1. 第1部で責任分界と前提条件（Agent-ready repo）を整理する  
2. 第2部で「指示（AGENTS）」「再利用（Skills）」「実行境界（Rules）」を標準化する  
3. 第3部で GitHub 上の運用フロー（Issue→PR→反復）に落とし込む  
4. 第4部で CI/CD とガバナンス（セキュリティ/メトリクス）に接続する  
