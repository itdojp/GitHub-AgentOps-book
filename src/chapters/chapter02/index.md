# 第2章：Agent-ready repo 要件（テンプレ / 品質ゲート / 権限境界）

## この章で扱うこと

- Issue/PR テンプレ、品質ゲート、権限境界、ログ/監査の最小要件
- Companion repo の資産を「導入可能（コピペ）」にする設計

## Companion 資産（参照先）

Companion repo: [itdojp/GitHub-AgentOps-companion](https://github.com/itdojp/GitHub-AgentOps-companion)

- Issue フォーム: `.github/ISSUE_TEMPLATE/`
- PR テンプレ: `.github/PULL_REQUEST_TEMPLATE.md`
- CODEOWNERS 指針: `CODEOWNERS_GUIDE.md`

## 章末チェックリスト（ドラフト）

- [ ] Issue/PR テンプレが整備され、受入基準が明文化されている
- [ ] ブランチ保護/Required checks/Required reviewers の方針が決まっている
- [ ] Secrets/権限/監査ログの運用方針が決まっている
