import watchDogClient from "./WatchDogClient.js";
import AttendanceSync from "../models/AttendanceSync.js";
import { processPunch } from "./attendanceService.js";

export async function syncAttendance() {

    let state =
        await AttendanceSync.findOne();

    if (!state)
        state =
            await AttendanceSync.create({});

    let page = 1;

    while (true) {

        const response =
            await watchDogClient.getTransactions(page);

        const transactions =
            response.results || [];

        if (
            transactions.length === 0
        )
            break;

        for (const trx of transactions) {

            if (
                trx.id <=
                state.lastTransactionId
            )
                continue;

            await processPunch(trx);

            if (
                trx.id >
                state.lastTransactionId
            ) {

                state.lastTransactionId =
                    trx.id;

            }

        }

        await state.save();

        if (!response.next)
            break;

        page++;

    }

}