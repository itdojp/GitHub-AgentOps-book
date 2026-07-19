# CHECKLIST（最終整合性検証）

## 概要

本書は「読めば分かる」ではなく「導入できる」を担保するため、本文、生成 docs、Companion 参照、
内部/外部リンク、PR レビュー証跡の整合性を検証し、結果を記録する。

## 対象

- Book: `itdojp/GitHub-AgentOps-book`
  - 本文/生成 docs の検証起点: PR #47 merge 後の `main`（`56cdb61c25fd1b43604ba25a223a7cff98fbc8ca`）
  - 本最終整合性 PR では、この CHECKLIST、README、CHANGELOG、検証スクリプトを更新し、同じ品質ゲートを再実行する
- Companion: `itdojp/GitHub-AgentOps-companion`
  - Book version `1.0.0` の対応commit: `7acb7958153e9e2b3d080f4940fbb95b883a429e`
  - 機械可読な正本: `config/companion-assets.json`
  - 実在確認済みを `shipped`、未提供候補を `planned / not yet shipped` として分離する
  - Companion 側の実ファイル追加・移行は、Book 本文変更とは別 Issue / PR で扱う

## 検証環境

- 基礎改稿の検証日: 2026-05-24（Asia/Tokyo）
- Companion固定path再監査日: 2026-07-19（Asia/Tokyo）
- Node.js: v24.18.0（`package.json` の `>=22.12.0` 前提）
- npm: ローカル環境の npm
- GitHub Pages: `main` / `/docs`

## 検証項目と結果

### 1) Book の品質ゲート（lint / build / internal link-check）

検証コマンド：

```bash
npm test
```

結果：

- [x] Markdown lint が通る
- [x] `docs/` 生成が通る
- [x] 内部リンク検証が通る
- [x] Companion固定path再監査で 111 internal links valid を確認済み

### 2) 外部リンク検証

検証コマンド：

```bash
npm run check-external-links
```

ネットワーク制約がある環境では、必要に応じて次のように到達不能ホストを明示的に除外する。

```bash
EXTERNAL_LINK_CHECK_SKIP_HOSTS=example.com,example.org npm run check-external-links
```

結果：

- [x] 2026-05-24 時点で、本文・README・企画書・検証記録の外部リンクを検査できる
- [x] 2026-07-19の再監査で 66 unique external URLs が HTTP 200 または正常リダイレクトで到達可能であることを確認済み
- [x] `localhost` などローカルプレビュー用 URL は外部リンク検証から除外する

### 3) 本文構成の整合性

検証観点：

- introduction、全11章、付録A/B/C が現在の Issue #37 方針に沿っている
- 章タイトル、トップページ、BOOK-PROPOSAL、navigation、generated docs が同期している
- 「Codex Action 単独中心」ではなく、Copilot code review、cloud agent、third-party agents、Codex CLI、Codex Action を実行パターンとして比較している
- volatile な料金・quota・preview 状態を固定数値として断定していない

結果：

- [x] 第1章〜第2章: 責任分界と Agent-ready repo 要件を説明している
- [x] 第3章〜第5章: instruction hierarchy、Skills / custom agents / hooks、policy / control surface を説明している
- [x] 第6章〜第7章: GitHub ネイティブな実行フローと MCP / tool exposure を説明している
- [x] 第8章: premium requests、Actions minutes、budgets、analytics を扱っている
- [x] 第9章: 複数の継続的 AI 実装パターンを比較している
- [x] 第10章: fork PR、`pull_request_target`、least privilege、OIDC、push protection、artifact attestations、supply chain を扱っている
- [x] 第11章: flow / quality / security / cost / adoption を横断する運用指標を扱っている
- [x] 付録A/B/C: 現行 ecosystem 向けのテンプレ、プレイブック、トラブルシュートとして再構成されている

### 4) PR / review / merge 証跡

検証観点：

- 各作業単位を適切な粒度の PR に分割している
- Copilot review の本文、inline comment、suggestion、thread を確認している
- CI 成功後に merge し、main CI と Pages を確認している
- Issue #37 の受入基準を evidence comment とともに更新している

結果：

- [x] PR #40〜#47 で章・付録の主要 rewrite slice を分割して実施した
- [x] Copilot review の inline comment がある PR では、修正・返信・resolve を実施した
- [x] `pr-review-completeness` で unresolved thread 0 を確認した
- [x] 各 PR で `docs-forbidden` / `qa` / `test` が成功してから merge した
- [x] 各 merge 後に `main` CI と GitHub Pages smoke を確認した

### 5) 残課題の扱い

- [x] Companion 側テンプレートや workflow の実ファイル追加・移行は、Book の本文変更とは別 Issue / PR に分離する
- [x] Companionの固定pathをimmutable commitへ対応付け、`shipped`と`planned / not yet shipped`を分離する
- [x] local fixture検査を `npm test`、remote tree検査を週次/手動workflowへ分離する
- [x] モデル名、料金、preview 機能などの時点依存情報は、四半期棚卸しで再確認する
- [x] 最終整合性 PR の本文に、旧構成→新構成、主な更新理由、未解決点を明記する

## Issue #37 受入基準との対応

| 受入基準 | 証跡 |
| --- | --- |
| 本文が一冊の実務書として読める | introduction → 第1章〜第11章 → 付録A/B/C の導線と本 CHECKLIST の構成監査 |
| `src/` 配下の主要ページが一通り改稿されている | introduction、全11章、付録A/B/C の rewrite PR #40〜#47 |
| 内部リンク・外部リンクが壊れていない | `npm test` と `npm run check-external-links` |
| `npm test` が通る | CI `test` / local `npm test` |
| PR 本文に旧構成→新構成、更新理由、未解決点を書く | 最終整合性 PR 本文 |

## 次回棚卸し

四半期棚卸しでは、次を確認する。

- GitHub Copilot / cloud agent / custom agents / hooks / MCP / code review の仕様変更
- Copilot premium requests、usage-based billing、Actions billing、予算/analytics の仕様変更
- OpenAI Codex CLI / Codex cloud / Codex Action の公式情報更新
- Companion repo の固定パス、Issue/PR template、Skills、workflow、MCP/tool exposure 例の整合
- 内部リンク、外部リンク、GitHub Pages の公開状態
