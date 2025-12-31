# 📸 Onboarding Screenshots Guide

本文档说明如何截取 Onboarding 流程的截图。

## 准备工作

1. 在 Chrome 或 Safari 中打开 `index.html`
2. 按 **F12**（Mac: **Cmd+Option+I**）打开开发者工具
3. 在 Console 中执行以下命令清除数据：

```javascript
localStorage.clear()
location.reload()
```

4. Onboarding 应该自动显示

## 截图步骤

### Step 1: 欢迎页 👋
**文件名：** `screenshots/onboarding-1-welcome.png`

**内容：**
- 显示 "欢迎使用 Start Page" 标题
- 5个进度点，第1个激活（蓝色长条）
- "开始设置" 按钮

**快捷键：** `Cmd+Shift+4`（Mac）或使用截图工具

---

### Step 2: 主题选择 🎨
**文件名：** `screenshots/onboarding-2-theme.png`

点击 "开始设置" 后：

**内容：**
- 深色模式 🌙 和浅色模式 ☀️ 两个选项
- 进度点：第2个激活
- "跳过" 和 "下一步" 按钮

---

### Step 3: 位置设置 🌍
**文件名：** `screenshots/onboarding-3-location.png`

点击 "下一步" 后：

**内容：**
- "自动定位" 选项 📍
- 进度点：第3个激活
- 提示文字："或者跳过此步骤..."

---

### Step 4: 导入书签 🔗
**文件名：** `screenshots/onboarding-4-import.png`

继续点击 "下一步"：

**内容：**
- 多行文本输入框
- 占位符显示导入格式示例
- 进度点：第4个激活
- "稍后添加" 和 "导入" 按钮

**可选：** 在输入框中输入示例链接：
```
https://google.com
GitHub | https://github.com | g
Twitter | https://twitter.com
```

---

### Step 5: 快速教程 ✨
**文件名：** `screenshots/onboarding-5-tutorial.png`

最后一步：

**内容：**
- 3个使用技巧（桌面端或移动端不同）
- 进度点：第5个激活（最后一个）
- "完成" 按钮

**桌面端提示：**
- ⌨️ 使用 Cmd/Ctrl+K 快速搜索
- 🔤 按快捷键字母快速打开链接
- 🖱️ 拖拽卡片和链接重新排序

**移动端提示：**
- 👆 横向滑动快捷链接栏
- ✋ 长按卡片开始拖拽排序
- 📌 点击 + 号添加新内容

---

## 移动端截图（可选）

使用 Chrome DevTools 设备模拟器：

1. 按 **Cmd+Shift+M**（Windows: **Ctrl+Shift+M**）
2. 选择设备（例如：iPhone 14 Pro）
3. 重复上述步骤
4. 文件名添加 `-mobile` 后缀：
   - `onboarding-1-welcome-mobile.png`
   - `onboarding-2-theme-mobile.png`
   - 等等...

## 截图规范

- **格式：** PNG
- **尺寸：** 保持原始尺寸（不要缩放）
- **内容：** 完整的模态框，包括背景模糊效果
- **命名：** 使用统一的命名格式

## 提交截图

截图完成后：

```bash
git add screenshots/onboarding-*.png
git commit -m "docs: Add onboarding flow screenshots"
git push
```

然后通知我更新 PR 描述。

## 自动化脚本（高级）

如果你想自动化截图流程，可以使用 Puppeteer：

```javascript
// screenshot-onboarding.js
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto('file:///path/to/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // 等待 onboarding 加载
  await page.waitForSelector('.onboarding-modal');

  // Step 1: Welcome
  await page.screenshot({ path: 'screenshots/onboarding-1-welcome.png' });
  await page.click('.onboarding-btn-primary');
  await page.waitForTimeout(500);

  // Step 2: Theme
  await page.screenshot({ path: 'screenshots/onboarding-2-theme.png' });
  await page.click('.onboarding-btn-primary');
  await page.waitForTimeout(500);

  // ... 继续其他步骤

  await browser.close();
})();
```

运行：
```bash
npm install puppeteer
node screenshot-onboarding.js
```
