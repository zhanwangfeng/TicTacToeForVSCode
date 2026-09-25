# TicTacToe for VS Code

[![VS Marketplace](https://vsmarketplacebadges.dev/version-short/zhanwangfeng.tictactoe-vscode.svg)](https://marketplace.visualstudio.com/items?itemName=zhanwangfeng.tictactoe-vscode)
[![Installs](https://vsmarketplacebadges.dev/installs/zhanwangfeng.tictactoe-vscode.svg)](https://marketplace.visualstudio.com/items?itemName=zhanwangfeng.tictactoe-vscode)

在 VS Code 中直接游玩井字棋（Tic-Tac-Toe）的扩展插件，内置 Webview 棋盘，不离开编辑器即可与电脑对战。

- GitHub: https://github.com/zhanwangfeng/TicTacToeForVSCode
- VSCode: https://marketplace.visualstudio.com/items?itemName=zhanwangfeng.tictactoe-vscode

## 游戏截图

![游戏截图](resources/shortcut_001.png)

## 1. 插件说明

- **入口**：活动栏「TicTacToe」侧栏，或命令面板执行 `TicTacToe: 打开游戏`。
- **主要特性**：
  - 难度 / 玩法 / 先手统一在棋盘内「游戏设置」弹层调整，确认后立即生效（切换先手或玩法会自动重开一局）。
  - 侧栏只保留入口与常用操作：打开游戏、重新开始、音效开关，以及只读的「当前设置」。
  - 设置持久化：难度 / 先手 / 玩法与音效开关都会保存，下次打开自动沿用。
  - 胜 / 负 / 平 计分；落子、胜负、消失均有 Web Audio 合成音效（无需音频文件）。
- **规则简介**：
  - **普通**：经典 3x3 井字棋，你执 X 先手，电脑执 O，三连即胜。
  - **超级**：双方各最多保留 3 子，落子后超出的最旧一子会高亮并消失。
  - **终极**：9 个小棋盘拼成大九宫，你落在某盘第几格，对手下一手就必须落在对应位置的大盘；赢下 3 个小棋盘连成一线即获胜。

## 2. 插件启动说明

### 方式一：VS Code 插件市场安装（推荐）

1. 打开 VS Code，进入扩展市场（快捷键 `Cmd/Ctrl + Shift + X`）。
2. 搜索 **`TicTacToe`**（或本插件发布名 `tictactoe-vscode`），点击 **安装**。
3. 安装完成后，点击活动栏的 **TicTacToe** 图标打开侧栏，点击「打开游戏」即可开始；或按 `Cmd/Ctrl + Shift + P` 执行命令 **`TicTacToe: 打开游戏`**。
4. 点击棋盘顶部设置条可调整难度 / 先手 / 玩法，或点击「重新开始」重开一局。

> 安装后若命令/视图未出现，可重启 VS Code 重新加载扩展。

### 方式二：本地源码调试运行（F5）

适用于从源码二次开发或本地预览：

1. 安装依赖：

   ```bash
   npm install
   ```

2. 使用 VS Code 打开本项目根目录，按 **F5** 启动调试。
   - 调试前会自动编译 TypeScript（`src` → `out`）并后台监听改动。
   - VS Code 会打开一个新的「扩展开发宿主」窗口。
3. 在扩展开发窗口中，点击活动栏 **TicTacToe** 图标点击「打开游戏」，或执行命令 **`TicTacToe: 打开游戏`**。

### 其他编译方式

- 单次编译：`npm run compile`
- 监听编译：`npm run watch`（调试时修改代码自动重新编译，重跑命令即生效）
- 打包发布：`npm run package`（自动先执行 `vscode:prepublish` 编译，生成带版本号的 .vsix）

## 3. 目录结构

```
src/
├── extension.ts          # 插件入口：侧栏 TreeView + Webview 面板 + 设置持久化（由 Webview 回传存盘）
└── webview/
    └── game.html         # 游戏页面（由 demo/index.html 移植，去掉广告与统计）
resources/
└── icon.png              # 插件图标
demo/
└── index.html            # 网页版原始实现（离线预览用）
```
