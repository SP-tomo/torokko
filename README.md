# 🛒 Trolley Adventure Engine (アルティメット版)

クイズ番組「ネプリーグ」のトロッコアドベンチャーを再現した、ブラウザベースのゲームエンジンです。
10問構成、3ステージ制、リアルな高画質アセット、ダイナミックな音響・視覚効果を搭載した「大会運営用」の決定版です。

## 🌟 主な特徴

- **10問・3ステージ構成**: 
    - Stage 1: **Cave** (初級)
    - Stage 2: **Jungle** (中級)
    - Stage 3: **Temple/Lava** (上級)
- **極限のリアリティ**: 生成AIにより作成された8K品質の背景アセットと、レールの振動・縦揺れをシミュレートする物理エフェクト。
- **ダイナミック音響**: Web Audio APIによるリアルタイムBGM生成。
- **統合エディタ (Editor)**: 専門知識なしで問題文や背景テーマを編集可能。
- **GitHub Ready**: リポジトリ構成が整っており、すぐに公開可能です。

## 🚀 使い方

1. `npm install`
2. `npm run dev`
3. ブラウザで `http://localhost:5173` を開く

### 🛠 カスタマイズ (管理画面)
- `http://localhost:5173/editor.html` にアクセスすることで、問題を10問分自由に設定できます。
- 設定はブラウザの LocalStorage に保存されるため、ページをリロードしても保持されます。

## 📦 GitHubへの公開手順

このプロジェクトをご自身のGitHubアカウントに公開するには、以下の手順を実行してください：

1. GitHubで新しいリポジトリ（例: `trolley-adventure`）を空の状態で作成します。
2. ターミナルで以下のコマンドを実行します：
   ```bash
   git remote add origin https://github.com/あなたのユーザー名/trolley-adventure.git
   git branch -M main
   git push -u origin main
   ```

## 🎨 素材について
- 背景およびトロッコの画像は生成AIを使用して作成された高品質なオリジナル素材です。
- 音声はプログラムによって動的に生成されているため、権利関係の心配なく利用可能です。

---
Produced by Antigravity (Advanced Agentic Coding AI)
