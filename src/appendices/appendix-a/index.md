# 付録A：テンプレ集（AGENTS.md / Issue / PR / .agent.md / Skills）

本文で参照するテンプレート類の一覧と用途を整理します。

## Companion repo

- リポジトリ: [itdojp/GitHub-AgentOps-companion](https://github.com/itdojp/GitHub-AgentOps-companion)

## Companion の使い分け早見表

| 導入目的 | まず開く固定パス | 参照章 |
| --- | --- | --- |
| 最初の 1 件を Issue から PR まで回したい | `.github/ISSUE_TEMPLATE/agent-task.yml` | 第6章 |
| エージェントへの基本指示を決めたい | `AGENTS.md` | 第3章 |
| 反復タスクを再利用可能な手順に切り出したい | `skills/docs-update/SKILL.md` | 第4章 |
| 実行境界と権限制御を先に固めたい | `rules/command-policy.md` / `CODEOWNERS_GUIDE.md` | 第5章 / 第10章 |
| PR での要約・確認観点を揃えたい | `.github/PULL_REQUEST_TEMPLATE.md` | 第6章 |

## テンプレ一覧（初期）

### AgentOps 運用（Issue→PR→反復）

- エージェント指示: `AGENTS.md`
- Issue（実行仕様）: `.github/ISSUE_TEMPLATE/agent-task.yml`
- バグ: `.github/ISSUE_TEMPLATE/bug-report.yml`
- 改善: `.github/ISSUE_TEMPLATE/improvement.yml`
- 依存更新: `.github/ISSUE_TEMPLATE/dependency-update.yml`
- ドキュメント: `.github/ISSUE_TEMPLATE/documentation.yml`
- PR: `.github/PULL_REQUEST_TEMPLATE.md`

### 権限/承認（ガバナンス）

- CODEOWNERS 指針: `CODEOWNERS_GUIDE.md`

### Skills（反復タスクの Runbook）

- 依存更新: `skills/dependency-update/SKILL.md`
- テスト追加: `skills/add-tests/SKILL.md`
- ドキュメント整備: `skills/docs-update/SKILL.md`
- 安全なリファクタ: `skills/refactor-safe/SKILL.md`

### カスタムエージェント（役割特化）

- doc-agent: `custom-agents/doc-agent/.agent.md`
- test-agent: `custom-agents/test-agent/.agent.md`
- dep-agent: `custom-agents/dep-agent/.agent.md`
- MCP 公開範囲設計例: `custom-agents/MCP_SCOPE_EXAMPLE.md`

### Rules（実行境界）

- allow/prompt/forbidden のポリシー雛形: `rules/command-policy.md`

### Codex Action（CI 統合）

- PR 要約 + リスク抽出コメント: `.github/workflows/codex-pr-review.yml`
- リリース前チェック（手動実行）: `.github/workflows/codex-release-prep.yml`
- プロンプト雛形: `.github/codex/prompts/`

## 1対1対応（固定パス前提）

本書は Companion repo の **固定パス** を参照します。
運用上は「破壊的変更（移動/改名）」を避け、必要な場合は移行期間を設けてください。
