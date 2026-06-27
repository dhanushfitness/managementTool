import axios from "axios";
import Member from '../models/Member.js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

class WatchDogClient {

    constructor() {

        this.client = axios.create({
            baseURL: process.env.WATCHDOG_URL,
            timeout: 10000
        });

        this.token = null;
    }

    async login() {

        if (this.token)
            return;

        const params = new URLSearchParams();
        params.append("username", process.env.WATCHDOG_USER);
        params.append("password", process.env.WATCHDOG_PASSWORD);

        const { data } = await this.client.post(
            "/api/api-token-auth/",
            params,
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "application/json"
                }
            }
        );

        if (!data.token && !data.key) {
            throw new Error(`WatchDog authentication failed: ${JSON.stringify(data)}`);
        }

        this.token = data.token || data.key;

        this.client.defaults.headers.common.Authorization =
            `Token ${this.token}`;
    }

    async getTransactions(page = 1) {

        await this.login();

        const { data } = await this.client.get(
            `/iclock/api/transactions/`
        );

        for (const trx of data.data) {

            const appMember = await Member.findOne({
                memberId: trx.emp_code
            }).select("firstName lastName attendanceId memberId");

            if (!appMember) {
                console.log(`${trx.emp_code}, ${trx.punch_time} - Member not found`);
                continue;
            }

            console.log({
                name: `${appMember.firstName} ${appMember.lastName}`,
                attendanceId: appMember.attendanceId,
                memberId: appMember.memberId,
                punchedAt: trx.punch_time,
                device: trx.terminal_alias,
                deviceSerial: trx.terminal_sn
            });
        }

        return data;
    }

    async createEmployee(payload) {

        await this.login();

        const { data } = await this.client.post(
            "/personnel/api/employees/",
            payload
        );

        return data;
    }

    async deleteEmployee(empCode) {

        await this.login();

        const { data } = await this.client.delete(
            `/personnel/api/employees/${empCode}/`
        );

        return data;
    }

}

export default new WatchDogClient();