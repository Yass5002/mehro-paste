import { disableDiskLogs } from "mehro-base/log";
import { logUnhandledErrorsAndRejections } from "mehro-base/log-web";
import { useEffect } from "react";

interface SetupLoggingOptions {
    disableDiskLogs?: boolean;
}

export const useSetupLogs = (opts?: SetupLoggingOptions) => {
    useEffect(() => {
        if (opts?.disableDiskLogs) disableDiskLogs();
        logUnhandledErrorsAndRejections(true);
        return () => logUnhandledErrorsAndRejections(false);
    }, [opts?.disableDiskLogs]);
};

