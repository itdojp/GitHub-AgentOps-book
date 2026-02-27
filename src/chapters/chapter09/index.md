# 第9章：Codex GitHub Action で継続的 AI

## この章で扱うこと

- PR 時の要約/リスク抽出、リリース前のチェック等の自動化例
- 自動化範囲と人間承認の境界

## Companion 資産（参照先）

Companion repo: [itdojp/GitHub-AgentOps-companion](https://github.com/itdojp/GitHub-AgentOps-companion)

- PR 作成/更新時の要約 + リスク抽出コメント: `.github/workflows/codex-pr-review.yml`
- リリース前の変更点サマリ/影響範囲/チェックリスト生成: `.github/workflows/codex-release-prep.yml`
- Codex Action 用プロンプト雛形: `.github/codex/prompts/`

## 自動化レベルの設計（最小）

「CI に組み込む」は、いきなり自動修正に寄せる必要はありません。
最小の導入は **コメント生成（読み取り）** で、次に **提案（パッチ）**、最後に **自動適用** を検討します。

- コメント生成：PR 要約、リスク抽出、推奨テスト（人間レビューの補助）
- 提案：修正案を PR に積む（マージは人間）
- 自動適用：原則推奨しない（権限/監査/責任の観点で難易度が高い）

## サンプルの読み方（何が担保されるか）

Companion のサンプルは、次を前提にしています。

- Secrets と権限は最小化する（例：PR コメント投稿に必要な最小権限のみ）
- 実行範囲は絞る（例：非 Draft、手動実行、`concurrency` で多重実行を抑止）
- プロンプトインジェクションを前提に「信頼しない」指示を書く

## 最小実装：PR要約 + リスク抽出（コメント生成）

最初の導入は「自動修正」ではなく **コメント生成（読み取り）** が安全です。Companion の `codex-pr-review.yml` は、PRごとに要約/リスク/推奨テストを生成し、PRコメントを upsert（更新）します。

- 全文： https://github.com/itdojp/GitHub-AgentOps-companion/blob/main/.github/workflows/codex-pr-review.yml

抜粋（重要部分のみ）：

{% raw %}

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]

concurrency:
  group: codex-pr-review-${{ github.event.pull_request.number }}
  cancel-in-progress: true

permissions:
  contents: read
  pull-requests: read
  issues: write

jobs:
  run_codex:
    runs-on: ubuntu-latest
    if: ${{ !github.event.pull_request.draft }}
    steps:
      - name: Guard (require OPENAI_API_KEY)
        id: guard
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          if [ -z "${OPENAI_API_KEY}" ]; then
            echo "has_key=false" >> "$GITHUB_OUTPUT"
            echo "OPENAI_API_KEY is not set; skipping Codex steps."
          else
            echo "has_key=true" >> "$GITHUB_OUTPUT"
          fi

      - name: Checkout PR merge ref
        if: ${{ steps.guard.outputs.has_key == 'true' }}
        uses: actions/checkout@v5
        with:
          ref: refs/pull/${{ github.event.pull_request.number }}/merge

      - name: Run Codex
        if: ${{ steps.guard.outputs.has_key == 'true' }}
        uses: openai/codex-action@v1
        with:
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
          sandbox: read-only
          safety-strategy: drop-sudo
```

{% endraw %}

設計意図（ガードレール）：

- **Draft PR を除外**し、レビューに乗る段階だけで実行する
- `concurrency` で多重起動を抑止し、コスト/ノイズを制御する
- `OPENAI_API_KEY` が無い場合は **失敗にせずスキップ**（fork PR では Secrets が渡らない前提のため）
- `refs/pull/<n>/merge` をチェックアウトし、**マージ後の姿**で差分/リスクを評価できるようにする

## 最小実装：リリース前準備（手動実行）

リリース前に「変更点サマリ/影響範囲/チェックリスト」を作る用途は、**手動実行（`workflow_dispatch`）** に寄せるのが安全です。

- 全文： https://github.com/itdojp/GitHub-AgentOps-companion/blob/main/.github/workflows/codex-release-prep.yml

抜粋（重要部分のみ）：

{% raw %}

```yaml
on:
  workflow_dispatch:
    inputs:
      base_ref:
        description: "比較元（例: v1.2.3）。空なら直近タグを自動選択（タグが無い場合は初回コミット）"
        required: false
      head_ref:
        description: "比較先（例: main, SHA）。空なら実行時の SHA"
        required: false

permissions:
  contents: read

jobs:
  run_codex:
    runs-on: ubuntu-latest
    steps:
      - name: Determine diff range
        id: range
        run: |
          head_ref="${{ github.event.inputs.head_ref }}"
          base_ref="${{ github.event.inputs.base_ref }}"
          # base_ref が空なら「直近タグ」→無ければ初回コミットへフォールバック
```

{% endraw %}

設計意図（ガードレール）：

- リリース系は自動化より先に、**手動実行 + 生成物（job summary / artifact）**で検証できる導線を作る
- 差分範囲は「タグが無い」ケースを考慮し、フォールバックを用意する（初回リリースで詰まらない）

## 運用ガードレール（本文で固定する判断基準）

- 自動適用（自動コミット/自動マージ）は原則しない（監査/責任/例外運用が難しい）
- `pull_request_target` への安易な置換は推奨しない（Secrets/信頼境界の事故リスクが高い）
- fork PR は「非信頼入力」として扱い、Secrets/外部操作が必要な処理は設計として分離する
  - 同一リポジトリブランチのみ実行
  - 手動実行（`workflow_dispatch`）
  - ラベル運用/承認後実行 など

## 人間承認に残す境界（推奨）

- マージ/リリースは人間が実施（承認ログを残す）
- Secrets を使う操作（デプロイ、外部 API 呼び出し等）は承認必須
- 破壊的操作（大量削除、force push、環境変更）は承認必須

## 導入チェックリスト（ドラフト）

- [ ] 最小構成で動作するワークフローがある（PR コメント/リリース前チェック等）
- [ ] Secrets/権限/実行範囲の注意が明記されている（最小権限、フォーク PR の扱い等）

## 運用チェックリスト（ドラフト）

- [ ] 自動化の停止線（人間承認に残す境界）が運用できている
- [ ] コスト/実行頻度のガードレール（`concurrency`、手動実行、対象絞り）が運用できている
