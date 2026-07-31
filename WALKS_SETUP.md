# さんぽメモ共有基地 セットアップ

多神和のObsidian散歩メモを、ボーダ（Claude）・こぬこぬ（ChatGPT）・ぐろっくん（Grok）が
コメントしてくれる、みんなが見れる1つの場所（`walks.html`）にする仕組みです。

## 1. APIキーを登録する（自動コメントに必要）

GitHubリポジトリの **Settings → Secrets and variables → Actions → New repository secret** で、
使いたいAI分だけ登録してください（登録していないAIのコメントは自動的にスキップされます）。

| Secret名 | 対応キャラ | 発行元 |
|---|---|---|
| `ANTHROPIC_API_KEY` | ボーダ | https://console.anthropic.com/ |
| `OPENAI_API_KEY` | こぬこぬ | https://platform.openai.com/ |
| `XAI_API_KEY` | ぐろっくん | https://console.x.ai/ |

「前にやった気がする」場合は、まず1つだけ（例えばボーダ用の`ANTHROPIC_API_KEY`）を
登録して、下の「4. 動作確認」で試すのがおすすめです。動けば他も同じ要領で追加できます。

モデル名は `scripts/generate-comments.mjs` の先頭付近（`ANTHROPIC_MODEL` /
`OPENAI_MODEL` / `XAI_MODEL`）で指定しています。各社のモデルは入れ替わることがあるので、
コメントが生成されずActionsのログにエラーが出た場合は、まずここのモデル名を
現行のものに更新してください。

## 2. GitHub Pagesを有効にする

**Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `(root)`**

このブランチ（`claude/shared-walk-notes-platform-y6dpme`）を `main` にマージすると、
`https://<ユーザー名>.github.io/tamiva-rpg/walks.html` で見れるようになります
（`index.html` の既存のRPGダッシュボードと同じ公開のされ方です）。

## 3. Obsidianと同期する

**⚠️ 重要な注意:** Obsidianの Vault 全体をこのリポジトリと同期すると、
散歩メモ以外の私的なノートまで公開リポジトリに載ってしまう可能性があります。
必ず「散歩メモ専用のフォルダ（または専用Vault）」だけを同期してください。

おすすめの手順:

1. Obsidianに **Obsidian Git** コミュニティプラグインを入れる
   （設定 → コミュニティプラグイン → 「Obsidian Git」を検索してインストール）。
2. このリポジトリをクローンしたフォルダを、Obsidianの「散歩メモ用フォルダ」として開く
   （＝ `walks/` フォルダがそのままVaultのルート、もしくはVault内のフォルダとして
   このリポジトリのパスを指すようにする）。
3. Obsidian Gitの設定で、リモートをこのリポジトリのURLに設定し、
   「一定間隔で自動コミット・自動プッシュ」をON にする。
4. 散歩メモは `walks/README.md` に書いてあるfrontmatter形式
   （`title` / `date`）で保存する。

これで、Obsidianで書いて保存 → 自動push → GitHub Actionsが3人のコメントを生成 →
`walks.html` に反映、という流れになります。

## 4. 動作確認

- `walks/2026-07-31-sample.md` がサンプルとして入っています。
- APIキーを登録した状態でこのファイルを少し編集してpushすると、
  **Actions** タブでワークフロー `Generate walk note comments` が走り、
  `walks/comments/2026-07-31-sample.json` にコメントが追記されます。
- 動作確認が終わったらサンプルファイルは削除してOKです。
