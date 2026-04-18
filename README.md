# 🛒 Trolley Adventure Engine (Ultimate Edition)

クイズ番組「ネプリーグ」のトロッコアドベンチャーを、放送クオリティで完全再現したブラウザベースのゲームエンジンです。
4チーム対抗戦、10問構成の3ステージ制、そしてリアルタイム描画による無限トンネル背景を搭載しています。

## 🌟 公開サイト
- **メインゲーム**: [https://SP-tomo.github.io/torokko/](https://SP-tomo.github.io/torokko/)
- **管理・編集画面**: [https://SP-tomo.github.io/torokko/editor.html](https://SP-tomo.github.io/torokko/editor.html)

## 🚀 主な機能

- **4チーム対抗戦システム**: チームA〜Dのスコア管理、放送風のスコアボード、各チーム個別の問題設定に対応。
- **放送クオリティの演出**:
    - **DirectorQueue**: 緻密に計算されたタイミングでナレーション、テロップ、効果音を同期。
    - **Narrator**: タイプライター演出付きのナレーターシステム。
    - **TelopSystem**: 複数のテロップを美しくスタック表示。
- **無限トンネルエンジン**: 静止画ではなく、Canvas APIを用いたリアルタイム透視投影（パースペクティブ）描画により、極限の疾走感を演出。
- **ダイナミック音源**: Web Audio APIによるシンセサイズ音響。機材なしでドラマチックな演出が可能。

## 🛠 使い方

1. `npm install`
2. `npm run dev`
3. ブラウザで `http://localhost:5173` を開く

### ⚙ 設定とカスタマイズ (Editor)
- `/editor.html` にアクセスすることで、チームごとの問題（全10問）を自由に編集できます。
- **設定タブ**: 制限時間や問題数を一括変更可能です。
- データはブラウザの LocalStorage に保存されるほか、JSONとしてエクスポートして共有も可能です。

## 📦 デプロイについて
GitHub Actions を使用して、`main` ブランチへのプッシュ時に自動的に GitHub Pages へデプロイされるよう設定されています。

---
Produced by Antigravity (Advanced Agentic Coding AI)
