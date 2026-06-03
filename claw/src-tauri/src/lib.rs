//! Claw Tauri 后端 - 仅负责桌面壳相关的命令。
//! 业务逻辑全部在 Python FastAPI（`backend/`）侧。
//! Tauri 侧只做：启动时拉起 Python 后端子进程、暴露系统级 API（打开浏览器、读写文件等）。

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[derive(Default)]
struct BackendProcess(Mutex<Option<Child>>);

#[derive(Debug, Serialize, Deserialize)]
struct BackendConfig {
    /// Python 后端 HTTP 端口
    port: u16,
    /// Python 解释器路径，留空则用 PATH 里的 python
    python: Option<String>,
    /// Python 入口模块
    module: String,
    /// 后端工作目录（绝对路径）
    workdir: PathBuf,
}

impl Default for BackendConfig {
    fn default() -> Self {
        Self {
            port: 8765,
            python: None,
            module: "app.main".to_string(),
            // 假设 backend/ 位于 Tauri 可执行文件同级
            workdir: std::env::current_dir()
                .unwrap_or_else(|_| PathBuf::from("."))
                .join("..")
                .join("backend"),
        }
    }
}

/// 启动 Python 后端子进程
#[tauri::command]
fn start_backend(
    app: AppHandle,
    state: State<'_, BackendProcess>,
    config: Option<BackendConfig>,
) -> Result<u16, String> {
    let cfg = config.unwrap_or_default();
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(child) = guard.as_mut() {
        // 已经跑着，直接返回端口
        return Ok(cfg.port);
    }

    let python = cfg
        .python
        .or_else(|| std::env::var("CLAW_PYTHON").ok())
        .unwrap_or_else(|| "python".to_string());

    let mut cmd = Command::new(&python);
    cmd.arg("-m")
        .arg(&cfg.module)
        .arg("--port")
        .arg(cfg.port.to_string())
        .current_dir(&cfg.workdir)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let child = cmd
        .spawn()
        .map_err(|e| format!("无法启动 Python 后端 ({}): {}", python, e))?;

    *guard = Some(child);

    // 等待后端健康检查通过
    let health_url = format!("http://127.0.0.1:{}/healthz", cfg.port);
    for _ in 0..50 {
        std::thread::sleep(std::time::Duration::from_millis(200));
        if let Ok(resp) = reqwest::blocking::get(&health_url) {
            if resp.status().is_success() {
                return Ok(cfg.port);
            }
        }
    }

    Err("Python 后端启动超时".into())
}

/// 停止 Python 后端子进程
#[tauri::command]
fn stop_backend(state: State<'_, BackendProcess>) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(mut child) = guard.take() {
        let _ = child.kill();
        let _ = child.wait();
    }
    Ok(())
}

/// 在系统默认浏览器中打开 URL
#[tauri::command]
fn open_external(url: String) -> Result<(), String> {
    open::that(&url).map_err(|e| e.to_string())
}

/// 获取后端 HTTP base URL，前端拼接用
#[tauri::command]
fn backend_base_url(config: Option<BackendConfig>) -> String {
    let port = config.map(|c| c.port).unwrap_or(8765);
    format!("http://127.0.0.1:{}", port)
}

#[tauri::command]
fn app_data_dir(app: AppHandle) -> Result<String, String> {
    app.path()
        .app_data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .manage(BackendProcess::default())
        .setup(|app| {
            // 启动时自动拉起后端
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = start_backend(handle.clone(), State::from(&*handle.state::<BackendProcess>()), None) {
                    eprintln!("[claw] 启动后端失败: {}", e);
                }
            });
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // 关闭主窗口时杀掉后端
                if let Some(state) = window.app_handle().try_state::<BackendProcess>() {
                    if let Ok(mut guard) = state.0.lock() {
                        if let Some(mut child) = guard.take() {
                            let _ = child.kill();
                        }
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            start_backend,
            stop_backend,
            open_external,
            backend_base_url,
            app_data_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running Claw Tauri app");
}
