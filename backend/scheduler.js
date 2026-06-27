import cron from "node-cron";
import { syncAttendance } from "./services/attendanceSync.js";

const cronExpression =
    process.env.WATCHDOG_SYNC_CRON || "*/5 * * * * *";

console.log(`WatchDog Scheduler: ${cronExpression}`);

cron.schedule(cronExpression, async () => {
    try {
        await syncAttendance();
    } catch (err) {
        console.error("WatchDog Sync Error:", err);
    }
});