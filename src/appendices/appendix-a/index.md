# 付録A：テンプレ集（instructions / Issue / PR / agents / Skills / hooks / MCP）

本文で扱った AgentOps の制御面を、導入時に参照するテンプレート候補として整理します。
ここで示すパスは Companion repo 側で維持する固定パス候補です。既存の Companion 資産と差分がある場合は、
移行期間を設け、旧パスから新パスへの案内を README や PR 本文に残してください。

## Companion repo

- リポジトリ: [itdojp/GitHub-AgentOps-companion](https://github.com/itdojp/GitHub-AgentOps-companion)

## この付録の読み方

- 付録Aは「どの資産をどこに置くか」を確認するカタログです。
- 付録Bは「タスク別にどう使うか」を確認するプレイブックです。
- 付録Cは「運用事故が起きたときにどこを切り分けるか」を確認するトラブルシュートです。

Companion repo にまだ存在しない資産を導入する場合は、本書のパスをいきなり必須化せず、
Issue に導入目的・所有者・検証方法・廃止条件を記録してから追加します。

## 導入パッケージ

| レベル | 入れる資産 | 完了条件 |
| --- | --- | --- |
| Minimum | Issue/PR テンプレ、`AGENTS.md`、`CODEOWNERS_GUIDE.md` | 1件の Issue→PR→CI→review→merge を小さく回せる |
| Standard | `.github/copilot-instructions.md`、path-specific instructions、Skills、policy | 反復タスクと制御面が人に依存せず再利用できる |
| Advanced | custom agents、hooks、MCP/tool exposure、運用 scorecard | 権限・監査・コスト・adoption を月次で説明できる |

## Companion の使い分け早見表

| 導入目的 | まず開く固定パス候補 | 参照章 |
| --- | --- | --- |
| 最初の1件を Issue から PR まで回す | `.github/ISSUE_TEMPLATE/agent-task.yml` | 第6章 |
| repo-wide な Copilot 指示を整える | `.github/copilot-instructions.md` | 第3章 |
| path-specific な指示を整える | `.github/instructions/docs.instructions.md` | 第3章 |
| Codex CLI など CLI agent の既定指示を整える | `AGENTS.md` | 第3章 |
| 反復タスクを再利用可能な手順に切り出す | `skills/docs-update/SKILL.md` | 第4章 |
| 専門 agent の役割と tool scope を固定する | `.github/agents/docs-reviewer.md` | 第4章 |
| 実行前後の禁止・監査・検証を置く | `.github/hooks/pre-tool-use.json` | 第4章 / 第5章 |
| MCP / tool exposure を審査する | `.github/mcp/tool-exposure-review.md` | 第7章 |
| PR での要約・リスク・検証観点を揃える | `.github/PULL_REQUEST_TEMPLATE.md` | 第6章 / 第9章 |
| 月次運用レビューへつなげる | `ops/agentops-scorecard.md` | 第11章 |

## Instructions / context templates

instruction は「全員に常に読ませるもの」と「特定パス・特定 agent だけに読ませるもの」を分けます。
長い一枚の `AGENTS.md` にすべてを寄せると、競合・陳腐化・レビュー漏れが起きやすくなります。

| 資産 | 固定パス候補 | 主な用途 | 更新責任 |
| --- | --- | --- | --- |
| repo-wide Copilot instructions | `.github/copilot-instructions.md` | リポジトリ全体の規約、レビュー観点、禁止事項 | Maintainer / DevEx |
| path-specific instructions | `.github/instructions/docs.instructions.md` | docs、workflow、security など領域別の追加指示 | 領域 owner |
| CLI agent 指示 | `AGENTS.md` | Codex CLI 等の作業規約、言語、検証、作業ディレクトリ制約 | Maintainer |
| agent-specific notes | `.github/agents/<agent-name>.md` | custom agent の役割・境界・tool scope | Agent owner |
| stale context log | `ops/context-refresh-log.md` | 指示の棚卸し日、根拠、廃止候補 | DevEx / Platform |

更新チェックリスト：

- [ ] 指示が重複していない
- [ ] 競合時の優先順位が本文・テンプレ双方で説明されている
- [ ] セキュリティ、コスト、レビュー基準が一箇所に閉じていない
- [ ] path-specific instructions は対象パスと owner が明記されている
- [ ] Copilot code review が参照する base branch 側の内容も更新済みである

## Issue / PR / review / risk templates

Issue は作業依頼ではなく、実行仕様として扱います。PR は実装報告だけでなく、レビュー・検証・残リスクを残す監査ログです。

| 資産 | 固定パス候補 | 必須項目 |
| --- | --- | --- |
| Agent task Issue | `.github/ISSUE_TEMPLATE/agent-task.yml` | 目的、非目標、受入基準、制約、検証、ロールバック |
| バグ報告 | `.github/ISSUE_TEMPLATE/bug-report.yml` | 再現条件、期待結果、実結果、影響範囲、回帰テスト |
| 依存更新 | `.github/ISSUE_TEMPLATE/dependency-update.yml` | 一次情報、更新範囲、破壊的変更、ロールバック |
| Security review | `.github/ISSUE_TEMPLATE/security-review.yml` | threat model、secret boundary、fork PR、権限、監査ログ |
| MCP/tool exposure | `.github/ISSUE_TEMPLATE/mcp-tool-exposure.yml` | tool 分類、scope、side effect、承認者、失効条件 |
| Rollout review | `.github/ISSUE_TEMPLATE/rollout-review.yml` | 対象チーム、maturity level、成功指標、撤退条件 |
| PR template | `.github/PULL_REQUEST_TEMPLATE.md` | 変更概要、旧→新対応、検証、リスク、未解決点 |
| Review checklist | `.github/review-templates/risk-review.md` | 品質、セキュリティ、コスト、運用、互換性 |

PR 本文テンプレートには、少なくとも次を入れます。

- 変更の目的とスコープ
- 旧構成から新構成への対応表
- ローカル検証と CI 結果
- Copilot review / human review の指摘対応状況
- 残リスク、未解決点、次 Issue

## Policy / control surface templates

policy は「方針を書く」だけでは不十分です。どの制御面で執行するかを、PR 前に決めます。

| 資産 | 固定パス候補 | 執行する内容 |
| --- | --- | --- |
| command policy | `rules/command-policy.md` | allow / prompt / forbidden、承認ログ、例外条件 |
| CODEOWNERS guide | `CODEOWNERS_GUIDE.md` | review owner、例外時の代替承認、危険領域 |
| branch/ruleset note | `rules/branch-protection.md` | required checks、merge queue、署名、review 要件 |
| environment gate | `rules/environment-gates.md` | 本番・外部 API・secret を伴う実行の承認条件 |
| Actions permission note | `rules/actions-permissions.md` | `GITHUB_TOKEN`、OIDC、fork PR、`pull_request_target` |
| risk log | `ops/risk-log.md` | 例外承認、期限、再評価日、owner |

推奨する最小ルール：

- `contents: write`、`pull-requests: write`、`id-token: write` は job 単位で理由を明記する
- secret、外部 side effect、production 変更は manual gate または environment approval に寄せる
- `pull_request_target` は base branch context と PR head code の扱いを分離して記録する
- MCP の mutating tool は、導入時に失効条件と audit log を持たせる

## Skills / custom agents / hooks / MCP templates

再利用レイヤーは、目的ごとに分けます。Skill は手順、custom agent は役割、hook は制御・監査、MCP は外部 context
と tool exposure の境界です。

| 種別 | 固定パス候補 | 用途 | レビュー観点 |
| --- | --- | --- | --- |
| Skill | `skills/docs-update/SKILL.md` | ドキュメント更新の反復手順 | 入力、手順、検証、完了条件 |
| Skill | `skills/security-review/SKILL.md` | security fix / review assist | secrets、権限、外部送信、ログ |
| Skill | `skills/release-prep/SKILL.md` | release 前の確認とサマリ | 対象 ref、成果物、ロールバック |
| custom agent | `.github/agents/docs-reviewer.md` | docs 差分の構造・リンク確認 | 触ってよいパス、禁止変更 |
| custom agent | `.github/agents/security-reviewer.md` | 権限・secret・workflow 差分の確認 | tool scope、false positive、監査 |
| hook | `.github/hooks/pre-tool-use.json` | 危険コマンドや外部送信の事前判定 | block/prompt 条件、例外ログ |
| hook | `.github/hooks/session-end.json` | 実行後の証跡収集、検証漏れ警告 | ログ量、機微情報、失敗時挙動 |
| MCP review | `.github/mcp/tool-exposure-review.md` | read-only / mutating / external side effect の分類 | 最小公開、失効、監査 |

移行メモ：既存 Companion に `custom-agents/` 配下の資産がある場合は、互換期間を設けて
`.github/agents/` へ段階移行します。移行中は旧パスを消さず、新パスの README から対応関係を示します。

## Continuous AI / CI integration templates

第9章の実装パターンは、CI に入れる前に「どの結果を gate にするか」を分けて設計します。

| 資産 | 固定パス候補 | 推奨する扱い |
| --- | --- | --- |
| PR summary / risk extraction | `.github/workflows/agentops-pr-summary.yml` | comment-only から開始し、必須 gate にしない |
| Copilot review checklist | `.github/review-templates/copilot-review.md` | suggestion 対応、却下理由、再レビュー条件を記録 |
| Release prep | `.github/workflows/agentops-release-prep.yml` | `workflow_dispatch` と対象 ref を明示 |
| Docs QA | `.github/workflows/docs-qa.yml` | lint / build / link-check を required check 化 |
| Scorecard update | `.github/workflows/agentops-scorecard.yml` | 月次または手動実行、個人ランキングに使わない |

CI 統合時の原則：

- 最初は advisory comment として導入し、誤検知率を測ってから required check 化する
- cost / security / reviewer load の owner を PR 本文に明記する
- generated artifact に secret や不要なログが含まれないかを release prep に含める

## 公式情報の確認先

本文や Companion 資産を更新するときは、古い二次情報ではなく一次情報を確認します。
2026-05-24（Asia/Tokyo）時点で確認すべき代表例は次です。

| 領域 | 確認先 |
| --- | --- |
| repository / path-specific instructions | [Adding repository custom instructions for GitHub Copilot](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions) |
| custom agents | [About custom agents](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/about-custom-agents) |
| Skills | [Adding agent skills for GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills) |
| hooks | [About hooks for GitHub Copilot](https://docs.github.com/en/copilot/concepts/agents/hooks) |
| MCP | [About Model Context Protocol](https://docs.github.com/en/copilot/concepts/context/mcp) |
| Copilot code review | [Using GitHub Copilot code review](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/request-a-code-review/use-code-review) |
| Actions permissions | [Workflow syntax for GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax) |
| Actions security | [Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use) |

## 変更管理チェックリスト

テンプレートを追加・移動・削除するときは、次を満たしてから PR を出します。

- [ ] 対象パス、owner、参照章、廃止条件を Issue に記録した
- [ ] 既存リンクを壊さない移行期間を設けた
- [ ] security / cost / review load の影響を確認した
- [ ] `npm test` または該当リポジトリの品質ゲートを通した
- [ ] PR 本文に「旧構成→新構成」「更新理由」「未解決点」を書いた
