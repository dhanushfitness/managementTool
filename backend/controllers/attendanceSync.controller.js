import axios from "axios";
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const easyTime = axios.create({
    baseURL: process.env.WATCHDOG_URL,
    auth: {
        username: process.env.WATCHDOG_USER,
        password: process.env.WATCHDOG_PASSWORD
    }
});

export async function syncAttendance() {

    const { data } = await easyTime.get(
        "/iclock/api/transactions/"
    );

    for (const trx of data.results) {

        await axios.post(
            "https://your-api.com/api/attendance/fingerprint",
            {
                fingerprintId: trx.emp_code,
                deviceId: trx.terminal_sn,
                timestamp: trx.punch_time
            }
        );
    }

}