# 第10章：セキュリティ・秘密情報・供給網

## この章で扱うこと

この章では、AgentOps のセキュリティを「Secrets を漏らさない」だけでなく、
イベント選択、最小権限、OIDC、ログ/成果物、push protection、artifact attestations、供給網まで含む運用設計として扱います。

扱う観点は次の通りです。

- fork PR と `pull_request_target` の信頼境界を明確にする
- `GITHUB_TOKEN`、job `permissions:`、environment、OIDC を最小権限で設計する
- Secrets、ログ、artifact、AI/外部サービス投入範囲を review 可能にする
- push protection、secret scanning、content exclusion を「漏えい前提の防御」として組み込む
- Actions / reusable workflow / dependencies / artifact attestations / SBOM を供給網 control として扱う
- 第5章の policy / control surface、第7章の MCP / tool exposure、第9章の継続的 AI pattern と接続する

2026-05-24（Asia/Tokyo）時点の GitHub 公式情報では、`pull_request_target` は base branch（PR のターゲットブランチ）の文脈で動くため、
ラベル付与やコメントには有用ですが、非信頼の PR head を checkout して実行すると write 権限や Secrets への意図しない到達につながるリスクがあります。
本章では、この前提を商用運用の設計ルールに落とします。

## 脅威モデル

AgentOps では、人間、agent、CI、MCP、外部 API が同じ Issue / PR / workflow 上で連携します。
したがって、脅威は単一の機能ではなく、境界のまたぎ方で発生します。

| 脅威 | 典型例 | 最小対策 |
| --- | --- | --- |
| Secrets 漏えい | ログ、PR comment、artifact、AI prompt、MCP tool に token が混入 | push protection、mask、環境分離、rotation runbook |
| 権限逸脱 | `GITHUB_TOKEN` に不要な write、外部 API token の過大 scope | `permissions:`、environment approval、GitHub App / OIDC |
| untrusted input 実行 | fork PR の code / script / prompt を Secrets 付き job で実行 | `pull_request` と `pull_request_target` の分離 |
| prompt injection | Issue / PR / README / dependency docs の指示に agent が誘導される | trusted source 区分、tool allowlist、human gate |
| 供給網改ざん | Action tag の差し替え、dependency update、build artifact の出所不明 | SHA pin、CODEOWNERS、Dependabot、attestations / SBOM |
| 監査不能 | agent が何を読んだか、誰が承認したか、何を出力したか不明 | PR body、review log、workflow run、audit log |

「AI が触るから危険」と抽象化せず、どの入力が非信頼か、どの credential に到達できるか、どの出力が外部へ残るかを分けます。

## fork PR と event selection

fork PR は、外部 contributor の code、workflow、prompt、test data が入る非信頼入力です。
Actions の event は、次のように用途を分けます。

| event / pattern | 使いどころ | credential 境界 | 禁止すること |
| --- | --- | --- | --- |
| `pull_request` | lint / test / build / comment-only review | fork PR では Secrets 不使用を前提にする | deploy、外部 write、機密ログ投入 |
| `pull_request_target` | label、comment、policy check など base repository 文脈の処理 | base branch（PR のターゲットブランチ）側の workflow 定義と権限で動く | PR head を checkout して実行すること |
| `workflow_dispatch` | maintainer 承認後の再実行、release prep、外部 API 呼び出し | 入力値と承認者を記録する | 未検証 ref を Secrets 付きで実行すること |
| `workflow_run` | CI 完了後の二段階処理 | upstream run の結論と head SHA を検証する | 任意 artifact を信頼して実行すること |
| environment approval | deploy、production secret、外部 write | required reviewer 後に secret 到達 | approval なしの自動実行 |

原則は次です。

1. 非信頼入力の build / test は `pull_request` で行う
2. PR comment / label などの base repo write は `pull_request_target` で行ってもよいが、PR head code を実行しない
3. Secrets や外部 write が必要な作業は `workflow_dispatch`、environment approval、または二段階 workflow に分離する
4. どの SHA / ref を対象にしたかをログと PR comment に残す

`pull_request_target` を使う場合の安全側の設計例は、PR 本文や changed files のメタデータだけを読み、
ラベル付与や注意コメントに限定することです。危険な設計例は、PR head を checkout し、Secrets を持つ job で script / test / build を実行することです。

## `GITHUB_TOKEN` と least privilege

GitHub Actions では、job ごとに `GITHUB_TOKEN` の権限を調整できます。
ワークフロー全体では read を既定にし、書き込みが必要な job だけに明示的に write を付与します。

```yaml
permissions: read-all

jobs:
  comment:
    permissions:
      contents: read
      pull-requests: read
      issues: write
```

設計時の確認項目は次です。

| 操作 | 最小権限の考え方 | 追加 gate |
| --- | --- | --- |
| checkout / test | `contents: read` | fork PR で Secrets なし |
| PR comment | `issues: write` または用途に応じた最小 write | bot comment upsert、noise review |
| PR review comment | `pull-requests: write` が必要か確認 | Copilot / human review と分離 |
| artifact attestation | `id-token: write`、`attestations: write` | release / build owner review |
| package publish | `packages: write` | environment approval、tag / release gate |
| cloud deploy | OIDC + cloud 側 condition | environment required reviewers |

権限を増やす PR では、PR body に「なぜ必要か」「どの job だけか」「どの event で動くか」「rollback 方法」を書きます。
`.github/workflows/**`、`.github/actions/**`、agent / MCP config は CODEOWNERS と required review に接続します。

## Secrets と OIDC

Secrets は、値そのものだけでなく、派生値、ログ断片、base64 / URL encode 後の値、生成した JWT も漏えい対象です。
マスクは補助であり、漏えい防止を保証しません。

運用ルールは次です。

- repository secret より environment secret を優先し、required reviewers を設定する
- production secret は PR event から直接参照しない
- secret を使う job は `permissions:`、event、checkout ref、artifact 出力を同時に review する
- secret を変換して使う場合は、派生値も mask / 登録対象として扱う
- 漏えい疑い時は、ログ削除より先に rotation / revoke / impact assessment を行う
- cloud provider が OIDC をサポートする場合は、長期 cloud secret ではなく短期 token を優先する

OIDC は、GitHub Actions job が cloud provider へ短期 token を要求する設計です。
ただし、OIDC を使うだけで安全になるわけではありません。
cloud 側の trust policy で repository、branch、environment、workflow、subject claim を絞り、
`id-token: write` を必要な job だけに付与します。

## AI / MCP / 外部サービス投入境界

AgentOps では、Issue、PR、diff、CI log、artifact、stack trace、dependency advisory が AI や外部サービスへ渡り得ます。
Secrets でなくても、顧客名、未公開仕様、脆弱性情報、インシデント詳細は機微情報です。

| 投入対象 | 許可条件 | 禁止/要承認 |
| --- | --- | --- |
| Issue / PR 本文 | public / internal で共有可能な内容 | 顧客固有情報、未公開障害、credential 断片 |
| diff / source | provider policy と content exclusion を確認 | secret file、private key、生成済み credential |
| CI log | redaction 済み、必要範囲のみ | env dump、debug trace、token 断片 |
| artifact / cache | retention と共有先が明確 | `.env`、credential store、個人情報入り report |
| MCP read | data boundary と用途を記録 | customer tenant / billing / audit log の無制限 read |
| MCP write | owner approval、rollback、audit log | production 変更、ticket 一括更新、外部通知の自動実行 |

Copilot content exclusion は、特定ファイルを Copilot の参照対象から外す設計に使えます。
ただし、対応範囲や制限は tool により異なるため、content exclusion を唯一の防御にしません。
機密ファイルは repository に置かない、Secrets に移す、権限で分離する、review で確認する、という基本線を優先します。

## push protection と secret scanning

push protection は、secret が repository 履歴へ入る前に止めるための frontline control です。
AgentOps では、人間だけでなく agent や GitHub MCP server 経由の変更も考慮し、次を運用ルールにします。

- push protection を repository / organization の標準にする
- bypass は「例外」ではなく security event として扱い、理由と承認者を残す
- `It's used in tests` や false positive でも、実値でないことを reviewer が確認する
- `I'll fix it later` は open alert として扱い、期限付きで rotation / remediation を追跡する
- custom secret pattern を organization 固有 token / customer identifier に合わせて検討する
- 既存履歴の secret scanning alert は、rotation、revoke、影響範囲、通知判断までを runbook 化する

push protection は検出可能な pattern に依存するため、万能ではありません。
PR review、content exclusion、artifact 除外、ログ確認、環境分離と併用します。

## 供給網 security

AgentOps の供給網は、AI が生成するコードだけでなく、workflow、actions、dependencies、build artifact、release asset を含みます。

| 対象 | control | review 観点 |
| --- | --- | --- |
| third-party actions | SHA pin、trusted publisher、CODEOWNERS | action の権限、外部通信、更新理由 |
| reusable workflows | 呼び出し元/呼び出し先の permissions | secret inheritance、OIDC、artifact 出力 |
| dependencies | lockfile、Dependabot、security updates | transitive update、license、breaking change |
| generated artifacts | retention、checksum、attestation | どの workflow / SHA / event で生成されたか |
| container images | digest pin、SBOM、provenance | base image、registry 権限、scan 結果 |
| releases | protected tag、attestation verify | 誰が承認し、どの artifact を出したか |

GitHub の secure use reference では、Action を full-length commit SHA に pin することが最も immutable な参照として説明されています。
一方で、SHA pin は更新運用の負荷を増やすため、重要 workflow から段階導入します。
更新は Dependabot / Renovate 等で PR 化し、理由、影響、検証、rollback をセットで review します。

### Action SHA pin の更新契約

full-length SHA は、version tagをコメントに残しただけでは監査済みになりません。更新PRでは次の順序を守ります。

1. upstreamのofficial releaseとexact version tagを確認し、tagとmajor aliasをcommitまでdereferenceする
2. candidate commit、署名・verification、`action.yml`、runtime、入力・出力・権限、transitive `uses:`、changelogを確認する
3. active workflowと配布templateを同じ監査済みSHAへ同期し、human-readableなexact version commentを併記する
4. `config/action-pins.json`へ確認日、release URL、SHAを記録する
5. `npm run test:action-pins`、`actionlint`、repository CI、template smokeを実行する
6. 問題があれば、直前の監査済みSHAへ戻し、失敗条件と再開条件を更新PRへ残す

Dependabotの`github-actions`更新は監査開始の通知であり、自動承認ではありません。
active workflowだけが自動更新されてtemplateやmanifestと不一致になった場合、pin gateを失敗させ、監査と同期が終わるまでmergeしません。
mutableなmajor tagへ戻してCIだけを通す運用は、供給網の再現性を失うため禁止します。

## artifact attestations / SBOM

release artifact、container image、CLI binary、重要な build output は、artifact attestations で provenance を残します。
attestation は、どの repository、workflow、commit SHA、event、environment から生成されたかを検証するための証跡です。

導入順序は次です。

1. release 対象 artifact を定義する
2. build workflow に `id-token: write`、`contents: read`、`attestations: write` を付与する
3. artifact 生成後に attestation を作成する
4. release 前または deploy 前に `gh attestation verify` で検証する
5. SBOM が必要な artifact は SPDX / CycloneDX 等の predicate と合わせて保管する
6. attestation の retention / lifecycle を運用に入れる

artifact attestations は「脆弱性をなくす」機能ではなく、どこでどのように作られたかを検証可能にする機能です。
scan、review、approval、rollback と組み合わせて supply chain risk を下げます。

## ログ / artifact / audit の証跡設計

AgentOps の証跡は、後から説明できる単位で残します。

| 証跡 | 残す内容 | 残してはいけない内容 |
| --- | --- | --- |
| Issue | scope、受け入れ条件、security boundary | secret 値、顧客固有の生ログ |
| PR body | 変更理由、権限変更、検証、残リスク | credential、private incident detail |
| review comment | 採否理由、例外承認、rollback | token 断片、内部監査ログの全文 |
| workflow log | command、exit code、artifact path | env dump、secret 派生値 |
| artifact | report、summary、attestation、SBOM | `.env`、credential file、raw customer data |
| audit log | secret / policy / runner / app 変更 | 外部に再掲できない機密詳細 |

ログ確認は CI が通った後の補助ではなく、security review の一部です。
特に AI / MCP / external API を使う workflow では、成功時と失敗時のログを確認し、Secrets が出ないことを検証します。

## Policy / control surface との接続

第5章の allow / prompt / forbidden は、セキュリティ境界へ落とし込みます。

| 分類 | 例 | control surface |
| --- | --- | --- |
| allow | read-only checkout、lint、unit test、public docs link check | `pull_request`、`permissions: read-all` |
| prompt | PR comment、dependency update、artifact upload、MCP read | CODEOWNERS、review checklist、budget owner |
| prompt + approval | deploy、external write、OIDC、package publish | environment required reviewers、workflow_dispatch |
| forbidden | secret 出力、fork PR で Secrets 使用、untrusted code を `pull_request_target` で実行 | ruleset、branch protection、workflow review |

この表は、AGENTS.md や PR template に転記できる運用ルールとして扱います。
例外が発生した場合は、例外を個別承認で終わらせず、policy matrix と runbook を更新します。

## 公式情報の確認先

2026-05-24（Asia/Tokyo）時点で、本章の用語整理に使う主な一次情報は次です。
GitHub Actions の event、permissions、OIDC、attestation、secret scanning、Copilot content exclusion の仕様は変わり得るため、導入時は最新ページを確認してください。

- GitHub Docs: [Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)
- GitHub Docs: [Events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
- GitHub Docs: [Workflow syntax for GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- GitHub Docs: [GITHUB_TOKEN](https://docs.github.com/en/actions/concepts/security/github_token)
- GitHub Docs: [OpenID Connect](https://docs.github.com/en/actions/concepts/security/openid-connect)
- GitHub Docs: [Using artifact attestations to establish provenance for builds](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations)
- GitHub Docs: [About push protection](https://docs.github.com/en/code-security/concepts/secret-security/about-push-protection)
- GitHub Docs: [Content exclusion for GitHub Copilot](https://docs.github.com/en/copilot/concepts/context/content-exclusion)

## 導入チェックリスト

- [ ] `pull_request`、`pull_request_target`、`workflow_dispatch`、environment approval の使い分けが定義されている
- [ ] `GITHUB_TOKEN` は workflow 既定 read、job 単位で必要最小 write になっている
- [ ] Secrets を使う job は event、checkout ref、artifact、ログ、外部送信先を同時に review している
- [ ] OIDC を使う cloud 操作は、cloud 側 trust policy と GitHub 側 `id-token: write` の両方を絞っている
- [ ] push protection / secret scanning / custom patterns / bypass review の運用がある
- [ ] Actions / reusable workflows / dependencies の更新が CODEOWNERS と PR review に乗っている
- [ ] release artifact / container image には必要に応じて attestation / SBOM / verify 手順がある
- [ ] AI / MCP / 外部サービスへ投入しない情報分類と、content exclusion の適用範囲を確認している

## 運用チェックリスト

- [ ] Secrets の棚卸し、rotation、漏えい時初動、通知判断が runbook 化されている
- [ ] `pull_request_target` を使う workflow が、PR head code を Secrets 付きで実行していない
- [ ] workflow 変更、permission 変更、runner / environment / GitHub App 変更が監査ログで追跡できる
- [ ] AI / MCP / Codex Action のログと artifact に secret / personal data / customer data が混入していない
- [ ] dependency / action 更新 PR には、理由、影響、検証、rollback が記載されている
- [ ] supply chain incident 時に、該当 artifact の workflow run、commit SHA、attestation、SBOM を追跡できる

## まとめ

AgentOps の security は、AI 利用を止めることではなく、信頼境界を明確にして安全に委譲することです。
fork PR、event、token、Secrets、OIDC、artifact、MCP、供給網を分けて設計し、
どの入力を信頼し、どの credential に到達でき、どの出力を残すかを PR で review 可能にします。
この境界が明確であれば、継続的 AI や agent PR を導入しても、商用運用に必要な監査性と rollback を維持できます。
