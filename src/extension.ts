import * as vscode from 'vscode';
import * as fs from 'fs';
import { LanMultiplayer } from './common';

type Difficulty = 'easy' | 'normal' | 'hard';
type Mode = 'normal' | 'super' | 'ultimate';

/** 联机房间固定端口（局域网 1v1），可在防火墙中放行。 */
const MULTI_PORT = 18901;

interface Options {
  difficulty: Difficulty;
  humanFirst: boolean;
  mode: Mode;
}

const OPT_KEY = 'tictactoe.options';
const SOUND_KEY = 'tictactoe.soundOn';

const DIFF_LABEL: Record<Difficulty, string> = { easy: '简单', normal: '普通', hard: '困难' };
const MODE_LABEL: Record<Mode, string> = { normal: '普通', super: '超级', ultimate: '终极' };

const DEFAULT_OPTIONS: Options = { difficulty: 'normal', humanFirst: true, mode: 'normal' };

function getOptions(ctx: vscode.ExtensionContext): Options {
  const saved = ctx.globalState.get<Partial<Options>>(OPT_KEY);
  return {
    difficulty: saved?.difficulty ?? DEFAULT_OPTIONS.difficulty,
    humanFirst: typeof saved?.humanFirst === 'boolean' ? saved.humanFirst : DEFAULT_OPTIONS.humanFirst,
    mode: saved?.mode ?? DEFAULT_OPTIONS.mode
  };
}
function getSoundOn(ctx: vscode.ExtensionContext): boolean {
  return ctx.globalState.get<boolean>(SOUND_KEY, true);
}

// ---------- TreeView 节点 ----------
// 难度 / 玩法 / 先手全部在 Webview 的「游戏设置」里调整，侧栏只保留入口、重开与音效开关
type TreeNode = { id: string; label: string; description?: string; command: string };

function buildRoot(ctx: vscode.ExtensionContext): TreeNode[] {
  const opt = getOptions(ctx);
  return [
    { id: 'open', label: '打开游戏', description: '开始一局', command: 'tictactoe.open' },
    { id: 'restart', label: '重新开始', description: '重开当前局', command: 'tictactoe.restart' },
    {
      id: 'sound',
      label: '音效开关',
      description: getSoundOn(ctx) ? '开' : '关',
      command: 'tictactoe.toggleSound'
    },
    {
      id: 'opts',
      label: '当前设置',
      description: `${DIFF_LABEL[opt.difficulty]} · ${opt.humanFirst ? '你先手' : '电脑先'} · ${MODE_LABEL[opt.mode]}`,
      command: 'tictactoe.open'
    },
    {
      id: 'multiCreate',
      label: '联机：创建房间',
      description: `端口 ${MULTI_PORT}`,
      command: 'tictactoe.multiCreate'
    },
    {
      id: 'multiJoin',
      label: '联机：加入房间',
      description: '输入 IP:端口',
      command: 'tictactoe.multiJoin'
    }
  ];
}

class TicTacToeTreeDataProvider implements vscode.TreeDataProvider<TreeNode> {
  constructor(private context: vscode.ExtensionContext) {}

  private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  refresh() { this._onDidChangeTreeData.fire(undefined); }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
    item.id = element.id;
    item.description = element.description;
    item.command = { command: element.command, title: element.label };
    item.iconPath = new vscode.ThemeIcon(
      element.id === 'open' ? 'play-circle' :
      element.id === 'restart' ? 'refresh' :
      element.id === 'opts' ? 'settings-gear' :
      element.id === 'multiCreate' ? 'radio-tower' :
      element.id === 'multiJoin' ? 'sign-in' : 'unmute'
    );
    item.tooltip = element.description ? `${element.label} · ${element.description}` : element.label;
    return item;
  }

  getChildren(): TreeNode[] {
    return buildRoot(this.context);
  }
}

let panel: vscode.WebviewPanel | undefined;
let provider: TicTacToeTreeDataProvider | undefined;
let multi: LanMultiplayer | undefined;

// 读取 src/webview/game.html，用扩展保存的选项覆盖默认值后作为 webview 内容
function getWebviewContent(context: vscode.ExtensionContext): string {
  const htmlPath = vscode.Uri.joinPath(context.extensionUri, 'src', 'webview', 'game.html');
  const html = fs.readFileSync(htmlPath.fsPath, 'utf-8');
  const opt = getOptions(context);

  return html
    .replace("difficulty = 'normal';", `difficulty = ${JSON.stringify(opt.difficulty)};`)
    .replace('humanFirst = true;', `humanFirst = ${JSON.stringify(opt.humanFirst)};`)
    .replace("mode = 'normal';", `mode = ${JSON.stringify(opt.mode)};`)
    .replace('let soundOn = true;', `let soundOn = ${JSON.stringify(getSoundOn(context))};`);
}

function openGame(context: vscode.ExtensionContext) {
  if (panel) {
    panel.reveal(vscode.ViewColumn.One);
    panel.webview.postMessage({ type: 'setSound', on: getSoundOn(context) });
    return;
  }
  panel = vscode.window.createWebviewPanel(
    'tictactoe',
    '井字棋 你 vs 电脑',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'src', 'webview')]
    }
  );
  panel.webview.html = getWebviewContent(context);
  panel.webview.postMessage({ type: 'setSound', on: getSoundOn(context) });

  // 接收 webview 内「游戏设置」改动与音效按钮状态，回写 globalState 并刷新侧栏
  panel.webview.onDidReceiveMessage(async msg => {
    if (!msg) return;
    if (msg.type === 'options' && msg.value) {
      const cur = getOptions(context);
      const next: Options = {
        difficulty: msg.value.difficulty ?? cur.difficulty,
        humanFirst: typeof msg.value.humanFirst === 'boolean' ? msg.value.humanFirst : cur.humanFirst,
        mode: msg.value.mode ?? cur.mode
      };
      await context.globalState.update(OPT_KEY, next);
      provider?.refresh();
    } else if (msg.type === 'sound') {
      await context.globalState.update(SOUND_KEY, !!msg.on);
      provider?.refresh();
    }
  }, null, context.subscriptions);

  panel.onDidDispose(() => { panel = undefined; }, null, context.subscriptions);
}

export function activate(context: vscode.ExtensionContext) {
  provider = new TicTacToeTreeDataProvider(context);

  context.subscriptions.push(
    vscode.commands.registerCommand('tictactoe.open', () => openGame(context))
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('tictactoe.restart', () => {
      if (panel) panel.webview.postMessage({ type: 'restart' });
      else openGame(context);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('tictactoe.toggleSound', async () => {
      const on = !getSoundOn(context);
      await context.globalState.update(SOUND_KEY, on);
      panel?.webview.postMessage({ type: 'setSound', on });
      multi?.postToWebview({ type: 'setSound', on });   // 联机面板内无音效按钮，统一由侧栏控制
      provider?.refresh();
    })
  );

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('tictactoe.tree', provider)
  );

  // ---------- 局域网联机（1v1）：复用 src/common 的联机桥接模块 ----------
  multi = new LanMultiplayer({
    context,
    commandPrefix: 'tictactoe',
    viewTypeHost: 'tictactoe.multiHost',
    viewTypeClient: 'tictactoe.multiClient',
    port: MULTI_PORT,
    maxPeers: 1,
    webviewHtmlPath: (ctx) => vscode.Uri.joinPath(ctx.extensionUri, 'src', 'webview', 'multi.html'),
    // 注入角色 / 地址 / 端口 / 音效开关；房主 X、加入方 O，棋盘坐标一致，无需镜像
    buildBootstrap: (p) => ({ ...p, soundOn: getSoundOn(context) }),
    i18n: {
      roomCreated: (ip, port) => `房间已创建！请让对手加入房间：${ip}:${port}`,
      portInUse: (port) => `端口 ${port} 已被占用，请先关闭其他房间或换端口重试。`,
      connectFailed: (err) => `连接房间失败: ${err}`,
      connectTimeout: (ms) => `连接超时：${ms}ms 内未连上，请检查 IP/端口/防火墙/是否同一局域网。`,
      joinPrompt: () => '请输入房主的 IP:端口（例如 192.168.1.10:18901）',
      invalidAddress: (raw) => `地址格式错误：${raw}，请使用 IP:端口 格式`,
    },
    // 音效开关属于本地偏好，不转发给对手
    onWebviewMessage: (msg) => {
      if (msg.type === 'sound') {
        const on = !!msg.on;
        void context.globalState.update(SOUND_KEY, on);
        provider?.refresh();
        panel?.webview.postMessage({ type: 'setSound', on });
        return true;
      }
      return false;
    },
  });
  context.subscriptions.push(multi.registerCommands());
}

export function deactivate() {
  multi?.dispose();
  multi = undefined;
}
