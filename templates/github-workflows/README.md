# GitHub Actions Workflows

このディレクトリには、GitHub Pagesの設定方式に応じた2つのワークフローテンプレートが含まれています。

## ワークフローの選択

### Legacy Pages設定（推奨）
- **ファイル**: `build-legacy.yml`
- **使用場面**: GitHub Pagesで「Deploy from a branch」を選択している場合
- **設定**: Settings > Pages > Source: Deploy from a branch > Branch: main > Folder: /docs
- **特徴**: 
  - シンプルで理解しやすい
  - ビルド後に自動的にdocsディレクトリにコミット
  - 確実に動作する

### GitHub Actions設定
- **ファイル**: `build-actions.yml`  
- **使用場面**: GitHub Pagesで「GitHub Actions」を選択している場合
- **設定**: Settings > Pages > Source: GitHub Actions
- **特徴**:
  - 新しい方式
  - artifact uploadとdeploy jobを分離
  - workflow既定とbuild jobは`contents: read`のみ
  - `pages: write`と`id-token: write`はdeploy jobだけに付与
  - internal PRとfork PRはいずれもread-onlyのbuild jobだけを実行し、artifact uploadとdeploy jobはスキップ
  - より高度な制御が可能

`build-actions.yml`のdeploy条件は、`main`へのpushまたは`main`上の手動実行（`workflow_dispatch`）だけを許可します。
`pull_request`イベントは、fork元にかかわらずbuild jobのbuild確認だけを実行し、Pagesへの書き込みやOIDC tokenの発行を行いません。

両templateのremote Action参照は、監査済みのfull-length commit SHAとexact version commentを組にして管理します。
copy後もmutableなmajor tagへ戻さず、更新時はupstream release/tag/commit、runtime、入出力、権限、transitive `uses:`を確認してください。
本リポジトリでは`config/action-pins.json`を監査記録の正本とし、`npm run test:action-pins`でactive workflowとtemplateのdriftを検出します。
Dependabotがactive workflowのSHAを更新した場合も、template、manifest、version comment、監査証跡を同期するまでmergeしません。
このv5 templateはGitHub.comのPagesを対象とします。GitHub Enterprise Serverで使う場合は、[`actions/deploy-pages`のcompatibility表](https://github.com/actions/deploy-pages#compatibility)でserver versionに対応するrelease lineを確認してください。

## セットアップ手順

1. プロジェクトに`.github/workflows/`ディレクトリを作成
2. 適切なワークフローファイルをコピー
3. GitHub Pagesの設定を確認・変更
4. ワークフローファイルの名前を`build.yml`に変更

## 推奨設定

初回セットアップでは**Legacy設定**を推奨します：

```bash
# .github/workflows/build.yml として配置
cp templates/github-workflows/build-legacy.yml .github/workflows/build.yml
```

## トラブルシューティング

### 404エラーが発生する場合
1. GitHub Pagesの設定を確認
2. ワークフローの実行ログを確認
3. docsディレクトリの内容を確認
4. _config.ymlのbaseurlを確認

### ワークフローが実行されない場合
1. `.github/workflows/`ディレクトリの配置を確認
2. YAMLの構文エラーを確認
3. mainブランチにプッシュされているか確認
