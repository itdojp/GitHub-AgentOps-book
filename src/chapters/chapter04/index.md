# 第4章：再利用レイヤー（Skills / custom agents / hooks）

## この章で扱うこと

この章では、第3章で分けた instruction hierarchy の上に、
反復可能な作業をどの再利用レイヤーへ置くかを設計します。

扱う対象は次の 3 つです。

- Skills: 手順、スクリプト、参考資産をまとめたタスク別 Runbook
- custom agents: 役割と専門性を固定したエージェントプロファイル
- hooks: agent 実行中の要所で検証、監査、通知、停止判断を挟む制御点

目的は「便利な部品を増やす」ことではありません。
同じ作業を、同じ品質・同じ承認境界・同じ証跡で繰り返せるようにすることです。

## 再利用レイヤーの比較

Skills、custom agents、hooks は似ていますが、役割は異なります。
次の表で、どこに何を置くかを先に決めます。

| レイヤー | 置くもの | 向いている用途 | 向いていない用途 | 主な証跡 |
| --- | --- | --- | --- | --- |
| Instruction | 全作業に効く方針、文体、禁止事項 | 常に守るルール | 長い手順、タスク別ノウハウ | instruction 変更 PR |
| Skill | タスク別の手順、入力、出力、検証、補助スクリプト | 依存更新、テスト追加、docs 改修、リリース準備 | 権限執行、最終承認 | 実行結果、PR本文、ログ |
| Custom agent | 専門役割、判断観点、使う tool / MCP / skill | docs reviewer、test generator、security reviewer | 汎用ルールの置き場、秘密情報の保持 | agent profile、review log |
| Hook | session / prompt / tool call / completion などの制御点 | secret scan、禁止コマンド検知、監査ログ、通知 | 複雑な本文生成、設計判断の代替 | hook log、CI log、audit log |
| MCP / tool | 外部データや操作 capability | Issue/PR 取得、社内 DB 参照、検索 | 無制限な外部操作 | tool call log、承認ログ |

設計の基本は、**知識は instruction / skill、役割は custom agent、執行は hook / CI / ruleset** に分けることです。

## Skills: 反復タスクの Runbook

Skill は、エージェントが必要なときに取り出す詳細手順です。
単発プロンプトに長い作業手順を書く代わりに、入力、出力、検証、失敗時対応を資産化します。

### Skill に入れるもの

- 目的と適用条件
- 必須入力と不足時の返し方
- 期待する出力、PR本文、証跡
- 実行手順
- 検証コマンド
- 失敗時の切り分け
- 非スコープと停止条件

### Skill に入れないもの

- 組織全体の恒久ポリシー
- Secrets や本番認証情報
- 人間の承認を不要にする例外
- 最新料金、UI、preview 状態など変動しやすい情報

### ミニ例: docs 改修 Skill の骨格

```md
# docs-update

## 目的
公開ドキュメントの誤字、導線、リンク、古い表現を最小差分で改善する。

## 入力
- 対象ファイルまたは Issue
- 受入基準
- 非スコープ
- 検証コマンド

## 手順
1. 対象章と周辺リンクを読む
2. 変更範囲を 1 PR = 1 意図に絞る
3. 本文、目次、生成物、関連リンクを整合させる
4. 検証結果と残リスクを PR に書く

## 停止条件
- 公式仕様確認が必要だが一次情報に到達できない
- 生成物とソースの関係が分からない
- 受入基準が複数の独立テーマに分かれる
```

Skill は作業を自動化しますが、承認境界そのものではありません。
危険操作を止める仕組みは、第5章の policy / control surface と組み合わせます。

## Custom agents: 専門役割を固定する

Custom agent は、特定のタスクに合わせて expertise、prompt、tool、MCP、skills を束ねるレイヤーです。
GitHub Copilot CLI では、repository-level agent を `.github/agents/` に置く運用ができます。
組織やユーザー単位の agent と衝突する可能性があるため、名前、用途、優先関係を明確にします。

### custom agent に向いている役割

- docs reviewer: 見出し、導線、リンク、読者前提を重点確認する
- test planner: 受入基準からテスト観点と不足ケースを洗い出す
- security reviewer: secret、権限、fork PR、外部 tool exposure を確認する
- release operator: changelog、tag、release note、rollback を点検する

### custom agent に書くべきこと

- いつ使う agent か
- 何を成果物として返すか
- 参照してよい範囲
- 使用してよい tool / MCP / skill
- 判断を人間へ戻す条件
- PR に残す証跡

custom agent は「専門家の観点」を固定する手段です。
人間の責任、CODEOWNERS、required review、CI を置き換えるものではありません。

## Hooks: 執行・監査・停止線を入れる

Hooks は、agent session の開始、終了、prompt submit、tool call などの要所で
shell command を実行し、検証や監査を挟むための仕組みです。
GitHub Copilot の hook は repository-level では `.github/hooks/*.json` に置く運用ができます。

### hook に向いている処理

- session start で作業ディレクトリや依存状態を記録する
- prompt submit で危険な指示語や本番値の混入を警告する
- tool call 前後で secret scan、禁止コマンド検知、外部送信検知を行う
- session end で変更ファイル、検証結果、ログ保存先をまとめる

### hook の注意点

- hook 自体が shell command を実行するため、最小権限で設計する
- 遅い hook は agent の反復速度と UX を悪化させる
- ネットワーク送信、外部通知、ログ保存は情報漏えいリスクを評価する
- hook で止めた理由を、PR / issue / audit log に追跡できる形で残す
- 複雑な設計判断を hook に押し込まず、policy と人間承認へ戻す

## 設計順序

再利用レイヤーは、次の順で導入します。

1. 反復している作業を Issue / PR の履歴から選ぶ
2. Skill として入力、出力、検証、停止条件を定義する
3. 専門観点が必要な作業だけ custom agent に切り出す
4. 実行前後に必ず機械的に確認したい条件を hook 化する
5. 危険操作は第5章の policy / control surface に接続する
6. 月次または四半期で、利用頻度、失敗率、手戻りを見直す

## 公式情報の確認先

2026-05-24（Asia/Tokyo）時点で、本章の用語整理に使う主な一次情報は次です。
提供範囲や設定ファイル形式は変わり得るため、導入時は最新ページを確認してください。

- GitHub Docs: [Overview of customizing GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/overview)
- GitHub Docs: [Invoking custom agents](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/invoke-custom-agents)
- GitHub Docs: [Creating and using custom agents for GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli)
- GitHub Docs: [Adding agent skills for GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills)
- GitHub Docs: [About hooks for GitHub Copilot](https://docs.github.com/en/copilot/concepts/agents/hooks)
- GitHub Docs: [Using hooks with GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/use-hooks)

## 章末チェックリスト

- [ ] 反復タスクは Skill として入力、出力、検証、停止条件を持っている
- [ ] custom agent は専門役割、利用条件、成果物、権限境界を説明している
- [ ] hook は検証・監査・停止線に限定され、設計判断を抱え込みすぎていない
- [ ] skill / custom agent / hook のどれが責任境界を担うかを混同していない
- [ ] 危険操作は第5章の policy / control surface に接続されている

## まとめ

再利用レイヤーは、エージェントを「速くする」ためだけの部品ではありません。
Skills で手順を再現可能にし、custom agents で専門観点を固定し、hooks で検証と監査を挟むことで、
反復作業を商用運用に耐える品質と証跡へ引き上げます。
