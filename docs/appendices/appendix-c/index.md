---
layout: book
title: "付録C：トラブルシュート（失敗パターンと対処）"
---

# 付録C：トラブルシュート（失敗パターンと対処）

仕様不足、指示競合、差分肥大、レビュー停滞、テスト失敗、権限不足、Secrets 事故、MCP / hook / custom agent
由来の運用事故など、AgentOps で起きやすい失敗パターンと対処を整理します。

## 最初に確認する切り分け順

1. 仕様の問題か
   - Issue の目的、非目標、受入基準、検証、ロールバックが揃っているか
2. 指示の問題か
   - `.github/copilot-instructions.md`、path-specific instructions、`AGENTS.md`、custom agent 指示が競合していないか
3. 実行境界の問題か
   - policy、hook、MCP tool、Actions permissions、ruleset、CODEOWNERS が意図どおり効いているか
4. 検証の問題か
   - lint / test / build / link-check / security check のどれが失敗しているか
5. 運用の問題か
   - review owner、承認ログ、cost owner、rollout owner が不明になっていないか

## 仕様不足（Issue が実行仕様になっていない）

### 症状

- エージェントの成果がブレる、手戻りが増える
- レビューで「何が正か」が決まらない
- PR 本文が実装報告だけになり、受入基準との対応が追えない

### 対処（最小）

- 不足情報を質問として返し、Issue に追記して確定させる
- 選択肢（案A/案B）と判断材料（メリット/デメリット/リスク）を提示する
- 非目標を明記し、PR が広がらないようにする

再発防止：`.github/ISSUE_TEMPLATE/agent-task.yml` に目的、非目標、受入基準、検証、ロールバックを必須化します。

## 指示競合 / stale context

### 症状

- `.github/copilot-instructions.md` と `AGENTS.md` で言語、検証、禁止事項が違う
- path-specific instructions が強すぎて、repo-wide の方針と矛盾する
- Copilot code review の指摘が古い base branch の instruction に基づいている
- agent が存在しないファイルや古い companion path を前提に動く

### 対処（最小）

- instruction を repo-wide、path-specific、agent-specific、CLI agent 指示に分類し直す
- 競合する文言は一箇所に集約し、他のファイルは参照・補足にする
- Copilot code review で使われる base branch 側の instructions を先に更新する
- stale context log に、更新日、根拠、owner、次回棚卸し日を残す

再発防止：四半期ごとに instruction diff を棚卸しし、長くなった指示は Skill / checklist / policy へ分離します。

## 差分肥大（1 PR が大きくてレビューできない）

### 症状

- 変更意図が追えない、リスク評価できない
- Copilot review や human review が枝葉の指摘に偏る
- CI 失敗時に原因範囲を切り分けられない

### 対処（最小）

- 1 PR = 1意図で分割する
- 命名変更、ファイル移動、機能変更、生成物更新を混ぜない
- 先に安全柵（テスト、静的解析、link-check）を置く
- PR 本文に、旧構成→新構成、検証、残リスクを表で示す

再発防止：Issue を milestone / checklist に分割し、各 PR の merge 後に次 PR の境界を見直します。

## Copilot review / suggestion 対応が収束しない

### 症状

- Copilot review の inline comment が残ったまま merge しようとしている
- suggestion を機械的に適用し、周辺整合や生成 docs を更新していない
- Copilot が「Comment」review だけを残すため、必須承認と混同する
- generated comment 数と実 comment 数が一致せず、見落としが疑われる

### 対処（最小）

- review 本文、inline comment、suggestion、thread 状態を全件確認する
- 採用する suggestion は、関連テスト・生成物・ドキュメントも合わせて更新する
- 採用しない suggestion は、根拠を PR に返信する
- 完了前に review completeness を確認し、unresolved thread が0件であることを記録する

再発防止：PR template に「Copilot review 対応状況」と「却下理由」を書く欄を追加します。

## テスト失敗 / フレーク

### 症状

- CI が不安定で、反復が収束しない
- ローカルでは成功するが CI では失敗する
- retry だけで原因を調べずに進めている

### 対処（最小）

- 失敗の再現条件（時刻、乱数、ネットワーク、並列実行、キャッシュ）を切り分ける
- CI logs、job summary、artifact を確認し、失敗した gate を PR に記録する
- 重いテストは nightly 等へ分離し、PR check は軽量かつ決定的にする
- フレークを一時 quarantine する場合は、期限と owner を Issue に残す

再発防止：test 追加プレイブックに、非決定要因の固定と実行時間の確認を入れます。

## 権限不足（Actions が失敗する / コメントできない）

### 症状

- PR コメント投稿、ラベル付与、PR 本文更新が失敗する
- `Resource not accessible by integration` が出る
- fork PR で secret や write token が利用できない

### 対処（最小）

- ワークフローの `permissions:` を確認し、job 単位で不足分だけ付与する
- PR コメント投稿は `issues: write`、PR 操作は `pull-requests: write` など用途別に分ける
- フォーク PR は Secrets が渡らない前提で設計する
- `pull_request_target` では PR head code を安易に checkout / execute しない
- Secrets / 外部操作が必要な場合は、manual dispatch、label gate、environment approval へ寄せる

```yaml
permissions:
  contents: read
  issues: write
```

再発防止：workflow 変更には CODEOWNERS または security reviewer を必須にします。

## ruleset / required workflow / merge queue で詰まる

### 症状

- ローカル検証は成功しているが merge button が有効にならない
- required check 名が変更され、保護ルールが古い check を待っている
- merge queue で再実行された CI だけ失敗する

### 対処（最小）

- branch protection / ruleset / required workflow の対象 branch と check 名を確認する
- workflow rename 時は、旧 required check を残す期間を設ける
- merge queue 用の event と通常 PR event で環境差がないか確認する
- bypass を使う場合は、owner、理由、期限、事後 Issue を残す

再発防止：workflow 名・job 名を変更する PR では、ruleset 更新を同じ rollout plan に含めます。

## hook が過剰に止める / 遅い / ログを出しすぎる

### 症状

- `pre-tool-use` が安全なコマンドまで block する
- hook の外部 API 呼び出しで agent session が遅くなる
- hook log に secret、file path、prompt など機微情報が過剰に残る

### 対処（最小）

- block と prompt を分け、低リスク操作は allow に戻す
- hook の timeout、retry、failure mode（fail-open / fail-closed）を明記する
- log は監査に必要な最小項目にし、値そのものではなく分類を残す
- secret scanning、path allowlist、command policy と重複していないか確認する

再発防止：hook 追加 PR には、想定 input、許可/拒否例、ログ例、rollback 手順を含めます。

## MCP / tool exposure の運用事故

### 症状

- read-only のつもりだった tool が外部状態を変更した
- agent が不要な data source や organization scope にアクセスできる
- MCP server の secret、token、rate limit、監査ログの owner が不明

### 対処（最小）

- tool を read-only、mutating、external side effect に再分類する
- 既定を deny に戻し、必要な tool だけ allow する
- secret を rotate し、対象 scope と audit log を確認する
- mutating tool は prompt / approval / environment gate を必須にする
- 失効条件と棚卸し日を `.github/mcp/tool-exposure-review.md` に記録する

再発防止：MCP 追加は Issue 化し、tool scope、secret boundary、cost owner、audit owner を必須項目にします。

## custom agent が過剰に触る / 役割を逸脱する

### 症状

- docs agent が code や workflow を変更する
- security reviewer が修正まで行い、レビューと実装の責任が混ざる
- agent profile に tools が広く付与され、不要な MCP tool まで使える

### 対処（最小）

- agent profile に対象パス、禁止変更、期待 output、handoff 条件を書く
- tools は最小化し、MCP server は必要なものだけに絞る
- 実装 agent と reviewer agent を分け、同じ agent に自己承認させない
- 逸脱が起きた PR は revert ではなく、差分を読んで必要箇所だけ残す

再発防止：`.github/agents/<agent>.md` の変更には、owner と review checklist を付けます。

## Secrets 事故（ログ / コメント / artifact への混入）

### 症状

- 値の露出、監査上の重大インシデント
- job summary、artifact、cache、PR comment に secret らしき文字列が残る
- AI agent が secret を見た、または外部サービスへ送った可能性がある

### 対処（最小）

- 直ちにローテーションし、影響範囲を特定する
- 値そのものは Issue / PR / chat / log に貼らない
- push protection / secret scanning / content exclusion / artifact 除外を確認する
- 外部送信が疑われる場合は、MCP / tool / network log と audit log を確認する

ありがちな混入経路：

- job summary / artifact / cache に `.env` や debug log が混ざる
- 例外スタックトレースや verbose log に token が含まれる
- PR comment に command output を丸ごと貼る

再発防止：生成物の出力前に機微情報が含まれないことを確認する review checklist を追加します。

## コスト超過 / usage drift

### 症状

- AI 実行が過剰、Actions が多重起動し、費用や待ち時間が増える
- premium requests、Actions minutes、artifact / cache storage、外部 API quota のどれが増えたか分からない
- Copilot usage dashboard と API/export の数字が一致せず、説明できない

### 対処（最小）

- 第8章の budget / policy / analytics に戻り、quota owner と budget owner を確認する
- `concurrency`、`paths`、`workflow_dispatch` で実行対象を絞る
- comment-only automation は required check 化の前に誤検知率と cost を測る
- dashboard と API/export は対象期間・対象 source・集計単位を合わせて比較する

`concurrency` の注意：

- `cancel-in-progress: true` は、group 設計が粗いと必要な run までキャンセルする
- PR 番号、workflow 名、対象 path など、意図した単位で group を設計する

再発防止：月次 scorecard に cost efficiency と exception log を含めます。

## ドキュメントのリンク切れ / ビルド失敗

### 症状

- link-check / build が落ち、公開が止まる
- source を直さず生成 docs だけ編集し、次 build で差分が消える
- Companion のパス移動で本文の固定パスが壊れる

### 対処（最小）

- ローカルで品質ゲートを実行し、再現手順を PR に残す
- source と generated docs の責任を分け、生成物は build で更新する
- Companion の移動・改名は移行期間を設け、旧パスから案内する
- 公開後は代表ページを smoke test し、主要 marker が表示されることを確認する

再発防止：docs PR では `npm test`、公開 site smoke、固定パス確認を PR template に含めます。

## 最終確認チェックリスト

- [ ] Issue は実行仕様として成立している
- [ ] instruction / Skill / agent / hook / MCP の責任分界が明確である
- [ ] review 本文、inline comment、suggestion、thread を全件確認した
- [ ] CI / ruleset / required workflow を迂回していない
- [ ] secret、cost、external side effect の owner と evidence がある
- [ ] merge 後の main CI、公開物、Issue checklist、次 Issue を確認した
