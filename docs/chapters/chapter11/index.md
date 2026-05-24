---
layout: book
title: "第11章：メトリクス・運用レビュー・展開ロードマップ"
---

# 第11章：メトリクス・運用レビュー・展開ロードマップ

## この章で扱うこと

この章では、AgentOps を「速くなった気がする」で終わらせず、flow、quality、security、cost、adoption を横断して
運用レビューできる状態にします。

扱う観点は次の通りです。

- Issue → PR → review → CI → merge → post-merge の flow を測る
- rework、unresolved thread、post-merge failure、human override で品質低下を検知する
- security exception、push protection bypass、secret / dependency alert を運用指標に入れる
- premium requests、Actions minutes、retry、artifact / cache を delivery outcome と結び付ける
- Copilot / agent の adoption を「利用量」ではなく「成果・安全性・継続性」と合わせて見る
- 週次、月次、四半期の review cadence と rollout roadmap を定義する

2026-05-24（Asia/Tokyo）時点の GitHub 公式情報では、Copilot usage metrics は adoption、engagement、
code generation、pull request lifecycle trends を扱い、API / dashboard / NDJSON export で確認できます。
Copilot usage dashboard と API / export は同一概念でも含む範囲が異なる項目があるため（例: CLI 指標）、
運用会議では「どの source の値か」を併記します。
一方で、データ更新遅延、scope ごとの差異、権限による可視範囲の違いがあります。
したがって、本章では「単一 dashboard の数値を追う」のではなく、PR / Issue / Actions / security / cost / review log を
同じ運用会議で解釈する設計にします。

## メトリクス設計の目的

AgentOps のメトリクスは、AI 利用量の報告ではありません。
目的は、次の 4 点を継続的に判断することです。

1. 価値ある変更が短い cycle time で届いているか
2. 品質、security、compliance の手戻りが増えていないか
3. agent / Copilot / CI のコストが成果に見合っているか
4. 導入対象を広げても、人間の承認境界と監査性を維持できるか

速度だけを最適化すると、oversized PR、浅い review、security 例外の増加、post-merge failure を招きます。
逆に安全側へ寄せすぎると、agent が使われず、導入投資が定着しません。
メトリクスはこの緊張関係を可視化し、どの control surface を強めるか、どこを自動化するかを決める材料です。

## North Star と guardrail

最初に、North Star metric と guardrail metrics を分けます。

| 種別 | 例 | 使い方 |
| --- | --- | --- |
| North Star | merge された価値ある変更の cycle time | 改善の方向を示す。単独で評価しない |
| flow guardrail | review wait time、CI duration、merge queue wait | ボトルネックを特定する |
| quality guardrail | rework rate、post-merge failure、reopen rate | 速度改善の副作用を検知する |
| security guardrail | security exception、secret alert、bypass | 危険な自動化を止める |
| cost guardrail | Actions minutes / merged PR、premium requests / outcome | 予算と成果の比率を見る |
| adoption guardrail | active / engaged users、Copilot-reviewed PR、human override | 導入定着と過信を同時に見る |

North Star は「方向」を決めるためのものです。
チーム評価や個人評価に直結させると、PR 分割の偽装、review 省略、easy issue への偏りが起きます。
商用運用では、North Star と guardrail を同じ scorecard で見ます。

## 指標体系: flow / quality / security / cost / adoption

### Flow 指標

flow 指標は、作業がどこで滞留しているかを見るためのものです。

| 指標 | 定義例 | データソース | 見る頻度 |
| --- | --- | --- | --- |
| lead time | Issue ready から merge まで | Issue / PR timestamp | 週次 / 月次 |
| PR cycle time | PR open から merge まで | PR created / merged | 週次 |
| time to first review | PR open から初回 human / Copilot review まで | review event | 週次 |
| review wait time | reviewer requested から review まで | review request / review event | 週次 |
| CI duration | required checks の実行時間 | Actions run / job | 週次 |
| CI queue time | job queued から start まで | Actions metrics | 月次 |
| merge queue wait | merge queue entry から merge まで | PR / queue event | 月次 |

lead time は、Issue 作成日ではなく「ready for agent / ready for implementation」から測る方が実務に合います。
Issue 作成から測ると、企画待ちや優先順位待ちを implementation flow の問題として誤読しやすくなります。

### Quality 指標

quality 指標は、速く merge した結果として品質負債が増えていないかを見るためのものです。

| 指標 | 定義例 | 悪化時に見る原因 |
| --- | --- | --- |
| rework rate | review 後に大幅修正が必要だった PR 比率 | Issue scope、設計不足、agent 指示不足 |
| post-merge failure | merge 後 main / Pages / release が失敗した比率 | PR 内検証不足、required checks 漏れ |
| reopen rate | close 後に再オープンされた Issue 比率 | 受入基準不足、検証不足 |
| unresolved thread rate | merge 前に未解決 review thread が残った比率 | review 完了 gate の不足 |
| regression escape | release 後に発覚した回帰件数 | test / eval / rollout 不足 |
| flaky check rate | rerun でしか通らない check の比率 | test isolation、runner、外部依存 |
| documentation drift | 実装と docs / runbook の不一致件数 | docs review の不足 |

review comment 数そのものを品質指標にしないでください。
comment 数は reviewer の粒度、Copilot review policy、PR サイズに左右されます。
「指摘が修正されたか」「未解決 thread が残っていないか」「merge 後に問題が出たか」を中心に見ます。

### Security 指標

security 指標は、第10章の trust boundary が実際に守られているかを見るためのものです。

| 指標 | 定義例 | 対応する control |
| --- | --- | --- |
| security exception rate | Secrets / workflow / deploy / external write の例外承認比率 | CODEOWNERS、environment approval |
| push protection bypass | bypass 件数、理由、承認者、remediation status | push protection、secret scanning |
| secret alert MTTR | alert open から revoke / rotation 完了まで | incident runbook |
| dependency alert MTTR | alert open から patch / risk acceptance まで | Dependabot / security review |
| high-risk workflow change | `permissions:`、OIDC、runner、MCP tool 変更 PR 件数 | policy / control surface |
| untrusted input violation | fork PR / `pull_request_target` 境界違反件数 | Actions policy / workflow review |
| security review coverage | high-risk PR の security review 実施率 | CODEOWNERS / required review |

Security Overview や secret scanning の dashboard は、現在の repository 状態や権限に依存します。
監査報告に使う場合は、いつ、誰が、どの scope で export したかを記録し、必要に応じて audit log と照合します。

### Cost 指標

cost 指標は、第8章の budget governance を delivery outcome と結び付けるためのものです。

| 指標 | 定義例 | 悪化時の対応 |
| --- | --- | --- |
| Actions minutes / merged PR | merge された PR あたりの Actions minutes | workflow trigger、cache、matrix 見直し |
| retry cost | rerun / failed run による追加 minutes | flaky test、外部依存、runner capacity |
| premium requests / accepted change | 採用された変更あたりの premium request | model / effort / prompt / issue size 調整 |
| artifact / cache growth | storage 使用量と retention | retention policy、artifact 範囲見直し |
| cost exception rate | budget owner 承認外の高コスト実行比率 | approval、workflow_dispatch、quota gate |
| cost per learning | eval / pilot に使った費用と得た判断 | pilot 終了条件、rollout 判断 |

コストは「安ければよい」ではありません。
high-risk change で review と eval に費用を使うのは合理的です。
一方で、同じ失敗を繰り返す rerun、巨大 PR による agent 再試行、不要 artifact は削減対象です。

### Adoption 指標

adoption 指標は、導入が使われているかだけでなく、過信や形骸化が起きていないかを見るために使います。

| 指標 | 定義例 | 読み方 |
| --- | --- | --- |
| active users | 対象期間に Copilot / agent を使った人数 | 導入の広がりを見る |
| engaged users | 実際に提案、chat、agent、review を利用した人数 | 定着度を見る |
| Copilot-reviewed PR | Copilot code review を受けた PR 数 / merge 数 | review flow への組込み度を見る |
| suggestion apply rate | Copilot review suggestion の適用率 | noise / 有用性を確認する |
| Copilot-authored merged PR | Copilot agent 作成 PR の merge 数 | agent authoring の導入度を見る |
| human override rate | agent 提案を人間が却下・修正した比率 | 過信防止と指示改善の両方に使う |
| playbook reuse | Skill / template / runbook を使った task 比率 | 標準化の定着を見る |

Copilot usage metrics の pull request fields には、作成、review、merge、time to merge、Copilot suggestion、
Copilot-reviewed / authored PR などの値が含まれます。
ただし、organization / enterprise scope では集計差や attribution timing の差があり得ます。
そのため、複数 scope の数値を直接比較せず、同一 scope・同一定義で時系列を見る運用にします。

## データソースと責任者

メトリクスは、owner と意思決定用途が決まって初めて運用できます。
次の表を、導入時の最小データ catalog として使います。

| データ | 主な用途 | owner | 注意点 |
| --- | --- | --- | --- |
| Issue / PR metadata | lead time、reopen、review wait | DevEx / repo owner | ラベルと状態定義を固定する |
| Review / thread state | review 完了率、unresolved thread | maintainer | bot と human review を分ける |
| Actions metrics | duration、queue、failure、minutes | Platform / SRE | workflow / job / repo 単位で見る |
| Copilot usage metrics | adoption、PR lifecycle、suggestion | Copilot admin / DevEx | data freshness と scope 差を記録する |
| Security Overview | alert、remediation、prevention | AppSec / security manager | 権限と current-state bias に注意する |
| Pulse | PR / Issue / commit activity の要約確認 | repo owner | repository 単位の要約。トップコントリビューター表示を個人評価に使わない |
| Budget / billing | premium requests、Actions minutes | budget owner | usage と outcome を結び付ける |
| Runbook / incident log | exception、rollback、root cause | owner team | 定性情報として残す |

個人別の ranking は原則避けます。
AgentOps の改善は、repo readiness、Issue 品質、review capacity、CI 安定性、policy 設計の問題であり、
個人の生産性ランキングに寄せると行動が歪みます。

## 最小 scorecard

最初の 1 か月は、次のような小さい scorecard で十分です。
数値だけでなく、解釈、判断、次の action を同じ PR / Issue / monthly note に残します。

```yaml
period: 2026-05
scope:
  organization: example-org
  repositories:
    - service-a
    - service-b
flow:
  median_pr_cycle_time_hours: 18
  median_time_to_first_review_hours: 2.5
  ci_failure_rate: 0.08
quality:
  post_merge_failure_count: 1
  reopened_issue_rate: 0.03
  unresolved_review_threads_before_merge: 0
security:
  security_exception_count: 2
  push_protection_bypass_count: 0
  secret_alert_mttr_hours: 4
cost:
  actions_minutes_per_merged_pr: 21
  premium_requests_per_accepted_change: 3.2
adoption:
  copilot_reviewed_pr_rate: 0.62
  copilot_suggestion_apply_rate: 0.31
  playbook_reuse_rate: 0.74
decisions:
  - keep level 2 agent PR for docs and tests
  - require security owner approval for workflow permission changes
next_actions:
  - split oversized dependency-update issues
  - reduce flaky e2e retry cost
```

この scorecard は、正確な BI 基盤を作る前の運用メモです。
重要なのは、毎回同じ定義で見て、次の action に接続することです。

## 週次 / 月次 / 四半期レビュー

### 週次レビュー

週次レビューは、flow と quality の短期悪化を検知します。

- merge された PR の cycle time と滞留理由
- review 待ち、CI 待ち、merge queue 待ちのどこで詰まったか
- unresolved thread、post-merge failure、flaky rerun の有無
- agent / Copilot に任せた task のうち、人間が差し戻したもの
- 次週に Issue 分割、template 改善、check 追加が必要なもの

### 月次レビュー

月次レビューは、security、cost、adoption を含めて運用設計を調整します。

- Copilot / agent adoption と、PR throughput / time to merge の推移
- Copilot-reviewed PR と human-only PR の cycle time / rework の差
- Actions minutes、premium requests、retry cost、artifact / cache growth
- security exception、push protection bypass、secret / dependency alert の状態
- policy / control surface の allow / prompt / forbidden を更新すべき箇所

### 四半期レビュー

四半期レビューは、rollout の拡大・縮小を判断します。

- 対象 repository / team を広げる条件を満たしたか
- agent に任せる task type を増やしてよいか
- required workflows、rulesets、CODEOWNERS、environment approval を強めるべきか
- custom agents / Skills / hooks / MCP の運用負荷が許容範囲か
- 予算、security、compliance の説明資料として十分な証跡が残っているか

## アンチパターン

| アンチパターン | 何が起きるか | 修正方法 |
| --- | --- | --- |
| velocity だけ追う | review と security が薄くなる | quality / security guardrail を同時に見る |
| Copilot 利用量を価値とみなす | 使われたが成果が不明になる | merged outcome / rework / cost と結び付ける |
| comment 数を品質指標にする | reviewer style に左右される | unresolved / fixed / post-merge failure を見る |
| org と enterprise の数値を直接比較する | attribution 差を誤読する | 同一 scope・同一定義で時系列化する |
| dashboard だけ作る | action に接続しない | scorecard に decision / next action を入れる |
| 個人 ranking にする | 指標の gaming と心理的安全性低下 | team / repo / workflow 単位で見る |
| 例外を記録しない | audit で説明できない | exception register と owner を持つ |
| rollout 条件がない | pilot が惰性で広がる | maturity gate を定義する |

## Rollout maturity matrix

AgentOps は、一気に全 repository へ展開しません。
次の maturity gate を使い、どの team がどの段階かを可視化します。

| Level | 状態 | 必須条件 | 次に進む条件 |
| --- | --- | --- | --- |
| 0: baseline | 現状を測る | PR / CI / cost / security の最小記録 | 4 週間の baseline がある |
| 1: assisted review | PR summary / Copilot review を使う | human review 必須、unresolved thread gate | review noise が許容範囲 |
| 2: bounded agent PR | docs / test / 小修正を agent に任せる | Issue scope、CI、rollback、budget owner | post-merge failure が増えない |
| 3: controlled workflow | release prep / dependency update を半自動化 | environment approval、security review | exception / cost が安定する |
| 4: scaled governance | 複数 team に横展開する | monthly scorecard、policy review、owner 明確化 | quarterly review で継続判断 |

Level を上げること自体は目的ではありません。
security 例外、cost 逸脱、post-merge failure、human override が増える場合は、Level を戻す判断も正しい運用です。

## 改善 backlog への接続

メトリクスレビューで見つかった問題は、抽象的な「改善」ではなく backlog に落とします。

| シグナル | 作る Issue の例 | owner |
| --- | --- | --- |
| review wait が長い | CODEOWNERS と reviewer rotation を見直す | maintainer |
| CI duration が長い | matrix / cache / path filter を再設計する | Platform |
| unresolved thread が残る | PR template と merge checklist を更新する | repo owner |
| post-merge failure が増える | required checks / smoke test を追加する | QA / SRE |
| cost が増える | agent task size と model / effort を見直す | budget owner |
| security exception が増える | workflow permission と environment approval を強化する | AppSec |
| adoption が伸びない | Skill / template / onboarding を改善する | DevEx |
| human override が多い | agent instruction と eval set を更新する | owner team |

Issue 化するときは、指標、対象期間、影響、仮説、検証方法を必ず書きます。
「数値が悪い」だけでは action になりません。

## 公式情報の確認先

2026-05-24（Asia/Tokyo）時点で、本章の用語整理に使う主な一次情報は次です。
GitHub / Copilot の metrics は対象 scope、権限、data freshness、API field が変わり得るため、運用設計時は最新ページを確認します。

- GitHub Docs: [GitHub Copilot usage metrics](https://docs.github.com/en/copilot/concepts/copilot-usage-metrics/copilot-metrics)
- GitHub Docs: [Data available in Copilot usage metrics](https://docs.github.com/en/copilot/reference/copilot-usage-metrics/copilot-usage-metrics)
- GitHub Docs: [REST API endpoints for Copilot metrics](https://docs.github.com/rest/copilot/copilot-usage)
- GitHub Docs: [About GitHub Actions metrics](https://docs.github.com/en/actions/concepts/about-github-actions-metrics)
- GitHub Docs: [Monitor workflows](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/monitoring-workflows)
- GitHub Docs: [About security overview](https://docs.github.com/en/code-security/concepts/security-at-scale/about-security-overview)
- GitHub Docs: [Using Pulse to view a summary of repository activity](https://docs.github.com/repositories/viewing-activity-and-data-for-your-repository/viewing-a-summary-of-repository-activity)

## 導入チェックリスト

- [ ] North Star と guardrail metrics が分かれている
- [ ] flow / quality / security / cost / adoption の最小 scorecard がある
- [ ] Issue / PR / review / Actions / security / cost の data owner が決まっている
- [ ] Copilot usage metrics の scope、data freshness、権限、集計差を記録している
- [ ] high-risk change の security exception と cost exception を追跡している
- [ ] post-merge failure、unresolved thread、reopen、human override を品質指標として見ている
- [ ] pilot / rollout の maturity gate と、戻す条件が定義されている

## 運用チェックリスト

- [ ] 週次レビューで flow / quality の滞留と手戻りを確認している
- [ ] 月次レビューで security / cost / adoption を確認している
- [ ] 四半期レビューで rollout 拡大・縮小・停止を判断している
- [ ] scorecard に decision と next action が残っている
- [ ] 指標悪化が backlog Issue に変換され、owner と検証方法が付いている
- [ ] 指標を個人 ranking ではなく、team / repo / workflow 改善に使っている
- [ ] dashboard の数値と audit / incident / review log の証跡が矛盾していない

## まとめ

AgentOps のメトリクスは、AI の使用量を増やすためのものではありません。
価値ある変更を安全に早く届け、品質・security・cost・adoption のバランスを保つための運用 feedback loop です。
flow だけでなく、quality、security、cost、adoption を同じ場で review し、scorecard から backlog へつなげます。
これにより、agent に委譲する範囲を段階的に広げても、商用運用に必要な説明責任、監査性、rollback を維持できます。
