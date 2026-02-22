# 第7章：カスタムエージェント（.agent.md）と MCP（公開範囲）

## この章で扱うこと

- 役割特化エージェント（doc/test/dep 等）の定義
- MCP のツール公開範囲（公開最小化、Secrets 境界、監査）

## カスタムエージェント（.agent.md）の設計

カスタムエージェントは「役割と境界を固定した運用単位」です。
汎用エージェントに全てを任せるのではなく、役割別に最小権限で分離します。

例：

- doc-agent：ドキュメント整備（章間参照、リンク、表記）
- test-agent：テスト追加/修正（診断性、粒度、フレーク対策）
- dep-agent：依存更新（一次情報、影響評価、ロールバック）

`.agent.md` に最低限含める要素（推奨）：

- 役割（何を達成するか）
- スコープ（対象/非対象）
- 実行ポリシー（allow/prompt/forbidden）
- 入力テンプレ（Issue に必要な情報）
- 出力要件（PR に残す証跡）

## MCP（ツール公開範囲）の考え方

MCP の設計は「ツールを増やす」ほど難しくなります。
原則は **公開最小化** と **Secrets 境界** と **監査可能性** です。

- 読み取り：調査に必要な最小限（リポジトリ/Issue/PR/ログ等）
- 書き込み：PR/コメント等に限定し、承認フローと連動させる
- 実行：lint/test/build 等に限定し、allow リストで運用する

Secrets を使う操作（デプロイ、外部 API 呼び出し等）は prompt 扱いとし、承認と証跡を必須にします。

## Companion 資産（参照先）

Companion repo: [itdojp/GitHub-AgentOps-companion](https://github.com/itdojp/GitHub-AgentOps-companion)

- カスタムエージェント雛形: `custom-agents/*/.agent.md`
- MCP 公開範囲設計例: `custom-agents/MCP_SCOPE_EXAMPLE.md`

## 章末チェックリスト（ドラフト）

- [ ] “1体作って運用できる” 雛形がある
- [ ] ツール公開範囲と承認フローが定義されている
