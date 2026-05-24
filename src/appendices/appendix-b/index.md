# 付録B：プレイブック集（タスク別運用手順）

バグ修正、依存更新、テスト追加、ドキュメント整備、セキュリティ対応、MCP / tool exposure、
rollout review など、商用運用で繰り返す作業の標準手順を整理します。

## Companion repo

- リポジトリ: [itdojp/GitHub-AgentOps-companion](https://github.com/itdojp/GitHub-AgentOps-companion)

## 共通プレイブック

すべての作業は、次の順序で進めます。

1. Issue を実行仕様として固定する
   - 目的、非目標、受入基準、制約、検証、ロールバックを記録する
   - 不明点は推測で埋めず、質問または選択肢として返す
2. 作業を1 PR = 1意図に分割する
   - 命名変更、リファクタ、機能変更、生成物更新を不用意に混ぜない
   - 反復が必要な場合は、PR 本文またはコメントに判断ログを残す
3. Policy に沿って承認を残す
   - allow は自動化してよい
   - prompt は承認者・理由・期限を残す
   - forbidden は例外運用にせず、別設計に切り替える
4. ローカル検証と CI を両方確認する
   - lint / test / build / link-check / security check のうち、対象差分に必要なものを選ぶ
   - CI 失敗、lint 失敗、hook 失敗は evidence として扱い、無断で無視しない
5. review feedback を収束させる
   - Copilot review と human review の本文・inline comment・suggestion を全件確認する
   - 採用しない指摘は、PR に理由を返信する
6. merge 後の evidence を残す
   - main branch CI、公開物、Issue checklist、次 Issue を確認する

共通停止条件：

- 受入基準が曖昧で、正解を判断できない
- secret、外部課金、production side effect が絡むが承認経路がない
- CI / ruleset / required workflow を迂回しないと進められない
- review thread が未解決のまま残っている

## バグ修正

- Issue テンプレ: `.github/ISSUE_TEMPLATE/bug-report.yml`
- 関連 Skill: `skills/add-tests/SKILL.md`

推奨手順：

1. 再現条件、期待結果、実結果、影響範囲を Issue に固定する
2. 先に最小再現または回帰テストを追加する
3. 修正範囲を原因箇所に限定し、周辺リファクタを混ぜない
4. ローカルで失敗→成功を確認し、CI の同等 gate を通す
5. PR 本文に、原因、修正、回帰防止、ロールバックを記録する

完了 evidence：

- 失敗を再現したテストまたはログ
- 修正後の test / CI 結果
- post-merge 監視観点または再発検知方法

## 依存更新

- Issue テンプレ: `.github/ISSUE_TEMPLATE/dependency-update.yml`
- 関連 Skill: `skills/dependency-update/SKILL.md`

推奨手順：

1. 更新理由を一次情報で確認する
   - security advisory、release notes、deprecation、compatibility のどれかを明記する
2. runtime dependency、dev dependency、lockfile の差分を分けて確認する
3. 破壊的変更、Node / Ruby / Python など runtime version、CI image の影響を見る
4. required checks を通し、必要なら smoke test を追加する
5. rollback は「前 lockfile に戻す」だけで足りるかを確認する

停止条件：

- advisory の深刻度や exploitability が不明
- major update だが移行手順と互換性確認がない
- transitive dependency の変更量が大きく、最小 smoke test がない

## テスト追加

- 関連 Skill: `skills/add-tests/SKILL.md`
- custom agent 例: `.github/agents/test-reviewer.md`

推奨手順：

1. 受入基準を正常系、異常系、境界値、権限境界へ分解する
2. unit / integration / e2e のうち、最も安価に失敗を検出できる粒度を選ぶ
3. 非決定要因を固定する
   - 時刻、乱数、ネットワーク、外部 API、並列実行、キャッシュ
4. テスト名に仕様を表し、実装詳細に依存しすぎない
5. フレーク兆候がある場合は、PR 本文に切り分け結果を残す

完了 evidence：

- 追加テストの対象仕様
- ローカルまたは CI の実行結果
- 実行時間と PR check への影響

## ドキュメント整備

- Issue テンプレ: `.github/ISSUE_TEMPLATE/documentation.yml`
- 関連 Skill: `skills/docs-update/SKILL.md`
- custom agent 例: `.github/agents/docs-reviewer.md`

推奨手順：

1. 読者、前提知識、到達点を先に固定する
2. 章間リンク、Companion 資産、外部一次情報を確認する
3. 変化しやすい仕様、料金、preview 状態は日付または確認先を添える
4. 生成 docs がある場合は source を編集し、生成物を build で更新する
5. link-check と公開 smoke test を行う

停止条件：

- 存在しない Companion ファイルへのリンクを貼る必要がある
- 公式仕様と本文の用語が一致しないが、どちらが現行か分からない
- 旧章との整合が崩れ、読者の導線が壊れる

## 安全なリファクタ

- 関連 Skill: `skills/refactor-safe/SKILL.md`

推奨手順：

1. 目的を「構造改善」「命名整理」「重複排除」など1つに限定する
2. 先に既存テストを実行し、必要なら安全柵を追加する
3. 振る舞い不変を受入基準として明記する
4. 大きい移動・改名は、機能変更 PR と分離する
5. レビューしやすい単位で commit または PR を分ける

完了 evidence：

- before / after の責務対応
- テスト結果
- 既知の互換性影響がないこと、または移行手順

## Copilot review 対応

- Review checklist: `.github/review-templates/copilot-review.md`

推奨手順：

1. Copilot review を request し、review 本文、inline comment、suggestion を全件確認する
2. suggestion は内容を理解してから採用する
   - security、compatibility、style のいずれの指摘かを分類する
   - 提案が誤っている場合は、根拠を PR に返信する
3. 修正した comment には返信し、thread を resolve する
4. Copilot suggestion を採用して commit が追加された場合、または agent が branch に commit した場合は、差分を必ず読む
5. 完了前に review completeness を確認する

停止条件：

- generated comment 数と実 comment 数が一致しない
- unresolved thread が残っている
- Copilot 由来 commit の意図が PR 本文に反映されていない

## Security fix / review assist

- Issue テンプレ: `.github/ISSUE_TEMPLATE/security-review.yml`
- 関連 Skill: `skills/security-review/SKILL.md`

推奨手順：

1. 影響範囲、攻撃経路、secret exposure、外部 side effect を分類する
2. secret が関係する場合は、値を Issue / PR に貼らず、先に rotate と失効を行う
3. fork PR、`pull_request_target`、`GITHUB_TOKEN`、OIDC、artifact の扱いを確認する
4. 修正は最小権限と監査ログを優先し、単純な権限拡大で済ませない
5. post-merge の再発防止を ruleset、hook、workflow、review checklist のいずれかへ反映する

停止条件：

- 値の漏えいが疑われるが、ローテーション権限や owner が不明
- production secret や cloud credential の影響範囲を把握できない
- emergency fix と恒久対策を同じ PR に混ぜるとレビューできない

## MCP / tool exposure 変更

- Issue テンプレ: `.github/ISSUE_TEMPLATE/mcp-tool-exposure.yml`
- Review note: `.github/mcp/tool-exposure-review.md`

推奨手順：

1. tool を read-only、mutating、external side effect に分類する
2. 利用者、対象 repo / org、secret、rate limit、audit log を確認する
3. 既定は deny とし、必要な tool だけ allow する
4. mutating tool は prompt / approval / environment gate のいずれかを設計する
5. 導入後の失効条件、棚卸し日、owner を記録する

停止条件：

- tool の副作用が分からない
- secret を渡す必要があるが、保管・ローテーション・監査設計がない
- organization / enterprise policy と repository 設定の優先関係が不明

## GitHub Actions workflow / permission 変更

- Policy note: `rules/actions-permissions.md`

推奨手順：

1. trigger、permissions、secrets、artifact、cache、concurrency を確認する
2. `permissions: read-all` または job-level minimum から始める
3. `pull_request_target` は base branch context と PR head code の扱いを明記する
4. 外部 API、deployment、comment write は job 単位で理由を残す
5. PR で workflow diff を強調し、CODEOWNERS または security reviewer を入れる

停止条件：

- fork PR に write token または secret を渡す前提になっている
- workflow 変更で required check / merge queue が壊れる可能性を評価していない
- artifact や job summary に secret が混ざる可能性を除外できていない

## Continuous AI / release prep

- ワークフロー例: `.github/workflows/codex-pr-review.yml`（既存固定パス）
- ワークフロー例: `.github/workflows/codex-release-prep.yml`（既存固定パス）

推奨手順：

既存 Companion では `codex-pr-review.yml` / `codex-release-prep.yml` を採用しています。
`agentops-*` などへ改名する場合は、互換期間、README の案内、本文・CHECKLIST の同期を先に決めます。

1. comment-only、advisory check、required check のどの段階かを決める
2. base / head、対象パス、実行頻度、課金 owner を固定する
3. 出力が PR comment、job summary、artifact のどこに残るかを確認する
4. 誤検知・過検知を測り、required check 化は段階導入する
5. release prep は手動実行を基本にし、未完了項目を Issue 化する

完了 evidence：

- 実行した workflow run
- 生成コメントまたは artifact の確認結果
- false positive / false negative の扱い

## Rollout review / metrics review

- Issue テンプレ: `.github/ISSUE_TEMPLATE/rollout-review.yml`
- Scorecard: `ops/agentops-scorecard.md`

推奨手順：

1. 対象チーム、対象 repo、maturity level、期間を決める
2. flow、quality、security、cost、adoption の minimum scorecard を選ぶ
3. 個人評価ではなく、システム改善の観点で集計する
4. 週次は詰まりの除去、月次は方針調整、四半期は maturity 更新に使う
5. 次の改善は1つの Issue に落とし、owner と期限を決める

停止条件：

- metric の定義がチーム間で違い、比較できない
- Copilot usage dashboard と API/export の差異を説明できない
- cost exception や security exception が backlog に変換されていない

## プレイブック更新チェックリスト

- [ ] 本文の参照章と用語が一致している
- [ ] Companion の固定パス候補と矛盾していない
- [ ] security / cost / adoption の観点が抜けていない
- [ ] Copilot review と human review の扱いが分離されている
- [ ] 検証結果、残リスク、次 Issue を残す欄がある
