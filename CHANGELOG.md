# CHANGELOG

本プロジェクトの変更履歴です（書籍本文/Companion 資産を含む）。

## [Unreleased]

### Changed

- 付録A/B/Cを現行 ecosystem 向けに再構成し、instructions / agents / Skills / hooks / MCP、Copilot review、Actions permissions、MCP/tool exposure、rollout review のテンプレ・プレイブック・トラブルシュートを追加
- 第11章を「メトリクス・運用レビュー・展開ロードマップ」として再構成し、flow / quality / security / cost / adoption の scorecard、レビュー cadence、maturity matrix を追加

## [v1.0.0] - 2026-02-23

### Added

- 書籍本文（第1部〜第4部、全11章 + 章末チェックリスト）
  - 第1部（第1-2章）責任分界 / Agent-ready repo 要件
  - 第2部（第3-5章）Instruction hierarchy / 再利用レイヤー / Policy 設計
  - 第3部（第6-8章）GitHub ネイティブ実行フロー / MCP と tool exposure / コスト・予算・利用ガバナンス
  - 第4部（第9-11章）継続的 AI 実装パターン / セキュリティ・供給網 / メトリクス・運用レビュー・展開ロードマップ
- 付録A/B/C（現行 ecosystem 対応テンプレ集、プレイブック集、トラブルシュート）
- 検証記録: `CHECKLIST.md`
- 公開（Web）: GitHub Pages（`main` / `/docs`）
- Companion repo（導入資産）
  - Issue/PR テンプレ、CODEOWNERS 指針
  - Skills 雛形、Policy 雛形、custom agent 雛形、MCP / tool exposure 設計例
  - Codex GitHub Action サンプル（PR コメント/リリース前チェック）
