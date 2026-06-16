# FlowLink Android App 打包说明

当前方案使用 Capacitor：保留现有 Vue 3 前端，把它打包进 Android 原生壳。

## 需要安装

1. Node.js 已安装。
2. Android Studio。
3. Android SDK 和 Android SDK Platform Tools。
4. JDK 17 或 Android Studio 自带 JDK。

## 第一次生成 Android 工程

在项目根目录执行：

```powershell
cd frontend
npm.cmd install
npm.cmd run android:init
```

执行后会生成：

```text
frontend/android/
```

这个目录就是 Android Studio 可以打开的原生工程。

## 同步前端到 Android

每次修改 Vue 前端后执行：

```powershell
cd frontend
npm.cmd run android:sync
```

然后打开 Android Studio：

```powershell
npm.cmd run android:open
```

## 生成 APK

在 Android Studio 中：

```text
Build > Build Bundle(s) / APK(s) > Build APK(s)
```

生成后可以把 APK 发给同学安装。

## App 如何连接后端

Android App 不能使用电脑浏览器里的 Vite 代理，也不能连接 `localhost`。

启动后端后，先查你电脑的局域网 IP：

```powershell
ipconfig
```

找到类似：

```text
192.168.1.23
```

确保手机和电脑连接同一个 Wi-Fi，然后在 App 登录页填写服务器地址：

```text
http://192.168.1.23:8080
```

再登录：

```text
linche / flowlink123
```

## 需要开放的端口

如果手机连不上，请检查 Windows 防火墙是否允许：

```text
8080  后端 HTTP API
8090  Netty WebSocket
9000  MinIO 文件访问，使用 MinIO 模式时需要
```

## 公网发布

如果要让不在同一 Wi-Fi 的人使用，需要把后端部署到云服务器，并在 App 服务器地址中填写公网地址，例如：

```text
https://api.your-domain.com
```

生产环境建议使用 HTTPS，否则部分 Android 设备会限制明文 HTTP。
