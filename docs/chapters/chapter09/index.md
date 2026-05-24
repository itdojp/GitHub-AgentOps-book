---
layout: book
title: "第9章：継続的 AI の実装パターン"
---

# 第9章：継続的 AI の実装パターン

## この章で扱うこと

この章では、「AI を CI に入れるか」ではなく、継続的 AI をどの実行パターンで使い分けるかを扱います。
PR 要約、リスク抽出、コードレビュー、agent による修正、ローカルでの調査、Actions 上の自動化は、
同じ AI 利用でも責任境界と運用コストが異なります。

扱う観点は次の通りです。

- PR 要約 / リスク抽出、Copilot code review、cloud agent / third-party agents、Codex CLI、Codex Action を比較する
- 「何を CI に入れるか」「何を GitHub 上で回すか」「何をローカルで回すか」の選択基準を示す
- read-only、comment-only、patch proposal、agent PR、auto apply を段階的に導入する
- 第5章の policy / control surface、第8章の cost governance、第10章の security / supply chain boundary に接続する
- 人間承認に残す境界と、AI 出力を required gate にする条件を明確にする

本章では Codex Action を重要な選択肢として扱いますが、唯一の中心には置きません。
商用運用では、GitHub ネイティブな Copilot code review や agent session、ローカル CLI、CI 上の独自 workflow を、
目的に応じて組み合わせます。

## 実装パターン比較

継続的 AI は、出力の種類と副作用で分類します。
最初に、どの pattern がどの責任を持つかを表で決めます。

| pattern | 主な用途 | 実行場所 | 出力 | 人間 gate | 主なリスク |
| --- | --- | --- | --- | --- | --- |
| PR summary / risk extraction | 変更要約、リスク、推奨テスト | GitHub Actions / bot | PR comment | comment 採否 | ノイズ、重複コメント、誤要約 |
| Copilot code review | inline review、suggested change | GitHub PR / IDE | review comment | 人間 reviewer が採否 | required approval と混同、再レビュー漏れ |
| Copilot cloud agent | Issue から実装、既存 PR の修正 | GitHub agent session | branch / PR / commit | PR review / merge | scope 過大、Actions / premium request 消費 |
| third-party agents | 専門 agent による非同期実装 | GitHub agents / 外部連携 | branch / PR / app log | PR review / audit | public preview、GitHub App 権限、外部境界 |
| Codex CLI | maintainer の手元調査、実装修正、ローカルレビュー | local terminal | local diff / commit | maintainer が commit / PR 化 | ローカル差分の証跡不足、環境差分 |
| Codex Action | Actions 上の制御された AI workflow | GitHub Actions | comment / file / artifact | workflow / PR review | Secrets、event、sandbox、runner cost |

この比較では「どれが最も高度か」ではなく、「どの副作用をどこで受け止めるか」を見ます。
comment-only の AI は review 補助に向きますが、修正責任は人間に残ります。
agent PR は実装速度を上げますが、PR review、CI、権限、cost、audit を明確にする必要があります。

## 導入レベル

継続的 AI は、いきなり自動修正へ寄せません。
次の段階で導入します。

| level | 目的 | 許可する出力 | gate |
| --- | --- | --- | --- |
| 0: local assist | 個人の調査・実装補助 | local diff / メモ | 人間が commit |
| 1: comment-only | PR 要約、リスク抽出、テスト提案 | PR comment / job summary | 人間 review |
| 2: review assist | inline comment、suggested change | review comment | 人間が apply / reply / resolve |
| 3: agent PR | agent が branch / PR を作る | commit / PR | CI + reviewer + owner approval |
| 4: controlled auto apply | 限定範囲の機械的修正 | commit / patch | strict policy + rollback |

商用運用でまず推奨するのは level 1 または level 2 です。
level 3 以降は、第5章の policy、第7章の tool exposure、第8章の budget、第10章の security / supply chain を満たしてから導入します。
level 4 は typo、format、依存 lock 更新など、失敗時の rollback が明確な範囲に限定します。

## 何を CI に入れるか

CI に入れる AI は、再現性と権限を強く意識します。
通常の lint / test / build は deterministic gate として required checks にできますが、AI の判断は確率的です。
そのため、AI 出力は最初から required approval の代替にしません。

CI に置きやすいものは次です。

- PR 要約、リスク抽出、推奨テストの comment 生成
- release 前の変更点サマリ、影響範囲、確認観点の job summary / artifact 生成
- 既存の deterministic check 結果を要約し、失敗原因の候補を提示する処理
- security / dependency / migration など、human reviewer に渡す観点リストの生成

CI に置く前に慎重に扱うものは次です。

- 自動 commit、auto merge、release、deploy
- `pull_request_target` で Secrets を使う AI 処理
- 外部 API / MCP write を伴う処理
- 高頻度の scheduled AI 実行
- 組織横断の一括修正

AI 出力を required gate にする場合は、「AI が良いと言ったから通す」ではなく、
固定された schema、policy ルール、検出対象、fallback、人間 override を用意します。

## Pattern 1: PR summary / risk extraction

PR summary / risk extraction は、最小導入に向く pattern です。
AI は PR の差分を読み、要約、リスク、追加で見るべきテスト、reviewer への質問を PR comment として出します。

設計の要点は次です。

- trigger は `pull_request` だが、Draft PR、巨大差分、対象外 path を除外する
- `concurrency` で PR 単位の多重実行を抑止する
- 権限は `contents: read`、`pull-requests: read`、comment upsert に必要な `issues: write` 程度に絞る
- 出力は「補助情報」であり、merge 可否の最終判断にしない
- 第8章の analytics に接続できるよう、実行回数、skip 理由、失敗理由を記録する

Companion repo の既存サンプルは、この pattern の最小形として読みます。

Companion repo: [itdojp/GitHub-AgentOps-companion](https://github.com/itdojp/GitHub-AgentOps-companion)

- PR 作成/更新時の要約 + リスク抽出コメント: `.github/workflows/codex-pr-review.yml`
- リリース前の変更点サマリ/影響範囲/チェックリスト生成: `.github/workflows/codex-release-prep.yml`
- Codex Action 用プロンプト雛形: `.github/codex/prompts/`

この pattern では、同じコメントを毎回追加するのではなく、bot comment を upsert して review noise を抑えます。

## Pattern 2: Copilot code review

Copilot code review は、GitHub PR 上で review comment や suggested change を得る pattern です。
既存の PR review flow に載せられるため、導入時の説明コストが低い一方で、required approval との役割分担を明示します。

運用ルールは次のように固定します。

- Copilot review は人間 reviewer の代替 approval ではなく、review input として扱う
- Copilot の comment は、人間 reviewer と同じく reply / resolve / hide / apply suggestion の対象にする
- 新しい commit を push した後に再レビューが必要な場合は、manual re-review または自動レビュー設定を確認する
- repository-wide / path-specific custom instructions は、第3章の instruction hierarchy に沿って保守する
- 月次で「採用した suggestion」「不要だった comment」「見逃し」を棚卸しする

Copilot code review には、plan、policy、quota、Actions runner の前提が関係します。
特に automatic review を有効にする場合は、第8章の premium request / Actions minutes と合わせて budget owner を決めます。

## Pattern 3: cloud agent / third-party agents

Copilot cloud agent や third-party agents は、Issue や prompt から非同期に作業し、branch / PR / session log を残す pattern です。
PR summary や code review と異なり、実際にコード差分を作るため、実装者として扱います。

適している作業は次です。

- scope が小さい bug fix
- テスト追加、ドキュメント整備、機械的な移行
- 受け入れ条件と検証コマンドが明確な Issue
- 人間が review しやすい小粒度 PR

適していない作業は次です。

- 要件が曖昧な新規設計
- production secret、deploy、外部 write を伴う作業
- 複数 repository を横断する大規模変更
- 失敗時に rollback できない環境変更

third-party agents は public preview や GitHub App / audit log の条件が変わり得ます。
導入時は、どの agent を有効にするか、どの repository で使うか、どの model / tool を許可するかを Issue で承認します。

## Pattern 4: local Codex CLI

Codex CLI は、maintainer がローカル terminal で調査、修正、検証を行う pattern です。
ローカル repository、ローカル test、手元の approval / sandbox 設定を使えるため、複雑な調査や反復に向きます。

向いている用途は次です。

- 複数ファイルを横断する調査
- 失敗ログを見ながらの修正
- PR 作成前の試行錯誤
- 既存 CI に載せる前の prompt / runbook 検証
- 人間が最終 commit を作る前提の refactor

ローカル実行では、作業の証跡を PR に残すことが重要です。
最終 PR には、実行した検証コマンド、判断した非スコープ、採用しなかった提案、残リスクを記載します。
ローカルでうまく動いたことを、そのまま CI / production の安全性とみなしてはいけません。

## Pattern 5: Codex Action

Codex Action は、OpenAI Codex CLI を GitHub Actions workflow から実行する pattern です。
GitHub Actions の permission、Secrets、runner、sandbox、artifact、comment 投稿を制御できるため、
独自の PR bot や release 前レビューを作りたい場合に選択肢になります。

採用条件は次です。

- Copilot code review だけでは不足する独自観点や出力 schema がある
- PR comment、job summary、artifact など、CI 上に残す成果物が明確である
- API key を repository / environment secret として扱い、fork PR では渡さない設計になっている
- `sandbox: read-only` など、用途に応じた実行制限を設定している
- `allow-users` / `allow-bots` 等の trigger 制御を理解している
- 失敗しても PR merge を不必要に止めない fallback がある

Codex Action を使う場合でも、自動修正を既定にしません。
最初は comment-only または artifact-only とし、patch proposal は owner approval と rollback の設計後に導入します。

## 実行経路の選択ルール

どの pattern を選ぶかは、次の質問で決めます。

| 質問 | yes の場合 | no の場合 |
| --- | --- | --- |
| 目的は review 補助だけか | PR summary / Copilot code review | agent PR / local CLI を検討 |
| コード差分を自動で作る必要があるか | cloud agent / third-party agent / local CLI | comment-only で十分 |
| Secrets や外部 write が必要か | 手動承認、environment、MCP gate を設計 | read-only / comment-only に寄せる |
| 高頻度で実行するか | `paths`、`if`、`concurrency`、budget を必須にする | manual trigger でよい |
| 出力を機械処理したいか | schema / artifact / stable marker を用意 | PR comment でよい |
| 失敗時に merge を止めるべきか | deterministic check と組み合わせる | advisory comment に留める |

判断に迷う場合は、comment-only → suggested change → agent PR の順に進めます。

## rollout plan

継続的 AI は、次の順で展開します。

1. 対象 repository とユースケースを 1 つに絞る
2. PR summary / risk extraction を comment-only で導入する
3. Copilot code review を manual request で運用し、採用率とノイズを測る
4. 小さい Issue で cloud agent / third-party agent を pilot する
5. 独自の出力 schema や release 前 summary が必要な場合に Codex Action を検討する
6. 第8章の月次レビューで cost / adoption / rework / noise を確認する
7. 必要に応じて automatic review、scheduled review、patch proposal へ拡張する
8. required gate 化は、deterministic check と policy が揃ってから検討する

## 公式情報の確認先

2026-05-24（Asia/Tokyo）時点で、本章の用語整理に使う主な一次情報は次です。
plan、preview 状態、quota、Actions minutes、Codex CLI / Action の入力項目は変わり得るため、導入時は最新ページを確認してください。

- GitHub Docs: [About GitHub Copilot code review](https://docs.github.com/en/copilot/concepts/agents/code-review)
- GitHub Docs: [Using GitHub Copilot code review on GitHub](https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/copilot-code-review)
- GitHub Docs: [Kick off a task with Copilot agents on GitHub](https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/kick-off-a-task)
- GitHub Docs: [About third-party agents](https://docs.github.com/en/copilot/concepts/agents/about-third-party-agents)
- OpenAI Developers: [Codex web](https://developers.openai.com/codex/cloud)
- OpenAI Developers: [Codex CLI](https://developers.openai.com/codex/cli)
- OpenAI GitHub: [Codex GitHub Action](https://github.com/openai/codex-action)

## 導入チェックリスト

- [ ] PR summary / risk extraction、Copilot code review、agent PR、local CLI、Codex Action の役割を分けている
- [ ] comment-only から始め、patch / auto apply へ進む条件を定義している
- [ ] AI 出力を required gate にする場合の schema、fallback、人間 override がある
- [ ] `paths`、`if`、`concurrency`、manual trigger で実行頻度を制御している
- [ ] Secrets、fork PR、外部 API / MCP write、artifact への出力を第10章の観点で確認している
- [ ] 第8章の cost governance と接続し、pattern ごとの usage / cost / noise を月次で見ている

## まとめ

継続的 AI の設計は、特定の Action や特定の agent を選ぶ作業ではありません。
PR comment、review comment、agent PR、local diff、Actions artifact という出力単位ごとに責任境界を分け、
必要な gate、cost owner、security boundary、human review を設計する作業です。
最初は comment-only と manual review で価値とノイズを測り、十分な証跡と rollback が揃った範囲だけを、
patch proposal や agent PR に広げます。
