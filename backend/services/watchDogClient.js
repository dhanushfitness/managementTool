import axios from "axios";
import Member from '../models/Member.js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

class WatchDogClient {

    constructor() {

        this.client = axios.create({
            baseURL: process.env.WATCHDOG_URL || "http://watchdog.airfitluxury.in",
            timeout: 10000
        });

        this.token = null;
    }

    async login() {

        if (this.token)
            return;

        const params = new URLSearchParams();
        params.append("username", process.env.WATCHDOG_USER || 'admin');
        params.append("password", process.env.WATCHDOG_PASSWORD || 'Airfit@2026');

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
              isActive: true,
              $or: [
                { attendanceId: trx.emp_code },
                { memberId: trx.emp_code },
                { "biometricData.fingerprint": trx.emp_code }
              ]
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

    async updateEmployeeValidity(payload) {
        await this.login();

        try {
            const { data } = await this.client.patch(
                `/personnel/api/employees/${payload.emp_code}/`,
                payload
            );
            return data;
            console.log(`Successfully updated validity for ${payload.emp_code} in WatchDog`);

        } catch (err) {
            console.log("Status:", err.response?.status);
            console.log("Response:", err.response?.data);
            throw err;
        }

    }

}

export default new WatchDogClient();