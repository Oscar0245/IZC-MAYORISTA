"""Vigila lista-precios-izc.xlsb y regenera precios automáticamente.

Se ejecuta en segundo plano (pythonw) al iniciar Windows o al abrir el sitio.
"""
from __future__ import annotations

import atexit
import os
import sys
import time
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "src"))

from extraer_precios import (  # noqa: E402
    RUTA_DATA_JS,
    RUTA_EXCEL,
    RUTA_JSON,
    extraer_precios_stone_usd,
    guardar_precios,
)

POLL_SECONDS = 2.0
LOCK_FILE = BASE_DIR / "assets" / "files" / ".precios-watch.lock"
LOG_FILE = BASE_DIR / "assets" / "files" / "precios-watch.log"


def log(msg: str) -> None:
    line = f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}"
    try:
        LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with LOG_FILE.open("a", encoding="utf-8") as fh:
            fh.write(line + "\n")
    except OSError:
        pass
    try:
        print(line, flush=True)
    except OSError:
        pass


def pid_alive(pid: int) -> bool:
    if pid <= 0:
        return False
    try:
        os.kill(pid, 0)
    except OSError:
        return False
    except SystemError:
        return False
    # En Windows os.kill(pid, 0) puede no existir igual; fallback:
    if os.name == "nt":
        try:
            import ctypes

            PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
            handle = ctypes.windll.kernel32.OpenProcess(
                PROCESS_QUERY_LIMITED_INFORMATION, False, pid
            )
            if handle:
                ctypes.windll.kernel32.CloseHandle(handle)
                return True
            return False
        except Exception:
            return False
    return True


def acquire_lock() -> bool:
    """Una sola instancia: mutex de Windows + archivo PID de respaldo."""
    LOCK_FILE.parent.mkdir(parents=True, exist_ok=True)

    if os.name == "nt":
        import ctypes

        ERROR_ALREADY_EXISTS = 183
        # Mutex con nombre fijo para IZC
        handle = ctypes.windll.kernel32.CreateMutexW(None, False, "Local\\IZC_PreciosWatcher")
        if not handle:
            log("No se pudo crear el mutex de instancia única.")
            return False
        if ctypes.windll.kernel32.GetLastError() == ERROR_ALREADY_EXISTS:
            log("Ya hay un vigilante activo. Saliendo.")
            ctypes.windll.kernel32.CloseHandle(handle)
            return False
        # Mantener el handle vivo en el proceso
        globals()["_IZC_MUTEX_HANDLE"] = handle
    else:
        if LOCK_FILE.exists():
            try:
                old_pid = int(LOCK_FILE.read_text(encoding="utf-8").strip() or "0")
            except ValueError:
                old_pid = 0
            if old_pid and pid_alive(old_pid) and old_pid != os.getpid():
                log(f"Ya hay un vigilante activo (PID {old_pid}). Saliendo.")
                return False

    LOCK_FILE.write_text(str(os.getpid()), encoding="utf-8")

    def _cleanup() -> None:
        try:
            if LOCK_FILE.exists() and LOCK_FILE.read_text(encoding="utf-8").strip() == str(os.getpid()):
                LOCK_FILE.unlink()
        except OSError:
            pass

    atexit.register(_cleanup)
    return True


def signature(path: Path) -> tuple[float, int] | None:
    if not path.exists():
        return None
    st = path.stat()
    return (st.st_mtime, st.st_size)


def needs_update(excel_sig: tuple[float, int]) -> bool:
    if not RUTA_JSON.exists() or not RUTA_DATA_JS.exists():
        return True
    json_mtime = RUTA_JSON.stat().st_mtime
    data_mtime = RUTA_DATA_JS.stat().st_mtime
    return excel_sig[0] > min(json_mtime, data_mtime)


def wait_until_stable(path: Path, rounds: int = 4, delay: float = 0.5) -> tuple[float, int] | None:
    """Espera a que tamaño/mtime dejen de cambiar (Excel terminó de guardar)."""
    prev = signature(path)
    for _ in range(rounds):
        time.sleep(delay)
        cur = signature(path)
        if cur is None:
            return None
        if cur == prev:
            return cur
        prev = cur
    return signature(path)


def sync_now(reason: str) -> None:
    log(reason)
    precios = extraer_precios_stone_usd()
    guardar_precios(precios)
    log(f"OK: {len(precios)} SKUs -> {RUTA_JSON.name} + {RUTA_DATA_JS.name}")


def main() -> None:
    if not acquire_lock():
        return

    log("Vigilante de precios iniciado (sin XAMPP)")
    log(f"Excel: {RUTA_EXCEL}")

    last_sig = signature(RUTA_EXCEL)
    if last_sig is None:
        log("Esperando a que exista el Excel...")
    elif needs_update(last_sig):
        try:
            sync_now("Excel más nuevo que precios → actualizando")
        except Exception as exc:
            log(f"Error al actualizar: {exc}")

    while True:
        try:
            time.sleep(POLL_SECONDS)
            sig = signature(RUTA_EXCEL)
            if sig is None:
                if last_sig is not None:
                    log("Excel no encontrado")
                last_sig = None
                continue
            if sig != last_sig:
                stable = wait_until_stable(RUTA_EXCEL)
                if stable is None:
                    last_sig = None
                    continue
                last_sig = stable
                try:
                    sync_now("Cambio detectado en lista-precios-izc.xlsb → actualizando")
                except Exception as exc:
                    log(f"Error al actualizar (¿Excel abierto/bloqueado?): {exc}")
        except KeyboardInterrupt:
            log("Vigilancia detenida")
            return


if __name__ == "__main__":
    main()
