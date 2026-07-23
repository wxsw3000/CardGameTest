# CardGameTest 多端跨平台架构与开发指南

本文档详细说明了 **CardGameTest** 项目为支持 **iOS App、Android App、鸿蒙 HarmonyOS NEXT、微信/腾讯小程序、抖音小程序** 所重构的跨平台基础框架及使用规范。

---

## 1. 核心目录与架构图谱

```
assets/Scripts/Framework/
├── Platform/                     # 平台抽象与适配层
│   ├── PlatformTypes.ts          # 多端平台类型定义、安全区、胶囊按钮等规范
│   ├── IPlatformAdapter.ts       # 平台适配器统一接口
│   ├── BaseAdapter.ts            # 通用基础回退实现
│   ├── WebAdapter.ts             # Web / 桌面 preview 适配器
│   ├── WeChatAdapter.ts          # 微信小游戏 / 腾讯小程序适配器
│   ├── DouyinAdapter.ts          # 抖音小游戏 / 字节小程序适配器
│   ├── NativeAdapter.ts          # iOS / Android / 鸿蒙原生适配器
│   └── PlatformManager.ts        # 全局平台单例管理类（自动感知运行环境）
│
├── UI/                           # 多端 UI 适配组件
│   └── SafeAreaAdapter.ts        # 异形屏（刘海屏/挖孔屏）及微信/抖音胶囊避让组件
│
├── Storage/                      # 跨平台持久化存储
│   └── StorageManager.ts         # 本地缓存与云端同步抽象层
│
├── Network/                      # 多端网络层
│   └── NetworkManager.ts         # 多环境 (Dev/Staging/Prod) HTTPS/WSS 请求规范
│
└── Resource/                     # 内存与资源生命周期
    └── ResManager.ts             # Asset Bundle 动态加载、引用计数与显式内存释放
```

---

## 2. 核心模块调用示例

### 2.1 平台感知与系统 API (`PlatformManager`)
无需关心当前运行在 iOS、Android、鸿蒙还是小程序端，统一调用 `PlatformManager.instance`：

```typescript
import { PlatformManager } from './Framework/Platform/PlatformManager';

// 1. 获取平台类型
const type = PlatformManager.instance.getPlatformType(); // PlatformType.WeChat / Douyin / iOS / Android / HarmonyOS / Web

// 2. 简易平台判断
if (PlatformManager.instance.isMiniGame()) {
    // 小程序特定逻辑
}

// 3. 触摸震动反馈
PlatformManager.instance.vibrateShort();

// 4. 用户授权登录
const loginRes = await PlatformManager.instance.login();
if (loginRes.success) {
    console.log('Login Code:', loginRes.code);
}
```

---

### 2.2 异形屏与小程序胶囊按钮避让 (`SafeAreaAdapter`)
* **使用方式**：直接将 `SafeAreaAdapter` 组件挂载在 UI 节点（如 `Canvas` 顶栏、`CardDeck` 弹窗、`Enemy` 节点）上。
* **效果**：在 iOS 刘海屏或微信/抖音小程序运行时，自动计算右上角胶囊按钮 `wx.getMenuButtonBoundingClientRect()` 与 Safe Area，防止重要 UI 元素被打断或遮挡。

---

### 2.3 存储与数据同步 (`StorageManager`)
跨平台 Key-Value 读写，支持对象自动 JSON 序列化：

```typescript
import { StorageManager } from './Framework/Storage/StorageManager';

// 存储对象或基础数据
StorageManager.instance.setItem('user_deck', { left: [1, 2], mid: [3], right: [4, 5] });

// 读取数据（带默认值）
const deck = StorageManager.instance.getItem('user_deck', { left: [], mid: [], right: [] });
```

---

### 2.4 多环境网络接口 (`NetworkManager`)
符合腾讯微信与抖音小程序后台 **HTTPS / WSS 域名白名单报备**要求：

```typescript
import { NetworkManager, NetworkEnv } from './Framework/Network/NetworkManager';

// 切换环境 (Dev / Staging / Production)
NetworkManager.instance.setEnvironment(NetworkEnv.Production);

// 发起网络请求
const result = await NetworkManager.instance.request('/v1/match/create', 'POST', { userId: 10001 });
```

---

### 2.5 动态资源与内存控制 (`ResManager`)
防止 iOS 微信小游戏 JIT 限制下的 500MB 内存过载（OOM 闪退）：

```typescript
import { ResManager } from './Framework/Resource/ResManager';
import { SpriteFrame, Prefab } from 'cc';

// 1. 从指定 Asset Bundle 加载 Prefab
const cardPrefab = await ResManager.instance.loadAsset('UI', 'Prefabs/CardPrefab', Prefab);

// 2. 显式释放显存/内存中的图片或纹理
ResManager.instance.releaseAsset(oldTexture);
```

---

## 3. 多平台构建发布注意事项 (Checklist)

| 目标平台 | 构建 Target | 限制与必做事项 |
| :--- | :--- | :--- |
| **微信小程序 / 小游戏** | `wechatgame` | 1. 主包必须 `< 4MB`，大图/特效置于子包；<br>2. 微信公众平台后台配置域名白名单；<br>3. 调用 `vibrateShort` 与胶囊避让。 |
| **抖音小程序 / 小游戏** | `bytedance-mini-game` | 1. 主包限制 `< 4MB`；<br>2. 抖音开放平台后台配置域名白名单；<br>3. 适配字节 `tt.login`。 |
| **鸿蒙原生 App** | `openharmony` | 1. 适配 OpenHarmony / HarmonyOS NEXT (Cocos 3.8.2+ 官方原生支持)；<br>2. NDK/ArkTS 编译配置。 |
| **iOS / Android App** | `ios` / `android` | 1. Xcode / Android Studio 原生打包；<br>2. 启用 ASTC 纹理压缩以节省显存。 |
