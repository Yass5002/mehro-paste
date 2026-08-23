import log from "mehro-base/log";

export const logUnhandledErrorsAndRejections = (attach: boolean) => {
    const handleError = (event: ErrorEvent) => {
        if (
            event.message ==
            "ResizeObserver loop completed with undelivered notifications."
        ) {
            return;
        }

        log.error("Unhandled error", event.error ?? event.message);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        log.error("Unhandled promise rejection", event.reason);
    };

    if (attach) {
        window.addEventListener("error", handleError);
        window.addEventListener("unhandledrejection", handleUnhandledRejection);
    } else {
        window.removeEventListener("error", handleError);
        window.removeEventListener(
            "unhandledrejection",
            handleUnhandledRejection,
        );
    }
};

interface LogEntry {
    timestamp: number;
    logLine: string;
}

const lsKey = "logs";

export const logToDisk = (message: string) => {
    const maxCount = 1000;
    const log: LogEntry = { logLine: message, timestamp: Date.now() };
    try {
        let logs = logEntries();
        if (logs.length > maxCount) {
            logs = logs.slice(logs.length - maxCount / 4);
        }
        logs.push(log);
        localStorage.setItem(lsKey, JSON.stringify({ logs }));
    } catch (e) {
        console.error("Failed to persist log", e);
        if (e instanceof Error && e.name == "QuotaExceededError") {
            localStorage.removeItem(lsKey);
        }
    }
};

const logEntries = (): unknown[] => {
    const s = localStorage.getItem("logs");
    if (!s) return [];
    const o: unknown = JSON.parse(s);
    if (!(o && typeof o == "object" && "logs" in o && Array.isArray(o.logs))) {
        console.error("Unexpected log entries obtained from local storage", o);
        return [];
    }
    return o.logs;
};

