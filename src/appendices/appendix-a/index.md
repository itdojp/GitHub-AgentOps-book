# 付録A：Companion 資産カタログ（shipped / planned）

本文で扱う AgentOps の制御面を、導入時にコピーできる Companion 資産と、まだ利用できない計画候補に分けて整理します。
固定パスは「名前の候補」ではなく、指定した Companion commit に実在することを確認した契約として扱います。

## Book / Companion 対応

- Book version: 1.0.0
- Companion repository: [itdojp/GitHub-AgentOps-companion](https://github.com/itdojp/GitHub-AgentOps-companion)
- Companion commit: `7acb7958153e9e2b3d080f4940fbb95b883a429e`
- 確認日: 2026-07-19（Asia/Tokyo）
- 機械可読な正本: `config/companion-assets.json`
- 固定スナップショット: [Companion tree at the verified commit](https://github.com/itdojp/GitHub-AgentOps-companion/tree/7acb7958153e9e2b3d080f4940fbb95b883a429e)

この版の本文が「Companion にある」と表現するのは、正本catalogで `shipped` に分類した資産だけです。
`planned / not yet shipped` は設計候補であり、コピー、実行、Required checks設定の導線には使用しません。
Companion の新しい `main` に同名pathがあっても、この対応commitを更新するまでは本書の検証済み資産とは扱いません。

## この付録の読み方

- 付録Aは、利用可能な固定pathと未提供候補を判別するcatalogです。
- 付録Bは、`shipped` 資産だけを使ったタスク別プレイブックです。
- 付録Cは、運用事故が起きたときの切り分けです。
- GitHub Trees APIによる実在確認は、週次/手動workflowで再実行します。

checkerは、`src`内で固定pathを含む全原稿を検出し、Companion contractかproduct一般の配置例かの未分類を拒否します。
第3章や第4章などの一般例はsourceに `companion-path-scope: generic` を明示し、Companion repositoryへの導線との併記を禁止します。
一般例をCompanionの導線へ変更する場合はgeneric分類を外し、source/generated docsの対応とcatalogへ追加して実在性を検査します。

## 導入レベル

| レベル | 現時点で利用する資産 | 完了条件 |
| --- | --- | --- |
| Minimum | Issue/PR template、`AGENTS.md`、`CODEOWNERS_GUIDE.md` | 1件の Issue→PR→CI→review→merge を小さく回せる |
| Standard | shipped Skills、`rules/command-policy.md`、Codex prompt/workflow | 反復タスクとcommand policyを再利用できる |
| Advanced | shipped custom agents、`custom-agents/MCP_SCOPE_EXAMPLE.md` | role/tool scopeを説明できる。hookや専用MCP reviewは未提供として別途設計する |

## Shipped：利用可能な固定path

以下は指定Companion commitでGit objectまで確認済みです。pathをコピーするときは、用途と内容を確認して必要なものだけ採用します。

### Issue / PR template

| 固定path | 用途 |
| --- | --- |
| `.github/ISSUE_TEMPLATE/agent-task.yml` | 目的、非目標、受入基準、制約、検証を持つAgent task |
| `.github/ISSUE_TEMPLATE/bug-report.yml` | 再現条件、期待結果、実結果を持つbug report |
| `.github/ISSUE_TEMPLATE/dependency-update.yml` | 依存更新の互換性、検証、rollback記録 |
| `.github/ISSUE_TEMPLATE/documentation.yml` | 文書更新の対象読者、導線、検証記録 |
| `.github/ISSUE_TEMPLATE/improvement.yml` | 改善案と効果測定の記録 |
| `.github/PULL_REQUEST_TEMPLATE.md` | 変更概要、検証、risk、未解決点の記録 |

### Instructions / policy

| 固定path | 用途 |
| --- | --- |
| `AGENTS.md` | CLI agent向けのrepository規約 |
| `CODEOWNERS_GUIDE.md` | review ownerと例外時の考え方 |
| `rules/README.md` | rulesの責務と配置案内 |
| `rules/command-policy.md` | allow / prompt / forbiddenと承認条件 |

Companionにはrepo-wide Copilot instructionsやpath-specific instructionsの完成資産はありません。
導入先で新規作成する場合は、GitHub公式仕様を確認し、owner、適用範囲、失効条件を導入先Issueへ記録します。

### Skills

| 固定path | 用途 |
| --- | --- |
| `skills/README.md` | Skill catalogの入口 |
| `skills/add-tests/SKILL.md` | test追加の反復手順 |
| `skills/dependency-update/SKILL.md` | 依存更新の反復手順 |
| `skills/docs-update/SKILL.md` | 文書更新の反復手順 |
| `skills/refactor-safe/SKILL.md` | 挙動を維持するrefactor手順 |

### Custom agents / MCP scope example

| 固定path | 用途 |
| --- | --- |
| `custom-agents/README.md` | 現行custom agent構成の入口 |
| `custom-agents/dep-agent/.agent.md` | 依存更新agentのrole/tool scope例 |
| `custom-agents/doc-agent/.agent.md` | 文書更新agentのrole/tool scope例 |
| `custom-agents/test-agent/.agent.md` | test追加agentのrole/tool scope例 |
| `custom-agents/MCP_SCOPE_EXAMPLE.md` | MCP/tool exposureを考えるためのscope例 |

これらは現行Companion固有の配置です。導入先productが別のcustom-agent配置を要求する場合は、その公式仕様へ変換し、
元assetと導入先pathの対応をPRへ記録します。存在しない別pathをCompanionの固定pathとして扱いません。

### Codex prompt / workflow

| 固定path | 用途 |
| --- | --- |
| `.github/codex/prompts/pr-review.md` | PR review promptと確認観点 |
| `.github/codex/prompts/release-prep.md` | release準備prompt |
| `.github/workflows/codex-pr-review.yml` | PR review workflow例 |
| `.github/workflows/codex-release-prep.yml` | 手動release準備workflow例 |

workflowをコピーする前に、Action SHA pin、権限、secret、fork PR、課金、利用productの仕様を導入先で再監査します。
Companionに存在することは、安全性や最新性を単独で保証しません。

## Planned / not yet shipped：未提供の候補

次のpathは指定Companion commitに存在しません。すべて **未提供（planned / not yet shipped）** であり、現時点の実行導線から外します。
追加する場合はCompanion側の独立Issue/PRで実装・検証し、そのmerge commitへcatalogを更新してから `shipped` へ移します。

| intended path | 状態 | 想定用途 |
| --- | --- | --- |
| `.github/copilot-instructions.md` | 未提供（planned / not yet shipped） | repo-wide Copilot instructions |
| `.github/instructions/docs.instructions.md` | 未提供（planned / not yet shipped） | docs向けpath-specific instructions |
| `.github/agents/docs-reviewer.md` | 未提供（planned / not yet shipped） | 別配置のdocs reviewer |
| `.github/agents/security-reviewer.md` | 未提供（planned / not yet shipped） | security reviewer |
| `.github/agents/test-reviewer.md` | 未提供（planned / not yet shipped） | 別配置のtest reviewer |
| `.github/hooks/pre-tool-use.json` | 未提供（planned / not yet shipped） | 実行前control hook |
| `.github/hooks/session-end.json` | 未提供（planned / not yet shipped） | session終了時の監査hook |
| `.github/mcp/tool-exposure-review.md` | 未提供（planned / not yet shipped） | MCP/tool exposure review note |
| `.github/ISSUE_TEMPLATE/security-review.yml` | 未提供（planned / not yet shipped） | security review専用Issue form |
| `.github/ISSUE_TEMPLATE/mcp-tool-exposure.yml` | 未提供（planned / not yet shipped） | MCP審査専用Issue form |
| `.github/ISSUE_TEMPLATE/rollout-review.yml` | 未提供（planned / not yet shipped） | rollout review専用Issue form |
| `.github/review-templates/risk-review.md` | 未提供（planned / not yet shipped） | 横断risk review checklist |
| `.github/review-templates/copilot-review.md` | 未提供（planned / not yet shipped） | Copilot review checklist |
| `rules/branch-protection.md` | 未提供（planned / not yet shipped） | branch/ruleset設計note |
| `rules/environment-gates.md` | 未提供（planned / not yet shipped） | environment approval note |
| `rules/actions-permissions.md` | 未提供（planned / not yet shipped） | Actions permission note |
| `ops/context-refresh-log.md` | 未提供（planned / not yet shipped） | context棚卸しlog |
| `ops/risk-log.md` | 未提供（planned / not yet shipped） | 例外承認と再評価log |
| `ops/agentops-scorecard.md` | 未提供（planned / not yet shipped） | team-level scorecard |
| `skills/security-review/SKILL.md` | 未提供（planned / not yet shipped） | security review Skill |
| `skills/release-prep/SKILL.md` | 未提供（planned / not yet shipped） | release準備Skill |
| `.github/workflows/docs-qa.yml` | 未提供（planned / not yet shipped） | docs専用quality gate |
| `.github/workflows/agentops-scorecard.yml` | 未提供（planned / not yet shipped） | scorecard更新workflow |

## 未提供領域を導入する場合

未提供assetを名称だけ模倣して運用へ入れません。まずshippedの汎用 `agent-task.yml` または `improvement.yml` で、
次を実行仕様として固定します。

- 導入目的、owner、非目標、利用productと公式仕様
- secrets、権限、外部side effect、課金、audit logの境界
- positive/negative test、失敗時の停止条件、rollback
- 固定pathを維持する期間、廃止条件、Bookへの反映条件

Companionへassetを追加したPRがmergeされ、immutable commitで実在と内容を確認した後にだけ、Bookのcatalogと本文を更新します。

## 公式情報の確認先

本文やCompanion資産を更新するときは、二次情報ではなく一次情報を確認します。

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

- [ ] `config/companion-assets.json`のCompanion commit、object SHA、確認日を更新した
- [ ] `shipped`はremote treeで実在し、`planned / not yet shipped`は実行導線から外れている
- [ ] Appendix A/B/C、Chapter 1/2/9、CHECKLIST、生成docsの参照が一致している
- [ ] local fixture testと週次/手動remote checkが成功した
- [ ] security / cost / review load、移行期間、rollbackをPRへ記録した
