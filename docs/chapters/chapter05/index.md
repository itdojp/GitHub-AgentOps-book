---
layout: book
title: "第5章：Policy と control surface 設計"
---

# 第5章：Policy と control surface 設計

## この章で扱うこと

この章では、allow / prompt / forbidden を抽象的なルールで終わらせず、
GitHub と agent 実行環境のどの control surface で執行するかを設計します。

扱う観点は次の通りです。

- 操作を allow / prompt / forbidden に分類する基準
- Copilot CLI の tool control、hooks、CI、rulesets、CODEOWNERS、environments の役割分担
- 例外運用と承認ログ
- policy が形骸化しないための棚卸し

## Policy は「書く」だけでは足りない

エージェント運用では、禁止事項を文書化するだけでは不十分です。
危険な操作が実行される場所、承認が必要な場所、機械的に止める場所を分ける必要があります。

代表的な失敗は次の通りです。

- `AGENTS.md` には禁止と書いたが、CLI の tool permission では許可されている
- PR template には review 必須と書いたが、ruleset / branch protection では要求されていない
- Secrets を使う job が、environment approval なしで動く
- hook が警告だけ出し、PR 上の証跡や CI gate につながっていない
- 例外承認が issue / PR に残らず、次回の判断材料にならない

Policy は、**文書、tool permission、hook、CI、GitHub repository controls** を組み合わせて初めて機能します。

## allow / prompt / forbidden の基準

最小構成では、操作を次の 3 区分に分けます。

| 区分 | 意味 | 例 | 必要な証跡 |
| --- | --- | --- | --- |
| allow | 低リスク、可逆、監査容易な操作 | read、grep、lint、unit test、docs build | 実行ログ、検証結果 |
| prompt | 影響が大きく、人間承認が必要な操作 | dependency install、push、release、外部 API、MCP の mutating tool | 承認理由、影響範囲、rollback |
| forbidden | 原則実行しない操作 | 本番 secret の表示、force push、外部 script 直実行、未承認の破壊的操作 | 拒否理由、代替案 |

分類は固定ではありません。
同じ `npm install` でも、個人の検証環境では prompt、CI の再現環境では allow、
本番サーバー上では forbidden になることがあります。

## Control surface 対応表

次の表を使い、policy をどこで執行するかを決めます。

| Control surface | 執行できること | 例 | 限界 |
| --- | --- | --- | --- |
| Instruction / Skill | 期待する作業手順、非スコープ、証跡 | `npm test` を必須化、PR本文の型 | 実行を機械的には止められない |
| Copilot CLI tool control | tool / command / MCP tool の許可・拒否 | `--deny-tool='shell(git push)'` | GitHub 上の PR merge や Actions policy は別管理 |
| Hooks | session / prompt / tool call 前後の検査 | secret scan、禁止コマンド検知、audit log | hook 自体の保守と性能影響がある |
| CI / required checks | 再現可能な品質ゲート | lint、test、link check、policy check | 人間承認や設計妥当性は直接判断しない |
| CODEOWNERS | ファイル領域別の review owner | `.github/**`、security docs、infra | 所有者に権限が必要。レビュー品質までは保証しない |
| Rulesets / branch protection | merge 前条件、required status、review 条件 | required checks、linear history、deployment success | repository / plan / permission に依存する |
| Environments | deploy 承認、environment secrets、待機条件 | production deploy approval | deploy 以外の通常PR判断は別途必要 |
| Issue / PR template | 受入基準、例外理由、rollback 記録 | review completeness checklist | 記入漏れを機械的に止めるには CI 等が必要 |

重要なのは、1 つの control surface に期待しすぎないことです。
たとえば「force push 禁止」は instruction だけでなく、tool deny、ruleset、レビュー運用を組み合わせます。

## 実装パターン: policy matrix

実務では、次のような matrix をリポジトリ単位で持ちます。

| 操作 | 既定分類 | 執行場所 | 承認者 | ログ |
| --- | --- | --- | --- | --- |
| Markdown の軽微修正 | allow | Skill / CI | PR reviewer | PR本文、CI |
| 依存追加 | prompt | tool prompt / PR review / CI | Maintainer | lockfile diff、CI、理由 |
| GitHub Actions workflow 変更 | prompt | CODEOWNERS / ruleset / CI | Platform owner | PR review、run結果 |
| MCP の mutating tool 追加 | prompt | MCP config review / CODEOWNERS | Security / Platform | tool list、権限理由 |
| 本番 secret 表示 | forbidden | hook / secret scanning / policy | なし | 拒否理由、代替案 |
| `git push --force` | forbidden | tool deny / branch rule | 例外時のみ owner | 承認ログ、復旧手順 |

matrix は、PR template や `AGENTS.md` に全文を貼る必要はありません。
参照先を置き、PR では今回該当する分類と証跡だけを記録します。

## prompt の承認フロー

prompt に分類した操作では、実行前に次を提示します。

1. 目的: 何のために実行するか
2. 対象: どのファイル、環境、外部サービスに触るか
3. 影響: どの差分、費用、権限、公開範囲が変わるか
4. 代替案: 実行しない場合の選択肢
5. rollback: 戻し方、停止方法、確認方法
6. 証跡: どの Issue / PR / run / log に残すか

承認ログの最小形は次です。

```text
[承認] dependency install を実行
目的: lockfile を current package.json と整合させるため
影響: package-lock.json が更新される可能性あり
代替: lockfile を手動確認して差分を最小化
rollback: 該当 commit を revert
証跡: PR #123 の検証セクションに npm test 結果を記録
```

## 例外運用

例外は、緊急時ほど必要になります。
ただし、例外を「暗黙の近道」にすると、policy は形骸化します。

例外を認める場合は、最低限次を残します。

- 誰が承認したか
- 何を一時的に緩和したか
- なぜ通常ルートでは間に合わないか
- いつ元に戻すか
- 再発防止として、policy / hook / CI / template のどれを更新するか

例外後の改善先まで決めておくと、運用は強くなります。

## 導入順序

すべてを一度に自動化する必要はありません。
次の順序で、文書から執行へ段階的に強化します。

1. allow / prompt / forbidden の matrix を作る
2. PR template に、該当分類、承認理由、rollback を書く欄を追加する
3. `npm test`、link check、policy check を required checks にする
4. `.github/**`、workflow、security docs に CODEOWNERS を設定する
5. high-risk 操作を Copilot CLI の deny / prompt と hook で止める
6. deploy 系は environments と required reviewers へ接続する
7. rulesets / branch protection で merge 前条件を固定する
8. 月次で例外、失敗、手戻りを見直し、matrix を更新する

## 公式情報の確認先

2026-05-24（Asia/Tokyo）時点で、本章の用語整理に使う主な一次情報は次です。
提供範囲や plan 条件は変わり得るため、導入時は最新ページを確認してください。

- GitHub Docs: [Allowing and denying tool use](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/allowing-tools)
- GitHub Docs: [About hooks for GitHub Copilot](https://docs.github.com/en/copilot/concepts/agents/hooks)
- GitHub Docs: [About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
- GitHub Docs: [Available rules for rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)
- GitHub Docs: [About code owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- GitHub Docs: [Using environments for deployment](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)

## 章末チェックリスト

- [ ] allow / prompt / forbidden の分類基準が、操作・環境・影響範囲ごとに定義されている
- [ ] 各 policy が instruction、tool control、hook、CI、CODEOWNERS、ruleset のどこで執行されるか分かる
- [ ] prompt 操作では、目的、影響、代替案、rollback、証跡を実行前に提示している
- [ ] forbidden 操作では、拒否理由と安全な代替案を残している
- [ ] 例外承認が Issue / PR / run log に残り、次回の policy 改善につながっている
- [ ] security / deploy / workflow 変更は、人間承認と機械的 gate の両方で止められる

## まとめ

Policy と control surface 設計の要点は、ルールを「書く」ことではなく、
実際に止める場所、承認する場所、証跡を残す場所を分けることです。
Instruction、tool control、hooks、CI、CODEOWNERS、rulesets、environments を組み合わせると、
AI エージェントの速度を保ちながら、監査可能な運用境界を作れます。
