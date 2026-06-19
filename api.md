# 后端 API 设计文档

## 1. 概述

本文档定义 AIVR 前端与后端 Agent 服务之间的通信协议。后端基于 **FastAPI** 框架实现，接收用户语音指令（及可选图片），调度 OpenClaw + AI 模型生成 3D 资产，并通过 WebSocket 主动推送任务进度和完成状态。前端无需轮询，仅在收到完成事件后发起 HTTP GET 请求下载生成的 `.ply` / `.glb` 文件。

**基础路径**：`/api/v1`

**通信协议**：REST + WebSocket

**数据格式**：JSON

---

## 2. 通用规范

### 2.1 请求头

| Header         | 值                 | 说明              |
| -------------- | ------------------ | ----------------- |
| `Content-Type` | `application/json` | POST/PUT 请求格式 |
| `Accept`       | `application/json` | 期望响应格式      |

### 2.2 统一响应结构

所有 REST API 均返回以下格式：

```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

### 2.3 错误码表

| code | 含义                    |
| ---- | ----------------------- |
| 0    | 成功                    |
| 400  | 请求参数错误            |
| 404  | 资源不存在              |
| 409  | 任务状态冲突            |
| 500  | 服务器内部错误          |
| 503  | 模型服务暂时不可用      |
| 429  | 请求频率过高（限流）    |
| 413  | 上传的图片过大（>10MB） |

---

## 3. REST API 端点

### 3.1 创建生成任务

**`POST /tasks`**

#### 请求体

| 字段          | 类型         | 必填 | 说明                                                         |
| ------------- | ------------ | ---- | ------------------------------------------------------------ |
| `instruction` | string       | 是   | 自然语言指令，例：“生成一把红色的椅子”                       |
| `type`        | string       | 否   | 任务类型提示：`object` 或 `avatar`，不填则自动识别           |
| `image_data`  | string\|null | 否   | Base64 编码的图片（含 data:image/… 前缀），用于图生3D或单图重建 |
| `config`      | object\|null | 否   | 额外参数，如 `{ "color": "red", "scale": 1.0 }`              |

#### 响应示例（200 OK）

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "task_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "pending",
    "created_at": "2026-05-24T10:00:00Z"
  }
}
```

---

### 3.2 查询任务状态（备选，通常用 WebSocket）

**`GET /tasks/{task_id}`**

仅用于前端恢复或调试场景，正常流程使用 WebSocket 接收状态。

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "task_id": "550e8400-...",
    "status": "processing",
    "progress": 45,
    "created_at": "2026-05-24T10:00:00Z",
    "updated_at": "2026-05-24T10:00:45Z",
    "result": null
  }
}
```

`status` 可能值：`pending`、`processing`、`completed`、`failed`、`cancelled`。

当 `status = "completed"` 时，`result` 包含：

```json
"result": {
  "asset_url": "http://10.88.80.67:18080/api/v1/assets/550e8400.../model.ply",
  "asset_type": "ply",
  "thumbnail_url": "http://.../thumb.png",
  "metadata": { "vertices": 150000 }
}
```

---

### 3.3 取消任务

**`DELETE /tasks/{task_id}`**

取消尚未完成的任务。

#### 响应

```json
{
  "code": 0,
  "message": "task cancelled",
  "data": null
}
```

---

### 3.4 下载资产文件

**`GET /assets/{task_id}/model.ply`** （或使用 `asset_url` 返回的完整路径）

直接返回二进制文件，支持 `Range` 请求，有效期建议 1 小时。

#### 响应头

```
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="model.ply"
```

---

## 4. WebSocket 实时通信

### 4.1 连接地址

```
ws://10.88.80.67:18080/api/v1/ws/tasks/{task_id}
```

前端在创建任务后立即建立 WebSocket 连接，用于接收进度推送和完成通知。

### 4.2 消息格式（服务端 → 客户端）

所有消息均为 JSON：

```json
{
  "event": "status_update",
  "timestamp": "2026-05-24T10:00:10Z",
  "data": { ... }
}
```

### 4.3 事件类型

| 事件            | 触发时机           | data 内容                                                   |
| --------------- | ------------------ | ----------------------------------------------------------- |
| `status_update` | 任务状态变化       | `{ "status": "processing", "message": "正在调用模型" }`     |
| `progress`      | 进度更新           | `{ "progress": 30 }`                                        |
| `log`           | 详细日志（调试用） | `{ "level": "info", "message": "模型推理开始" }`            |
| `completed`     | 任务成功完成       | `{ "task_id": "...", "asset_url": "http://.../model.ply" }` |
| `failed`        | 任务失败           | `{ "error": "模型超时", "code": 500 }`                      |

### 4.4 客户端心跳

前端应每 30 秒发送 `ping` 字符串，后端回复 `pong`。若 60 秒无心跳，服务端主动断开连接。

```javascript
ws.send('ping');
```

---

## 5. 完整交互时序

```
前端                                后端
  |                                   |
  |-- POST /tasks ------------------->|
  |<-- {task_id, status=pending} ----|
  |                                   |
  |-- WebSocket connect ------------->|
  |                                   |
  |<-- {event: status_update, processing} |
  |                                   |
  |<-- {event: completed, asset_url} ---|
  |                                   |
  |-- GET asset_url ----------------->|
  |<-- binary .ply -------------------|
  |                                   |
  |-- (前端调用 aivrApp.loadSplat)  --|
```

---

## 6. FastAPI 实现核心代码示例

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
from uuid import uuid4
from typing import Dict
import asyncio

app = FastAPI()

tasks: Dict[str, dict] = {}
connections: Dict[str, WebSocket] = {}

class TaskCreate(BaseModel):
    instruction: str
    type: str | None = None
    image_data: str | None = None
    config: dict | None = None

@app.post("/api/v1/tasks")
async def create_task(req: TaskCreate, background_tasks: BackgroundTasks):
    task_id = str(uuid4())
    tasks[task_id] = {"status": "pending", "progress": 0}
    background_tasks.add_task(run_generation, task_id, req)
    return {
        "code": 0,
        "message": "success",
        "data": {"task_id": task_id, "status": "pending"}
    }

@app.websocket("/api/v1/ws/tasks/{task_id}")
async def websocket_endpoint(websocket: WebSocket, task_id: str):
    await websocket.accept()
    connections[task_id] = websocket
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        connections.pop(task_id, None)

async def run_generation(task_id: str, req: TaskCreate):
    # 更新状态
    tasks[task_id]["status"] = "processing"
    await send_ws(task_id, {"event": "status_update", "data": {"status": "processing"}})
    
    # 模拟进度
    for prog in [20, 40, 60, 80]:
        await asyncio.sleep(2)
        tasks[task_id]["progress"] = prog
        await send_ws(task_id, {"event": "progress", "data": {"progress": prog}})
    
    # 生成完成后获取资产 URL
    asset_url = f"http://10.88.80.67:18080/api/v1/assets/{task_id}/model.ply"
    tasks[task_id].update({"status": "completed", "result": {"asset_url": asset_url}})
    
    # 推送完成事件（携带 asset_url）
    await send_ws(task_id, {
        "event": "completed",
        "data": {"task_id": task_id, "asset_url": asset_url}
    })

async def send_ws(task_id: str, message: dict):
    ws = connections.get(task_id)
    if ws:
        try:
            await ws.send_json(message)
        except:
            pass

@app.get("/api/v1/assets/{task_id}/model.ply")
async def get_asset(task_id: str):
    file_path = f"/data/assets/{task_id}/model.ply"  # 实际路径
    return FileResponse(file_path, media_type="application/octet-stream")
```

---

## 7. 前端对接说明

现有前端 `VrVoicePanel` 需要修改 `onSendClick` 方法，参考以下逻辑：

```typescript
// 1. 发送 POST /tasks 创建任务
const resp = await fetch('/api/v1/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ instruction: this.currentResult })
});
const { data } = await resp.json();
const taskId = data.task_id;

// 2. 建立 WebSocket
const ws = new WebSocket(`ws://10.88.80.67:18080/api/v1/ws/tasks/${taskId}`);
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.event === 'completed') {
    const assetUrl = msg.data.asset_url;
    // 3. 调用已有的 loadSplat 方法
    aivrApp.loadSplat(assetUrl, new pc.Vec3(0, 1, 0), new pc.Vec3(1,1,1));
  }
};
```

---

## 8. 注意事项

- **CORS**：FastAPI 需配置 `allow_origins=["http://localhost:5173"]` 等。
- **超时**：长耗时生成任务请使用 `BackgroundTasks` 或 Celery 等异步队列，避免阻塞 FastAPI 事件循环。
- **资产存储**：生成的 `.ply` / `.glb` 文件建议存入固定目录，URL 映射使用 `FileResponse`。
- **安全性**：后续可增加 API Key 验证（请求头 `X-API-Key`）。

---

## 9. 版本

| 版本 | 日期       | 说明                                          |
| ---- | ---------- | --------------------------------------------- |
| v1.0 | 2026-05-24 | 初始版本，支持 WebSocket 推送 + HTTP GET 资产 |