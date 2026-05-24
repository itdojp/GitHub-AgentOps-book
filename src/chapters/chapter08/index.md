# 第8章：コスト・予算・利用ガバナンス

## この章で扱うこと

この章では、AgentOps のコストを「あとから請求額を見るもの」ではなく、実行設計、予算、ポリシー、
利用分析をつなぐガバナンス対象として扱います。

扱う観点は次の通りです。

- premium requests、Copilot cloud agent、third-party agents、Copilot CLI、GitHub Actions minutes / storage を分けて把握する
- コストが「誰の quota / budget」に載るかを明確にする
- budget / policy / analytics を月次の control loop にする
- 自動実行と手動実行を使い分け、過剰な再実行と過剰品質を避ける
- overage（予算超過・上限到達）時の停止線、承認、復旧手順を固定する

2026-05-24（Asia/Tokyo）時点では、GitHub Docs は Copilot の request-based billing から
usage-based billing への移行予定を明記しています。したがって、本章では具体単価や plan 別上限を固定せず、
運用側で変わりにくい「実行単位」「責任者」「budget / policy / analytics」の型を固定します。

## コストを「実行単位」で見る

AI エージェントのコストは、単一の「AI 利用料」ではありません。
商用運用では、少なくとも次の実行単位に分けて見ます。

| 実行単位 | 主なコスト/制約 | 典型的な発生タイミング | owner |
| --- | --- | --- | --- |
| Copilot Chat / CLI | premium requests、モデル倍率、session / weekly limit | 調査、計画、修正、追加質問 | 個人 / 組織の Copilot 管理者 |
| Copilot cloud agent | session 単位の premium request、agent runner、Actions 関連費用 | Issue から実装依頼、PR 修正依頼 | repository owner / Copilot 管理者 |
| third-party coding agents | 提供者の課金、GitHub 側の統合条件、preview 条件 | 外部 agent を PR 作業へ接続 | サービス owner / Platform |
| GitHub Actions | hosted runner minutes、larger runner、artifact / cache storage | lint、test、build、preview、agent workflow | repository owner |
| 外部 MCP / API | API quota、SaaS 課金、rate limit、外部ログ保存 | MCP tool call、ticket 更新、検索、通知 | 外部サービス owner |
| やり直し | 追加 premium requests、追加 CI minutes、review time | 仕様不足、巨大 PR、失敗の再実行 | Issue owner / maintainer |

ここで重要なのは、「どの単価か」より先に「何を増やすと増えるか」を明確にすることです。
例えば、巨大な Issue は agent session、差分レビュー、CI 再実行、追加質問を同時に増やします。
逆に、Issue を小さく切り、受け入れ条件と検証コマンドを固定すると、AI 利用と CI 利用の両方を抑制できます。

## quota / budget owner を分ける

コスト統制では、誰がボタンを押したかと、誰に請求・上限到達の影響が出るかを分けます。

| 項目 | 確認すること | 記録先 |
| --- | --- | --- |
| Copilot premium requests | 個人、組織、enterprise、cost center のどれに紐づくか | Copilot 管理設定、Issue / PR の前提欄 |
| Copilot cloud agent | agent 実行が premium requests / Actions / runner 設定のどこへ影響するか | agent enablement Issue、repository 設定 |
| Actions minutes | repository owner の allowance / budget に載ることを owner が理解しているか | workflow 設計 PR、運用 runbook |
| Artifact / cache storage | retention、cache size、custom image、Packages 共有枠を管理しているか | workflow、retention policy |
| 外部 API / MCP | token owner、tenant、quota、超過時の停止条件が明確か | MCP / tool exposure review |
| 例外運用 | 緊急時の上限緩和、承認者、期限、復旧条件があるか | Incident / change request |

GitHub Actions は、実行者の個人アカウントではなく repository owner 側の使用量として扱われます。
そのため、write 権限を持つ人が workflow を起動できる場合でも、budget owner が承認していない高頻度実行は避けます。
Copilot premium requests は、複数の組織や enterprise からライセンスを受ける利用者では billing entity の選択が関係します。
この前提を PR テンプレートや agent 実行手順に書かないと、「実行できるが、誰の予算か分からない」状態になります。

## budget / policy / analytics の control loop

コストガバナンスは、budget だけでは完結しません。
次の 3 点を 1 つの control loop として扱います。

| 要素 | 決めること | 例 |
| --- | --- | --- |
| budget | 月次上限、警告閾値、停止有無、scope | organization、repository、cost center、premium request SKU |
| policy | 誰が何を使えるか、超過利用を許すか、どの agent を有効化するか | paid usage policy、agent enablement、tool allowlist |
| analytics | 使用量、上位消費者、機能別内訳、成果との比率 | premium request analytics、metered usage、Actions workflow metrics |

GitHub の budgets は、閾値通知だけでなく、設定により budget 到達時に追加利用を止める用途にも使えます。
一方、重複した budget scope は意図せず機能を止める原因になります。
特に organization、repository、cost center、SKU をまたぐ budget は、どれが failsafe でどれが運用目標かを明示します。

月次レビューでは、最低限次を確認します。

- premium requests の総量、機能別内訳、上位 user / organization / repository
- Copilot cloud agent と third-party agents の session 数、成功率、追加 steering の回数
- Actions の workflow 別実行回数、失敗率、平均 duration、artifact / cache storage
- 予算到達、警告、手動上限緩和、例外承認の件数
- 成果指標（merged PR、lead time、review time）に対する費用の妥当性

「使った金額」だけを見ると、成果が増えたのか、失敗再実行が増えたのかが分かりません。
AgentOps では、第11章のメトリクスと併せ、費用を delivery outcome と結び付けて判断します。

## 自動実行と手動実行の使い分け

AI と CI は、すべて自動化すればよいわけではありません。
コスト影響、権限影響、再実行頻度に応じて、既定の実行方法を変えます。

| 用途 | 推奨トリガー | 理由 | ガードレール |
| --- | --- | --- | --- |
| PR 要約 / リスク抽出 | `pull_request` + 条件付き | review 補助として反復価値が高い | Draft 除外、`paths`、`concurrency` |
| 大規模リファクタ計画 | `workflow_dispatch` / Issue から手動依頼 | 高コストで判断が必要 | scope、budget owner、承認者を明記 |
| release 前サマリ | `workflow_dispatch` | 実行頻度が低く、対象差分を選びたい | base/head input、artifact retention |
| 外部 API / MCP write | 手動承認後 | 外部副作用と課金がある | owner approval、rollback、audit log |
| 定期棚卸し | `schedule` か手動 | 低頻度で十分なことが多い | 月次上限、失敗時通知、重複実行抑止 |

自動実行にする条件は、「安いから」ではなく、失敗時の影響と再実行の制御が明確であることです。
高コスト・高権限・高不確実性の作業は、手動実行と承認を既定にします。

## overage / exception handling

予算超過や上限到達は、失敗ではなく運用イベントとして扱います。
あらかじめ対応を決めておくことで、緊急時の場当たり的な権限緩和を避けられます。

| 状態 | 対応 | 証跡 |
| --- | --- | --- |
| 75% 到達 | owner に通知し、今月の高コスト作業を棚卸し | Issue comment / Slack 等 |
| 90% 到達 | 新規自動実行の縮退、手動承認への切替 | change log、workflow 設定 PR |
| 100% 到達 / blocked | 緊急度を判定し、停止または期限付き上限緩和 | 承認者、期限、復旧条件 |
| 異常増加 | 直近 PR、agent session、workflow retry、artifact 増加を調査 | incident Issue |
| 外部 API quota 超過 | mutating tool を停止し、read-only fallback に切替 | MCP / tool exposure review 更新 |

上限緩和を行う場合は、次を必ず記録します。

- なぜ必要か
- どの budget / SKU / repository / cost center を変更するか
- 誰が承認したか
- いつ元に戻すか
- 再発防止として Issue 分割、workflow 条件、cache / artifact retention、モデル選択をどう見直すか

## コスト最適化の優先順位

コスト最適化は、単価の低いモデルを選ぶだけでは不十分です。
次の順で削減すると、品質と監査可能性を落としにくくなります。

1. **Issue / PR を小さくする**
   - 受け入れ条件、非スコープ、検証コマンド、対象ファイルを固定する
2. **不要な workflow 起動を減らす**
   - `paths`、`if`、Draft 除外、`concurrency`、manual trigger を使う
3. **再実行と失敗を減らす**
   - 依存 cache、ローカル検証、失敗ログの分析、flake 対応を先に行う
4. **artifact / cache / custom image の retention を管理する**
   - 大容量 artifact、不要 cache、長期保持を棚卸しする
5. **モデルと実行モードを用途別に分ける**
   - 調査、実装、レビュー、要約で必要品質と速度を分ける
6. **MCP / 外部 API の tool exposure を絞る**
   - read-only を既定にし、write / external side effect は承認制にする
7. **導入を pilot → 拡大の順にする**
   - 全リポジトリ展開前に、成功率、費用、例外、review time を確認する

## 月次レビュー用テンプレート

月次の AgentOps review では、次の形式で記録します。

```md
## AgentOps cost review: YYYY-MM

- 対象: organization / repository / cost center
- Copilot usage:
  - premium requests total:
  - cloud agent sessions:
  - top consumers / repositories:
- Actions usage:
  - total spend or minutes:
  - top workflows:
  - failed reruns:
  - artifact / cache storage notes:
- Overage / alerts:
  - 75% / 90% / 100% alerts:
  - stop-usage events:
  - exceptions approved:
- Outcome:
  - merged PR:
  - lead time / review time:
  - defect / rollback notes:
- Decisions:
  - budgets to update:
  - policies to update:
  - workflows to shrink:
  - agents/tools to disable or expand:
```

このテンプレートは、単なる会計レポートではなく、次月の policy と workflow 設計を変えるための入力です。

## 公式情報の確認先

2026-05-24（Asia/Tokyo）時点で、本章の用語整理に使う主な一次情報は次です。
課金体系、plan、model multiplier、budget scope、policy 条件は変わり得るため、導入時は最新ページを確認してください。

- GitHub Docs: [Requests in GitHub Copilot](https://docs.github.com/en/copilot/concepts/billing/copilot-requests)
- GitHub Docs: [Monitoring your GitHub Copilot usage and entitlements](https://docs.github.com/en/copilot/how-tos/manage-and-track-spending/monitor-premium-requests)
- GitHub Docs: [Managing the premium request allowance for your organization or enterprise](https://docs.github.com/en/copilot/how-tos/manage-and-track-spending/manage-request-allowances)
- GitHub Docs: [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- GitHub Docs: [Setting up budgets to control spending on metered products](https://docs.github.com/en/billing/how-tos/set-up-budgets)
- GitHub Docs: [Viewing your usage of metered products and licenses](https://docs.github.com/en/billing/how-tos/products/view-productlicense-use)

## 章末チェックリスト

- [ ] premium requests、Copilot cloud agent、Actions、外部 MCP / API のコスト発生点を分けている
- [ ] quota / budget owner と、実行者・承認者・例外承認者を分けて記録している
- [ ] budget / policy / analytics を月次 control loop として運用している
- [ ] 自動実行と手動実行の基準を、コスト・権限・不確実性に基づいて決めている
- [ ] overage 時の停止、縮退、上限緩和、復旧条件が runbook 化されている
- [ ] `paths`、`if`、`concurrency`、artifact / cache retention で不要な Actions 消費を抑制している
- [ ] 公式 docs の課金体系変更を四半期ごとに棚卸ししている

## まとめ

AgentOps のコスト設計は、利用額を後追いで確認する作業ではありません。
budget、policy、analytics、workflow trigger、agent session、MCP / external API を一体で設計し、
「誰が何を実行でき、どの予算に影響し、超過時にどう止めるか」を明確にすることで、
AI エージェントの導入効果を保ちながら商用運用に耐える統制を実現できます。
