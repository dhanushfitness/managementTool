import Attendance from "../models/Attendance.js";
import Member from "../models/Member.js";

export async function processPunch(transaction) {

    const identifier = String(
        transaction.emp_code
    ).trim();

    const member = await Member.findOne({

        isActive: true,

        $or: [

            {
                attendanceId: identifier
            },

            {
                memberId: identifier
            },

            {
                "biometricData.fingerprint":
                    identifier
            }

        ]

    }).populate("currentPlan.planId");

    if (!member) {

        console.log(
            "Member not found:",
            identifier
        );

        return;
    }

    const existing = await Attendance.findOne({

        externalTransactionId:
            transaction.id

    });

    if (existing)
        return;

    await Attendance.create({

        externalTransactionId:
            transaction.id,

        memberId: member._id,

        branchId: member.branchId,

        organizationId:
            member.organizationId,

        checkInTime:
            new Date(
                transaction.punch_time
            ),

        method: "biometric",

        status: "success",

        deviceId:
            transaction.terminal_sn,

        notes:
            "Easy Time Pro"

    });

    console.log(
        "Attendance synced:",
        identifier
    );

}