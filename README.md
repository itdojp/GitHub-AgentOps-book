# GitHub AgentOps 実践ガイド（Codex中心）

本リポジトリは、GitHub 上で AI エージェント（Codex 等）を運用するための「運用設計（Ops）」を、テンプレートと手順として体系化する書籍プロジェクトです。

## クイックスタート

前提: Node.js `20` 以上（推奨: `>=22`）

```bash
npm install
npm run build
npm run preview
```

- `npm run build` は `docs/` に GitHub Pages 用の成果物を生成します。
- `npm run preview` は `http://localhost:8080` でプレビューします。

## ディレクトリ構成（抜粋）

- `src/`: 原稿（章/付録）
- `docs/`: ビルド成果物（GitHub Pages 用）
- `templates/`: ビルド時にコピーするデザイン/レイアウト資産
- `scripts/`: ビルド/リンク検証

## 品質ゲート（ローカル）

```bash
npm test
```

実行内容:

- Markdown lint
- ビルド（`docs/` 生成）
- `docs/` に対する内部リンク検証

## オンライン版

- GitHub Pages: https://itdojp.github.io/GitHub-AgentOps-book/
- 公開設定（他書籍と同様）: Settings > Pages > Source: Deploy from a branch / Branch: `main` / Folder: `/docs`

## リリース（v1.0 準備）

- 変更履歴: `CHANGELOG.md`
- 検証記録: `CHECKLIST.md`

タグ/リリースノート（GitHub Release）は Issue #17 で確定します。

## 更新ポリシー（四半期棚卸し）

- 四半期ごとに、Agents/MCP/課金/リンク切れ/サンプル整合を点検します。
- Issue テンプレ: `.github/ISSUE_TEMPLATE/quarterly-review.yml`

## 進捗管理

- Epic: #1
- 実行計画（ロードマップ）: #18
- 企画書: `BOOK-PROPOSAL.md`
