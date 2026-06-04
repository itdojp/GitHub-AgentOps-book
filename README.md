# GitHub AgentOps 実践ガイド

AIエージェント駆動開発のための運用設計

- English Title: GitHub AgentOps Practical Guide
- English Subtitle: Ops Design for AI Agent-Driven Development

本リポジトリは、GitHub 上で AI エージェントを運用するための「運用設計（Ops）」を、テンプレートと手順として体系化する書籍プロジェクトです。

主要な対象は Copilot cloud agent、Copilot code review、third-party agents（OpenAI Codex 等）、Copilot CLI、Codex CLI / Codex Action です。特定の実行方式だけを正解にせず、責任分界、権限、レビュー、CI、セキュリティ、コスト、メトリクスを組み合わせて扱います。

## クイックスタート

前提: Node.js `20` 以上（推奨: `>=22`）

```bash
npm install
npm run build
npm run preview
```

- `npm run build` は `docs/` に GitHub Pages 用の成果物を生成します。
- `npm run preview` は `http://localhost:8080` でプレビューします。
- `npm run check-external-links` は、リリース前や最終整合性確認で外部リンクを検査します。
- DNS 制限のある環境では `EXTERNAL_LINK_CHECK_SKIP_HOSTS=example.com,example.org npm run check-external-links` のようにホスト単位で除外できます。

## ディレクトリ構成（抜粋）

- `src/`: 原稿（章/付録）
- `docs/`: ビルド成果物（GitHub Pages 用）
- `templates/`: ビルド時にコピーするデザイン/レイアウト資産
- `scripts/`: ビルド/リンク検証

## 品質ゲート（ローカル）

```bash
npm run check:metadata
npm test
```

実行内容:

- メタデータ / ナビゲーション整合性検証
- Markdown lint
- ビルド（`docs/` 生成）
- `docs/` に対する内部リンク検証

## オンライン版

- GitHub Pages: https://itdojp.github.io/GitHub-AgentOps-book/
- 公開設定（他書籍と同様）: Settings > Pages > Source: Deploy from a branch / Branch: `main` / Folder: `/docs`

## 検証とリリース準備

- 変更履歴: `CHANGELOG.md`
- 検証記録: `CHECKLIST.md`
- 最終整合性では `npm test`、`npm run check-external-links`、GitHub Pages smoke を確認します。

## 更新ポリシー（四半期棚卸し）

- 四半期ごとに、Copilot / cloud agent / custom agents / hooks / MCP / Codex / 課金 / リンク切れ / Companion サンプル整合を点検します。
- Issue テンプレ: `.github/ISSUE_TEMPLATE/quarterly-review.yml`

## 進捗管理

- 企画書: `BOOK-PROPOSAL.md`
- 検証記録: `CHECKLIST.md`
- 大規模改稿や四半期棚卸しは GitHub Issues で追跡します。

## ライセンス

CC BY-NC-SA 4.0（商用は別契約）

- 詳細: `LICENSE.md`
