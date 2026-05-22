# CHECKLIST（v1.0 検証）

## 概要

本書は「読めば分かる」ではなく「導入できる」を担保するため、テンプレ/サンプル/CI の整合性を検証し、結果を記録する。

## 対象

- Book: `itdojp/GitHub-AgentOps-book`
  - 検証対象コミット: `512a50af2295f583c0e6c3070bcbdfa8780ed1fb`
- Companion: `itdojp/GitHub-AgentOps-companion`
  - 検証対象コミット: `b1733c86128b055021c21b5a0b0c013983edf506`

## 検証環境（例）

- 日付: 2026-02-22
- Node.js: v22.19.0
- npm: 11.8.0

## 検証項目と結果

### 1) Book の品質ゲート（lint/build/link-check）

- [x] コマンド: `npm test`
- [x] 結果: PASS（markdownlint / build / link-check）

### 2) テンプレ整合（Issue フォーム → PR テンプレ → レビュー観点）

検証観点（最小）：

- Issue が実行仕様（目的/受入基準/制約/検証）として書ける
- PR が「変更意図/検証結果/リスク/ロールバック」を残せる
- Rules（allow/prompt/forbidden）と矛盾しない（承認境界が明確）

結果：

- [x] Issue フォーム（Companion `.github/ISSUE_TEMPLATE/`）が受入基準/制約/検証の記述を促す
- [x] PR テンプレ（Companion `.github/PULL_REQUEST_TEMPLATE.md`）で検証結果とリスク記録の導線がある

### 3) Skills の実行可能性（手順資産としての再現性）

検証観点（最小）：

- 各 Skill が「入力/出力/手順/チェック/失敗時対応」を持つ
- prompt（承認必須）に該当する操作が混ざる場合、承認/証跡の扱いが説明される

結果：

- [x] Companion `skills/*/SKILL.md` がテンプレ構造を満たす（dependency-update/add-tests/docs-update/refactor-safe）

### 4) Rules の抑止力（危険操作の抑止と実務性）

検証観点（最小）：

- allow/prompt/forbidden の線引きが明文化され、prompt の承認フローがある
- Secrets/破壊的操作/監査性の毀損が forbidden/prompt として扱われる

結果：

- [x] Companion `rules/command-policy.md` に allow/prompt/forbidden と承認フローが定義されている

### 5) Codex Action サンプル（最小構成で動く/手順明記）

注記：

- GitHub Actions の実行はローカルで再現しないため、ここでは「サンプルの配置」「導入手順の明記」を検証する。

検証観点（最小）：

- ワークフローが存在する（PR コメント/リリース前チェック）
- Secrets/権限/実行範囲（フォーク PR 等）の注意が明記されている

結果：

- [x] Companion `.github/workflows/codex-pr-review.yml`（PR 要約 + リスク抽出コメント）
- [x] Companion `.github/workflows/codex-release-prep.yml`（手動実行のリリース前チェック）
- [x] Companion `README.md` に `OPENAI_API_KEY`、権限、実行範囲の注意が明記されている

### 6) 参照整合（Book → Companion）

- [x] Book 各章/付録に Companion リポジトリ（固定パス）参照が存在する
- [x] link-check が PASS する

## 2026-05-23 追加レビュー

親ロードマップ `itdojp/it-engineer-knowledge-architecture#153` / Phase 2 管理 Issue #155 の観点で、
GitHub AgentOps の運用ゲートを再確認した。

### 追加確認項目

- [x] PR 完了ゲート、review 本文/inline comment/suggestion 対応、未解決 review thread 0 を本文で扱う
- [x] AI/外部サービス投入、Secrets、ログ、provider 条件確認、漏えい疑い時の初動を本文で扱う
- [x] review 完了率、post-merge 失敗率、eval 再実行率など AgentOps 固有の指標を本文で扱う
- [x] 公式情報の確認先を本文に残す

### 確認した公式情報

- GitHub Copilot coding agent / Copilot code review
- GitHub Actions `GITHUB_TOKEN` / environments
- OpenAI Codex Action

### 残課題の扱い

- Companion 側テンプレートや workflow の変更が必要な場合は、Book の本文変更とは別 Issue / PR に分離する。
- モデル名、料金、preview 機能などの時点依存情報は、四半期棚卸しで再確認する。
