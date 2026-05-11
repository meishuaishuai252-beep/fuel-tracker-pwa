# 油耗记录助手 PWA

一个手机优先的车辆油耗记录工具，PWA 单页应用，无需后端服务器，数据保存在浏览器本地。

访问地址：https://你的用户名.github.io/fuel-tracker-pwa/

## 当前功能

- **首页仪表盘**：本月油费、本月行驶、平均油耗、每公里成本、最近加油/行程
- **加油记录**：日期、里程、金额、升数、油价（填写任意两项自动计算第三项）、加满标记、备注
- **行程记录**：起止里程自动计算距离、根据平均油耗估算油费
- **统计**：百公里油耗、每公里油费、本月/总计汇总
- **设置/备份**：导出 JSON、导入 JSON、清空数据（二次确认）
- **离线可用**：Service Worker 缓存，添加到桌面后可离线打开

## 如何本地运行

```bash
cd fuel-tracker-pwa
npx serve .
```

然后用浏览器打开 `http://localhost:3000`。

或使用 Python：

```bash
cd fuel-tracker-pwa
python -m http.server 8080
```

> 直接双击 index.html 也能打开，但 Service Worker 离线功能需要 HTTP 服务器才能生效。

## 如何添加到手机桌面

1. 用手机浏览器打开网址
2. **Android Chrome**：菜单 → "添加到主屏幕"
3. **iPhone Safari**：底部分享按钮 → "添加到主屏幕"
4. 添加后以全屏独立窗口运行，无浏览器地址栏

## 数据保存方式

所有数据保存在浏览器 `localStorage` 中，不上传任何服务器。

## 备份方式

在设置页可导出全部数据为 JSON 文件、从 JSON 文件导入恢复。

⚠️ **注意事项**：
- 清除浏览器数据会导致本地记录丢失
- 建议定期在设置页导出 JSON 备份
- 导出文件请妥善保存，不要上传到公开仓库

## 后续计划

- [ ] GitHub Pages 部署
- [ ] 图表统计（油耗趋势图）
- [ ] 多车辆支持
- [ ] 微信 / OpenClaw 记录入口
- [ ] 云同步

## 技术栈

HTML + CSS + JavaScript（无框架），PWA（manifest.json + Service Worker），localStorage。
