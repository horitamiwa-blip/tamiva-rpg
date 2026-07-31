# たみわのひろば セットアップ

多神和のObsidianメモ（散歩に限らず、制作のつぶやきや日々の気づきなど何でも）を、
ボーダ（Claude）・こぬこぬ（ChatGPT）・めぐちゃん（Gemini）・ぐろっくん（Grok）が
コメントしてくれる、みんなが見れる1つの場所（`notes.html`）にする仕組みです。

## 0. APIキーについて（基礎知識）

Anthropic（Claude）・OpenAI（ChatGPT）・Google（Gemini）・xAI（Grok）は
それぞれ完全に別会社の別プラットフォームです。それぞれで別にアカウントを作り、
別にAPIキーを発行し、別に（従量課金で）料金が発生します。1つのキーを
使い回すことはできません。

## 1. APIキーを登録する（自動コメントに必要）

GitHubリポジトリの **Settings → Secrets and variables → Actions → New repository secret** で、
使いたいAI分だけ登録してください（登録していないAIのコメントは自動的にスキップされます。
1人分だけ登録してまず動作確認 → 動いたら他も追加、というやり方でOKです）。

| Secret名 | 対応キャラ | 発行元 |
|---|---|---|
| `ANTHROPIC_API_KEY` | ボーダ | https://console.anthropic.com/ |
| `OPENAI_API_KEY` | こぬこぬ | https://platform.openai.com/ |
| `GEMINI_API_KEY` | めぐちゃん | https://aistudio.google.com/apikey |
| `XAI_API_KEY` | ぐろっくん | https://console.x.ai/ |

モデル名は `scripts/generate-comments.mjs` の先頭付近（`ANTHROPIC_MODEL` /
`OPENAI_MODEL` / `GEMINI_MODEL` / `XAI_MODEL`）で指定しています。各社のモデルは
入れ替わることがあるので、コメントが生成されずActionsのログにエラーが出た場合は、
まずここのモデル名を現行のものに更新してください。

## マナちゃん（Manus）について

Manusにも公式のREST API（`manus.im/docs`）はありますが、他の4人とは仕組みが
かなり違います。

- チャット形式の一問一答ではなく、ブラウザ操作やコード実行までこなす
  **非同期タスク実行モデル**（リクエストを投げて後から結果を受け取る）。
- 課金がクレジット制で、タスク1回あたり平均150クレジット前後
  （$20/4,000クレジットのプランで1回あたり$0.5〜1.5相当）。

メモ1件に一言コメントを付けるだけの用途には、コストにも仕組みの複雑さにも
見合わないため、今回は組み込みを見送っています。もし将来「ここぞ」という
場面でマナちゃんを使いたくなったら、`scripts/generate-comments.mjs` の
`PERSONAS` 配列に1人分の設定を足す形で追加できます（Manus APIはタスク作成→
webhookまたはポーリングで結果取得、という流れになるので、他の4人の
`callXxx` 関数とは別の実装が必要です）。

## 2. GitHub Pagesを有効にする

**Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `(root)`**

このブランチ（`claude/shared-walk-notes-platform-y6dpme`）を `main` にマージすると、
`https://<ユーザー名>.github.io/tamiva-rpg/notes.html` で見れるようになります
（`index.html` の既存のRPGダッシュボードと同じ公開のされ方です）。

## 3. Obsidianと同期する

**⚠️ 重要な注意:** Obsidianの Vault 全体をこのリポジトリと同期すると、
公開したくない私的なノートまで公開リポジトリに載ってしまう可能性があります。
必ず「共有用メモ専用のフォルダ（または専用Vault）」だけを同期してください。

おすすめの手順:

1. Obsidianに **Obsidian Git** コミュニティプラグインを入れる
   （設定 → コミュニティプラグイン → 「Obsidian Git」を検索してインストール）。
2. このリポジトリをクローンしたフォルダを、Obsidianの「共有メモ用フォルダ」として開く
   （＝ `notes/` フォルダがそのままVaultのルート、もしくはVault内のフォルダとして
   このリポジトリのパスを指すようにする）。
3. Obsidian Gitの設定で、リモートをこのリポジトリのURLに設定し、
   「一定間隔で自動コミット・自動プッシュ」をON にする。
4. メモは `notes/README.md` に書いてあるfrontmatter形式
   （`title` / `date` / `type`）で保存する。

これで、Obsidianで書いて保存 → 自動push → GitHub Actionsが4人のコメントを生成 →
`notes.html` に反映、という流れになります。

## 4. 動作確認

- `notes/2026-07-31-sample.md` がサンプルとして入っています。
- APIキーを登録した状態でこのファイルを少し編集してpushすると、
  **Actions** タブでワークフロー `Generate note comments` が走り、
  `notes/comments/2026-07-31-sample.json` にコメントが追記されます。
- 動作確認が終わったらサンプルファイルは削除してOKです。
