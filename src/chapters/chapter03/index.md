# 第3章：Instruction hierarchy と context 設計

<!-- companion-path-scope: generic -->

## この章で扱うこと

この章では、AI エージェントに渡す指示を 1 つの巨大な `AGENTS.md` に集約せず、
GitHub / Copilot / Codex / ローカル運用で再利用できる **instruction hierarchy** として設計します。

扱う観点は次の通りです。

- repo-wide / path-specific / agent-specific instruction の役割分担
- `AGENTS.md`、`.github/copilot-instructions.md`、`.github/instructions/**/*.instructions.md` の使い分け
- Issue / PR / review comment に残す runtime steering の扱い
- 指示の衝突、古い指示、過剰な context を避ける運用
- 監査可能性を保つための更新・レビュー手順

## なぜ `AGENTS.md` だけでは足りないのか

`AGENTS.md` は、エージェントにリポジトリ固有の作業規約を渡すための有効な資産です。
しかし、すべての指示を 1 ファイルに詰め込むと、次の問題が起きます。

- 全領域に関係しない詳細ルールまで毎回 context に入る
- docs / app / infra / security など領域別の例外が埋もれる
- GitHub Copilot code review や coding agent が参照する repository custom instructions との責務が曖昧になる
- 「このタスクだけの判断」を恒久ルールとして残してしまう
- 更新者が増えるほど、古い手順・矛盾・重複が検出しにくくなる

商用運用では、指示を **適用範囲** と **寿命** で分けます。
長期に残すべき原則はリポジトリ資産へ、短期の判断は Issue / PR / review comment へ残す、という分離が重要です。

## Instruction hierarchy の全体像

次の表は、指示をどこに置くかを決めるための標準形です。
実際の優先順位やサポート範囲はツールごとに異なるため、導入時は必ず公式ドキュメントで確認します。

| レイヤー | 主な配置場所 | 寿命 | 典型用途 | 運用上の注意 |
| --- | --- | --- | --- | --- |
| Organization / personal policy | GitHub / Copilot の組織・個人設定 | 中〜長期 | 企業全体の言語、セキュリティ姿勢、禁止事項 | リポジトリ内からは見えにくいため、PR 判断の根拠にする場合は該当ポリシーを参照できる形で残す |
| Repository-wide instruction | `.github/copilot-instructions.md` | 中期 | リポジトリ全体の設計方針、標準コマンド、レビュー観点 | すべての作業に効く前提で、短く、衝突しない内容にする |
| Path-specific instruction | `.github/instructions/**/*.instructions.md` | 中期 | `docs/**`、`src/**`、`infra/**` など領域別の編集ルール | `applyTo` で対象を明示し、repo-wide instruction と重複しすぎないようにする |
| Agent instruction | `AGENTS.md`（必要ならサブディレクトリにも配置） | 中期 | Codex / coding agent / CLI エージェント向けの作業手順、禁止事項、検証コマンド | サブディレクトリ単位で細分化する場合は、上位ルールとの関係を冒頭に書く |
| Runtime steering | Issue / PR / review comment | 短期 | 受入基準、例外判断、レビュー指摘、今回だけの非スコープ | 恒久化すべき判断は、後続 PR で instruction / template / checklist へ昇格する |

この階層は「どれが正しいか」を競わせるためではなく、**どの指示を、どの対象に、どの期間だけ効かせるか** を決めるための設計です。

## どのファイルに何を書くか

### `.github/copilot-instructions.md`

GitHub Copilot に対する repository-wide custom instructions を置く場所です。
リポジトリ全体に常に効かせたい、短く安定した指示を置きます。

推奨内容:

- リポジトリの目的と主な読者
- 主要ディレクトリと編集対象
- 標準の検証コマンド
- PR で必ず記録する事項
- セキュリティ・機密情報・生成物編集に関する原則

避ける内容:

- 1 章だけ、1 ディレクトリだけに効く細かいルール
- 価格、UI、preview 状態など変化しやすい情報
- Issue / PR ごとの一時判断

### `.github/instructions/**/*.instructions.md`

Path-specific custom instructions を置く場所です。
ファイル冒頭の front matter に `applyTo` を置き、対象ファイルを glob で示します。

例:

```md
---
applyTo: "src/chapters/**/*.md,src/appendices/**/*.md"
---

- 日本語はです・ます調に統一する。
- 本文で変化しやすい料金・プラン・UI手順を断定しない。
- 章末にはチェックリストまたは次アクションを置く。
```

このレイヤーは、docs / app / infra / security などで品質基準が違う場合に有効です。
ただし、repo-wide instruction と同じ内容を繰り返すと、更新漏れが増えます。
共通原則は repo-wide、領域固有の例外は path-specific に分けます。

### `AGENTS.md`

`AGENTS.md` は、エージェントに対する運用手順をリポジトリ内に固定するためのファイルです。
特に Codex CLI や他の coding agent を含め、リポジトリを読むエージェントに「この作業場での作法」を伝える用途に向きます。

推奨内容:

- 回答言語、文体、断定禁止、根拠提示
- 編集対象と生成物の扱い
- 実行すべき検証コマンド
- 禁止事項（Secrets、破壊的操作、force push、外部送信など）
- 作業台帳、レビュー完全性、CI green、公開反映確認などの完了条件

サブディレクトリに `AGENTS.md` を置く場合は、上位ルールを否定するのではなく、
「この配下で追加される制約」を明確に書きます。

### Issue / PR / review comment

Issue / PR / review comment は、その作業だけに効く runtime steering です。
次のような情報は、恒久的な instruction ではなく、まず Issue / PR に残します。

- 今回の受入基準
- 今回だけ非スコープにする範囲
- レビューで決まった仕様差分
- CI skip / retry / known warning の理由
- merge 後の確認結果

後から同じ判断が繰り返される場合に限り、テンプレートや `AGENTS.md` へ昇格します。

## Context 設計の原則

### 1. 対象を絞る

エージェントに大量の文脈を渡すほど、重要な制約が埋もれます。
repo-wide instruction は「全作業に効く原則」だけにし、領域固有の細部は path-specific に分けます。

### 2. 衝突を作らない

同じテーマについて複数ファイルで違う指示を書くと、エージェントの挙動が不安定になります。
次を避けます。

- あるファイルでは `docs/` を生成物扱い、別のファイルでは手編集対象扱いにする
- あるファイルでは `npm test`、別のファイルでは `npm run build` のみを必須とする
- 「外部リンクは使う」と「外部リンクは禁止」を同時に置く

衝突が必要な場合は、適用範囲と理由を明記します。

### 3. 変動情報を本文に固定しない

モデル名、プラン、価格、UI、preview 状態、サポート範囲は変わります。
これらは instruction に固定しすぎず、次の形にします。

- 「最新の公式ドキュメントで確認する」観点を書く
- 参照先を置く場合は、確認日と対象範囲を明記する
- 期限付きの判断は Issue / PR に残し、四半期棚卸しで見直す

### 4. 監査可能な形で更新する

Instruction は運用ルールです。
変更すると、エージェントの出力品質、レビュー負荷、CI の期待値が変わります。

最低限、PR に次を残します。

- 変更した instruction レイヤー
- 変更理由
- 影響する作業種別
- 移行が必要なテンプレートやチェックリスト
- 検証結果

## ミニ設計例：書籍リポジトリの場合

書籍リポジトリでは、次の分担が扱いやすいです。

| 対象 | 配置 | 内容 |
| --- | --- | --- |
| 全体方針 | `.github/copilot-instructions.md` | 日本語の文体、読者、検証コマンド、PR 証跡 |
| 原稿 | `.github/instructions/manuscript.instructions.md` | `src/**` の章構成、です・ます調、出典・断定の扱い |
| 公開生成物 | `.github/instructions/docs-output.instructions.md` | `docs/**` が生成物か手編集対象か、build 手順 |
| Codex / CLI 作業 | `AGENTS.md` | worktree 方針、台帳更新、レビュー完全性、CI / Pages 確認 |
| 個別改稿 | Issue | 章別スコープ、受入基準、非スコープ、確認対象 URL |

この分担にすると、改稿 Issue ごとの判断を GitHub 上に残しつつ、再利用すべき運用ルールだけを instruction 資産へ戻せます。

## 公式情報の確認先

2026-05-24（Asia/Tokyo）時点で、本章の用語整理に使う主な一次情報は次です。
仕様・提供範囲・サポート環境は変わるため、導入時は必ず最新ページを確認してください。

- GitHub Docs: [Adding repository custom instructions for GitHub Copilot](https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot)
- GitHub Docs: [Support for different types of custom instructions](https://docs.github.com/en/copilot/reference/custom-instructions-support)
- GitHub Docs: [About GitHub Copilot coding agent](https://docs.github.com/en/copilot/concepts/coding-agent/coding-agent)
- GitHub Docs: [About custom agents](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/about-custom-agents)
- OpenAI Developers: [Codex cloud](https://developers.openai.com/codex/cloud)
- OpenAI Developers: [Agent internet access](https://developers.openai.com/codex/cloud/internet-access)

## 章末チェックリスト

- [ ] repo-wide、path-specific、agent-specific、runtime steering の置き場所が分かれている
- [ ] `.github/copilot-instructions.md` に全作業へ効く短い原則だけが書かれている
- [ ] `.github/instructions/**/*.instructions.md` の `applyTo` が対象範囲を正しく示している
- [ ] `AGENTS.md` に編集対象、禁止事項、検証、完了条件が書かれている
- [ ] Issue / PR に今回だけの受入基準、非スコープ、レビュー判断が残っている
- [ ] instruction 変更時に、影響範囲と検証結果を PR に記録している

## まとめ

Instruction hierarchy は、エージェントを強く縛るためだけの仕組みではありません。
適切な場所に、適切な粒度で、適切な寿命の指示を置くことで、
再現性・監査可能性・更新しやすさを同時に高めるための運用設計です。
