# Contributing Guide

## 基本方針

- 原稿は `src/` 配下で管理し、`docs/` はビルド成果物として扱います（手編集しない）。
- 章/付録の追加・更新は、必ず `npm test` が通る状態で PR を作成します。
- Issue に受入基準/制約/検証観点が不足している場合は、先に Issue を補強します。

## 執筆ルール（最小）

- 章タイトルは `#` 見出し（H1）を 1 つだけ置く（ビルドがタイトル抽出に使用）。
- 章末に「チェックリスト（導入/運用）」を置き、読者が実務に落とせる形にする。
- 参照リンクは相対リンク（ディレクトリ形式）を優先する。

## 章/付録の配置

- はじめに: `src/introduction/index.md`
- 章: `src/chapters/chapter01/` ... `src/chapters/chapter11/`
- 付録: `src/appendices/appendix-a/` など

## ローカル検証

```bash
npm install
npm test
```

## 画像/アセット

- 画像は `assets/images/` に配置し、`/assets/images/...` で参照します。
- 追加した画像/リンクは `npm run build:validate` で検証します。
