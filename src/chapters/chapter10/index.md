# 第10章：セキュリティ設計（Secrets / 権限 / ログ / 供給網）

## この章で扱うこと

- Secrets 管理、権限設計、実行ログ/監査、供給網（サプライチェーン）
- Rules（第5章）との整合

## 脅威モデル（最小）

エージェント運用で想定すべき事故は、概ね次に集約できます。

- **Secrets 漏えい**：ログ/コメント/成果物への混入、外部送信
- **権限逸脱**：不要な write 権限、環境変更、デプロイ権限の誤付与
- **プロンプトインジェクション**：PR 本文やコード内の指示に誘導される
- **供給網リスク**：Actions/依存関係の改ざん、意図しない更新

この章の目的は、上記を「運用できるルール」に落とすことです。

## Secrets 設計（最小）

- Secrets は **必要最小限** にし、参照できるワークフロー/イベント/環境を制限する
- 値は **出力しない**（マスクされても、断片や派生情報が漏れる可能性がある）
- ローテーション（期限/漏えい時）と棚卸し（不要 Secrets の削除）を手順化する

フォーク PR など「信頼できない入力」経路に Secrets を渡さない設計を優先します。

## 権限設計（最小権限）

GitHub Actions では `permissions:` により `GITHUB_TOKEN` の権限を絞れます。
原則は **read をデフォルト** とし、必要なジョブだけに write を付与します。

例：

- PR コメント投稿のみが必要：`issues: write`（必要に応じて `pull-requests: read`）
- コード変更が必要：PR 作成/更新の権限を付与し、承認フローと合わせて運用

### 最小権限テンプレ（workflow read + job write）

基本は workflow レベルで read を固定し、**書き込みが必要なジョブだけ**に write を付与します。

```yaml
name: Example
on:
  pull_request:

permissions:
  contents: read

jobs:
  comment_only:
    runs-on: ubuntu-latest
    permissions:
      issues: write
      pull-requests: read
    steps:
      - run: echo "post a comment"
```

### イベント選択の指針（`pull_request` / `workflow_dispatch` / `pull_request_target`）

- `pull_request`（推奨：基本）
  - fork PR では Secrets が渡らない前提で設計する
  - コメント生成など「読み取り系」へ寄せると安全に導入できる
- `workflow_dispatch`（推奨：Secrets/外部操作が必要な場合）
  - 手動実行 + 入力（`base_ref`/`head_ref` 等）で「承認してから走らせる」導線を作る
- `pull_request_target`（原則非推奨：安易な採用は禁止）
  - Secrets を扱える一方、設計を誤ると外部から悪用され得る
  - 使う場合は「何をチェックアウトし、何に Secrets を渡すか」を固定し、監査可能にする

### Secrets 境界（承認境界の作り方）

- Secrets を使う処理（デプロイ/外部 API 呼び出し等）は、Environment 保護（required reviewers）や手動実行に寄せる
- fork PR は「非信頼入力」として扱い、Secrets/外部操作が必要な処理は分離する
- 可能なら「長期 Secrets を避ける（OIDC 等）」へ寄せる（詳細は workflow-book を参照）
  - <https://itdojp.github.io/github-workflow-book/chapters/chapter13/>（13.8）

### 供給網（サプライチェーン）: Actions の固定方針

- 少なくともメジャーバージョン固定（例：`actions/checkout@v5`）
- 可能なら SHA pin（例：`uses: owner/action@<sha>`）を検討し、更新は PR レビュー対象とする
- 更新時は「理由/影響/検証/ロールバック」をセットで残す

## ログ/監査（証跡の残し方）

最低限、次を残します。

- 仕様差分（決定事項）：Issue/PR コメント
- 検証結果：CI の実行ログと Required checks の結果
- 承認：レビュー（誰が/いつ/何を承認したか）

## 供給網（サプライチェーン）設計

Actions の固定方針は上記を前提とし、ここでは運用面を補足します。

- 依存更新は Skill/テンプレに沿って「理由/影響/検証/ロールバック」を揃える
- lockfile を前提に再現性を担保し、不要な差分（フォーマット一括変更等）を避ける

## Rules（allow / prompt / forbidden）との整合

セキュリティは章単体では成立しません。Rules を通じて「承認境界」と一致させます。

- allow：読み取り/検証（lint/test/build 等）
- prompt：Secrets 利用、依存更新、環境変更、破壊的操作の可能性があるもの
- forbidden：Secrets の出力/外部送信、監査性を損なう操作

## 導入チェックリスト（ドラフト）

- [ ] Secrets と権限の境界が運用可能な形で定義されている（最小権限、参照範囲、承認境界）
- [ ] 監査ログ/証跡の保持方針が定義されている（Issue/PR/CI の証跡）
- [ ] 供給網リスクの扱い（Actions/依存更新の変更管理）が定義されている

## 運用チェックリスト（ドラフト）

- [ ] Secrets の棚卸し/ローテーション/漏えい時対応が運用手順になっている
- [ ] Rules（allow/prompt/forbidden）が実態と乖離していない（例外をルールへ還元できている）
